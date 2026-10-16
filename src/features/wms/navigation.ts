export const navigation = [
  {id:'dashboard',label:'Visão geral',hint:'Filas e pendências',permissions:[]},
  {id:'warehouse',label:'Armazéns',hint:'Estrutura, zonas e posições',permissions:['WAREHOUSE_VIEW']},
  {id:'products',label:'Produtos',hint:'Catálogo e embalagens',permissions:['PRODUCT_VIEW']},
  {id:'partners',label:'Parceiros',hint:'Clientes e fornecedores',permissions:['ORDER_VIEW']},
  {id:'receipts',label:'Pré-recebimentos',hint:'Expectativa de entrada',permissions:['PRE_RECEIPT_VIEW']},
  {id:'orders',label:'Pedidos e ondas',hint:'Planejamento de saída',permissions:['ORDER_VIEW','WAVE_VIEW']},
  {id:'tasks',label:'Tarefas',hint:'Histórico e tratamento',permissions:['TASK_VIEW']},
  {id:'monitoring',label:'Acompanhamento',hint:'Entrada, separação e expedição',permissions:['PUTAWAY_VIEW','PICKING_VIEW','SHIPMENT_VIEW']},
  {id:'stock',label:'Estoque',hint:'Saldos e bloqueios',permissions:['STOCK_VIEW']},
  {id:'transfers',label:'Transferências',hint:'Planejamento e consulta',permissions:['TRANSFER_VIEW']},
  {id:'inventories',label:'Inventários',hint:'Contagens e reconciliações',permissions:['INVENTORY_VIEW']},
  {id:'audit',label:'Livro razão',hint:'Movimentações imutáveis',permissions:['AUDIT_VIEW']},
  {id:'users',label:'Usuários',hint:'Contas e perfis de acesso',permissions:['USER_VIEW','PROFILE_VIEW']},
  {id:'account',label:'Minha conta',hint:'Identidade e permissões',permissions:[]},
] as const;
export type SectionId = typeof navigation[number]['id'];
export function sectionUrl(id:string) { return id === 'dashboard' ? '/' : `/gestao/${id}`; }
