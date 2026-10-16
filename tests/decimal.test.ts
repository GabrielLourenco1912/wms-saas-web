import assert from "node:assert/strict";
import { test } from "node:test";
import { decimal, ExactDecimal, optionalDecimal, parseJson, stringifyJson } from "@/lib/api/decimal";
import { formatDecimal } from "@/lib/api/types";

test("12 integer and 6 fractional digits are serialized as an exact JSON number", () => {
  const quantity = decimal("999999999999,999999");
  assert.ok(quantity instanceof ExactDecimal);
  assert.equal(stringifyJson({ quantity }), '{"quantity":999999999999.999999}');
  assert.equal(stringifyJson({ quantity: decimal("0,000001") }), '{"quantity":0.000001}');
  assert.equal(stringifyJson(decimal("000012,340000")), "12.34");
});

test("quantities enforce positivity, precision and input shape; zero is explicitly opt-in", () => {
  for (const invalid of ["0", "0,000000", "-1", "1e3", "1.000,50", "1000000000000", "1.0000001", "NaN", "Infinity", "", null, undefined]) {
    assert.throws(() => decimal(invalid));
  }
  assert.equal(stringifyJson(decimal("0,000000", { allowZero: true })), "0");
  assert.equal(optionalDecimal(""), null);
  assert.equal(optionalDecimal(null), null);
  assert.equal(optionalDecimal(undefined), null);
  assert.equal(stringifyJson(optionalDecimal("12,5")), "12.5");
  assert.equal(stringifyJson(optionalDecimal("0", { allowZero: true })), "0");
});

test("decimal value objects reject arbitrary JSON text and are immutable", () => {
  for (const invalid of ['1,"admin":true', "01", "+1", "1e3", "NaN", "1\n", "1.", ".1"]) {
    assert.throws(() => new ExactDecimal(invalid));
  }
  const value = new ExactDecimal("12.500000");
  assert.equal(Object.isFrozen(value), true);
  assert.equal(String(value), "12.500000");
  assert.equal(stringifyJson(value), "12.500000");
});

test("unsafe quantities and integers parse as text while safe metadata remains numeric", () => {
  const parsed = parseJson('{"quantity":999999999999.999999,"negative":-999999999999.999999,"sequence":9007199254740993,"page":0,"size":20,"factor":12.500000,"minimum":0.000001}') as Record<string, unknown>;
  assert.equal(parsed.quantity, "999999999999.999999");
  assert.equal(parsed.negative, "-999999999999.999999");
  assert.equal(parsed.sequence, "9007199254740993");
  assert.equal(parsed.page, 0);
  assert.equal(parsed.size, 20);
  assert.equal(parsed.factor, 12.5);
  assert.equal(parsed.minimum, 0.000001);
});

test("numeric IDs, barcodes and challenge codes stay strings with leading zeroes", () => {
  const value = { id: "00000000000000000000000001", barcode: "07891234567890", code: "012345", sku: "1e3" };
  assert.deepEqual(parseJson(stringifyJson(value)), value);
});

test("nested payloads preserve quoted text, backslashes and JSON-shaped strings without injection", () => {
  const text = 'LPN "012345" \\ posição\n{"quantity":999999999999.999999,"admin":true}';
  const value = { reason: text, nested: [{ barcode: "000123", quantity: decimal("999999999999,999999") }], ignored: undefined, empty: null, enabled: false, list: [undefined, "12"] };
  const serialized = stringifyJson(value);
  const parsed = parseJson(serialized) as { reason: string; nested: { barcode: string; quantity: string }[]; empty: null; enabled: boolean; list: unknown[] };
  assert.equal(parsed.reason, text);
  assert.deepEqual(parsed.nested, [{ barcode: "000123", quantity: "999999999999.999999" }]);
  assert.equal("admin" in parsed, false);
  assert.equal("ignored" in parsed, false);
  assert.equal(parsed.empty, null);
  assert.equal(parsed.enabled, false);
  assert.deepEqual(parsed.list, [null, "12"]);
});

test("the codec rejects non-finite values and malformed JSON instead of inventing a quantity", () => {
  for (const value of [NaN, Infinity, -Infinity]) assert.throws(() => stringifyJson({ quantity: value }), /Número inválido/);
  for (const source of ["undefined", "NaN", "{", '{"quantity":01}', '{"quantity":1,}', '{"text":"unterminated}']) assert.throws(() => parseJson(source));
});

test("decimal display preserves every exact digit and uses Brazilian separators", () => {
  assert.equal(formatDecimal("999999999999.999999"), "999.999.999.999,999999");
  assert.equal(formatDecimal("-12345.000001"), "-12.345,000001");
  assert.equal(formatDecimal("0.000001"), "0,000001");
  assert.equal(formatDecimal(0), "0");
  assert.equal(formatDecimal(null), "—");
  assert.equal(formatDecimal(undefined), "—");
  assert.equal(formatDecimal(""), "—");
});
