import { normalizeSearch } from './documentation-model';

export type ModelField = { name: string; type: string; nullable: boolean; pk: boolean; unique: boolean; ref: string | null; refField: string | null; note: string };
export type ModelTable = { name: string; title: string; purpose: string; group: string; fields: ModelField[]; summary: string[]; constraints: string[]; rules: string };
export type ModelGroup = { id: string; name: string; label: string; color: string; tip: string; tables: string[] };
export type Relationship = { child: string; parent: string; field: string; parentField: string; optional: boolean; unique: boolean; essential: boolean };
export type RelationalModel = { groups: ModelGroup[]; tables: Record<string, ModelTable>; relationships: Relationship[]; source: { version: string; reviewedAt: string } };

export function matchesTable(table: ModelTable, query: string): boolean {
  const haystack = normalizeSearch([table.name, table.title, table.purpose, ...table.fields.map(field => field.name)].join(' '));
  return normalizeSearch(query).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}
export function tableRelationships(model: RelationalModel, name: string): Relationship[] {
  return model.relationships.filter(relation => relation.child === name || relation.parent === name);
}
export function relatedTables(model: RelationalModel, name: string): Set<string> {
  return new Set(tableRelationships(model, name).flatMap(relation => [relation.child, relation.parent]));
}
export function tableFromHash(model: RelationalModel, hash: string): string | null {
  const name = hash.replace(/^#tabela-/, '');
  return hash.startsWith('#tabela-') && Object.hasOwn(model.tables, name) ? name : null;
}
export function clampZoom(value: number): number { return Math.max(50, Math.min(300, Math.round(value))); }
