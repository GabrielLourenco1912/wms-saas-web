import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDocumentRequest, buildWaveRequest, expectedInstant, localDateTime, positiveQuantity, requiredReason, type DocumentDraft } from "@/features/planning/contracts";
import { PlanningGateway } from "@/features/planning/gateway";
import { stringifyJson } from "@/lib/api/decimal";

const warehouse = { id: "WAREHOUSE", label: "Centro de distribuição" };
const partner = { id: "PARTNER", label: "Parceiro" };
function draft(): DocumentDraft {
  return { warehouse, partner, documentNumber: " NF-123 ", expectedAt: "", items: [{ key: "line", product: { id: "PRODUCT", label: "SKU · Produto" }, quantity: "24,500001" }] };
}

test("planning preserves exact base quantities and sends only the document write contract", () => {
  const input = draft();
  input.items[0].quantity = "999999999999,999999";
  const payload = buildDocumentRequest(input, true);
  assert.equal(payload.documentNumber, "NF-123");
  assert.equal(payload.expectedAt, null);
  assert.equal(stringifyJson(payload), '{"warehouseId":"WAREHOUSE","partnerId":"PARTNER","documentNumber":"NF-123","expectedAt":null,"items":[{"productId":"PRODUCT","quantity":999999999999.999999}]}');
  assert.equal("id" in payload.items[0], false);
  assert.equal("fulfilledQuantity" in payload.items[0], false);
  assert.equal("reservedQuantity" in payload.items[0], false);
});

test("receipt requires a document number while an outbound order accepts an omitted number", () => {
  const input = draft();
  input.documentNumber = " ";
  assert.throws(() => buildDocumentRequest(input, true), /documento de entrada/);
  assert.equal(buildDocumentRequest(input, false).documentNumber, null);
  input.documentNumber = "X".repeat(51);
  assert.throws(() => buildDocumentRequest(input, false), /50 caracteres/);
});

test("planning rejects duplicate or missing products and empty documents before submitting", () => {
  const input = draft();
  input.items.push({ ...input.items[0], key: "duplicate" });
  assert.throws(() => buildDocumentRequest(input, true), /somente uma vez/);
  input.items = [{ key: "empty", product: null, quantity: "1" }];
  assert.throws(() => buildDocumentRequest(input, true), /todos os itens/);
  input.items = [];
  assert.throws(() => buildDocumentRequest(input, true), /entre 1 e 500/);
  input.warehouse = null;
  assert.throws(() => buildDocumentRequest(input, true), /armazém e o parceiro/);
});

test("planned quantities reject zero, negatives, excess precision, exponents and grouping", () => {
  for (const value of ["0", "0,000000", "-1", "1000000000000", "1,0000001", "1e3", "1.000,50", "NaN", ""]) {
    assert.throws(() => positiveQuantity(value), /quantidade maior que zero/);
  }
  assert.equal(stringifyJson(positiveQuantity("0,000001")), "0.000001");
  assert.equal(stringifyJson(positiveQuantity("24,50")), "24.5");
});

test("a document can hold the backend limit of 500 unique products but never 501", () => {
  const input = draft();
  input.items = Array.from({ length: 500 }, (_, index) => ({ key: String(index), product: { id: `PRODUCT-${index}`, label: `Produto ${index}` }, quantity: "1" }));
  assert.equal(buildDocumentRequest(input, true).items.length, 500);
  input.items.push({ key: "501", product: { id: "PRODUCT-501", label: "Produto 501" }, quantity: "1" });
  assert.throws(() => buildDocumentRequest(input, true), /entre 1 e 500/);
});

test("wave selection has distinct orders, a bounded integer priority and the chosen warehouse", () => {
  const order = { id: "ORDER", label: "Pedido 1" };
  assert.deepEqual(buildWaveRequest(warehouse, " ONDA-1 ", [order], "1000"), { warehouseId: warehouse.id, code: "ONDA-1", orderIds: [order.id], priority: 1000 });
  assert.throws(() => buildWaveRequest(null, "ONDA", [order], "0"), /armazém/);
  assert.throws(() => buildWaveRequest(warehouse, "ONDA", [], "0"), /entre 1 e 200/);
  assert.throws(() => buildWaveRequest(warehouse, "ONDA", [order, order], "0"), /repetidos/);
  for (const value of ["-1", "1.5", "1001", ""]) assert.throws(() => buildWaveRequest(warehouse, "ONDA", [order], value), /inteiro entre 0 e 1000/);
});

test("reason is mandatory and bounded; expected time is optional or a valid instant", () => {
  assert.equal(requiredReason("  Autorização após conferência  "), "Autorização após conferência");
  assert.throws(() => requiredReason(" "), /motivo/);
  assert.throws(() => requiredReason("a".repeat(256)), /255/);
  assert.equal(expectedInstant(""), null);
  assert.equal(expectedInstant("2026-10-16T18:00:00Z"), "2026-10-16T18:00:00.000Z");
  assert.throws(() => expectedInstant("inválido"), /previsão válida/);
});

test("editing an expected instant preserves seconds and milliseconds in local time", () => {
  for (const instant of ["2026-10-16T18:00:57.123Z", "2026-01-01T00:00:00.001Z", "2028-02-29T23:59:59.999Z"]) {
    assert.equal(expectedInstant(localDateTime(instant)), instant);
  }
  assert.equal(localDateTime(null), "");
  assert.equal(localDateTime("invalid"), "");
});

test("a document edit preserves the original server instant until its expected time changes", () => {
  const input = draft();
  input.originalExpectedAt = "2026-10-16T18:00:57.123456Z";
  input.expectedAt = localDateTime(input.originalExpectedAt);
  assert.equal(buildDocumentRequest(input, true).expectedAt, input.originalExpectedAt);
  input.expectedAt = "";
  assert.equal(buildDocumentRequest(input, true).expectedAt, null);
  input.expectedAt = "2026-10-17T18:00:57.123Z";
  assert.equal(buildDocumentRequest(input, true).expectedAt, "2026-10-17T18:00:57.123Z");
});

test("invalid calendar dates and ambiguous date-only values never become shifted expectations", () => {
  for (const value of ["2026-02-29T10:00", "2026-02-30T10:00:00Z", "2026-04-31T10:00", "2026-01-01T24:00", "2026-10-16", "10/16/2026 10:00"]) {
    assert.throws(() => expectedInstant(value), /previsão válida/);
  }
  assert.equal(expectedInstant("2028-02-29T18:00:00-03:00"), "2028-02-29T21:00:00.000Z");
});

type Call = { kind: "request" | "command"; path: string; body?: unknown; options?: unknown };
function gateway() {
  const calls: Call[] = [];
  const transport = {
    request: async <T,>(path: string, options?: { method?: string; body?: unknown }) => { calls.push({ kind: "request", path, options, body: options?.body }); return null as T; },
    command: async <T,>(path: string, body?: unknown, options?: { method?: string; keyInBody?: boolean }) => { calls.push({ kind: "command", path, body, options }); return null as T; },
  };
  return { service: new PlanningGateway(transport), calls };
}

test("receipt creation and full edit use header idempotency with the correct HTTP method", async () => {
  const { service, calls } = gateway();
  await service.saveDocument(true, draft());
  await service.saveDocument(true, draft(), "RECEIPT");
  assert.equal(calls[0].kind, "command");
  assert.equal(calls[0].path, "/pre-receipts");
  assert.deepEqual(calls[0].options, { method: "POST" });
  assert.equal(calls[1].path, "/pre-receipts/RECEIPT");
  assert.deepEqual(calls[1].options, { method: "PUT" });
});

test("order creation and edit use the non-idempotent API and never attach a command key", async () => {
  const { service, calls } = gateway();
  await service.saveDocument(false, draft());
  await service.saveDocument(false, draft(), "ORDER");
  assert.deepEqual(calls.map(({ kind, path }) => ({ kind, path })), [{ kind: "request", path: "/orders" }, { kind: "request", path: "/orders/ORDER" }]);
  assert.equal((calls[0].options as { method: string }).method, "POST");
  assert.equal((calls[1].options as { method: string }).method, "PUT");
  assert.equal("idempotencyKey" in (calls[0].body as object), false);
});

test("XML invoice import sends the original XML inside JSON with header idempotency", async () => {
  const { service, calls } = gateway();
  const xml = '<NFe><infNFe><ide><nNF>123</nNF></ide></infNFe></NFe>';
  await service.importInvoice(warehouse, partner, xml, "");
  assert.equal(calls[0].path, "/pre-receipts/import");
  assert.deepEqual(calls[0].body, { warehouseId: warehouse.id, partnerId: partner.id, invoiceXml: xml, expectedAt: null });
  assert.equal(calls[0].options, undefined);
  assert.throws(() => service.importInvoice(warehouse, partner, " ", ""), /XML/);
  assert.throws(() => service.importInvoice(warehouse, partner, "x".repeat(1_000_001), ""), /1.000.000/);
});

test("wave creation, outbound cancellations and excess place idempotency in JSON; task cancel uses a header", async () => {
  const { service, calls } = gateway();
  await service.createWave(warehouse, "ONDA", [{ id: "ORDER", label: "Pedido" }], "0");
  await service.cancelDocument("orders", "ORDER", " Erro de planejamento ");
  await service.cancelDocument("waves", "WAVE", "Replanejamento");
  await service.authorizeExcess("TASK", "25,000001", "Excesso conferido");
  await service.cancelTask("TASK", "Replanejamento");
  assert.deepEqual(calls.map((call) => call.path), ["/waves", "/orders/ORDER/cancel", "/waves/WAVE/cancel", "/tasks/TASK/authorize-excess", "/tasks/TASK/cancel"]);
  for (const call of calls.slice(0, 4)) assert.deepEqual(call.options, { keyInBody: true });
  assert.equal(calls[4].options, undefined);
  assert.deepEqual(calls[1].body, { reason: "Erro de planejamento" });
  assert.equal(stringifyJson(calls[3].body), '{"newTargetQuantity":25.000001,"reason":"Excesso conferido"}');
});
