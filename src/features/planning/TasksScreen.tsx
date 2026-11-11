"use client";

import { useState } from "react";
import { ApiLookup } from "@/components/wms/ApiLookup";
import { ResourceTable } from "@/components/wms/ResourceTable";
import { FilterDisclosure } from "@/components/wms/FilterDisclosure";
import { DetailGrid, Modal, Notice, Panel, StatusPill } from "@/components/wms/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import type { LookupOption } from "@/lib/api/types";
import { dateLabel, LoadingDetail, quantityLabel, ReasonForm } from "./components";
import { taskStatuses, type TaskHistory, type WarehouseTask } from "./contracts";
import { planningGateway } from "./gateway";

function ExcessForm({ task, onSaved, onBusyChange }: { task: WarehouseTask; onSaved: () => void; onBusyChange: (busy: boolean) => void }) {
  const [quantity, setQuantity] = useState("");
  return <ReasonForm onBusyChange={onBusyChange} description={`Alvo atual: ${quantityLabel(task.targetQuantity)} na unidade base. O novo alvo deve ser maior e respeitar a demanda e o saldo livre. A autorização será registrada no histórico.`} submitLabel="Autorizar novo alvo" onSubmit={async (reason) => {
    await planningGateway.authorizeExcess(task.id, quantity, reason);
    onSaved();
  }}><label className="field">Novo alvo autorizado<input type="text" inputMode="decimal" required value={quantity} maxLength={19} onChange={(event) => setQuantity(event.target.value)} placeholder="Quantidade na unidade base" /></label></ReasonForm>;
}

export function TasksScreen() {
  const { can, user } = useAuth();
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [assignee, setAssignee] = useState<LookupOption | null>(null);
  const [type, setType] = useState("");
  const [mine, setMine] = useState(false);
  const [selected, setSelected] = useState<{ mode: "detail" | "cancel" | "excess"; task: WarehouseTask } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [success, setSuccess] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const saved = (message: string) => { setSelected(null); setReloadKey((value) => value + 1); setSuccess(message); };
  return <div className="screen-stack">
    {success && <Notice tone="success">{success}</Notice>}
    <Panel title="Acompanhamento de tarefas" description="Consulte o responsável, as quantidades e o histórico. A execução física é realizada no aplicativo mobile.">
      <FilterDisclosure activeCount={[warehouse, type, mine || assignee].filter(Boolean).length}><div className="toolbar">
        {can("WAREHOUSE_VIEW") && <ApiLookup resource="warehouses" label="Armazém" value={warehouse} onChange={setWarehouse} />}
        <label className="field">Tipo de tarefa<select value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos os tipos</option><option value="PUTAWAY">Armazenagem (putaway)</option><option value="PICKING">Separação (picking)</option><option value="TRANSFERENCIA">Transferência</option></select></label>
        {can("USER_VIEW") && <ApiLookup resource="users" label="Responsável" value={assignee} disabled={mine} onChange={setAssignee} />}
        <label className="checkbox-field"><input type="checkbox" checked={mine} onChange={(event) => { setMine(event.target.checked); setAssignee(null); }} />Somente minhas tarefas</label>
      </div></FilterDisclosure>
    </Panel>
    <ResourceTable<WarehouseTask> title="Tarefas operacionais" endpoint="/tasks" permission="TASK_VIEW" statuses={taskStatuses} filters={{ ...(warehouse ? { warehouseId: warehouse.id } : {}), ...(type ? { type } : {}), ...(mine && user ? { assignedUserId: user.id } : assignee ? { assignedUserId: assignee.id } : {}) }} reloadKey={reloadKey} searchPlaceholder="Pesquisar por tarefa, tipo, situação ou motivo" columns={[
      { key: "id", label: "Tarefa" }, { key: "type", label: "Tipo" }, { key: "status", label: "Situação", render: (row) => <StatusPill value={row.status} /> }, { key: "targetQuantity", label: "Alvo", render: (row) => quantityLabel(row.targetQuantity) }, { key: "actualQuantity", label: "Realizada", render: (row) => quantityLabel(row.actualQuantity) }, { key: "assignedUserId", label: "Responsável", render: (row) => row.assignedUserId || "Aguardando início pelo operador" }, { key: "createdAt", label: "Criada em", render: (row) => dateLabel(row.createdAt) },
    ]} onOpen={(task) => setSelected({ mode: "detail", task })} rowActions={(task) => <div className="action-row">
      <button className="secondary-button" type="button" onClick={() => setSelected({ mode: "detail", task })}>Detalhes e histórico</button>
      {can("TASK_CANCEL") && task.status === "PENDENTE" && <button className="danger-button" type="button" onClick={() => setSelected({ mode: "cancel", task })}>Cancelar</button>}
      {can("TASK_QUANTITY_OVERRIDE") && task.type === "PICKING" && ["PENDENTE", "EM_EXECUCAO"].includes(task.status) && <button className="secondary-button" type="button" onClick={() => setSelected({ mode: "excess", task })}>Autorizar excesso</button>}
    </div>} />
    {selected && <Modal title={selected.mode === "cancel" ? "Cancelar tarefa pendente" : selected.mode === "excess" ? "Autorizar excesso no picking" : "Detalhes e histórico da tarefa"} busy={modalBusy} onClose={() => { if (!modalBusy) setSelected(null); }}>
      {selected.mode === "cancel" ? <ReasonForm onBusyChange={setModalBusy} description="O cancelamento é permitido somente enquanto a tarefa está pendente. O servidor tratará as reservas e os vínculos e manterá o histórico da operação." submitLabel="Confirmar cancelamento" onSubmit={async (reason) => {
        await planningGateway.cancelTask(selected.task.id, reason);
        saved("Tarefa cancelada. As reservas e o histórico foram atualizados pelo servidor.");
      }} /> : selected.mode === "excess" ? <LoadingDetail<{ task: WarehouseTask }> endpoint={`/tasks/${encodeURIComponent(selected.task.id)}`}>{(detail) => <ExcessForm task={detail.task} onSaved={() => saved("Novo alvo autorizado e registrado no histórico. Atualize a tarefa no dispositivo do operador.")} onBusyChange={setModalBusy} />}</LoadingDetail> : <LoadingDetail<{ task: WarehouseTask }> endpoint={`/tasks/${encodeURIComponent(selected.task.id)}`}>{({ task }) => <>
        <DetailGrid values={{ Tarefa: task.id, Tipo: task.type, Situação: task.status, Prioridade: task.priority, Alvo: quantityLabel(task.targetQuantity), Realizada: quantityLabel(task.actualQuantity), Responsável: task.assignedUserId || "Aguardando início pelo operador", "Criada em": dateLabel(task.createdAt), "Iniciada em": dateLabel(task.startedAt), "Concluída em": dateLabel(task.completedAt), "ID do pedido": task.orderId, "ID da onda": task.waveId, "ID do produto": task.productId, "ID do LPN": task.lpnId, "ID da posição de origem": task.originPositionId, "ID da posição de destino": task.destinationPositionId, "Motivo do cancelamento": task.cancellationReason }} />
        <ResourceTable<TaskHistory> title="Histórico da tarefa" description="Eventos registrados pelo servidor, com paginação independente." endpoint={`/tasks/${encodeURIComponent(task.id)}/history`} permission="TASK_VIEW" columns={[
          { key: "recordedAt", label: "Registrado em", render: (row) => dateLabel(row.recordedAt) }, { key: "previousStatus", label: "Situação anterior", render: (row) => row.previousStatus || "Criação" }, { key: "newStatus", label: "Nova situação", render: (row) => <StatusPill value={row.newStatus} /> }, { key: "reason", label: "Motivo", render: (row) => row.reason || "—" }, { key: "userId", label: "Usuário" },
        ]} searchPlaceholder="Pesquisar no histórico desta tarefa" />
      </>}</LoadingDetail>}
    </Modal>}
  </div>;
}
