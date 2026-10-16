import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import source from '@/features/documentation/content/api-documents.json';
import snapshot from '@/features/documentation/content/relational-model.json';
import { extractEndpoints, filterEndpoints, prepareDocument, publicDocumentationHref } from '@/features/documentation/documentation-model';
import { clampZoom, matchesTable, relatedTables, tableFromHash, type RelationalModel } from '@/features/documentation/relational-model';

const model: RelationalModel = snapshot;
const api = prepareDocument(source.documents[0].markdown);
const endpoints = extractEndpoints(api);

test('published API keeps every catalog endpoint and its contract columns', () => {
  const original = source.documents[0].markdown.split('## 12. Catálogo completo de endpoints')[1].split('## 13.')[0];
  const rows = original.match(/^\| `(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD) [^`]+` \|/gm) ?? [];
  assert.equal(endpoints.length, rows.length);
  assert(endpoints.length > 150);
  assert.equal(new Set(endpoints.map(endpoint => `${endpoint.method} ${endpoint.path}`)).size, endpoints.length);
  const inventory = endpoints.find(endpoint => endpoint.path === '/api/inventories/{id}/counts' && endpoint.method === 'POST')!;
  assert.equal(inventory.permission, 'INVENTORY_EXECUTE');
  assert.equal(inventory.idempotency, 'Header');
  assert.equal(inventory.request, 'InventoryCountsRequest');
});

test('every payload and response fragment remains a real published heading', () => {
  const ids = new Set(api.headings.map(heading => heading.id));
  assert.equal(ids.size, api.headings.length);
  const anchors = [...source.documents[0].markdown.matchAll(/\]\(#([^)]+)\)/g)].map(match => match[1]);
  for (const anchor of anchors) assert(ids.has(anchor), anchor);
  assert(api.markdown.includes('Padrão `GESTOR\\|OPERADOR`'));
});

test('heading preparation ignores examples and disambiguates names without losing explicit anchors', () => {
  const prepared = prepareDocument('# Page\n## Índice\n- [A](#a)\n<a id="a"></a>\n## Access\n```md\n## Not a heading\n```\n### Access\n### Access');
  assert.deepEqual(prepared.headings.map(heading => heading.id), ['a', 'access', 'access-2']);
  assert(prepared.markdown.includes('## Not a heading'));
  assert(!prepared.markdown.includes('[A](#a)'));
});

test('endpoint search combines resource, method, DTO and permission and handles empty results', () => {
  const results = filterEndpoints(endpoints, 'inventories INVENTORY_EXECUTE', 'POST');
  assert(results.length >= 3);
  assert(results.every(endpoint => endpoint.method === 'POST'));
  assert(filterEndpoints(endpoints, 'InventoryDetail').some(endpoint => endpoint.path === '/api/inventories/{id}'));
  assert.equal(filterEndpoints(endpoints, 'not-a-real-endpoint').length, 0);
});

test('public guide links avoid filesystem paths and unsafe schemes', () => {
  assert.equal(publicDocumentationHref('../../wms-saas-backend/docs/API_CLIENTS.md', 'web'), '/documentacao/api');
  assert.equal(publicDocumentationHref('INTEGRACAO_API.md', 'mobile'), '/documentacao/api?guia=mobile');
  assert.equal(publicDocumentationHref('../src/main/java/Dto.java', 'api'), null);
  assert.equal(publicDocumentationHref('javascript:alert(1)', 'api'), null);
  assert.equal(publicDocumentationHref('#modelo-loginrequest', 'api'), '#modelo-loginrequest');
});

test('published schema preserves all approved tables fields and valid FK destinations', () => {
  assert.equal(Object.keys(model.tables).length, 29);
  assert.equal(Object.values(model.tables).reduce((sum, table) => sum + table.fields.length, 0), 276);
  assert.equal(model.relationships.length, 91);
  const groups = model.groups.flatMap(group => group.tables);
  assert.equal(new Set(groups).size, 29);
  for (const relation of model.relationships) {
    const field = model.tables[relation.child].fields.find(field => field.name === relation.field)!;
    assert.equal(field.ref, relation.parent);
    assert(model.tables[relation.parent].fields.some(field => field.name === relation.parentField));
    assert.equal(relation.optional, field.nullable);
  }
  assert.equal(model.tables.estoque.fields.find(field => field.name === 'id')!.type, 'VARCHAR(26)');
});

test('schema search finds human labels and column names across accents and multiple words', () => {
  assert(matchesTable(model.tables.estoque, 'SÁLDOS'));
  assert(matchesTable(model.tables.estoque, 'data_entrada'));
  assert(matchesTable(model.tables.estoque, 'estoque lote'));
  assert(!matchesTable(model.tables.estoque, 'inventory does-not-exist'));
});

test('selection keeps links traversable and rejects unknown or inherited hash names', () => {
  assert.equal(tableFromHash(model, '#tabela-estoque'), 'estoque');
  assert.equal(tableFromHash(model, '#tabela-__proto__'), null);
  assert.equal(tableFromHash(model, '#estoque'), null);
  assert(relatedTables(model, 'estoque').has('lpns'));
  assert(relatedTables(model, 'estoque').has('transacoes_estoque'));
});

test('published diagram is byte identical to the approved source and zoom remains bounded', () => {
  assert.equal(createHash('sha256').update(readFileSync('public/documentacao/modelo-relacional-wms-v2.png')).digest('hex'), snapshot.source.pngSha256);
  assert.equal(clampZoom(-20), 50);
  assert.equal(clampZoom(9000), 300);
  assert.equal(clampZoom(125), 125);
});
