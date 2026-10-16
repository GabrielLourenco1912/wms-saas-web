import { decimal } from "../../lib/api/decimal";

export interface DocumentSummary {
  id: string;
  warehouseId: string;
  partnerId: string;
  documentNumber: string | null;
  type: string;
  status: string;
  expectedAt: string | null;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  requestedQuantity: number | string;
  fulfilledQuantity: number | string;
  pickedQuantity?: number | string;
  reservedQuantity?: number | string;
  remainingQuantity?: number | string;
}

export interface ReceiptConfirmation {
  id: string;
  orderItemId: string;
  lpnCode: string;
  positionCode: string;
  informedQuantity: number | string;
  baseQuantity: number | string;
  lot: string | null;
  expiryDate: string | null;
  userId: string;
  confirmedAt: string;
}

export interface ReceiptDetail {
  receipt: DocumentSummary;
  items: DocumentItem[];
  confirmations: ReceiptConfirmation[];
}

export interface OrderDetail extends DocumentSummary {
  items: DocumentItem[];
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface WarehouseTask {
  id: string;
  type: string;
  status: string;
  priority: number;
  waveId: string | null;
  orderId: string | null;
  assignedUserId: string | null;
  originPositionId: string | null;
  destinationPositionId: string | null;
  lpnId: string | null;
  productId: string | null;
  targetQuantity: number | string;
  actualQuantity: number | string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancellationReason: string | null;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  previousStatus: string | null;
  newStatus: string;
  userId: string;
  operationId: string;
  reason: string | null;
  recordedAt: string;
}

export interface Wave {
  id: string;
  warehouseId: string;
  code: string;
  status: string;
  createdAt: string;
  cancelledAt: string | null;
  orderIds: string[];
  tasks: WarehouseTask[];
}

export interface SelectedEntity {
  id: string;
  label: string;
}

export interface DraftItem {
  key: string;
  product: SelectedEntity | null;
  quantity: string;
}

export interface DocumentDraft {
  warehouse: SelectedEntity | null;
  partner: SelectedEntity | null;
  documentNumber: string;
  expectedAt: string;
  originalExpectedAt?: string | null;
  items: DraftItem[];
}

export const receiptStatuses = ["PENDENTE", "EM_RECEBIMENTO", "ATENDIDO"];
export const orderStatuses = ["PENDENTE", "EM_EXECUCAO", "PARCIAL", "ATENDIDO", "CANCELADO"];
export const taskStatuses = ["PENDENTE", "EM_EXECUCAO", "CONCLUIDA", "DIVERGENTE", "CANCELADA"];
export const waveStatuses = ["PENDENTE", "EM_EXECUCAO", "CONCLUIDA", "CANCELADA"];

/** Preserve user-entered quantities through the API's exact decimal serializer. */
export function positiveQuantity(input: string) {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(normalized) || !/[1-9]/.test(normalized)) {
    throw new Error("Informe uma quantidade maior que zero, com até 12 dígitos inteiros e 6 casas decimais.");
  }
  return decimal(normalized);
}

export function expectedInstant(value: string): string | null {
  if (!value) return null;
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(?:Z|[+-]\d{2}:\d{2})?$/);
  if (!parts) throw new Error("Informe uma previsão válida.");
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0"] = parts;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (!daysInMonth || day < 1 || day > daysInMonth || Number(hourText) > 23 || Number(minuteText) > 59 || Number(secondText) > 59) {
    throw new Error("Informe uma previsão válida.");
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Informe uma previsão válida.");
  return parsed.toISOString();
}

export function localDateTime(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${String(parsed.getFullYear()).padStart(4, "0")}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}T${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}:${String(parsed.getSeconds()).padStart(2, "0")}.${String(parsed.getMilliseconds()).padStart(3, "0")}`;
}

export function buildDocumentRequest(draft: DocumentDraft, receipt: boolean) {
  if (!draft.warehouse || !draft.partner) throw new Error("Selecione o armazém e o parceiro.");
  const documentNumber = draft.documentNumber.trim();
  if (receipt && !documentNumber) throw new Error("Informe o número do documento de entrada.");
  if (documentNumber.length > 50) throw new Error("O documento deve ter até 50 caracteres.");
  if (!draft.items.length || draft.items.length > 500) throw new Error("O documento deve conter entre 1 e 500 produtos.");
  const seen = new Set<string>();
  const items = draft.items.map((item) => {
    if (!item.product) throw new Error("Selecione o produto em todos os itens.");
    if (seen.has(item.product.id)) throw new Error("Um produto deve aparecer somente uma vez. Some a quantidade no item existente.");
    seen.add(item.product.id);
    return { productId: item.product.id, quantity: positiveQuantity(item.quantity) };
  });
  return {
    warehouseId: draft.warehouse.id,
    partnerId: draft.partner.id,
    documentNumber: documentNumber || null,
    // Keep the server instant when its local form was not changed, including
    // sub-millisecond precision and the offset of repeated daylight-saving hours.
    expectedAt: draft.originalExpectedAt && draft.expectedAt && draft.expectedAt === localDateTime(draft.originalExpectedAt)
      ? draft.originalExpectedAt : expectedInstant(draft.expectedAt),
    items,
  };
}

export function buildWaveRequest(warehouse: SelectedEntity | null, code: string, orders: SelectedEntity[], priority: string) {
  if (!warehouse) throw new Error("Selecione o armazém.");
  const cleanCode = code.trim();
  if (!cleanCode || cleanCode.length > 50) throw new Error("Informe um código de onda com até 50 caracteres.");
  if (!orders.length || orders.length > 200) throw new Error("Selecione entre 1 e 200 pedidos do armazém.");
  if (new Set(orders.map((order) => order.id)).size !== orders.length) throw new Error("Há pedidos repetidos na seleção.");
  if (!/^\d+$/.test(priority.trim()) || Number(priority) > 1000) throw new Error("A prioridade deve ser um inteiro entre 0 e 1000.");
  return { warehouseId: warehouse.id, code: cleanCode, orderIds: orders.map((order) => order.id), priority: Number(priority) };
}

export function requiredReason(value: string): string {
  const reason = value.trim();
  if (!reason || reason.length > 255) throw new Error("Informe um motivo com até 255 caracteres.");
  return reason;
}
