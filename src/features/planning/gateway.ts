import { api } from "../../lib/api/client";
import { buildDocumentRequest, buildWaveRequest, expectedInstant, positiveQuantity, requiredReason, type DocumentDraft, type SelectedEntity } from "./contracts";

type PlanningTransport = Pick<typeof api, "request" | "command">;

/** Each command preserves the backend's route, method and idempotency location. */
export class PlanningGateway {
  constructor(private readonly transport: PlanningTransport = api) {}

  saveDocument(receipt: boolean, draft: DocumentDraft, id?: string) {
    const path = `/${receipt ? "pre-receipts" : "orders"}${id ? `/${encodeURIComponent(id)}` : ""}`;
    const method = id ? "PUT" : "POST";
    const body = buildDocumentRequest(draft, receipt);
    return receipt ? this.transport.command(path, body, { method }) : this.transport.request(path, { method, body });
  }

  importInvoice(warehouse: SelectedEntity | null, partner: SelectedEntity | null, invoiceXml: string, expectedAt: string) {
    if (!warehouse || !partner) throw new Error("Selecione o armazém e o fornecedor.");
    if (!invoiceXml.trim() || invoiceXml.length > 1_000_000) throw new Error("Selecione ou cole um XML de NF-e com até 1.000.000 de caracteres.");
    return this.transport.command("/pre-receipts/import", { warehouseId: warehouse.id, partnerId: partner.id, invoiceXml, expectedAt: expectedInstant(expectedAt) });
  }

  createWave(warehouse: SelectedEntity | null, code: string, orders: SelectedEntity[], priority: string) {
    return this.transport.command("/waves", buildWaveRequest(warehouse, code, orders, priority), { keyInBody: true });
  }

  cancelDocument(resource: "orders" | "waves", id: string, reason: string) {
    return this.transport.command(`/${resource}/${encodeURIComponent(id)}/cancel`, { reason: requiredReason(reason) }, { keyInBody: true });
  }

  cancelTask(id: string, reason: string) {
    return this.transport.command(`/tasks/${encodeURIComponent(id)}/cancel`, { reason: requiredReason(reason) });
  }

  authorizeExcess(id: string, quantity: string, reason: string) {
    return this.transport.command(`/tasks/${encodeURIComponent(id)}/authorize-excess`, { newTargetQuantity: positiveQuantity(quantity), reason: requiredReason(reason) }, { keyInBody: true });
  }
}

export const planningGateway = new PlanningGateway();
