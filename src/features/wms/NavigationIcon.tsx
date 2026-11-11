import type { SectionId } from './navigation';

const paths: Record<SectionId | 'menu' | 'close', string> = {
  dashboard: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  warehouse: 'm3 9 9-5 9 5v11H3Zm4 11v-7h10v7M7 9h10',
  products: 'm12 3 9 5-9 5-9-5Zm-9 5v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5',
  partners: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8m6 10v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  receipts: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  orders: 'M8 3H5v18h14V3h-3M9 2h6v4H9ZM8 11h8m-8 5h6',
  tasks: 'm3 6 2 2 4-4m3 2h9M3 13l2 2 4-4m3 2h9M3 20l2 2 4-4m3 2h9',
  monitoring: 'M3 3v18h18M7 14l4-4 4 3 6-7',
  stock: 'M3 3h18v18H3ZM3 9h18m-12 0v12M8 6h8m-3 7h4m-4 4h4',
  transfers: 'M3 7h17m-4-4 4 4-4 4M21 17H4m4-4-4 4 4 4',
  inventories: 'M8 3H5v18h14V3h-3M9 2h6v4H9Zm0 12 2 2 4-4',
  audit: 'M4 3h16v18H4ZM8 7h8m-8 5h8m-8 5h5',
  users: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  account: 'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M6 18 18 6',
};

export function NavigationIcon({ name }: { name: keyof typeof paths }) {
  return <svg className="navigation-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
