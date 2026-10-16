"use client";

import { useState, type FormEvent } from "react";
import { ApiLookup } from "@/components/wms/ApiLookup";
import { ResourceTable } from "@/components/wms/ResourceTable";
import { DetailGrid, Modal, Notice, Panel, StatusPill } from "@/components/wms/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import { formatDate, formatDecimal, text, type Entity, type LookupOption, type Query } from "@/lib/api/types";
import { errorMessage, Reference, StockDetailLoader } from "./components";
import { ledgerDateRange } from "./stock-model";

const movements = ["ENTRADA", "SAIDA", "PUTAWAY", "PICKING", "TRANSFERENCIA", "AJUSTE", "COMPENSACAO", "BLOQUEIO", "DESBLOQUEIO"];

function AuditDetail({ row }: { row: Entity }) {
  return <>
    <Notice>Registro imutável do livro razão. Ajustes e compensações geram novos lançamentos, preservando o histórico original.</Notice>
    <DetailGrid values={{ Lançamento: row.id, Movimento: row.movementType, Quantidade: formatDecimal(row.quantity), "Saldo anterior": formatDecimal(row.previousBalance), "Saldo resultante": formatDecimal(row.resultingBalance), "Saldo anterior no destino": formatDecimal(row.destinationPreviousBalance), "Saldo resultante no destino": formatDecimal(row.destinationResultingBalance), "Ocorrido em": row.occurredAt, "Lote registrado": row.recordedLot, "Validade registrada": row.recordedExpiryDate, "Entrada registrada": row.recordedEntryAt, Motivo: row.reason }} />
    <dl className="detail-grid">
      <div><dt>Produto</dt><dd><Reference resource="products" id={row.productId} permission="PRODUCT_VIEW" labelKey="name" /></dd></div>
      <div><dt>Usuário</dt><dd><Reference resource="users" id={row.userId} permission="USER_VIEW" labelKey="name" /></dd></div>
      <div><dt>LPN de origem</dt><dd><Reference resource="lpns" id={row.lpnId} permission="STOCK_VIEW" labelKey="trackingCode" /></dd></div>
      <div><dt>LPN de destino</dt><dd><Reference resource="lpns" id={row.destinationLpnId} permission="STOCK_VIEW" labelKey="trackingCode" /></dd></div>
      <div><dt>Posição anterior</dt><dd><Reference resource="positions" id={row.previousPositionId} permission="WAREHOUSE_VIEW" labelKey="code" /></dd></div>
      <div><dt>Nova posição</dt><dd><Reference resource="positions" id={row.newPositionId} permission="WAREHOUSE_VIEW" labelKey="code" /></dd></div>
    </dl>
    <h3>Rastreabilidade da operação</h3>
    <DetailGrid values={{ "ID da operação": row.operationId, Sequência: row.sequence, "ID da tarefa": row.taskId, "ID do saldo de origem": row.stockId, "ID do saldo de destino": row.destinationStockId, "Lançamento compensado": row.compensatedTransactionId, "Item de inventário": row.inventoryItemId, "Item de expedição": row.shipmentItemId }} />
  </>;
}

export function AuditScreen() {
  const { can } = useAuth();
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [product, setProduct] = useState<LookupOption | null>(null);
  const [lpn, setLpn] = useState<LookupOption | null>(null);
  const [stock, setStock] = useState<LookupOption | null>(null);
  const [user, setUser] = useState<LookupOption | null>(null);
  const [movementType, setMovementType] = useState("");
  const [lot, setLot] = useState("");
  const [operationId, setOperationId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<Query>({});
  const [filterError, setFilterError] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFilterError("");
    try {
      setFilters({ warehouseId: warehouse?.id, productId: product?.id, lpnId: lpn?.id, stockId: stock?.id, userId: user?.id, movementType: movementType || undefined, lot: lot.trim() || undefined, operationId: operationId.trim() || undefined, ...ledgerDateRange(from, to) });
    } catch (caught) { setFilterError(errorMessage(caught)); }
  }
  function clearFilters() {
    setWarehouse(null); setProduct(null); setLpn(null); setStock(null); setUser(null); setMovementType(""); setLot(""); setOperationId(""); setFrom(""); setTo(""); setFilterError(""); setFilters({});
  }
  if (!can("AUDIT_VIEW")) return <Notice>Seu perfil não tem acesso ao livro razão.</Notice>;
  return <div className="screen-stack">
    <Panel title="Livro razão de estoque" description="Acompanhe entradas, saídas, movimentações e ajustes com o histórico preservado.">
      <Notice>Esta consulta apresenta os lançamentos registrados pela API. Datas inicial e final abrangem os dias inteiros no fuso horário do navegador.</Notice>
      <form aria-label="Filtrar livro razão" onSubmit={applyFilters}><div className="form-grid">
        <ApiLookup resource="warehouses" label="Armazém" value={warehouse} onChange={(option) => { setWarehouse(option); setLpn(null); setStock(null); }} />
        <ApiLookup resource="products" label="Produto" value={product} onChange={(option) => { setProduct(option); setStock(null); }} />
        <ApiLookup resource="lpns" label="LPN de origem ou destino" value={lpn} onChange={(option) => { setLpn(option); setStock(null); }} filters={{ warehouseId: warehouse?.id }} />
        <ApiLookup resource="stock" label="Saldo de origem" value={stock} onChange={setStock} filters={{ warehouseId: warehouse?.id, productId: product?.id, lpnId: lpn?.id }} />
        {can("USER_VIEW") && <ApiLookup resource="users" label="Usuário responsável" value={user} onChange={setUser} />}
        <label className="field"><span>Tipo de movimento</span><select value={movementType} onChange={(event) => setMovementType(event.target.value)}><option value="">Todos</option>{movements.map((type) => <option key={type} value={type}>{({ ENTRADA: "Entrada", SAIDA: "Saída", PUTAWAY: "Armazenagem", PICKING: "Separação", TRANSFERENCIA: "Transferência", AJUSTE: "Ajuste", COMPENSACAO: "Compensação", BLOQUEIO: "Bloqueio", DESBLOQUEIO: "Desbloqueio" })[type]}</option>)}</select></label>
        <label className="field"><span>Lote registrado</span><input value={lot} onChange={(event) => setLot(event.target.value)} maxLength={100} /></label>
        <label className="field"><span>ID da operação</span><input value={operationId} onChange={(event) => setOperationId(event.target.value)} maxLength={26} /></label>
        <label className="field"><span>Data inicial</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label className="field"><span>Data final</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
      </div>{filterError && <Notice tone="error">{filterError}</Notice>}<div className="form-actions"><button type="button" className="secondary-button" onClick={clearFilters}>Limpar filtros</button><button type="submit" className="primary-button">Aplicar filtros</button></div></form>
    </Panel>
    <ResourceTable title="Lançamentos do livro razão" endpoint="/stock-transactions" permission="AUDIT_VIEW" filters={filters} searchPlaceholder="Pesquisar por lote registrado, motivo ou identificador" emptyMessage="Nenhum lançamento encontrado para esta pesquisa e os filtros aplicados." columns={[
      { key: "id", label: "Lançamento" }, { key: "occurredAt", label: "Ocorrido em", render: (row) => formatDate(row.occurredAt) },
      { key: "movementType", label: "Movimento", render: (row) => <StatusPill value={text(row, "movementType")} /> },
      { key: "quantity", label: "Quantidade", render: (row) => formatDecimal(row.quantity) },
      { key: "recordedLot", label: "Lote registrado" },
      { key: "previousBalance", label: "Saldo anterior", render: (row) => formatDecimal(row.previousBalance) },
      { key: "resultingBalance", label: "Saldo resultante", render: (row) => formatDecimal(row.resultingBalance) },
      { key: "reason", label: "Motivo" },
    ]} onOpen={(row) => setDetailId(text(row, "id"))} rowActions={(row) => <button type="button" className="secondary-button" onClick={() => setDetailId(text(row, "id"))}>Detalhes e rastreabilidade</button>} />
    {detailId && <Modal title="Lançamento do livro razão" onClose={() => setDetailId(null)}><StockDetailLoader endpoint={`/stock-transactions/${encodeURIComponent(detailId)}`} permission="AUDIT_VIEW">{(row) => <AuditDetail row={row} />}</StockDetailLoader></Modal>}
  </div>;
}
