import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { NextRequest } from "next/server";
import { GET, POST, PUT } from "@/app/api/backend/[...path]/route";

type Call = { target: URL; options: RequestInit; headers: Headers };
const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.WMS_API_BASE_URL;
const originalWebOrigin = process.env.WEB_ORIGIN;
const appOrigin = "https://wms.example.com";

function request(method = "GET", path = "/stock", headers: Record<string, string> = {}, body?: string) {
  return new NextRequest(`${appOrigin}/api/backend${path}`, {
    method,
    headers: { ...(method === "GET" ? {} : { Origin: appOrigin }), ...headers },
    ...(body === undefined ? {} : { body }),
  });
}

function context(path: string[]) { return { params: Promise.resolve({ path }) }; }

function stubFetch(handler: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  globalThis.fetch = async (input, options = {}) => {
    const call = { target: new URL(String(input)), options, headers: new Headers(options.headers) };
    calls.push(call);
    return handler(call);
  };
  return calls;
}

function envelope(status = 200, data: unknown = null, message = "OK") {
  return new Response(JSON.stringify({ timestamp: "2026-10-17T12:00:00Z", status: `${status}`, message, data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("backend proxy isolation, cookie transport and failures", { concurrency: false }, () => {
  beforeEach(() => {
    process.env.WMS_API_BASE_URL = "http://private-api.internal:8080";
    process.env.WEB_ORIGIN = appOrigin;
    globalThis.fetch = async () => { throw new Error("Unexpected upstream request in proxy test"); };
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalBaseUrl === undefined) delete process.env.WMS_API_BASE_URL;
    else process.env.WMS_API_BASE_URL = originalBaseUrl;
    if (originalWebOrigin === undefined) delete process.env.WEB_ORIGIN;
    else process.env.WEB_ORIGIN = originalWebOrigin;
  });

  test("GET uses the configured backend with literal pagination and forces the WEB token transport", async () => {
    const calls = stubFetch(() => envelope(200, { content: [], page: 2, size: 20 }));
    const response = await GET(request("GET", "/stock?page=2&size=20&q=SKU%2B1%20%26%25", {
      "X-Client-Type": "MOBILE",
      Authorization: "Bearer access-token",
      "Idempotency-Key": "operation-key",
      "X-Untrusted-Header": "ignore-me",
    }), context(["stock"]));

    assert.equal(response.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].target.origin, "http://private-api.internal:8080");
    assert.equal(calls[0].target.pathname, "/api/stock");
    assert.deepEqual(Object.fromEntries(calls[0].target.searchParams), { page: "2", size: "20", q: "SKU+1 &%" });
    assert.equal(calls[0].headers.get("X-Client-Type"), "WEB");
    assert.equal(calls[0].headers.get("Authorization"), "Bearer access-token");
    assert.equal(calls[0].headers.get("Idempotency-Key"), "operation-key");
    assert.equal(calls[0].headers.get("Accept"), "application/json");
    assert.equal(calls[0].headers.has("X-Untrusted-Header"), false);
    assert.equal(calls[0].options.cache, "no-store");
    assert.equal(calls[0].options.redirect, "manual");
    assert.equal(calls[0].options.body, undefined);
    assert.ok(calls[0].options.signal instanceof AbortSignal);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  });

  test("POST and PUT preserve JSON text and idempotency headers without rounding quantities", async () => {
    const calls = stubFetch(() => envelope(200, { id: "PRODUCT" }));
    const body = '{"quantity":999999999999.999999,"description":"A+B & SKU"}';
    for (const method of ["POST", "PUT"] as const) {
      const handle = method === "POST" ? POST : PUT;
      const response = await handle(request(method, "/products/PRODUCT", {
        "Content-Type": "application/json", "Idempotency-Key": `key-${method}`,
      }, body), context(["products", "PRODUCT"]));
      assert.equal(response.status, 200);
    }
    assert.deepEqual(calls.map((call) => call.options.method), ["POST", "PUT"]);
    for (const call of calls) {
      assert.equal(call.options.body, body);
      assert.equal(call.headers.get("Content-Type"), "application/json");
      assert.equal(call.headers.get("Idempotency-Key"), `key-${call.options.method}`);
    }
  });

  test("public HTTPS mutations reach the Docker backend despite internal request URLs", async () => {
    process.env.WMS_API_BASE_URL = "http://backend:8181";
    const calls = stubFetch(() => envelope());
    for (const internalOrigin of ["http://0.0.0.0:3000", "https://0.0.0.0:3000"]) {
      for (const method of ["POST", "PUT"] as const) {
        const incoming = new NextRequest(`${internalOrigin}/api/backend/products`, {
          method,
          headers: { Origin: appOrigin, Host: "wms.example.com", "X-Forwarded-Proto": "https" },
          body: "{}",
        });
        const handle = method === "POST" ? POST : PUT;
        assert.equal((await handle(incoming, context(["products"]))).status, 200);
      }
    }
    assert.equal(calls.length, 4);
    for (const call of calls) assert.equal(call.target.href, "http://backend:8181/api/products");
  });

  test("configured public origins support explicit ports and local development", async () => {
    const calls = stubFetch(() => envelope());
    for (const configured of ["https://wms.example.com:443/", "https://wms.example.com:8443", "http://localhost:13000"]) {
      process.env.WEB_ORIGIN = configured;
      const incoming = new NextRequest("http://web:3000/api/backend/auth/refresh", {
        method: "POST", headers: { Origin: new URL(configured).origin, Host: "web:3000" },
      });
      assert.equal((await POST(incoming, context(["auth", "refresh"]))).status, 200);
    }
    assert.equal(calls.length, 3);
  });

  test("request and forwarded hosts cannot authorize a foreign origin", async () => {
    const calls = stubFetch(() => envelope());
    const incoming = new NextRequest("https://attacker.example/api/backend/auth/refresh", {
      method: "POST",
      headers: {
        Origin: "https://attacker.example", Host: "attacker.example",
        "X-Forwarded-Host": "attacker.example", "X-Forwarded-Proto": "https",
      },
    });
    assert.equal((await POST(incoming, context(["auth", "refresh"]))).status, 403);
    assert.equal(calls.length, 0);
  });

  test("missing or invalid public origin configuration blocks mutations before contacting the API", async () => {
    const calls = stubFetch(() => envelope());
    for (const configured of [undefined, "", "not-a-url", "null", "file:///etc/passwd", "ftp://wms.example.com",
      "https://user:password@wms.example.com", `${appOrigin}/path`, `${appOrigin}?query=1`, `${appOrigin}#fragment`]) {
      if (configured === undefined) delete process.env.WEB_ORIGIN;
      else process.env.WEB_ORIGIN = configured;
      const response = await POST(request("POST", "/auth/refresh"), context(["auth", "refresh"]));
      assert.equal(response.status, 503, `WEB_ORIGIN=${configured}`);
      assert.equal((await response.json()).message, "A origem pública do painel não está configurada corretamente.");
    }
    assert.equal(calls.length, 0);
  });

  test("authentication forwards only the refresh cookie and ignores unrelated browser cookies", async () => {
    const calls = stubFetch(() => envelope());
    await POST(request("POST", "/auth/refresh", {
      Cookie: "analytics=private-data; refresh_token=refresh-secret; unrelated=session-secret",
    }), context(["auth", "refresh"]));
    assert.equal(calls[0].headers.get("Cookie"), "refresh_token=refresh-secret");
  });

  test("operational resources never receive browser cookies", async () => {
    const calls = stubFetch(() => envelope());
    await GET(request("GET", "/stock", { Cookie: "refresh_token=refresh-secret; session=browser-only" }), context(["stock"]));
    assert.equal(calls[0].headers.has("Cookie"), false);
  });

  test("refresh cookies keep their protections and use the browser-facing authentication path", async () => {
    const headers = new Headers({ "Content-Type": "application/json" });
    headers.append("Set-Cookie", "refresh_token=rotated; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000");
    headers.append("Set-Cookie", "refresh_token=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0");
    stubFetch(() => new Response('{"data":null}', { status: 200, headers }));
    const response = await POST(request("POST", "/auth/refresh"), context(["auth", "refresh"]));
    assert.deepEqual(response.headers.getSetCookie(), [
      "refresh_token=rotated; Path=/api/backend/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000",
      "refresh_token=; Path=/api/backend/auth; HttpOnly; SameSite=Lax; Max-Age=0",
    ]);
  });

  test("mutations from a forged, missing or malformed origin are rejected before contacting the API", async () => {
    const calls = stubFetch(() => envelope());
    for (const origin of ["https://attacker.example", "https://wms.example.com.attacker.example", "http://wms.example.com", "https://wms.example.com:444", "not-a-url", "null", ""]) {
      const response = await POST(request("POST", "/auth/refresh", { Origin: origin }), context(["auth", "refresh"]));
      assert.equal(response.status, 403);
    }
    const withoutOrigin = new NextRequest(`${appOrigin}/api/backend/products`, { method: "PUT", body: "{}" });
    assert.equal((await PUT(withoutOrigin, context(["products"]))).status, 403);
    assert.equal(calls.length, 0);
  });

  test("unknown resources and traversal segments are rejected before contacting the API", async () => {
    const calls = stubFetch(() => envelope());
    for (const path of [[], ["actuator"], ["stock", ".."], ["stock", "."], ["stock", "other/resource"], ["stock", "other\\resource"]]) {
      const response = await GET(request(), context(path));
      assert.equal(response.status, 404, path.join("/"));
    }
    assert.equal(calls.length, 0);
  });

  test("invalid backend configuration and unsupported protocols never reach fetch", async () => {
    const calls = stubFetch(() => envelope());
    for (const value of ["not-a-url", "file:///etc/passwd", "ftp://private-api.internal", "javascript:alert(1)"]) {
      process.env.WMS_API_BASE_URL = value;
      const response = await GET(request(), context(["stock"]));
      assert.equal(response.status, 503);
      assert.equal((await response.json()).message, "A conexão com a API não está configurada corretamente.");
    }
    assert.equal(calls.length, 0);
  });

  test("upstream success, validation, permission, conflict and outage envelopes retain their HTTP status and data", async () => {
    for (const status of [200, 201, 202, 400, 401, 403, 404, 409, 422, 503]) {
      const payload = { timestamp: "2026-10-17T12:00:00Z", status: `${status}`, message: "Resposta do backend", data: { field: "value", fieldErrors: [{ field: "sku", message: "Inválido" }] } };
      stubFetch(() => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } }));
      const response = await GET(request(), context(["stock"]));
      assert.equal(response.status, status);
      assert.deepEqual(await response.json(), payload);
      assert.equal(response.headers.get("Content-Type"), "application/json");
    }
  });

  test("network failures return a useful 503 without exposing the internal address or exception", async () => {
    const calls = stubFetch(() => { throw new Error("private-api.internal:8080 database-password=secret"); });
    const response = await GET(request(), context(["stock"]));
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.match(body, /A API está indisponível/);
    assert.doesNotMatch(body, /private-api|password|secret/);
    assert.equal(calls.length, 1);
  });

  test("upstream redirects are rejected without following or exposing their location", async () => {
    const calls = stubFetch(() => new Response(null, { status: 302, headers: { Location: "https://attacker.example/steal" } }));
    const response = await GET(request(), context(["stock"]));
    assert.equal(response.status, 502);
    assert.equal(response.headers.has("Location"), false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.redirect, "manual");
  });
});
