'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiQuery } from '@/lib/api/hooks';
import { isPage } from '@/lib/api/types';
import type { Entity,Page,Query } from '@/lib/api/types';
import { Loading, Notice, Panel, statusLabel } from './primitives';
export type TableColumn<T> = {key:string;label:string;render?:(row:T)=>ReactNode};
export function ResourceTable<T extends object = Entity>({title,description,endpoint,permission,columns,filters={},statuses=[],actions,rowActions,onOpen,reloadKey=0,searchPlaceholder='Pesquisar registros',emptyMessage='Nenhum registro encontrado. Revise os filtros ou crie um novo cadastro.'}:{title:string;description?:string;endpoint:string;permission:string;columns:TableColumn<T>[];filters?:Query;statuses?:string[];actions?:ReactNode;rowActions?:(row:T)=>ReactNode;onOpen?:(row:T)=>void;reloadKey?:number;searchPlaceholder?:string;emptyMessage?:string}) {
  const {can} = useAuth();
  const [draft,setDraft] = useState(''),[q,setQ] = useState(''),[status,setStatus] = useState(''),[size,setSize] = useState(20);
  const [mobileView,setMobileView] = useState<'cards'|'table'>('cards');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const scrollPending = useRef(false);
  const scope = JSON.stringify([filters,q,status,size]);
  const [pagination,setPagination] = useState({scope:'',page:0});
  const page = pagination.scope === scope ? pagination.page : 0;
  if(pagination.scope !== scope) setPagination({scope,page:0});
  useEffect(() => { const timeout = setTimeout(() => setQ(draft.trim()),350); return () => clearTimeout(timeout); },[draft]);
  const result = useApiQuery<Page<T>>(endpoint,{...filters,page,size,...(q ? {q}:{}),...(status ? {status}:{})},can(permission),reloadKey);
  const valid = result.data && isPage<T>(result.data) ? result.data : null;
  const error = result.error?.message ?? (result.data && !valid ? 'Resposta paginada inválida. Tente atualizar a consulta.' : null);
  useLayoutEffect(() => {
    if (!valid || !scrollPending.current) return;
    scrollPending.current = false;
    if (window.matchMedia('(max-width: 640px)').matches) toolbarRef.current?.scrollIntoView({block:'start',behavior:'instant'});
  },[valid]);
  const showPage = (next:number) => { scrollPending.current = true; setPagination({scope,page:next}); };
  return <Panel title={title} description={description} actions={actions}>
    {!can(permission) ? <Notice>Seu perfil não tem acesso a esta consulta.</Notice> : <>
      <div className="table-toolbar" ref={toolbarRef}><label className="search-field"><span className="sr-only">{searchPlaceholder}</span><input type="search" maxLength={160} placeholder={searchPlaceholder} value={draft} onChange={event => setDraft(event.target.value)}/></label>
        {statuses.length > 0 && <label className="compact-field"><span>Situação</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">Todas</option>{statuses.map(value => <option value={value} key={value}>{statusLabel(value)}</option>)}</select></label>}
        <button className="secondary-button" type="button" onClick={result.reload} disabled={result.loading}>Atualizar</button>
      </div>
      {error && <Notice tone="error">{error} <button className="text-button" onClick={result.reload}>Tentar novamente</button></Notice>}
      {result.loading && <Loading/>}
      {valid && <>
        <div className="mobile-table-controls"><span>{valid.totalElements} {valid.totalElements === 1 ? 'registro' : 'registros'}</span><div className="table-view-toggle" role="group" aria-label="Visualização dos registros"><button type="button" aria-pressed={mobileView==='cards'} onClick={()=>setMobileView('cards')}>Lista</button><button type="button" aria-pressed={mobileView==='table'} onClick={()=>setMobileView('table')}>Tabela</button></div></div>
        {mobileView==='table'&&<p className="table-scroll-hint">Deslize para comparar todas as colunas.</p>}
        <div className="table-wrap" data-mobile-view={mobileView} tabIndex={0} role="region" aria-label={`Tabela ${title}`}><table className="data-table" role="table" aria-label={title}><thead role="rowgroup"><tr role="row">{columns.map(column => <th role="columnheader" scope="col" key={column.key}>{column.label}</th>)}{rowActions && <th role="columnheader" scope="col">Ações</th>}</tr></thead>
          <tbody role="rowgroup">{valid.content.length === 0 ? <tr role="row" className="empty-row"><td role="cell" colSpan={columns.length+(rowActions?1:0)} className="empty-state">{emptyMessage}</td></tr> : valid.content.map((row,index) => <tr role="row" key={String((row as Entity).id ?? (row as Entity).code ?? index)}>{columns.map((column,columnIndex) => <td role="cell" key={column.key}><span className="mobile-cell-label" aria-hidden="true">{column.label}</span><div className="table-cell-value">{onOpen && columnIndex === 0 ? <button className="table-link" type="button" onClick={() => onOpen(row)}>{column.render?.(row) ?? String((row as Entity)[column.key] ?? '—')}</button> : column.render?.(row) ?? String((row as Entity)[column.key] ?? '—')}</div></td>)}{rowActions && <td role="cell" className="row-actions-cell"><div className="action-row">{rowActions(row)}</div></td>}</tr>)}</tbody></table></div>
        <div className="pagination"><label>Por página <select aria-label="Registros por página" value={size} onChange={event => {scrollPending.current=true;setSize(Number(event.target.value));}}>{[10,20,50,100].map(value => <option value={value} key={value}>{value}</option>)}</select></label>
          <span aria-live="polite">{valid.totalElements} registros · Página {valid.totalPages === 0 ? 0 : valid.page+1} de {valid.totalPages}</span><div className="action-row"><button className="secondary-button" disabled={valid.first || valid.page === 0} onClick={()=>showPage(page-1)}>Anterior</button><button className="secondary-button" disabled={valid.last} onClick={()=>showPage(page+1)}>Próxima</button></div>
        </div>
      </>}
    </>}
  </Panel>;
}
