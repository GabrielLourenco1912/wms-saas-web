'use client';
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { formatDate, formatDecimal } from '@/lib/api/types';

export function Panel({title,description,children,actions}:{title:string;description?:string;children:ReactNode;actions?:ReactNode}) {
  return <section className="panel"><header className="panel-header"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions&&<div className="panel-header-actions">{actions}</div>}</header>{children}</section>;
}
export function Notice({children,tone='info'}:{children:ReactNode;tone?:'error'|'success'|'info'}) {
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}
export function Modal({title,onClose,children,busy=false}:{title:string;onClose:()=>void;children:ReactNode;busy?:boolean}) {
  const ref = useRef<HTMLDialogElement>(null), id = useId();
  useEffect(() => { if (!ref.current?.open) ref.current?.showModal(); },[]);
  const close = () => { if (!busy) onClose(); };
  return <dialog ref={ref} className="wms-modal" aria-labelledby={id} onCancel={event => { event.preventDefault(); close(); }}>
    <header className="modal-header"><h2 id={id}>{title}</h2><button className="icon-button" type="button" onClick={close} disabled={busy} aria-label="Fechar janela">×</button></header>{children}
  </dialog>;
}
const labels:Record<string,string> = {ACTIVE:'Ativo',INVITED:'Aguardando verificação',LOCKED:'Bloqueado',DISABLED:'Desativado',PENDENTE:'Pendente',EM_RECEBIMENTO:'Em recebimento',ATENDIDO:'Atendido',PARCIAL:'Parcial',EM_EXECUCAO:'Em execução',EM_CONTAGEM:'Em contagem',CONCLUIDO:'Concluído',CONCLUIDA:'Concluída',CANCELADO:'Cancelado',CANCELADA:'Cancelada',DIVERGENTE:'Divergente',ABERTA:'Aberta',CONFERIDA:'Conferida',DESPACHADA:'Despachada',ATIVO:'Ativo',SEPARADO:'Separado',EXPEDIDO:'Expedido',DISPONIVEL:'Disponível',OCUPADA:'Ocupada',LIVRE:'Livre',BLOQUEADO:'Bloqueado',BLOQUEADA:'Bloqueada',RECEBIMENTO:'Recebimento',ARMAZENAGEM:'Armazenagem',EXPEDICAO:'Expedição',TRANSFERENCIA:'Transferência',PUTAWAY:'Armazenagem',PICKING:'Separação',CLIENTE:'Cliente',FORNECEDOR:'Fornecedor',AMBOS:'Cliente e fornecedor',GESTOR:'Gestor',OPERADOR:'Operador'};
export function statusLabel(value:string) { return labels[value] ?? value.replaceAll('_',' ').toLowerCase().replace(/^./,s=>s.toUpperCase()); }
export function StatusPill({value}:{value:string}) {
  const tone = /CANCEL|DIVERG|BLOQUE|LOCKED|DISABLED/.test(value) ? 'danger' : /CONCLU|ATENDIDO|ACTIVE|DISPONIVEL|LIVRE/.test(value) ? 'success' : /PENDENTE|INVITED/.test(value) ? 'warning' : 'info';
  return <span className={`status-pill status-${tone}`}>{statusLabel(value)}</span>;
}
export function DetailGrid({values}:{values:Record<string,unknown>}) {
  return <dl className="detail-grid">{Object.entries(values).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value == null || value === '' ? '—' : typeof value === 'boolean' ? value ? 'Sim' : 'Não' : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|$)/.test(value) ? formatDate(value) : typeof value === 'number' ? formatDecimal(value) : String(value)}</dd></div>)}</dl>;
}
export function Loading({message='Carregando dados…'}:{message?:string}) { return <div className="loading-state" role="status"><span className="spinner" aria-hidden="true"/>{message}</div>; }
