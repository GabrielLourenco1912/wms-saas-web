export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export type WarehousePosition = {
  id: string;
  zone: string;
  aisle: string;
  level: string;
  capacityKg: number;
  usedKg: number;
  capacityM3: number;
  usedM3: number;
  status: "Disponivel" | "Ocupada" | "Bloqueada" | "Reservada";
};

export type Product = {
  sku: string;
  name: string;
  category: string;
  requiresLot: boolean;
  requiresExpiration: boolean;
  unit: string;
  packageType: string;
  active: boolean;
};

export type StockItem = {
  id: string;
  sku: string;
  product: string;
  lpn: string;
  lot: string;
  expiration: string;
  position: string;
  quantity: number;
  reserved: number;
  status: "Disponivel" | "Reservado" | "Bloqueado" | "Qualidade";
};

export type PreReceipt = {
  id: string;
  supplier: string;
  document: string;
  expectedDate: string;
  items: number;
  volume: number;
  status: "Aguardando doca" | "Conferencia liberada" | "Conferido";
};

export type SalesOrder = {
  id: string;
  customer: string;
  priority: "Alta" | "Media" | "Baixa";
  promisedDate: string;
  items: number;
  status: "Pendente" | "Em onda" | "Separado" | "Cancelado";
  allocated: number;
};

export type PickingWave = {
  id: string;
  orders: number;
  tasks: number;
  route: string;
  strategy: "FEFO" | "FIFO";
  status: "Planejada" | "Liberada" | "Concluida";
};

export type OperationalTask = {
  id: string;
  type: "Putaway" | "Picking" | "Transferencia" | "Inventario";
  reference: string;
  operator: string;
  status: "Pendente" | "Em execucao" | "Divergente" | "Concluida" | "Cancelada";
  progress: number;
};

export type LedgerEntry = {
  id: string;
  date: string;
  event: string;
  sku: string;
  lpn: string;
  from: string;
  to: string;
  quantity: number;
  user: string;
};

export type UserProfile = {
  id: string;
  name: string;
  role: "Gestor" | "Supervisor" | "Auditor";
  email: string;
  status: "Ativo" | "Inativo";
  permissions: string[];
};
