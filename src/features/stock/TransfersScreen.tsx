"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ApiLookup } from "@/components/wms/ApiLookup";
import { ResourceTable } from "@/components/wms/ResourceTable";
import { DetailGrid, Loading, Modal, Notice, Panel, StatusPill } from "@/components/wms/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/hooks";
import { formatDate, formatDecimal, text, type Entity, type LookupOption, type Page } from "@/lib/api/types";
import { errorMessage, Reference, StockDetailLoader } from "./components";
import { loadLpnQuantity, transferPayload } from "./stock-model";

function TransferForm({ onSaved, onCancel, onBusy }: { onSaved: () => void; onCancel: () => void; onBusy: (value: boolean) => void }) {
  const [mode, setMode] = useState<"lpn" | "stock">("lpn");
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [source, setSource] = useState<LookupOption | null>(null);
  const [destination, setDestination] = useState<LookupOption | null>(null);
  const [quantity, setQuantity] = useState("");
  const [destinationLpnCode, setDestinationLpnCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lpnQuantity, setLpnQuantity] = useState<{ id: string; quantity?: string; error?: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);
  const sourceResult = useApiQuery<Entity>(`/${mode === "lpn" ? "lpns" : "stock"}/${encodeURIComponent(source?.id ?? "")}`, {}, Boolean(source));
  useEffect(() => {
    if (mode !== "lpn" || !source) return;
    const controller = new AbortController();
    const selectedId = source.id;
    void loadLpnQuantity(selectedId, (page) => api.get<Page<Entity>>("/stock", { lpnId: selectedId, page, size: 100 }, controller.signal)).then((total) => {
      if (!controller.signal.aborted) setLpnQuantity({ id: selectedId, quantity: total.value });
    }).catch((caught: unknown) => {
      if (!controller.signal.aborted) setLpnQuantity({ id: selectedId, error: errorMessage(caught) });
    });
    return () => controller.abort();
  }, [mode, source, retry]);
  const total = lpnQuantity?.id === source?.id ? lpnQuantity : null;
  function clearSource() { setSource(null); setQuantity(""); setLpnQuantity(null); setError(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true; setBusy(true); onBusy(true); setError("");
    try {
      if (!warehouse || !source || !destination) throw new Error("Selecione o armazém, a origem e a posição de destino.");
      if (!sourceResult.data) throw new Error("Aguarde a consulta da origem antes de planejar.");
      if (sourceResult.data.positionId === destination.id) throw new Error("A posição de destino deve ser diferente da origem.");
      if (mode === "stock" && destinationLpnCode.trim() === sourceResult.data.lpnCode) throw new Error("Use um LPN de destino diferente do LPN de origem.");
      if (mode === "lpn" && !total?.quantity) throw new Error("Conclua a consulta de todas as camadas do LPN antes de planejar.");
      const payload = transferPayload(mode, { lpnId: mode === "lpn" ? source.id : undefined, stockId: mode === "stock" ? source.id : undefined, destinationPositionId: destination.id, destinationLpnCode, quantity: mode === "lpn" ? total?.quantity : quantity });
      await api.command("/transfers", payload);
      onSaved();
    } catch (caught) { setError(errorMessage(caught)); }
    finally { submitting.current = false; setBusy(false); onBusy(false); }
  }
  return <form onSubmit={submit} aria-label="Planejar transferência">
    <Notice>O planejamento cria uma tarefa. A movimentação e a leitura dos códigos físicos são concluídas pelo operador no mobile.</Notice>
    <fieldset className="form-fields" disabled={busy}><div className="form-grid">
      <label className="field"><span>Tipo de transferência</span><select value={mode} onChange={(event) => { setMode(event.target.value as "lpn" | "stock"); clearSource(); setDestinationLpnCode(""); }}><option value="lpn">LPN inteiro: todos os produtos e lotes</option><option value="stock">Por saldo: quantidade de um produto/lote</option></select></label>
      <ApiLookup resource="warehouses" label="Armazém de origem e destino" value={warehouse} required onChange={(option) => { setWarehouse(option); clearSource(); setDestination(null); }} disabled={busy} />
      <ApiLookup key={`${mode}-${warehouse?.id ?? ""}`} resource={mode === "lpn" ? "lpns" : "stock"} label={mode === "lpn" ? "LPN de origem" : "Saldo de origem"} value={source} onChange={(option) => { setSource(option); setLpnQuantity(null); setQuantity(""); setError(""); }} filters={{ warehouseId: warehouse?.id }} disabled={busy || !warehouse} required helperText="Selecione o armazém para consultar as origens disponíveis." />
      <ApiLookup resource="positions" label="Posição de destino" value={destination} onChange={setDestination} filters={{ warehouseId: warehouse?.id, purpose: "ARMAZENAGEM", active: true }} disabled={busy || !warehouse} required helperText="São exibidas posições de armazenagem do mesmo armazém." />
      {mode === "stock" ? <><label className="field"><span>Quantidade na unidade base *</span><input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} required maxLength={20} placeholder="Ex.: 12,500001" /></label><label className="field"><span>Código do LPN de destino *</span><input value={destinationLpnCode} onChange={(event) => setDestinationLpnCode(event.target.value)} required placeholder="LPN diferente da origem" /></label></> : <div className="field"><span>Quantidade integral calculada</span><strong>{total?.quantity ? formatDecimal(total.quantity) : "Aguardando seleção e consulta do LPN"}</strong><small>Inclui todas as páginas e camadas do LPN, em unidades base.</small></div>}
    </div></fieldset>
    {source && sourceResult.loading && <Loading message="Consultando a origem…" />}
    {sourceResult.error && <Notice tone="error">{sourceResult.error.message}<button type="button" className="text-button" onClick={sourceResult.reload}>Consultar origem novamente</button></Notice>}
    {sourceResult.data && <DetailGrid values={{ "Posição de origem": sourceResult.data.positionCode ?? sourceResult.data.positionId, "LPN de origem": sourceResult.data.lpnCode ?? sourceResult.data.trackingCode, ...(mode === "stock" ? { Produto: `${text(sourceResult.data, "sku")} · ${text(sourceResult.data, "productName")}`, "Saldo físico": formatDecimal(sourceResult.data.quantity), Disponível: formatDecimal(sourceResult.data.availableQuantity) } : { Situação: sourceResult.data.status }) }} />}
    {mode === "lpn" && source && !total && <Loading message="Somando todas as camadas do LPN…" />}
    {mode === "lpn" && total?.error && <Notice tone="error">{total.error}<button type="button" className="text-button" onClick={() => { setLpnQuantity(null); setRetry((value) => value + 1); }}>Atualizar quantidade integral</button></Notice>}
    {error && <Notice tone="error">{error}</Notice>}
    <p className="muted">O servidor valida disponibilidade, capacidade do destino e alterações concorrentes antes de aceitar o planejamento.</p>
    <div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>Cancelar</button><button type="submit" className="primary-button" disabled={busy || !source || !destination || !sourceResult.data || (mode === "lpn" && !total?.quantity)}>{busy ? "Planejando…" : "Criar tarefa de transferência"}</button></div>
  </form>;
}

function TransferDetail({ row }: { row: Entity }) {
  return <>
    <DetailGrid values={{ Tarefa: row.id, Situação: row.status, "Quantidade planejada": formatDecimal(row.targetQuantity), "Quantidade realizada": formatDecimal(row.actualQuantity), "Criada em": row.createdAt, "Iniciada em": row.startedAt, "Concluída em": row.completedAt, "Cancelada em": row.cancelledAt, "Motivo do cancelamento": row.cancellationReason }} />
    <dl className="detail-grid"><div><dt>LPN de origem</dt><dd><Reference resource="lpns" id={row.lpnId} permission="STOCK_VIEW" labelKey="trackingCode" /></dd></div><div><dt>Posição de origem</dt><dd><Reference resource="positions" id={row.originPositionId} permission="WAREHOUSE_VIEW" labelKey="code" /></dd></div><div><dt>Posição de destino</dt><dd><Reference resource="positions" id={row.destinationPositionId} permission="WAREHOUSE_VIEW" labelKey="code" /></dd></div><div><dt>Produto</dt><dd><Reference resource="products" id={row.productId} permission="PRODUCT_VIEW" labelKey="name" /></dd></div><div><dt>Responsável</dt><dd><Reference resource="users" id={row.assignedUserId} permission="USER_VIEW" labelKey="name" /></dd></div></dl>
    <Notice>A confirmação física da transferência é feita no mobile. As quantidades e a situação acima são retornadas pelo servidor.</Notice>
  </>;
}

export function TransfersScreen() {
  const { can } = useAuth();
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [create, setCreate] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const canPlan = can("TRANSFER_EXECUTE") && can("STOCK_VIEW") && can("WAREHOUSE_VIEW");
  if (!can("TRANSFER_VIEW")) return <Notice>Seu perfil não tem acesso às transferências.</Notice>;
  return <div className="screen-stack">
    <Panel title="Transferências internas" description="Planeje a movimentação de um LPN inteiro ou de uma camada de saldo dentro do mesmo armazém." actions={canPlan && <button className="primary-button" type="button" onClick={() => setCreate(true)}>Planejar transferência</button>}>
      <ApiLookup resource="warehouses" label="Filtrar por armazém" value={warehouse} onChange={setWarehouse} />
      <p className="muted">A execução com leitura física é realizada no mobile. O cancelamento de tarefas pendentes está disponível na gestão de tarefas.</p>
    </Panel>
    {success && <Notice tone="success">Tarefa de transferência criada. O operador pode realizar a movimentação no mobile.</Notice>}
    {can("TRANSFER_EXECUTE") && !canPlan && <Notice>Para planejar pela interface, seu perfil também precisa consultar armazéns e saldos de estoque.</Notice>}
    <ResourceTable title="Tarefas de transferência" endpoint="/transfers" permission="TRANSFER_VIEW" filters={{ warehouseId: warehouse?.id }} statuses={["PENDENTE", "EM_EXECUCAO", "CONCLUIDA", "DIVERGENTE", "CANCELADA"]} reloadKey={reloadKey} searchPlaceholder="Pesquisar tarefa de transferência ou situação" columns={[
      { key: "id", label: "Tarefa" }, { key: "status", label: "Situação", render: (row) => <StatusPill value={text(row, "status")} /> },
      { key: "targetQuantity", label: "Planejada", render: (row) => formatDecimal(row.targetQuantity) }, { key: "actualQuantity", label: "Realizada", render: (row) => formatDecimal(row.actualQuantity) },
      { key: "createdAt", label: "Criada em", render: (row) => formatDate(row.createdAt) }, { key: "completedAt", label: "Concluída em", render: (row) => formatDate(row.completedAt) },
    ]} onOpen={(row) => setDetailId(text(row, "id"))} rowActions={(row) => <button type="button" className="secondary-button" onClick={() => setDetailId(text(row, "id"))}>Detalhes e origem/destino</button>} />
    {create && <Modal title="Planejar transferência" busy={busy} onClose={() => { if (!busy) setCreate(false); }}><TransferForm onBusy={setBusy} onCancel={() => setCreate(false)} onSaved={() => { setCreate(false); setSuccess(true); setReloadKey((value) => value + 1); }} /></Modal>}
    {detailId && <Modal title="Detalhes da transferência" onClose={() => setDetailId(null)}><StockDetailLoader endpoint={`/transfers/${encodeURIComponent(detailId)}`} permission="TRANSFER_VIEW">{(row) => <TransferDetail row={row} />}</StockDetailLoader></Modal>}
  </div>;
}
