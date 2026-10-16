export type Entity = Record<string, unknown>;
export type Query = Record<string, string | number | boolean | null | undefined>;
export type Page<T = Entity> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number; first: boolean; last: boolean };
export type ApiPage<T = Entity> = Page<T>;
export type LookupOption = { id: string; label: string };
export function text(row: object, key: string, fallback = '—'): string {
  const value = (row as Entity)[key];
  return value == null || value === '' ? fallback : String(value);
}
export function rows(value: unknown): Entity[] {
  return Array.isArray(value) ? value.filter((row): row is Entity => row !== null && typeof row === 'object' && !Array.isArray(row)) : [];
}
export function formatDecimal(value: unknown): string {
  if (value == null || value === '') return '—';
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!match) return String(value);
  return `${match[1]}${match[2].replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${match[3] ? ',' + match[3] : ''}`;
}
export function formatDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split('-').reverse().join('/');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', {dateStyle:'short', timeStyle:'short'}).format(date);
}
export function permissionFor(resource: string): string {
  const key = resource.split('/').filter(Boolean)[0];
  const map: Record<string,string> = {warehouses:'WAREHOUSE_VIEW',zones:'WAREHOUSE_VIEW',positions:'WAREHOUSE_VIEW',categories:'PRODUCT_VIEW',products:'PRODUCT_VIEW','product-packages':'PRODUCT_VIEW',partners:'ORDER_VIEW','pre-receipts':'PRE_RECEIPT_VIEW',receipts:'RECEIPT_VIEW','putaway-tasks':'PUTAWAY_VIEW',orders:'ORDER_VIEW',waves:'WAVE_VIEW','picking-tasks':'PICKING_VIEW',divergences:'PICKING_VIEW',shipments:'SHIPMENT_VIEW',stock:'STOCK_VIEW','stock-blocks':'STOCK_VIEW',lpns:'STOCK_VIEW',transfers:'TRANSFER_VIEW',tasks:'TASK_VIEW','stock-transactions':'AUDIT_VIEW',inventories:'INVENTORY_VIEW',users:'USER_VIEW',profiles:'PROFILE_VIEW',permissions:'PROFILE_VIEW'};
  return map[key] ?? '';
}
export function isPage<T>(value: unknown): value is Page<T> {
  if (value == null || typeof value !== 'object') return false;
  const page = value as Entity;
  return Array.isArray(page.content) && ['page','size','totalElements','totalPages'].every(key => Number.isSafeInteger(page[key])) && typeof page.first === 'boolean' && typeof page.last === 'boolean';
}
