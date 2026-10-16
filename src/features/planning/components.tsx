"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "@/lib/api/client";
import { Notice } from "@/components/wms/primitives";
import type { DocumentItem } from "./contracts";

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir a solicitação.";
}

export function dateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

export function quantityLabel(value: number | string | null | undefined): string {
  if (value == null) return "—";
  const [integer, fraction] = String(value).split(".");
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}${fraction ? `,${fraction}` : ""}`;
}

export function LoadingDetail<T>({ endpoint, children, reloadKey = 0 }: {
  endpoint: string;
  reloadKey?: number;
  children: (data: T) => ReactNode;
}) {
  const [state, setState] = useState<{ endpoint: string; key: number; data?: T; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    let active = true;
    const request = ++sequence.current;
    void api.get<T>(endpoint).then((data) => {
      if (active && sequence.current === request) setState({ endpoint, key: reloadKey + retry, data });
    }).catch((error: unknown) => {
      if (active && sequence.current === request) setState({ endpoint, key: reloadKey + retry, error: errorText(error) });
    });
    return () => { active = false; };
  }, [endpoint, reloadKey, retry]);
  if (!state || state.endpoint !== endpoint || state.key !== reloadKey + retry) return <p role="status">Carregando detalhes…</p>;
  if (state.error) return <Notice tone="error">{state.error} <button type="button" className="secondary-button" onClick={() => setRetry((value) => value + 1)}>Tentar novamente</button></Notice>;
  return state.data === undefined ? null : children(state.data);
}

export function DocumentItems({ items, receipt = false }: { items: DocumentItem[]; receipt?: boolean }) {
  return <div className="table-wrap"><table>
    <caption>Quantidades na unidade base de cada produto</caption>
    <thead><tr><th scope="col">Produto</th><th scope="col">Solicitada</th>{!receipt && <><th scope="col">Reservada</th><th scope="col">Preparada</th></>}<th scope="col">{receipt ? "Recebida" : "Atendida"}</th>{receipt && <th scope="col">Restante</th>}</tr></thead>
    <tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.sku}</strong><br />{item.productName}</td><td>{quantityLabel(item.requestedQuantity)}</td>{!receipt && <><td>{quantityLabel(item.reservedQuantity)}</td><td>{quantityLabel(item.pickedQuantity)}</td></>}<td>{quantityLabel(item.fulfilledQuantity)}</td>{receipt && <td>{quantityLabel(item.remainingQuantity)}</td>}</tr>)}</tbody>
  </table></div>;
}

export function ReasonForm({ description, submitLabel, onSubmit, children, onBusyChange }: {
  description: string;
  submitLabel: string;
  onSubmit: (reason: string) => Promise<void>;
  children?: ReactNode;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  return <form onSubmit={async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try { await onSubmit(reason); } catch (caught) { setError(errorText(caught)); }
    finally { submitting.current = false; setBusy(false); onBusyChange?.(false); }
  }}>
    <p>{description}</p>
    <fieldset disabled={busy} className="form-fieldset">{children}
    <label className="field">Motivo<textarea value={reason} onChange={(event) => setReason(event.target.value)} required maxLength={255} rows={3} /></label></fieldset>
    {error && <Notice tone="error">{error}</Notice>}
    <div className="action-row"><button className="danger-button" type="submit" disabled={busy}>{busy ? "Enviando…" : submitLabel}</button></div>
  </form>;
}
