import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { api, ApiError, getAccessToken, setAccessToken } from "@/lib/api/client";
import { decimal } from "@/lib/api/decimal";

type Call = { path: string; options: RequestInit; headers: Headers };
const originalFetch = globalThis.fetch;
function bearer(subject = "ACCOUNT-A", revision = "initial") {
  return `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: subject, revision })).toString("base64url")}.signature`;
}
function envelope(data: unknown, status = 200, message = "OK") {
  return new Response(JSON.stringify({ timestamp: "2026-10-16T12:00:00Z", status: `${status}`, message, data }), { status, headers: { "Content-Type": "application/json" } });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
}
function stubFetch(handler: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  globalThis.fetch = async (input, options = {}) => {
    const call = { path: String(input), options, headers: new Headers(options.headers) };
    calls.push(call);
    return handler(call);
  };
  return calls;
}

describe("API client session, transport and command guarantees", { concurrency: false }, () => {
  beforeEach(() => { setAccessToken(bearer()); });
  afterEach(() => { globalThis.fetch = originalFetch; setAccessToken(null); });

  test("GET keeps query text literal, includes false and zero, and sends bearer plus secure-cookie credentials", async () => {
    const calls = stubFetch(() => envelope({ content: [] }));
    await api.get("/products", { page: 0, size: 20, q: "A+B & SKU/%_", active: false, omitted: undefined, absent: null, empty: "" });
    assert.equal(calls.length, 1);
    const url = new URL(calls[0].path, "https://wms.example.com");
    assert.equal(url.pathname, "/api/backend/products");
    assert.deepEqual(Object.fromEntries(url.searchParams), { page: "0", size: "20", q: "A+B & SKU/%_", active: "false" });
    assert.equal(calls[0].headers.get("Authorization"), `Bearer ${getAccessToken()}`);
    assert.equal(calls[0].headers.get("Accept"), "application/json");
    assert.equal(calls[0].options.credentials, "include");
    assert.equal(calls[0].options.cache, "no-store");
    assert.equal(calls[0].options.method, "GET");
    assert.equal(calls[0].options.body, undefined);
    assert.equal(calls[0].headers.has("Content-Type"), false);
  });

  test("an omitted query leaves the backend default page size intact and lookup requests retain size five", async () => {
    const calls = stubFetch(() => envelope([]));
    await api.get("/orders");
    await api.get("/lookups/products", { page: 0, size: 5, q: "SKU" });
    assert.equal(calls[0].path, "/api/backend/orders");
    assert.equal(new URL(calls[1].path, "https://wms.example.com").searchParams.get("size"), "5");
  });

  test("public login failures never attach a bearer or enter a refresh loop", async () => {
    const currentToken = getAccessToken();
    const calls = stubFetch(() => envelope(null, 401, "Credenciais inválidas"));
    await assert.rejects(api.request("/auth/login", { method: "POST", auth: false, body: { email: "user@example.com", password: "password" } }), (error: unknown) => error instanceof ApiError && error.status === 401);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].headers.has("Authorization"), false);
    assert.equal(calls[0].options.credentials, "include");
    assert.equal(calls[0].headers.get("Content-Type"), "application/json");
    assert.equal(getAccessToken(), currentToken);
  });

  test("parallel 401 responses share one refresh and retry each request with the new token", async () => {
    const renewed = bearer("ACCOUNT-A", "renewed");
    const waitingRefresh = deferred<Response>();
    const refreshStarted = deferred<void>();
    const calls = stubFetch((call) => {
      if (call.path === "/api/backend/auth/refresh") { refreshStarted.resolve(); return waitingRefresh.promise; }
      return call.headers.get("Authorization") === `Bearer ${renewed}` ? envelope({ ok: true }) : envelope(null, 401, "Expired");
    });
    const requests = [api.get("/products"), api.get("/orders")];
    await refreshStarted.promise;
    waitingRefresh.resolve(envelope({ token: renewed, subject: "ACCOUNT-A" }));
    assert.deepEqual(await Promise.all(requests), [{ ok: true }, { ok: true }]);
    assert.equal(calls.filter((call) => call.path.endsWith("/auth/refresh")).length, 1);
    assert.equal(calls.filter((call) => call.path.endsWith("/products")).length, 2);
    assert.equal(calls.filter((call) => call.path.endsWith("/orders")).length, 2);
    assert.equal(getAccessToken(), renewed);
    assert.equal(calls.find((call) => call.path.endsWith("/auth/refresh"))?.headers.has("Authorization"), false);
  });

  test("a command retried after 401 keeps its body and the same idempotency header", async () => {
    const renewed = bearer("ACCOUNT-A", "renewed");
    const calls = stubFetch((call) => call.path.endsWith("/auth/refresh")
      ? envelope({ token: renewed, subject: "ACCOUNT-A" })
      : call.headers.get("Authorization") === `Bearer ${renewed}` ? envelope({ id: "RECEIPT" }) : envelope(null, 401));
    await api.command("/pre-receipts", { quantity: decimal("999999999999,999999"), documentNumber: "NF-1" });
    const commands = calls.filter((call) => call.path.endsWith("/pre-receipts"));
    assert.equal(commands.length, 2);
    assert.ok(commands[0].headers.get("Idempotency-Key"));
    assert.equal(commands[0].headers.get("Idempotency-Key"), commands[1].headers.get("Idempotency-Key"));
    assert.equal(commands[0].options.body, commands[1].options.body);
    assert.match(String(commands[0].options.body), /"quantity":999999999999\.999999/);
  });

  test("a second 401 expires the session without another refresh attempt", async () => {
    const calls = stubFetch((call) => call.path.endsWith("/auth/refresh") ? envelope({ token: bearer("ACCOUNT-A", "renewed"), subject: "ACCOUNT-A" }) : envelope(null, 401));
    await assert.rejects(api.get("/stock"), (error: unknown) => error instanceof ApiError && error.status === 401);
    assert.equal(calls.filter((call) => call.path.endsWith("/stock")).length, 2);
    assert.equal(calls.filter((call) => call.path.endsWith("/auth/refresh")).length, 1);
    assert.equal(getAccessToken(), null);
  });

  test("403 remains a permission error without refreshing or clearing the session", async () => {
    const currentToken = getAccessToken();
    const calls = stubFetch(() => envelope(null, 403, "Permissão insuficiente"));
    await assert.rejects(api.get("/profiles"), (error: unknown) => error instanceof ApiError && error.statusCode === 403 && /Permissão/.test(error.message));
    assert.equal(calls.length, 1);
    assert.equal(getAccessToken(), currentToken);
  });

  test("a transient refresh failure preserves the access token and command key for an explicit retry", async () => {
    const currentToken = getAccessToken();
    const renewed = bearer("ACCOUNT-A", "renewed");
    let refreshUnavailable = true;
    const calls = stubFetch((call) => {
      if (call.path.endsWith("/auth/refresh")) {
        if (refreshUnavailable) throw new TypeError("Network unavailable");
        return envelope({ token: renewed, subject: "ACCOUNT-A" });
      }
      return call.headers.get("Authorization") === `Bearer ${renewed}` ? envelope({ id: "TASK" }) : envelope(null, 401);
    });
    const body = { reason: "Replanejamento" };
    await assert.rejects(api.command("/tasks/TASK/cancel", body), (error: unknown) => error instanceof ApiError && error.status === 0);
    assert.equal(getAccessToken(), currentToken);
    refreshUnavailable = false;
    await api.command("/tasks/TASK/cancel", body);
    const commands = calls.filter((call) => call.path.endsWith("/tasks/TASK/cancel"));
    assert.equal(commands.length, 3);
    assert.ok(commands[0].headers.get("Idempotency-Key"));
    assert.equal(new Set(commands.map((call) => call.headers.get("Idempotency-Key"))).size, 1);
  });

  test("old success and 401 responses cannot expose data or invalidate a newer account", async () => {
    for (const responseStatus of [200, 401]) {
      setAccessToken(bearer("ACCOUNT-A"));
      const response = deferred<Response>();
      const calls = stubFetch(() => response.promise);
      const oldRequest = api.get("/users/me");
      const newToken = bearer("ACCOUNT-B");
      setAccessToken(newToken);
      response.resolve(envelope({ id: "ACCOUNT-A" }, responseStatus));
      await assert.rejects(oldRequest, (error: unknown) => error instanceof ApiError && error.status === 401);
      assert.equal(getAccessToken(), newToken);
      assert.equal(calls.length, 1);
    }
  });

  test("a refresh already in flight cannot install its old account token after a session switch", async () => {
    const refreshResponse = deferred<Response>();
    const refreshStarted = deferred<void>();
    const calls = stubFetch((call) => {
      if (call.path.endsWith("/auth/refresh")) { refreshStarted.resolve(); return refreshResponse.promise; }
      return envelope(null, 401);
    });
    const oldRequest = api.get("/users/me");
    await refreshStarted.promise;
    const newToken = bearer("ACCOUNT-B");
    setAccessToken(newToken);
    refreshResponse.resolve(envelope({ token: bearer("ACCOUNT-A", "renewed"), subject: "ACCOUNT-A" }));
    await assert.rejects(oldRequest, (error: unknown) => error instanceof ApiError && error.status === 401);
    assert.equal(getAccessToken(), newToken);
    assert.equal(calls.length, 2);
  });

  test("logout invalidates local access before the server responds", async () => {
    const response = deferred<Response>();
    stubFetch(() => response.promise);
    const pendingLogout = api.request("/auth/logout", { method: "POST", auth: false });
    assert.equal(getAccessToken(), null);
    response.resolve(envelope(null));
    await pendingLogout;
  });

  test("concurrent equal commands deduplicate despite object key order and receive one result", async () => {
    const response = deferred<Response>();
    const calls = stubFetch(() => response.promise);
    const first = api.command("/stock/STOCK/block", { reason: "Dano", metadata: { b: 2, a: 1 } });
    const second = api.command("/stock/STOCK/block", { metadata: { a: 1, b: 2 }, reason: "Dano" });
    assert.equal(first, second);
    assert.equal(calls.length, 1);
    response.resolve(envelope({ id: "BLOCK" }));
    assert.deepEqual(await Promise.all([first, second]), [{ id: "BLOCK" }, { id: "BLOCK" }]);
  });

  test("an uncertain command reuses its key; a completed fresh command receives a new key", async () => {
    let interrupted = true;
    const calls = stubFetch(() => {
      if (interrupted) throw new TypeError("Response lost");
      return envelope({ id: "BLOCK" });
    });
    await assert.rejects(api.command("/stock/STOCK/block", { reason: "Dano", lot: "LOT" }), ApiError);
    interrupted = false;
    await api.command("/stock/STOCK/block", { lot: "LOT", reason: "Dano" });
    await api.command("/stock/STOCK/block", { reason: "Dano", lot: "LOT" });
    const keys = calls.map((call) => call.headers.get("Idempotency-Key"));
    assert.ok(keys[0]);
    assert.equal(keys[0], keys[1]);
    assert.notEqual(keys[1], keys[2]);
  });

  test("outbound commands place the retry key only in JSON, and retain it after an uncertain failure", async () => {
    let interrupted = true;
    const calls = stubFetch(() => {
      if (interrupted) throw new TypeError("Response lost");
      return envelope({ id: "WAVE" });
    });
    const body = { warehouseId: "WAREHOUSE", code: "ONDA-1", orderIds: ["ORDER"], priority: 0 };
    await assert.rejects(api.command("/waves", body, { keyInBody: true }), ApiError);
    interrupted = false;
    await api.command("/waves", body, { keyInBody: true });
    const payloads = calls.map((call) => JSON.parse(String(call.options.body)) as typeof body & { idempotencyKey: string });
    assert.ok(payloads[0].idempotencyKey);
    assert.equal(payloads[0].idempotencyKey, payloads[1].idempotencyKey);
    assert.deepEqual(payloads[0].orderIds, ["ORDER"]);
    assert.ok(calls.every((call) => !call.headers.has("Idempotency-Key")));
    assert.equal("idempotencyKey" in body, false);
  });

  test("malformed or null response envelopes produce ApiError with the relevant status", async () => {
    for (const [body, status, expectedStatus] of [["null", 200, 0], ["not JSON", 502, 502], ['{"message":"missing data"}', 200, 0], ["null", 401, 401]] as const) {
      const calls = stubFetch(() => new Response(body, { status }));
      await assert.rejects(api.request("/auth/login", { auth: false }), (error: unknown) => error instanceof ApiError && error.status === expectedStatus);
      assert.equal(calls.length, 1);
    }
  });

  test("field validation errors retain their status and readable field messages", async () => {
    stubFetch(() => envelope([null, { field: "sku", message: "SKU obrigatório" }, { unrecognized: "ignore" }], 400, "Falha de validação"));
    await assert.rejects(api.request("/products", { method: "POST", body: {} }), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.deepEqual(error.fieldErrors, [{ field: "sku", message: "SKU obrigatório" }]);
      assert.match(error.message, /sku: SKU obrigatório/);
      return true;
    });
  });
});
