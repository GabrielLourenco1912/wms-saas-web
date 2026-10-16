import assert from "node:assert/strict";
import { test } from "node:test";
import * as model from "@/features/catalog/catalog-model";
import { stringifyJson } from "@/lib/api/decimal";
import { catalogFields, catalogInitialValues } from "@/features/catalog/catalog-fields";

test('full position update preserves physical limits and excludes operational status and identifiers', () => {
  const payload = model.catalogFormPayload('positions', {
    id: 'POSITION', zoneId: 'ZONE', code: 'A-01', type: 'PRATELEIRA', purpose: 'ARMAZENAGEM',
    weightCapacityKg: '999999999999,999999', volumeCapacityM3: null, active: false, status: 'BLOQUEADO', reservedQuantity: 70,
  });
  const json = stringifyJson(payload);
  assert.match(json, /"weightCapacityKg":999999999999\.999999/);
  assert.match(json, /"volumeCapacityM3":null/);
  assert.match(json, /"active":false/);
  assert.equal('status' in payload, false);
  assert.equal('reservedQuantity' in payload, false);
  assert.equal('id' in payload, false);
});

test('barcode packaging keeps nested product ownership for create and edit', () => {
  assert.equal(model.catalogPath('product-packages'), '/search/product-packages');
  assert.equal(model.catalogPath('product-packages', { productId: 'PRODUCT' }), '/products/PRODUCT/packages');
  assert.equal(model.catalogPath('product-packages', { productId: 'PRODUCT', id: 'PACKAGE' }), '/products/PRODUCT/packages/PACKAGE');
  const values = { type: 'CX', conversionFactor: '12.000001', barcode: '789012', weightKg: '0', volumeM3: '', active: true };
  const json = stringifyJson(model.catalogFormPayload('product-packages', values));
  assert.match(json, /"conversionFactor":12\.000001/);
  assert.match(json, /"weightKg":0/);
  assert.match(json, /"volumeM3":null/);
  assert.equal(catalogFields('product-packages', { editing: true }).find((field) => field.name === 'conversionFactor')?.disabled, true);
});

test('product dimension zero is accepted while capacity and conversion zero are rejected', () => {
  assert.deepEqual(model.validateCatalogValues('products', { categoryId: 'CATEGORY', sku: 'SKU', name: 'Produto', baseUnit: 'UN', unitWeightKg: '0', unitVolumeM3: '0' }), {});
  assert.ok(model.validateCatalogValues('positions', { zoneId: 'ZONE', code: 'A', type: 'DOCA', purpose: 'RECEBIMENTO', weightCapacityKg: '0' }).weightCapacityKg);
  assert.ok(model.validateCatalogValues('product-packages', { type: 'CX', conversionFactor: '0' }).conversionFactor);
  assert.ok(model.validateCatalogValues('product-packages', { type: 'CX', conversionFactor: '1.0000001' }).conversionFactor);
});

test('optional documents are normalized, checked for correct length, and left null when absent', () => {
  const warehouse = model.catalogFormPayload('warehouses', { name: 'CD', taxId: '12.345.678/0001-90', address: '', active: true });
  assert.equal(warehouse.taxId, '12345678000190');
  assert.equal(warehouse.address, null);
  assert.ok(model.validateCatalogValues('warehouses', { name: 'CD', taxId: '12345678901' }).taxId);
  assert.deepEqual(model.validateCatalogValues('partners', { legalName: 'Cliente', taxId: '123.456.789-01', type: 'CLIENTE' }), {});
  assert.ok(model.validateCatalogValues('partners', { legalName: 'Cliente', taxId: '12345', type: 'CLIENTE' }).taxId);
  assert.ok(model.validateCatalogValues('partners', { legalName: 'Cliente', taxId: 'CPF abc', type: 'CLIENTE' }).taxId);
});

test('editing inactive entities preserves false flags and optional fields rather than silently reactivating', () => {
  const values = catalogInitialValues('products', { active: false, lotControlled: false, expiryControlled: false, unitWeightKg: 0, unitVolumeM3: 0, shelfLifeDays: 0 });
  assert.equal(values.active, false);
  assert.equal(values.unitWeightKg, '0');
  assert.equal(values.shelfLifeDays, '0');
  assert.equal(values.lotControlled, false);
});
