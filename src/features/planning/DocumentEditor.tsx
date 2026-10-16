"use client";

import { useRef, useState } from "react";
import { ApiLookup } from "@/components/wms/ApiLookup";
import { Notice } from "@/components/wms/primitives";
import { ApiError } from "@/lib/api/client";
import { localDateTime, type DocumentDraft, type DocumentItem, type DocumentSummary } from "./contracts";
import { errorText } from "./components";
import { planningGateway } from "./gateway";

export function DocumentEditor({ receipt, existing, items = [], onSaved, onBusyChange }: {
  receipt: boolean;
  existing?: DocumentSummary;
  items?: DocumentItem[];
  onSaved: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [draft, setDraft] = useState<DocumentDraft>(() => ({
    warehouse: existing ? { id: existing.warehouseId, label: `Armazém atual · ${existing.warehouseId}` } : null,
    partner: existing ? { id: existing.partnerId, label: `Parceiro atual · ${existing.partnerId}` } : null,
    documentNumber: existing?.documentNumber ?? "",
    expectedAt: localDateTime(existing?.expectedAt ?? null),
    originalExpectedAt: existing?.expectedAt,
    items: items.length ? items.map((item) => ({ key: item.id, product: { id: item.productId, label: `${item.sku} · ${item.productName}` }, quantity: String(item.requestedQuantity) })) : [{ key: "new-1", product: null, quantity: "" }],
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const submitting = useRef(false);
  const counter = useRef(1);
  const updateItem = (key: string, update: Partial<DocumentDraft["items"][number]>) => setDraft((value) => ({ ...value, items: value.items.map((item) => item.key === key ? { ...item, ...update } : item) }));
  return <form onSubmit={async (event) => {
    event.preventDefault();
    if (submitting.current || uncertain) return;
    submitting.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      await planningGateway.saveDocument(receipt, draft, existing?.id);
      onSaved();
    } catch (caught) {
      setError(errorText(caught));
      if (!receipt && (!existing) && caught instanceof ApiError && (caught.status === 0 || caught.status >= 500)) setUncertain(true);
    } finally { submitting.current = false; setBusy(false); onBusyChange?.(false); }
  }}>
    <Notice>{receipt ? "O documento registra a expectativa de entrada. A conferência e a geração de saldo são realizadas no aplicativo mobile." : "As quantidades são expressas na unidade base. A reserva será feita na criação da onda; a quantidade atendida será atualizada no despacho."}</Notice>
    <fieldset disabled={busy || uncertain} className="form-fieldset">
      <div className="form-grid">
        <ApiLookup resource="warehouses" permission="WAREHOUSE_VIEW" label="Armazém" value={draft.warehouse} required disabled={Boolean(existing)} onChange={(warehouse) => setDraft((value) => ({ ...value, warehouse }))} />
        <ApiLookup resource="partners" permission="ORDER_VIEW" label={receipt ? "Fornecedor" : "Cliente"} helperText={receipt ? "Selecione um fornecedor ou parceiro do tipo Ambos." : "Selecione um cliente ou parceiro do tipo Ambos."} value={draft.partner} required onChange={(partner) => setDraft((value) => ({ ...value, partner }))} />
        <label className="field">Número do documento{!receipt && " (opcional)"}<input value={draft.documentNumber} maxLength={50} required={receipt} onChange={(event) => setDraft((value) => ({ ...value, documentNumber: event.target.value }))} /></label>
        <label className="field">Previsão (opcional)<input type="datetime-local" step="0.001" value={draft.expectedAt} onChange={(event) => setDraft((value) => ({ ...value, expectedAt: event.target.value }))} /><small>Horário local do dispositivo.</small></label>
      </div>
      <h3>Itens do documento</h3>
      <p>Informe a quantidade na unidade base. Cada produto deve aparecer uma única vez.</p>
      {draft.items.map((item, index) => <div className="form-grid planning-item" key={item.key}>
        <ApiLookup resource="products" permission="PRODUCT_VIEW" label={`Produto ${index + 1}`} value={item.product} required onChange={(product) => updateItem(item.key, { product })} />
        <label className="field">Quantidade do item {index + 1}<input type="text" inputMode="decimal" value={item.quantity} required maxLength={19} placeholder="Ex.: 24,5" onChange={(event) => updateItem(item.key, { quantity: event.target.value })} /></label>
        <div className="action-row"><button type="button" className="secondary-button" disabled={draft.items.length === 1} aria-label={`Remover item ${index + 1}`} onClick={() => setDraft((value) => ({ ...value, items: value.items.filter((line) => line.key !== item.key) }))}>Remover item</button></div>
      </div>)}
      <div className="action-row"><button type="button" className="secondary-button" disabled={draft.items.length >= 500} onClick={() => {
        const key = `new-${++counter.current}`;
        setDraft((value) => ({ ...value, items: [...value.items, { key, product: null, quantity: "" }] }));
      }}>Adicionar produto</button></div>
    </fieldset>
    {error && <Notice tone="error">{error}</Notice>}
    {uncertain && <Notice>A confirmação da criação não chegou. Feche este formulário e consulte a lista de pedidos antes de iniciar outra criação.</Notice>}
    <div className="action-row"><button type="submit" className="primary-button" disabled={busy || uncertain}>{busy ? "Salvando…" : existing ? "Salvar alterações" : receipt ? "Criar pré-recebimento" : "Criar pedido"}</button></div>
  </form>;
}
