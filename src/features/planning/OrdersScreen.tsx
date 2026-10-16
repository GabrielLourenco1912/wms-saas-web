"use client";

import { useRef, useState } from "react";
import { ApiLookup } from "@/components/wms/ApiLookup";
import { ResourceTable } from "@/components/wms/ResourceTable";
import { DetailGrid, Modal, Notice, Panel, StatusPill } from "@/components/wms/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { api } from "@/lib/api/client";
import type { LookupOption } from "@/lib/api/types";
import { DocumentEditor } from "./DocumentEditor";
import { dateLabel, DocumentItems, errorText, LoadingDetail, quantityLabel, ReasonForm } from "./components";
import { orderStatuses, waveStatuses, type OrderDetail, type Wave } from "./contracts";
import { planningGateway } from "./gateway";

function WaveEditor({ onSaved, onBusyChange }: { onSaved: () => void; onBusyChange: (busy: boolean) => void }) {
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<LookupOption | null>(null);
  const [orders, setOrders] = useState<LookupOption[]>([]);
  const [code, setCode] = useState("");
  const [priority, setPriority] = useState("0");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const submitting = useRef(false);
  const selecting = useRef(false);
  return <form onSubmit={async (event) => {
    event.preventDefault();
    if (submitting.current || selecting.current) return;
    submitting.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try { await planningGateway.createWave(warehouse, code, orders, priority); onSaved(); }
    catch (caught) { setError(errorText(caught)); }
    finally { submitting.current = false; setBusy(false); onBusyChange(false); }
  }}>
    <Notice>O servidor seleciona saldo elegível por FEFO/FIFO, considera a demanda residual e reserva por tarefa. Todos os pedidos devem pertencer ao mesmo armazém.</Notice>
    <fieldset disabled={busy || adding} className="form-fieldset">
      <div className="form-grid">
        <ApiLookup resource="warehouses" permission="WAREHOUSE_VIEW" label="Armazém" value={warehouse} required onChange={(value) => { setWarehouse(value); setOrders([]); setSelectedOrder(null); }} />
        <label className="field">Código da onda<input value={code} maxLength={50} required onChange={(event) => setCode(event.target.value)} /></label>
        <label className="field">Prioridade<input type="number" value={priority} min={0} max={1000} step={1} required onChange={(event) => setPriority(event.target.value)} /><small>Inteiro de 0 a 1000.</small></label>
      </div>
      <h3>Pedidos da onda</h3>
      <div className="form-grid"><ApiLookup resource="orders" permission="ORDER_VIEW" label="Pesquisar pedido" value={selectedOrder} onChange={setSelectedOrder} disabled={!warehouse} filters={warehouse ? { warehouseId: warehouse.id } : {}} helperText="Escolha o armazém antes de pesquisar os pedidos." />
        <div className="action-row"><button type="button" className="secondary-button" disabled={!selectedOrder || orders.length >= 200} onClick={async () => {
          if (!selectedOrder || !warehouse || selecting.current) return;
          if (orders.some((order) => order.id === selectedOrder.id)) { setError("Este pedido já está na onda."); return; }
          selecting.current = true;
          setAdding(true);
          setError("");
          try {
            const detail = await api.get<OrderDetail>(`/orders/${encodeURIComponent(selectedOrder.id)}`);
            if (detail.warehouseId !== warehouse.id) throw new Error("O pedido pertence a outro armazém.");
            if (["ATENDIDO", "CANCELADO"].includes(detail.status)) throw new Error("Um pedido encerrado não pode ser incluído na onda.");
            setOrders((value) => [...value, selectedOrder]);
            setSelectedOrder(null);
          } catch (caught) { setError(errorText(caught)); }
          finally { selecting.current = false; setAdding(false); }
        }}>{adding ? "Verificando pedido…" : "Adicionar pedido"}</button></div>
      </div>
      {orders.length ? <ul className="selection-list" aria-label="Pedidos selecionados">{orders.map((order) => <li key={order.id}><span>{order.label}</span><button type="button" className="secondary-button" aria-label={`Remover pedido ${order.label}`} onClick={() => setOrders((value) => value.filter((item) => item.id !== order.id))}>Remover</button></li>)}</ul> : <p>Nenhum pedido selecionado.</p>}
    </fieldset>
    {error && <Notice tone="error">{error}</Notice>}
    <div className="action-row"><button type="submit" className="primary-button" disabled={busy || adding || !orders.length}>{busy ? "Gerando onda…" : "Gerar onda e reservar"}</button></div>
  </form>;
}

export function OrdersScreen() {
  const { can } = useAuth();
  const [tab, setTab] = useState<"orders" | "waves">(() => can("ORDER_VIEW") ? "orders" : "waves");
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit" | "detail" | "cancel-order" | "create-wave" | "wave-detail" | "cancel-wave"; id?: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [success, setSuccess] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const selectedTab = tab === "orders" && !can("ORDER_VIEW") ? "waves" : tab === "waves" && !can("WAVE_VIEW") ? "orders" : tab;
  const saved = (message: string) => { setModal(null); setReloadKey((value) => value + 1); setSuccess(message); };
  const filters = warehouse ? { warehouseId: warehouse.id } : {};
  return <div className="screen-stack">
    {success && <Notice tone="success">{success}</Notice>}
    <Panel title="Pedidos e ondas" description="Planeje a saída, reserve saldo por tarefa e acompanhe o atendimento após o despacho.">
      <div className="toolbar">
        <div role="tablist" aria-label="Planejamento de saída" className="action-row">
          {can("ORDER_VIEW") && <button type="button" role="tab" aria-selected={selectedTab === "orders"} aria-controls="planning-orders-panel" className={selectedTab === "orders" ? "primary-button" : "secondary-button"} onClick={() => setTab("orders")}>Pedidos</button>}
          {can("WAVE_VIEW") && <button type="button" role="tab" aria-selected={selectedTab === "waves"} aria-controls="planning-waves-panel" className={selectedTab === "waves" ? "primary-button" : "secondary-button"} onClick={() => setTab("waves")}>Ondas</button>}
        </div>
        {can("WAREHOUSE_VIEW") && <ApiLookup resource="warehouses" label="Filtrar por armazém" value={warehouse} onChange={setWarehouse} />}
      </div>
    </Panel>
    {selectedTab === "orders" ? <div id="planning-orders-panel" role="tabpanel"><ResourceTable<OrderDetail> title="Pedidos de saída" endpoint="/orders" permission="ORDER_VIEW" statuses={orderStatuses} filters={filters} reloadKey={reloadKey} searchPlaceholder="Pesquisar por documento ou identificador" columns={[
      { key: "documentNumber", label: "Pedido", render: (row) => row.documentNumber || row.id },
      { key: "status", label: "Situação", render: (row) => <StatusPill value={row.status} /> },
      { key: "expectedAt", label: "Previsão", render: (row) => dateLabel(row.expectedAt) },
      { key: "items", label: "Itens", render: (row) => row.items.length },
      { key: "createdAt", label: "Criado em", render: (row) => dateLabel(row.createdAt) },
    ]} onOpen={(row) => setModal({ mode: "detail", id: row.id })} actions={can("ORDER_CREATE") ? <button className="primary-button" type="button" onClick={() => setModal({ mode: "create" })}>Novo pedido</button> : undefined} rowActions={(row) => <div className="action-row"><button className="secondary-button" type="button" onClick={() => setModal({ mode: "detail", id: row.id })}>Detalhes</button>{can("ORDER_EDIT") && row.status === "PENDENTE" && <button className="secondary-button" type="button" onClick={() => setModal({ mode: "edit", id: row.id })}>Editar</button>}{can("ORDER_CANCEL") && !["ATENDIDO", "CANCELADO"].includes(row.status) && <button type="button" className="danger-button" onClick={() => setModal({ mode: "cancel-order", id: row.id })}>Cancelar</button>}</div>} /></div> : <div id="planning-waves-panel" role="tabpanel"><ResourceTable<Wave> title="Ondas de separação" endpoint="/waves" permission="WAVE_VIEW" statuses={waveStatuses} filters={filters} reloadKey={reloadKey} searchPlaceholder="Pesquisar por código da onda" columns={[
      { key: "code", label: "Onda" }, { key: "status", label: "Situação", render: (row) => <StatusPill value={row.status} /> }, { key: "orderIds", label: "Pedidos", render: (row) => row.orderIds.length }, { key: "tasks", label: "Tarefas", render: (row) => row.tasks.length }, { key: "createdAt", label: "Criada em", render: (row) => dateLabel(row.createdAt) },
    ]} onOpen={(row) => setModal({ mode: "wave-detail", id: row.id })} actions={can("WAVE_CREATE") && can("ORDER_VIEW") ? <button className="primary-button" type="button" onClick={() => setModal({ mode: "create-wave" })}>Nova onda</button> : undefined} rowActions={(row) => <div className="action-row"><button className="secondary-button" type="button" onClick={() => setModal({ mode: "wave-detail", id: row.id })}>Detalhes</button>{can("WAVE_CANCEL") && ["PENDENTE", "EM_EXECUCAO"].includes(row.status) && <button className="danger-button" type="button" onClick={() => setModal({ mode: "cancel-wave", id: row.id })}>Cancelar onda</button>}</div>} /></div>}
    {modal && <Modal title={modal.mode === "create" ? "Novo pedido" : modal.mode === "edit" ? "Editar pedido" : modal.mode === "cancel-order" ? "Cancelar pedido" : modal.mode === "create-wave" ? "Nova onda" : modal.mode === "wave-detail" ? "Detalhes da onda" : modal.mode === "cancel-wave" ? "Cancelar onda" : "Detalhes do pedido"} busy={modalBusy} onClose={() => { if (!modalBusy) setModal(null); }}>
      {modal.mode === "create" ? <DocumentEditor receipt={false} onSaved={() => saved("Pedido criado. Gere uma onda para reservar o saldo elegível.")} onBusyChange={setModalBusy} /> : modal.mode === "create-wave" ? <WaveEditor onSaved={() => saved("Onda criada e reservas confirmadas pelo servidor. As tarefas estão disponíveis para execução no mobile.")} onBusyChange={setModalBusy} /> : modal.mode === "cancel-order" || modal.mode === "cancel-wave" ? <ReasonForm onBusyChange={setModalBusy} description="O servidor verificará as tarefas em execução e os vínculos antes de cancelar. Mercadoria preparada de pedido cancelado deve retornar à armazenagem pela transferência física do LPN inteiro." submitLabel={modal.mode === "cancel-order" ? "Confirmar cancelamento do pedido" : "Confirmar cancelamento da onda"} onSubmit={async (reason) => {
        await planningGateway.cancelDocument(modal.mode === "cancel-order" ? "orders" : "waves", modal.id!, reason);
        saved("Cancelamento confirmado pelo servidor. Consulte novamente as tarefas e as reservas relacionadas.");
      }} /> : modal.mode === "wave-detail" ? <LoadingDetail<Wave> endpoint={`/waves/${encodeURIComponent(modal.id!)}`}>{(wave) => <>
        <DetailGrid values={{ Código: wave.code, Situação: wave.status, "Criada em": dateLabel(wave.createdAt), Pedidos: wave.orderIds.length, Tarefas: wave.tasks.length, "ID do armazém": wave.warehouseId }} />
        <h3>Pedidos vinculados</h3><ul>{wave.orderIds.map((id) => <li key={id}>{id}</li>)}</ul>
        <h3>Tarefas geradas</h3>{wave.tasks.length ? <div className="table-wrap"><table><thead><tr><th scope="col">Tarefa</th><th scope="col">Situação</th><th scope="col">Alvo</th><th scope="col">Realizada</th></tr></thead><tbody>{wave.tasks.map((task) => <tr key={task.id}><td>{task.id}</td><td><StatusPill value={task.status} /></td><td>{quantityLabel(task.targetQuantity)}</td><td>{quantityLabel(task.actualQuantity)}</td></tr>)}</tbody></table></div> : <p>Nenhuma tarefa vinculada à onda.</p>}
      </>}</LoadingDetail> : <LoadingDetail<OrderDetail> endpoint={`/orders/${encodeURIComponent(modal.id!)}`}>{(order) => modal.mode === "edit" ? order.status === "PENDENTE" ? <DocumentEditor key={order.id} receipt={false} existing={order} items={order.items} onSaved={() => saved("Pedido atualizado.")} onBusyChange={setModalBusy} /> : <Notice>Este pedido já avançou no fluxo e não pode ser editado.</Notice> : <>
        <DetailGrid values={{ Documento: order.documentNumber || "Sem número", Situação: order.status, Previsão: dateLabel(order.expectedAt), "Criado em": dateLabel(order.createdAt), "ID do armazém": order.warehouseId, "ID do cliente": order.partnerId, "Motivo do cancelamento": order.cancellationReason }} />
        <Notice>Preparada é a quantidade coletada no picking. Atendida é a quantidade efetivamente despachada.</Notice>
        <DocumentItems items={order.items} />
      </>}</LoadingDetail>}
    </Modal>}
  </div>;
}
