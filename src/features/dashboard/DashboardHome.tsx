'use client';
import Link from 'next/link';
import {useState} from 'react';
import {ApiLookup} from '@/components/wms/ApiLookup';
import {Notice,Panel,StatusPill} from '@/components/wms/primitives';
import {ResourceTable} from '@/components/wms/ResourceTable';
import {useAuth} from '@/features/auth/AuthProvider';
import {BrandMark} from '@/features/branding/BrandMark';
import {useApiQuery} from '@/lib/api/hooks';
import {isPage,text} from '@/lib/api/types';
import type {Entity,LookupOption,Page,Query} from '@/lib/api/types';
const queues=[
  {title:'Entradas previstas',description:'Pré-recebimentos pendentes',resource:'pre-receipts',permission:'PRE_RECEIPT_VIEW',status:'PENDENTE',section:'receipts'},
  {title:'Pedidos pendentes',description:'Aguardando planejamento',resource:'orders',permission:'ORDER_VIEW',status:'PENDENTE',section:'orders'},
  {title:'Tarefas pendentes',description:'Aguardando início',resource:'tasks',permission:'TASK_VIEW',status:'PENDENTE',section:'tasks'},
  {title:'Bloqueios ativos',description:'Restrições de movimentação',resource:'stock-blocks',permission:'STOCK_VIEW',active:true,section:'stock'},
];
function QueueCard({queue,filters,revision}:{queue:typeof queues[number];filters:Query;revision:number}) {
 const result=useApiQuery<Page<Entity>>(`/${queue.resource}`,{...filters,page:0,size:1,...('status'in queue?{status:queue.status}:{active:true})},true,revision);
 return <Link className="metric-card queue-card" href={`/gestao/${queue.section}`}><span>{queue.title}</span><strong>{result.loading?'…':result.error?'—':result.data&&isPage(result.data)?result.data.totalElements:'—'}</strong><small>{result.error?'Consulta indisponível; tente atualizar':queue.description}</small></Link>;
}
export function DashboardHome(){
 const {can,user}=useAuth(),[warehouse,setWarehouse]=useState<LookupOption|null>(null),[revision,setRevision]=useState(0);
 const filters=warehouse?{warehouseId:warehouse.id}:{};
 return <div className="screen-stack"><div className="welcome-banner"><div><span className="eyebrow">WMS · Gestão</span><h2>Olá, {user?.name.split(' ')[0]}.</h2><p>Acompanhe as pendências e planeje os próximos passos da operação.</p></div><span className="welcome-mark" aria-hidden="true"><BrandMark size={88} inverse /></span></div>
 <div className="dashboard-toolbar">{can('WAREHOUSE_VIEW')&&<ApiLookup resource="warehouses" label="Armazém" value={warehouse} onChange={setWarehouse} helperText="Sem seleção, todos os armazéns permitidos."/>}<button type="button" className="secondary-button dashboard-refresh" aria-label="Atualizar painel" onClick={()=>setRevision(value=>value+1)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9"/></svg><span>Atualizar painel</span></button></div>
 <div className="metrics-grid">{queues.filter(queue=>can(queue.permission)).map(queue=><QueueCard key={queue.resource} queue={queue} filters={filters} revision={revision}/>)}</div>
 {!queues.some(queue=>can(queue.permission))&&<Notice>Seu perfil não tem acesso às filas operacionais. Consulte os módulos disponíveis no menu.</Notice>}
 {can('TASK_VIEW')&&<ResourceTable title="Fila de tarefas" description="Consulte a situação e abra o módulo de tarefas para acompanhar o histórico." endpoint="/tasks" permission="TASK_VIEW" filters={filters} reloadKey={revision} columns={[{key:'type',label:'Tipo',render:row=><StatusPill value={text(row,'type')}/>},{key:'id',label:'Tarefa'},{key:'status',label:'Situação',render:row=><StatusPill value={text(row,'status')}/>},{key:'assignedUserId',label:'Responsável',render:row=>text(row,'assignedUserId','Aguardando início')}]} statuses={['PENDENTE','EM_EXECUCAO','CONCLUIDA','DIVERGENTE','CANCELADA']}/>}
 <Panel title="Planejamento e conferência" description="Cada etapa mantém suas próprias permissões."><div className="workflow-guide"><div><b>01</b><h3>Planeje no painel</h3><p>Cadastre a estrutura e os produtos, registre entradas previstas e organize pedidos em ondas.</p></div><div><b>02</b><h3>Acompanhe a operação</h3><p>Os operadores conferem códigos e quantidades no aplicativo. Consulte o andamento e trate as exceções.</p></div><div><b>03</b><h3>Confira a rastreabilidade</h3><p>Consulte os saldos atuais e as movimentações registradas no livro razão.</p></div></div></Panel>
 </div>;
}
