'use client';
import { useEffect,useId,useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { useApiQuery } from '@/lib/api/hooks';
import { isPage, permissionFor } from '@/lib/api/types';
import type { LookupOption,Page,Query } from '@/lib/api/types';
import { Loading,Notice } from './primitives';
export function ApiLookup({resource,label,value,onChange,filters={},disabled=false,required=false,permission,helperText}:{resource:string;label:string;value:LookupOption|null;onChange:(value:LookupOption|null)=>void;filters?:Query;disabled?:boolean;required?:boolean;permission?:string;helperText?:string}) {
  const {can} = useAuth(), id=useId();
  const [open,setOpen] = useState(false),[draft,setDraft]=useState(''),[q,setQ]=useState('');
  const scope=JSON.stringify([resource,filters,q]),[pagination,setPagination]=useState({scope:'',page:0});
  const page=pagination.scope===scope?pagination.page:0;
  if(pagination.scope !== scope) setPagination({scope,page:0});
  const allowed=can(permission??permissionFor(resource));
  useEffect(()=>{const timer=setTimeout(()=>setQ(draft.trim()),300);return()=>clearTimeout(timer);},[draft]);
  const result=useApiQuery<Page<LookupOption>>(`/lookups/${resource}`,{...filters,page,size:5,...(q?{q}:{})},open&&allowed&&!disabled);
  const options=result.data&&isPage<LookupOption>(result.data)?result.data:null;
  return <div className="field lookup-field"><span id={`${id}-label`}>{label}{required?' *':''}</span>
    <div className="lookup-selection"><button className="lookup-trigger" type="button" disabled={disabled||!allowed} onClick={()=>setOpen(!open)} aria-expanded={open} aria-controls={`${id}-options`} aria-labelledby={`${id}-label ${id}-value`}><span id={`${id}-value`}>{value?.label??'Selecionar…'}</span><span aria-hidden="true">⌄</span></button>{value&&!disabled&&<button type="button" className="icon-button" onClick={()=>onChange(null)} aria-label={`Limpar ${label}`}>×</button>}</div>
    {helperText&&<small className="field-help">{helperText}</small>}{!allowed&&<small>Seu perfil não permite consultar estas opções.</small>}
    {open&&allowed&&!disabled&&<div className="lookup-options" id={`${id}-options`}>
      <label className="sr-only" htmlFor={`${id}-search`}>Pesquisar {label}</label><input id={`${id}-search`} type="search" maxLength={160} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={`Pesquisar ${label.toLowerCase()}`} onKeyDown={event=>{if(event.key==='Escape')setOpen(false);}}/>
      {result.loading&&<Loading message="Buscando opções…"/>}{result.error&&<Notice tone="error">{result.error.message}<button type="button" className="text-button" onClick={result.reload}>Tentar novamente</button></Notice>}
      {options&&<><ul aria-label={`Opções de ${label}`}>{options.content.map(option=><li key={option.id}><button type="button" onClick={()=>{onChange(option);setOpen(false);}} aria-pressed={value?.id===option.id}>{option.label}</button></li>)}{options.content.length===0&&<li className="empty-state">Nenhuma opção encontrada.</li>}</ul><div className="lookup-pagination"><button type="button" disabled={options.first} onClick={()=>setPagination({scope,page:page-1})}>Anterior</button><small>{options.totalPages?options.page+1:0}/{options.totalPages}</small><button type="button" disabled={options.last} onClick={()=>setPagination({scope,page:page+1})}>Próxima</button></div></>}
      <button className="text-button" type="button" onClick={()=>setOpen(false)}>Fechar opções</button>
    </div>}
  </div>;
}
