"use client";

import { useState } from "react";
import { ApiLookup } from "@/components/wms/ApiLookup";
import { ResourceTable } from "@/components/wms/ResourceTable";
import { DetailGrid, Modal, Notice, Panel, StatusPill } from "@/components/wms/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import type { LookupOption } from "@/lib/api/types";
import { dateLabel, LoadingDetail, quantityLabel } from "./components";
import { taskStatuses } from "./contracts";

type RecordData = Record<string, unknown>;
const monitors = [
  { id: "putaway-tasks", title: "Armazenagem", permission: "PUTAWAY_VIEW", statuses: taskStatuses },
  { id: "picking-tasks", title: "Separação", permission: "PICKING_VIEW", statuses: taskStatuses },
  { id: "divergences", title: "Divergências", permission: "PICKING_VIEW", statuses: ["ABERTA", "TRATADA"] },
  { id: "shipments", title: "Expedição", permission: "SHIPMENT_VIEW", statuses: ["ABERTA", "CONFERIDA", "DESPACHADA", "CANCELADA"] },
] as const;

function str(value: unknown): string { return value == null || value === "" ? "—" : String(value); }
function qty(value: unknown): string { return typeof value === "string" || typeof value === "number" ? quantityLabel(value) : "—"; }
function array(value: unknown): RecordData[] { return Array.isArray(value) ? value.filter((row): row is RecordData => typeof row === "object" && row !== null && !Array.isArray(row)) : []; }

function MonitorDetail({ resource, detail }: { resource: string; detail: RecordData }) {
  if (resource === "divergences") return <>
    <DetailGrid values={{ Divergência: detail.id, Tipo: detail.type, Situação: detail.status, Esperada: qty(detail.expectedQuantity), Apurada: qty(detail.actualQuantity), Faltante: qty(detail.missingQuantity), Motivo: detail.reason, "Registrada em": dateLabel(str(detail.createdAt)), "ID da tarefa": detail.taskId, "ID do saldo": detail.stockId, "ID da posição": detail.positionId, "Autorizada por": detail.authorizedById }} />
    <Notice>As faltas geram tratamento e possível realocação de tarefas no servidor. A divergência não representa uma baixa física do saldo.</Notice>
    <h3>Tarefas de reposição</h3>{Array.isArray(detail.replacementTaskIds) && detail.replacementTaskIds.length ? <ul>{detail.replacementTaskIds.map((id) => <li key={String(id)}>{String(id)}</li>)}</ul> : <p>Nenhuma tarefa de reposição vinculada.</p>}
  </>;
  if (resource === "shipments") return <>
    <DetailGrid values={{ Carga: detail.id, Situação: detail.status, "Criada em": dateLabel(str(detail.createdAt)), "Despachada em": detail.dispatchedAt ? dateLabel(str(detail.dispatchedAt)) : "—", "ID do pedido": detail.orderId, "ID da doca": detail.dockPositionId }} />
    <Notice>A conferência dos LPNs e o despacho são realizados no mobile. O saldo sai do armazém quando o servidor confirma o despacho.</Notice>
    <div className="table-wrap"><table><caption>Itens da carga</caption><thead><tr><th scope="col">SKU</th><th scope="col">LPN</th><th scope="col">Quantidade</th><th scope="col">Situação</th><th scope="col">Conferido em</th></tr></thead><tbody>{array(detail.items).map((item) => <tr key={str(item.id)}><td>{str(item.sku)}</td><td>{str(item.lpnCode)}</td><td>{qty(item.quantity)}</td><td><StatusPill value={str(item.status)} /></td><td>{item.confirmedAt ? dateLabel(str(item.confirmedAt)) : "—"}</td></tr>)}</tbody></table></div>
  </>;
  return <>
    <DetailGrid values={{ Tarefa: detail.id, Situação: detail.status, Produto: detail.productName || detail.productSku, LPN: detail.lpnCode || detail.sourceLpnCode, Origem: detail.originPositionCode, Destino: detail.destinationPositionCode || detail.destinationPositionId, Alvo: qty(detail.targetQuantity), Realizada: qty(detail.actualQuantity), Responsável: detail.assignedUserId || "Aguardando início pelo operador", "Criada em": dateLabel(str(detail.createdAt)), "Iniciada em": detail.startedAt ? dateLabel(str(detail.startedAt)) : "—", "Concluída em": detail.completedAt ? dateLabel(str(detail.completedAt)) : "—", "ID do pedido": detail.orderId, "ID da onda": detail.waveId }} />
    {resource === "putaway-tasks" && <>
      <h3>Conteúdo do LPN</h3><Notice>O LPN pode conter vários produtos e lotes. A conclusão do putaway movimenta todo o conteúdo para o destino planejado.</Notice>
      <div className="table-wrap"><table><thead><tr><th scope="col">Produto</th><th scope="col">Quantidade</th><th scope="col">Lote</th><th scope="col">Validade</th></tr></thead><tbody>{array(detail.contents).map((item) => <tr key={str(item.stockId)}><td>{str(item.sku)}<br />{str(item.productName)}</td><td>{qty(item.quantity)}</td><td>{str(item.lot)}</td><td>{str(item.expiryDate)}</td></tr>)}</tbody></table></div>
    </>}
  </>;
}

export function MonitoringScreen() {
  const { can } = useAuth();
  const available = monitors.filter((monitor) => can(monitor.permission));
  const [tab, setTab] = useState<string>(() => available[0]?.id ?? "");
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [selected, setSelected] = useState<{ resource: string; id: string; title: string } | null>(null);
  const current = available.find((monitor) => monitor.id === tab) ?? available[0];
  if (!current) return <Notice>Seu perfil não possui permissão para o acompanhamento operacional.</Notice>;
  return <div className="screen-stack">
    <Panel title="Acompanhamento operacional" description="Visualize o progresso informado pela API e as divergências que precisam de atenção do gestor.">
      <div className="toolbar"><div className="action-row" role="tablist" aria-label="Acompanhamento operacional">{available.map((monitor) => <button type="button" role="tab" aria-selected={current.id === monitor.id} aria-controls="monitoring-panel" className={current.id === monitor.id ? "primary-button" : "secondary-button"} key={monitor.id} onClick={() => setTab(monitor.id)}>{monitor.title}</button>)}</div>{can("WAREHOUSE_VIEW") && <ApiLookup resource="warehouses" label="Filtrar por armazém" value={warehouse} onChange={setWarehouse} />}</div>
    </Panel>
    <div role="tabpanel" id="monitoring-panel"><ResourceTable<RecordData> key={current.id} title={current.title} endpoint={`/${current.id}`} permission={current.permission} statuses={[...current.statuses]} filters={warehouse ? { warehouseId: warehouse.id } : {}} searchPlaceholder={current.id === "divergences" ? "Pesquisar por motivo, tipo ou situação" : "Pesquisar por identificador ou situação"} columns={[
      { key: "id", label: current.id === "shipments" ? "Carga" : current.id === "divergences" ? "Divergência" : "Tarefa" },
      { key: "status", label: "Situação", render: (row) => <StatusPill value={str(row.status)} /> },
      ...(current.id === "putaway-tasks" ? [{ key: "lpnCode", label: "LPN" }] : current.id === "picking-tasks" ? [{ key: "productSku", label: "Produto", render: (row: RecordData) => <>{str(row.productSku)}<br />{str(row.productName)}</> }] : current.id === "divergences" ? [{ key: "type", label: "Tipo" }, { key: "reason", label: "Motivo" }] : [{ key: "orderId", label: "Pedido" }]),
      ...(current.id !== "shipments" && current.id !== "divergences" ? [{ key: "targetQuantity", label: "Alvo", render: (row: RecordData) => qty(row.targetQuantity) }, { key: "actualQuantity", label: "Realizada", render: (row: RecordData) => qty(row.actualQuantity) }] : []),
      { key: "createdAt", label: "Registrado em", render: (row) => dateLabel(str(row.createdAt)) },
    ]} onOpen={(row) => setSelected({ resource: current.id, id: str(row.id), title: current.title })} rowActions={(row) => <button className="secondary-button" type="button" onClick={() => setSelected({ resource: current.id, id: str(row.id), title: current.title })}>Detalhes</button>} /></div>
    {selected && <Modal title={`Detalhes · ${selected.title}`} onClose={() => setSelected(null)}><LoadingDetail<RecordData> endpoint={`/${selected.resource}/${encodeURIComponent(selected.id)}`}>{(detail) => <MonitorDetail resource={selected.resource} detail={detail} />}</LoadingDetail></Modal>}
  </div>;
}
