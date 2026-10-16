"use client";

import { useRef, useState } from "react";
import { ApiLookup } from "@/components/wms/ApiLookup";
import { ResourceTable } from "@/components/wms/ResourceTable";
import { DetailGrid, Modal, Notice, Panel, StatusPill } from "@/components/wms/primitives";
import { useAuth } from "@/features/auth/AuthProvider";
import type { LookupOption } from "@/lib/api/types";
import { DocumentEditor } from "./DocumentEditor";
import { dateLabel, DocumentItems, errorText, LoadingDetail, quantityLabel } from "./components";
import { receiptStatuses, type DocumentSummary, type ReceiptDetail } from "./contracts";
import { planningGateway } from "./gateway";

function ImportReceipt({ onSaved, onBusyChange }: { onSaved: () => void; onBusyChange: (busy: boolean) => void }) {
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [partner, setPartner] = useState<LookupOption | null>(null);
  const [invoiceXml, setXml] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState(false);
  const submitting = useRef(false);
  const fileReading = useRef(false);
  const fileSequence = useRef(0);
  return <form onSubmit={async (event) => {
    event.preventDefault();
    if (submitting.current || fileReading.current) return;
    submitting.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      await planningGateway.importInvoice(warehouse, partner, invoiceXml, expectedAt);
      onSaved();
    } catch (caught) { setError(errorText(caught)); }
    finally { submitting.current = false; setBusy(false); onBusyChange(false); }
  }}>
    <Notice>A importação utiliza os produtos e as embalagens já cadastrados. O arquivo cria a expectativa de entrada e não realiza autorização fiscal da NF-e.</Notice>
    <fieldset disabled={busy} className="form-fieldset"><div className="form-grid">
      <ApiLookup resource="warehouses" permission="WAREHOUSE_VIEW" label="Armazém" value={warehouse} onChange={setWarehouse} required />
      <ApiLookup resource="partners" permission="ORDER_VIEW" label="Fornecedor" helperText="Fornecedor ou parceiro do tipo Ambos." value={partner} onChange={setPartner} required />
      <label className="field">Previsão (opcional)<input type="datetime-local" step="0.001" value={expectedAt} onChange={(event) => setExpectedAt(event.target.value)} /><small>Horário local do dispositivo.</small></label>
      <label className="field">Arquivo XML da NF-e<input type="file" accept=".xml,application/xml,text/xml" onChange={async (event) => {
        const selected = event.target.files?.[0];
        const request = ++fileSequence.current;
        fileReading.current = Boolean(selected);
        setReading(Boolean(selected));
        if (!selected) return;
        setError("");
        try {
          if (selected.size > 4_000_000) throw new Error("O arquivo excede o limite para importação.");
          const content = await selected.text();
          if (content.length > 1_000_000) throw new Error("O XML deve ter até 1.000.000 de caracteres.");
          if (request === fileSequence.current) { setXml(content); setFileName(selected.name); }
        } catch (caught) { if (request === fileSequence.current) { setXml(""); setFileName(""); setError(errorText(caught)); } }
        finally { if (request === fileSequence.current) { fileReading.current = false; setReading(false); } }
      }} />{fileName && <small>Arquivo carregado: {fileName}</small>}</label>
    </div><label className="field">Conteúdo do XML<textarea value={invoiceXml} onChange={(event) => { ++fileSequence.current; fileReading.current = false; setReading(false); setXml(event.target.value); setFileName(""); }} rows={8} maxLength={1_000_000} required spellCheck={false} placeholder="Selecione um arquivo acima ou cole o XML da NF-e." /></label></fieldset>
    {reading && <p role="status">Carregando o arquivo XML selecionado…</p>}
    {error && <Notice tone="error">{error}</Notice>}
    <div className="action-row"><button type="submit" className="primary-button" disabled={busy || reading}>{busy ? "Importando…" : "Importar pré-recebimento"}</button></div>
  </form>;
}

export function ReceiptsScreen() {
  const { can } = useAuth();
  const [warehouse, setWarehouse] = useState<LookupOption | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "import" | "detail" | "edit"; id?: string } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [success, setSuccess] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const saved = () => { setModal(null); setReloadKey((value) => value + 1); setSuccess("Pré-recebimento salvo. A expectativa está disponível para a conferência no mobile."); };
  return <div className="screen-stack">
    {success && <Notice tone="success">{success}</Notice>}
    <Panel title="Planejamento de entrada" description="Cadastre a expectativa e acompanhe a conferência realizada no aplicativo mobile.">
      {can("WAREHOUSE_VIEW") && <div className="toolbar"><ApiLookup resource="warehouses" label="Filtrar por armazém" value={warehouse} onChange={setWarehouse} /></div>}
      <Notice>A criação e a edição do documento não geram saldo físico. LPNs, lotes e posições são registrados na conferência.</Notice>
    </Panel>
    <ResourceTable<DocumentSummary> title="Pré-recebimentos" endpoint="/pre-receipts" permission="PRE_RECEIPT_VIEW" statuses={receiptStatuses} filters={warehouse ? { warehouseId: warehouse.id } : {}} reloadKey={reloadKey} searchPlaceholder="Pesquisar por documento ou identificador" columns={[
      { key: "documentNumber", label: "Documento", render: (row) => row.documentNumber || row.id },
      { key: "status", label: "Situação", render: (row) => <StatusPill value={row.status} /> },
      { key: "expectedAt", label: "Previsão", render: (row) => dateLabel(row.expectedAt) },
      { key: "createdAt", label: "Criado em", render: (row) => dateLabel(row.createdAt) },
    ]} onOpen={(row) => setModal({ mode: "detail", id: row.id })} actions={can("PRE_RECEIPT_CREATE") ? <div className="action-row"><button type="button" className="secondary-button" onClick={() => setModal({ mode: "import" })}>Importar NF-e</button><button type="button" className="primary-button" onClick={() => setModal({ mode: "create" })}>Novo pré-recebimento</button></div> : undefined} rowActions={(row) => <div className="action-row"><button className="secondary-button" type="button" onClick={() => setModal({ mode: "detail", id: row.id })}>Detalhes</button>{can("PRE_RECEIPT_EDIT") && row.status === "PENDENTE" && <button className="secondary-button" type="button" onClick={() => setModal({ mode: "edit", id: row.id })}>Editar</button>}</div>} />
    {modal && <Modal title={modal.mode === "create" ? "Novo pré-recebimento" : modal.mode === "import" ? "Importar XML da NF-e" : modal.mode === "edit" ? "Editar pré-recebimento" : "Detalhes do pré-recebimento"} busy={modalBusy} onClose={() => { if (!modalBusy) setModal(null); }}>
      {modal.mode === "create" ? <DocumentEditor receipt onSaved={saved} onBusyChange={setModalBusy} /> : modal.mode === "import" ? <ImportReceipt onSaved={saved} onBusyChange={setModalBusy} /> : <LoadingDetail<ReceiptDetail> endpoint={`/pre-receipts/${encodeURIComponent(modal.id!)}`}>{(detail) => modal.mode === "edit" ? detail.receipt.status === "PENDENTE" && detail.confirmations.length === 0 ? <DocumentEditor key={detail.receipt.id} receipt existing={detail.receipt} items={detail.items} onSaved={saved} onBusyChange={setModalBusy} /> : <Notice>A conferência deste documento já foi iniciada. Atualize a lista para acompanhar o recebimento.</Notice> : <>
        <DetailGrid values={{ Documento: detail.receipt.documentNumber, Situação: detail.receipt.status, Previsão: dateLabel(detail.receipt.expectedAt), "Criado em": dateLabel(detail.receipt.createdAt), "ID do armazém": detail.receipt.warehouseId, "ID do fornecedor": detail.receipt.partnerId }} />
        <DocumentItems items={detail.items} receipt />
        <h3>Conferências registradas</h3>
        {detail.confirmations.length ? <div className="table-wrap"><table><thead><tr><th scope="col">LPN / posição</th><th scope="col">Quantidade recebida</th><th scope="col">Lote / validade</th><th scope="col">Registrada em</th></tr></thead><tbody>{detail.confirmations.map((confirmation) => <tr key={confirmation.id}><td>{confirmation.lpnCode}<br />{confirmation.positionCode}</td><td>{quantityLabel(confirmation.baseQuantity)} na unidade base<br /><small>{quantityLabel(confirmation.informedQuantity)} embalagens informadas</small></td><td>{confirmation.lot || "—"}<br />{confirmation.expiryDate || "—"}</td><td>{dateLabel(confirmation.confirmedAt)}</td></tr>)}</tbody></table></div> : <p>Nenhuma conferência registrada para este documento.</p>}
      </>}</LoadingDetail>}
    </Modal>}
  </div>;
}
