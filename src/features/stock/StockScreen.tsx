"use client";

import { useState } from "react";
import { ApiLookup } from "@/components/wms/ApiLookup";
import { EntityForm, type FieldSpec, type FormValues } from "@/components/wms/EntityForm";
import { ResourceTable } from "@/components/wms/ResourceTable";
import { FilterDisclosure } from "@/components/wms/FilterDisclosure";
import { DetailGrid, Modal, Notice, Panel, StatusPill } from "@/components/wms/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { api } from "@/lib/api/client";
import { formatDate, formatDecimal, text, type Entity, type LookupOption, type Query } from "@/lib/api/types";
import { StockDetailLoader } from "./components";
import { lotBlockPayload, reasonPayload } from "./stock-model";

type Action = { kind: "stock-block" | "stock-unblock"; row: Entity } | { kind: "lot" | "position-block" | "position-unblock" } | { kind: "release"; row: Entity };
const reasonField: FieldSpec = { name: "reason", label: "Motivo", type: "textarea", required: true, maxLength: 255 };

function actionLabel(action: Action): string {
  return ({ "stock-block": "Bloquear saldo", "stock-unblock": "Liberar bloqueio do saldo", lot: "Bloquear lote", "position-block": "Bloquear posição", "position-unblock": "Liberar bloqueio da posição", release: "Liberar bloqueio" })[action.kind];
}

export function StockScreen() {
  const { can } = useAuth();
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [product, setProduct] = useState<LookupOption | null>(null);
  const [position, setPosition] = useState<LookupOption | null>(null);
  const [lpn, setLpn] = useState<LookupOption | null>(null);
  const [lot, setLot] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(false);
  const [tab, setTab] = useState<"stock" | "blocks">("stock");
  const [active, setActive] = useState("true");
  const [reloadKey, setReloadKey] = useState(0);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [blockDetail, setBlockDetail] = useState<Entity | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const warehouseFilter = warehouse ? { warehouseId: warehouse.id } : {};
  const filters: Query = { ...warehouseFilter, productId: product?.id, positionId: position?.id, lpnId: lpn?.id, lot: lot.trim() || undefined, blockStatus: blockedOnly ? "BLOQUEADO" : undefined };
  const blockFilters: Query = { ...warehouseFilter, productId: product?.id, positionId: position?.id, lot: lot.trim() || undefined, active: active === "" ? undefined : active === "true" };
  const changeWarehouse = (value: LookupOption | null) => { setWarehouse(value); setPosition(null); setLpn(null); };

  async function submitAction(values: FormValues) {
    if (!action) return;
    setBusy(true);
    try {
      if (action.kind === "lot") await api.command("/stock-blocks/lots", lotBlockPayload(values));
      else if (action.kind === "position-block" || action.kind === "position-unblock") {
        const id = String(values.positionId ?? "");
        if (!id) throw new Error("Informe a posição.");
        await api.command(`/positions/${encodeURIComponent(id)}/${action.kind === "position-block" ? "block" : "unblock"}`, reasonPayload(values));
      } else if (action.kind === "release") await api.command(`/stock-blocks/${encodeURIComponent(text(action.row, "id"))}/release`, reasonPayload(values));
      else if ("row" in action) await api.command(`/stock/${encodeURIComponent(text(action.row, "id"))}/${action.kind === "stock-block" ? "block" : "unblock"}`, reasonPayload(values));
      setSuccess("Comando confirmado pelo servidor. Os saldos e bloqueios foram atualizados.");
      setReloadKey((value) => value + 1);
      setDetailId(null); setBlockDetail(null); setAction(null);
    } finally { setBusy(false); }
  }

  const actionFields: FieldSpec[] = action?.kind === "lot" ? [
    { name: "warehouseId", label: "Armazém do lote", type: "lookup", resource: "warehouses", required: true, initialLabel: warehouse?.label },
    { name: "productId", label: "Produto do lote", type: "lookup", resource: "products", required: true, initialLabel: product?.label },
    { name: "lot", label: "Lote", required: true, maxLength: 100 }, reasonField,
  ] : action?.kind === "position-block" || action?.kind === "position-unblock" ? [
    { name: "positionId", label: "Posição", type: "lookup", resource: "positions", required: true, filters: warehouseFilter, initialLabel: position?.label }, reasonField,
  ] : [reasonField];

  if (!can("STOCK_VIEW")) return <Notice>Seu perfil não tem acesso à consulta de estoque.</Notice>;
  return <div className="screen-stack">
    <Panel title="Estoque e rastreabilidade" description="Consulte o saldo físico, as reservas e a disponibilidade calculada pelo servidor.">
      <FilterDisclosure activeCount={Object.values(tab === "stock" ? filters : blockFilters).filter(value => value != null && value !== '').length}><div className="form-grid">
        <ApiLookup resource="warehouses" label="Armazém" value={warehouse} onChange={changeWarehouse} />
        <ApiLookup resource="products" label="Produto" value={product} onChange={setProduct} />
        <ApiLookup resource="positions" label="Posição" value={position} onChange={setPosition} filters={warehouseFilter} />
        {tab === "stock" && <ApiLookup resource="lpns" label="LPN" value={lpn} onChange={setLpn} filters={warehouseFilter} />}
        <label className="field"><span>Lote exato</span><input value={lot} onChange={(event) => setLot(event.target.value)} maxLength={100} placeholder="Filtrar pelo lote" /></label>
        {tab === "stock" ? <label className="checkbox-field"><input type="checkbox" checked={blockedOnly} onChange={(event) => setBlockedOnly(event.target.checked)} />Somente saldos bloqueados</label> : <label className="field"><span>Bloqueios</span><select value={active} onChange={(event) => setActive(event.target.value)}><option value="true">Ativos</option><option value="false">Liberados</option><option value="">Todos</option></select></label>}
      </div></FilterDisclosure>
      <div className="action-row">
        <button type="button" className={tab === "stock" ? "primary-button" : "secondary-button"} aria-pressed={tab === "stock"} onClick={() => setTab("stock")}>Saldos</button>
        <button type="button" className={tab === "blocks" ? "primary-button" : "secondary-button"} aria-pressed={tab === "blocks"} onClick={() => setTab("blocks")}>Bloqueios</button>
        {can("STOCK_BLOCK") && <><button type="button" className="secondary-button" onClick={() => setAction({ kind: "lot" })}>Bloquear lote</button><button type="button" className="secondary-button" onClick={() => setAction({ kind: "position-block" })}>Bloquear posição</button></>}
        {can("STOCK_UNBLOCK") && <button type="button" className="secondary-button" onClick={() => setAction({ kind: "position-unblock" })}>Liberar posição</button>}
      </div>
    </Panel>
    {success && <Notice tone="success">{success}</Notice>}
    {tab === "stock" ? <ResourceTable<Entity> title="Saldos por produto e LPN" endpoint="/stock" permission="STOCK_VIEW" filters={filters} reloadKey={reloadKey} searchPlaceholder="Pesquisar por SKU, produto, LPN, posição ou lote" columns={[
      { key: "sku", label: "Produto", render: (row) => <><strong>{text(row, "sku")}</strong><br />{text(row, "productName")}</> },
      { key: "lpnCode", label: "LPN" }, { key: "positionCode", label: "Posição" }, { key: "lot", label: "Lote" },
      { key: "quantity", label: "Físico", render: (row) => formatDecimal(row.quantity) },
      { key: "reservedQuantity", label: "Reservado", render: (row) => formatDecimal(row.reservedQuantity) },
      { key: "availableQuantity", label: "Disponível", render: (row) => formatDecimal(row.availableQuantity) },
      { key: "blockStatus", label: "Bloqueio", render: (row) => row.blockStatus ? <StatusPill value={String(row.blockStatus)} /> : "Sem bloqueio" },
    ]} onOpen={(row) => setDetailId(text(row, "id"))} rowActions={(row) => <>
      <button type="button" className="secondary-button" onClick={() => setDetailId(text(row, "id"))}>Detalhes</button>
      {can("STOCK_BLOCK") && <button type="button" className="secondary-button" onClick={() => setAction({ kind: "stock-block", row })}>Bloquear</button>}
      {can("STOCK_UNBLOCK") && row.blockStatus === "BLOQUEADO" && <button type="button" className="secondary-button" onClick={() => setAction({ kind: "stock-unblock", row })}>Liberar</button>}
    </>} /> : <ResourceTable<Entity> title="Registro de bloqueios" endpoint="/stock-blocks" permission="STOCK_VIEW" filters={blockFilters} reloadKey={reloadKey} searchPlaceholder="Pesquisar por motivo, lote, tipo ou identificador" columns={[
      { key: "type", label: "Abrangência" }, { key: "lot", label: "Lote" }, { key: "reason", label: "Motivo" },
      { key: "active", label: "Situação", render: (row) => row.active ? "Ativo" : "Liberado" },
      { key: "createdAt", label: "Criado em", render: (row) => formatDate(row.createdAt) },
      { key: "releasedAt", label: "Liberado em", render: (row) => formatDate(row.releasedAt) },
    ]} onOpen={setBlockDetail} rowActions={(row) => <><button type="button" className="secondary-button" onClick={() => setBlockDetail(row)}>Detalhes</button>{can("STOCK_UNBLOCK") && row.active === true && <button type="button" className="secondary-button" onClick={() => setAction({ kind: "release", row })}>Liberar bloqueio</button>}</>} />}
    {detailId && <Modal title="Detalhes do saldo" onClose={() => setDetailId(null)}><StockDetailLoader endpoint={`/stock/${encodeURIComponent(detailId)}`} permission="STOCK_VIEW">{(row) => <>
      <DetailGrid values={{ Produto: `${text(row, "sku")} · ${text(row, "productName")}`, LPN: row.lpnCode, Posição: row.positionCode, Lote: row.lot, Validade: row.expiryDate, "Saldo físico": formatDecimal(row.quantity), Reservado: formatDecimal(row.reservedQuantity), Disponível: formatDecimal(row.availableQuantity), Bloqueio: row.blockStatus ?? "Sem bloqueio", Entrada: row.entryAt, "ID do saldo": row.id }} />
      <Notice>A disponibilidade considera reservas, bloqueios e restrições operacionais. A liberação de um bloqueio pode manter outras restrições sobre este saldo.</Notice>
    </>}</StockDetailLoader></Modal>}
    {blockDetail && <Modal title="Detalhes do bloqueio" onClose={() => setBlockDetail(null)}><DetailGrid values={{ Identificador: blockDetail.id, Abrangência: blockDetail.type, Motivo: blockDetail.reason, Ativo: blockDetail.active, Lote: blockDetail.lot, "ID do armazém": blockDetail.warehouseId, "ID do produto": blockDetail.productId, "ID da posição": blockDetail.positionId, "ID do saldo": blockDetail.stockId, "Criado por": blockDetail.createdById, "Criado em": blockDetail.createdAt, "Liberado por": blockDetail.releasedById, "Liberado em": blockDetail.releasedAt }} /></Modal>}
    {action && <Modal title={actionLabel(action)} busy={busy} onClose={() => { if (!busy) setAction(null); }}><EntityForm title={actionLabel(action)} description={"row" in action ? `${action.kind === "release" ? "Bloqueio" : "Saldo"}: ${text(action.row, "sku", text(action.row, "id"))} · ${text(action.row, "lpnCode", text(action.row, "reason"))}` : "A alteração exige um motivo e será registrada pelo servidor."} fields={actionFields} initialValues={{ warehouseId: warehouse?.id ?? "", productId: product?.id ?? "", positionId: position?.id ?? "", lot }} onSubmit={submitAction} onCancel={() => setAction(null)} submitLabel="Confirmar alteração" extra={<Notice>Liberações preservam reservas e outros bloqueios aplicáveis. Consulte o saldo atualizado após a confirmação.</Notice>} /></Modal>}
  </div>;
}

export { TransfersScreen } from "./TransfersScreen";
