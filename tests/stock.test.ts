import assert from "node:assert/strict";
import { test } from "node:test";
import { ledgerDateRange, loadLpnQuantity, lotBlockPayload, reasonPayload, sumLpnQuantities, transferPayload } from "@/features/stock/stock-model";
import { stringifyJson } from "@/lib/api/decimal";
import type { Entity, Page } from "@/lib/api/types";

function page(content: Entity[], number: number, totalElements: number, totalPages: number): Page<Entity> {
  return { content, page: number, size: 2, totalElements, totalPages, first: number === 0, last: number + 1 >= totalPages };
}

test("a stock transfer sends exactly one origin and preserves the full decimal quantity", () => {
  const payload = transferPayload("stock", { stockId: "STOCK", lpnId: "IGNORED", destinationPositionId: "DEST", destinationLpnCode: " NEW-LPN ", quantity: "999999999999,999999", status: "CONCLUIDA", scannedLpnCode: "FORBIDDEN" });
  assert.equal(stringifyJson(payload), '{"stockId":"STOCK","destinationPositionId":"DEST","destinationLpnCode":"NEW-LPN","quantity":999999999999.999999}');
  assert.equal("lpnId" in payload, false);
  assert.equal("status" in payload, false);
  assert.equal("scannedLpnCode" in payload, false);
});

test("whole-LPN planning never sends a source stock or physical confirmation fields", () => {
  const payload = transferPayload("lpn", { lpnId: "LPN", stockId: "IGNORED", destinationPositionId: "DEST", destinationLpnCode: "IGNORED", quantity: "12.500001" });
  assert.equal(stringifyJson(payload), '{"lpnId":"LPN","destinationPositionId":"DEST","quantity":12.500001}');
});

test("planning rejects missing source, destination, split LPN and invalid quantities", () => {
  const input = { stockId: "STOCK", lpnId: "LPN", destinationPositionId: "DEST", destinationLpnCode: "SPLIT", quantity: "1" };
  assert.throws(() => transferPayload("lpn", { ...input, lpnId: " " }), /LPN de origem/);
  assert.throws(() => transferPayload("stock", { ...input, stockId: "" }), /saldo de origem/);
  assert.throws(() => transferPayload("stock", { ...input, destinationPositionId: "" }), /posição de destino/);
  assert.throws(() => transferPayload("stock", { ...input, destinationLpnCode: "" }), /LPN de destino/);
  for (const quantity of ["0", "-1", "1.0000001", "1000000000000", "1e3", "1.000,50"]) {
    assert.throws(() => transferPayload("lpn", { ...input, quantity }));
  }
});

test("mixed-product LPN totals use integer arithmetic rather than rounding binary decimals", () => {
  assert.equal(sumLpnQuantities([{ quantity: "0.1" }, { quantity: "0.2" }, { quantity: "0.000001" }, { quantity: "0" }]).value, "0.300001");
  assert.equal(sumLpnQuantities([{ quantity: "999999999999.999998" }, { quantity: "0.000001" }]).value, "999999999999.999999");
  assert.throws(() => sumLpnQuantities([]), /maior que zero/);
  assert.throws(() => sumLpnQuantities([{ quantity: "999999999999" }, { quantity: "1" }]), /12 dígitos/);
});

test("LPN total loads every page and all product/lot layers", async () => {
  const calls: number[] = [];
  const total = await loadLpnQuantity("LPN", async (number) => {
    calls.push(number);
    return number === 0
      ? page([{ id: "A", lpnId: "LPN", productId: "PRODUCT-A", quantity: "10.1" }, { id: "B", lpnId: "LPN", productId: "PRODUCT-B", quantity: "0.2" }], 0, 3, 2)
      : page([{ id: "C", lpnId: "LPN", productId: "PRODUCT-A", lot: "OTHER", quantity: "0.000001" }], 1, 3, 2);
  });
  assert.deepEqual(calls, [0, 1]);
  assert.equal(total.value, "10.300001");
});

test("LPN total refuses inconsistent totals, duplicate layers, foreign rows and skipped pages", async () => {
  await assert.rejects(loadLpnQuantity("LPN", async (number) => number === 0 ? page([{ id: "A", lpnId: "LPN", quantity: "1" }], 0, 2, 2) : page([{ id: "B", lpnId: "LPN", quantity: "1" }], 1, 3, 2)), /mudou/);
  await assert.rejects(loadLpnQuantity("LPN", async () => page([{ id: "A", lpnId: "OTHER", quantity: "1" }], 0, 1, 1)), /não corresponde/);
  await assert.rejects(loadLpnQuantity("LPN", async () => page([{ id: "A", lpnId: "LPN", quantity: "1" }, { id: "A", lpnId: "LPN", quantity: "1" }], 0, 2, 1)), /não corresponde/);
  await assert.rejects(loadLpnQuantity("LPN", async () => page([{ id: "A", lpnId: "LPN", quantity: "1" }], 1, 1, 2)), /mudou/);
  await assert.rejects(loadLpnQuantity("LPN", async () => page([], 0, 1, 2)), /não pôde ser concluída/);
  await assert.rejects(loadLpnQuantity("LPN", async () => page([{ id: "A", lpnId: "LPN", quantity: "1" }], 0, 2, 1)), /mudou/);
});

test("blocking is scoped to warehouse/product/lot with an explicit bounded reason", () => {
  assert.deepEqual(lotBlockPayload({ warehouseId: " W ", productId: " P ", lot: " LOT ", reason: "  Avaria detectada  ", quantity: 99 }), { warehouseId: "W", productId: "P", lot: "LOT", reason: "Avaria detectada" });
  assert.deepEqual(reasonPayload({ reason: " Liberação revisada ", active: false }), { reason: "Liberação revisada" });
  assert.throws(() => reasonPayload({ reason: " " }), /motivo/);
  assert.throws(() => reasonPayload({ reason: "x".repeat(256) }), /255/);
  assert.throws(() => lotBlockPayload({ warehouseId: "W", productId: "P", lot: "x".repeat(101), reason: "Motivo" }), /100/);
  assert.throws(() => lotBlockPayload({ warehouseId: "W", lot: "LOT", reason: "Motivo" }), /produto/);
});

test("ledger dates include the entire local end day and reject invalid or reversed ranges", () => {
  const range = ledgerDateRange("2026-10-15", "2026-10-16");
  assert.equal(new Date(range.from!).getHours(), 0);
  assert.equal(new Date(range.from!).getMinutes(), 0);
  assert.equal(new Date(range.to!).getHours(), 23);
  assert.equal(new Date(range.to!).getMinutes(), 59);
  assert.equal(new Date(range.to!).getSeconds(), 59);
  assert.equal(new Date(range.to!).getMilliseconds(), 999);
  assert.deepEqual(ledgerDateRange("", ""), {});
  assert.throws(() => ledgerDateRange("2026-10-17", "2026-10-16"), /anterior ou igual/);
  assert.throws(() => ledgerDateRange("2026-02-30", ""), /válidas/);
  assert.throws(() => ledgerDateRange("", "invalid"), /válidas/);
});
