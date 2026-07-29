import type {
  LedgerEntry,
  OperationalTask,
  PickingWave,
  PreReceipt,
  Product,
  SalesOrder,
  StockItem,
  UserProfile,
  WarehousePosition,
} from "./types";

export const positions: WarehousePosition[] = [
  { id: "A-01-01", zone: "Pulmao", aisle: "A", level: "01", capacityKg: 900, usedKg: 670, capacityM3: 18, usedM3: 12.8, status: "Ocupada" },
  { id: "A-01-02", zone: "Pulmao", aisle: "A", level: "02", capacityKg: 900, usedKg: 260, capacityM3: 18, usedM3: 4.4, status: "Disponivel" },
  { id: "A-02-01", zone: "Pulmao", aisle: "A", level: "01", capacityKg: 900, usedKg: 810, capacityM3: 18, usedM3: 16.1, status: "Reservada" },
  { id: "B-01-01", zone: "Picking", aisle: "B", level: "01", capacityKg: 420, usedKg: 310, capacityM3: 8, usedM3: 5.8, status: "Ocupada" },
  { id: "B-01-02", zone: "Picking", aisle: "B", level: "02", capacityKg: 420, usedKg: 95, capacityM3: 8, usedM3: 2.1, status: "Disponivel" },
  { id: "B-02-01", zone: "Picking", aisle: "B", level: "01", capacityKg: 420, usedKg: 0, capacityM3: 8, usedM3: 0, status: "Bloqueada" },
  { id: "C-01-01", zone: "Qualidade", aisle: "C", level: "01", capacityKg: 600, usedKg: 380, capacityM3: 11, usedM3: 6.2, status: "Bloqueada" },
  { id: "D-01-01", zone: "Doca", aisle: "D", level: "00", capacityKg: 1200, usedKg: 520, capacityM3: 26, usedM3: 13.5, status: "Reservada" },
];

export const products: Product[] = [
  { sku: "SKU-10045", name: "Cafe torrado premium 500g", category: "Alimentos", requiresLot: true, requiresExpiration: true, unit: "UN", packageType: "Caixa 24 un", active: true },
  { sku: "SKU-23810", name: "Shampoo neutro 300ml", category: "Higiene", requiresLot: true, requiresExpiration: true, unit: "UN", packageType: "Caixa 12 un", active: true },
  { sku: "SKU-77120", name: "Cabo USB-C reforcado", category: "Eletronicos", requiresLot: false, requiresExpiration: false, unit: "UN", packageType: "Master 80 un", active: true },
  { sku: "SKU-88102", name: "Filtro para purificador", category: "Casa", requiresLot: true, requiresExpiration: false, unit: "UN", packageType: "Caixa 10 un", active: true },
  { sku: "SKU-42990", name: "Suplemento vitaminico", category: "Saude", requiresLot: true, requiresExpiration: true, unit: "FR", packageType: "Caixa 30 fr", active: false },
];

export const stockItems: StockItem[] = [
  { id: "EST-001", sku: "SKU-10045", product: "Cafe torrado premium 500g", lpn: "LPN-883410", lot: "CAF2409", expiration: "2026-11-10", position: "B-01-01", quantity: 840, reserved: 180, status: "Reservado" },
  { id: "EST-002", sku: "SKU-23810", product: "Shampoo neutro 300ml", lpn: "LPN-883411", lot: "HIG2501", expiration: "2027-02-18", position: "A-01-01", quantity: 520, reserved: 0, status: "Disponivel" },
  { id: "EST-003", sku: "SKU-77120", product: "Cabo USB-C reforcado", lpn: "LPN-883412", lot: "-", expiration: "-", position: "A-02-01", quantity: 1120, reserved: 320, status: "Reservado" },
  { id: "EST-004", sku: "SKU-88102", product: "Filtro para purificador", lpn: "LPN-883413", lot: "FTR2510", expiration: "-", position: "C-01-01", quantity: 160, reserved: 0, status: "Qualidade" },
  { id: "EST-005", sku: "SKU-42990", product: "Suplemento vitaminico", lpn: "LPN-883414", lot: "SUP2406", expiration: "2026-08-03", position: "B-02-01", quantity: 90, reserved: 0, status: "Bloqueado" },
];

export const preReceipts: PreReceipt[] = [
  { id: "PR-2048", supplier: "Distribuidora Litoral", document: "NF 77812", expectedDate: "Hoje, 14:00", items: 18, volume: 86, status: "Aguardando doca" },
  { id: "PR-2049", supplier: "Norte Foods", document: "NF 77855", expectedDate: "Hoje, 16:30", items: 7, volume: 32, status: "Conferencia liberada" },
  { id: "PR-2050", supplier: "Tech Cable BR", document: "NF 77880", expectedDate: "Amanha, 08:00", items: 4, volume: 20, status: "Aguardando doca" },
];

export const salesOrders: SalesOrder[] = [
  { id: "PV-98120", customer: "Mercado Avenida", priority: "Alta", promisedDate: "Hoje", items: 14, status: "Pendente", allocated: 0 },
  { id: "PV-98121", customer: "Farmacia Central", priority: "Alta", promisedDate: "Hoje", items: 9, status: "Em onda", allocated: 100 },
  { id: "PV-98122", customer: "E-commerce Direct", priority: "Media", promisedDate: "Amanha", items: 26, status: "Pendente", allocated: 0 },
  { id: "PV-98123", customer: "Loja Costa Sul", priority: "Baixa", promisedDate: "21/06", items: 5, status: "Separado", allocated: 100 },
];

export const pickingWaves: PickingWave[] = [
  { id: "ONDA-310", orders: 8, tasks: 42, route: "B > A > Doca 03", strategy: "FEFO", status: "Liberada" },
  { id: "ONDA-311", orders: 5, tasks: 19, route: "A > B > Doca 01", strategy: "FIFO", status: "Planejada" },
  { id: "ONDA-309", orders: 11, tasks: 53, route: "B > C > Doca 02", strategy: "FEFO", status: "Concluida" },
];

export const operationalTasks: OperationalTask[] = [
  { id: "TAR-7001", type: "Putaway", reference: "PR-2049 / LPN-883520", operator: "Aguardando operador", status: "Pendente", progress: 0 },
  { id: "TAR-7002", type: "Picking", reference: "ONDA-310 / PV-98121", operator: "Marina Souza", status: "Em execucao", progress: 64 },
  { id: "TAR-7003", type: "Picking", reference: "ONDA-310 / PV-98124", operator: "Paulo Lima", status: "Divergente", progress: 48 },
  { id: "TAR-7004", type: "Transferencia", reference: "LPN-883413 / Qualidade", operator: "Aguardando operador", status: "Pendente", progress: 0 },
];

export const ledgerEntries: LedgerEntry[] = [
  { id: "TRX-9001", date: "19/06 09:14", event: "Reserva FEFO", sku: "SKU-10045", lpn: "LPN-883410", from: "B-01-01", to: "ONDA-310", quantity: -180, user: "Sistema" },
  { id: "TRX-9002", date: "19/06 09:22", event: "Bloqueio qualidade", sku: "SKU-88102", lpn: "LPN-883413", from: "C-01-01", to: "C-01-01", quantity: 0, user: "Camila Rocha" },
  { id: "TRX-9003", date: "19/06 10:03", event: "Pre-recebimento", sku: "SKU-23810", lpn: "-", from: "Fornecedor", to: "Doca 01", quantity: 520, user: "Rafael Alves" },
  { id: "TRX-9004", date: "19/06 11:18", event: "Ajuste inventario", sku: "SKU-77120", lpn: "LPN-883412", from: "A-02-01", to: "A-02-01", quantity: -8, user: "Sistema" },
];

export const users: UserProfile[] = [
  { id: "USR-001", name: "Rafael Alves", role: "Gestor", email: "rafael@wms.local", status: "Ativo", permissions: ["estrutura", "produtos", "ondas", "auditoria", "usuarios"] },
  { id: "USR-002", name: "Camila Rocha", role: "Supervisor", email: "camila@wms.local", status: "Ativo", permissions: ["estoque", "bloqueios", "pedidos"] },
  { id: "USR-003", name: "Diego Martins", role: "Auditor", email: "diego@wms.local", status: "Ativo", permissions: ["estoque", "auditoria"] },
  { id: "USR-004", name: "Ana Beatriz", role: "Supervisor", email: "ana@wms.local", status: "Inativo", permissions: ["recebimentos", "pedidos"] },
];
