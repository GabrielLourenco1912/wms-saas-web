'use client';
import {useState} from 'react';
import {ApiLookup} from '@/components/wms/ApiLookup';
import {ResourceTable} from '@/components/wms/ResourceTable';
import {DetailGrid,Loading,Modal,Notice,Panel,StatusPill} from '@/components/wms/primitives';
import {useAuth} from '@/features/auth/AuthProvider';
import {useApiQuery} from '@/lib/api/hooks';
import {formatDate,formatDecimal,rows,text} from '@/lib/api/types';
import type {Entity,LookupOption} from '@/lib/api/types';
function InventoryDetail({id}:{id:string}){
 const result=useApiQuery<Entity>(`/inventories/${encodeURIComponent(id)}`);
 if(result.loading)return <Loading/>;
 if(result.error)return <Notice tone="error">{result.error.message}<button type="button" className="text-button" onClick={result.reload}>Tentar novamente</button></Notice>;
 if(!result.data)return null;
 const inventory=result.data.inventory as Entity;
 return <><DetailGrid values={{Inventário:inventory.id,Situação:inventory.status,'Posição (ID)':inventory.positionId,'Responsável (ID)':inventory.responsibleUserId,'Aberto em':formatDate(inventory.createdAt),'Concluído em':formatDate(inventory.completedAt)}}/><Notice>A contagem física e a reconciliação são realizadas no aplicativo móvel pelas pessoas autorizadas. Esta tela acompanha os valores registrados.</Notice><div className="table-wrap" tabIndex={0}><table><caption>Snapshot e contagens do inventário</caption><thead><tr>{['Produto','LPN','Lote / validade','Teórico','Contado','Registrado em'].map(value=><th scope="col" key={value}>{value}</th>)}</tr></thead><tbody>{rows(result.data.items).map(item=><tr key={text(item,'id')}><td>{text(item,'sku')}</td><td>{text(item,'lpnCode')}</td><td>{text(item,'lot')}<small className="cell-secondary">{formatDate(item.expiryDate)}</small></td><td>{formatDecimal(item.theoreticalQuantity)}</td><td>{item.countedQuantity===null?'Não contado':formatDecimal(item.countedQuantity)}</td><td>{formatDate(item.countedAt)}</td></tr>)}</tbody></table></div></>;
}
export function InventoriesScreen(){
 const {can}=useAuth(),[warehouse,setWarehouse]=useState<LookupOption|null>(null),[position,setPosition]=useState<LookupOption|null>(null),[selected,setSelected]=useState<string|null>(null);
 return <div className="screen-stack"><Panel title="Acompanhamento de inventários" description="Consulte contagens e ajustes sem modificar o saldo físico pelo painel."><div className="toolbar">{can('WAREHOUSE_VIEW')&&<><ApiLookup resource="warehouses" label="Armazém" value={warehouse} onChange={value=>{setWarehouse(value);setPosition(null);}}/><ApiLookup resource="positions" label="Posição" value={position} onChange={setPosition} filters={warehouse?{warehouseId:warehouse.id}:{}}/></>}</div></Panel><ResourceTable title="Inventários" endpoint="/inventories" permission="INVENTORY_VIEW" statuses={['PENDENTE','EM_CONTAGEM','CONCLUIDO','CANCELADO']} filters={{...(warehouse?{warehouseId:warehouse.id}:{}),...(position?{positionId:position.id}:{})}} columns={[{key:'id',label:'Inventário'},{key:'positionId',label:'Posição (ID)'},{key:'responsibleUserId',label:'Responsável (ID)'},{key:'status',label:'Situação',render:row=><StatusPill value={text(row,'status')}/>},{key:'createdAt',label:'Aberto em',render:row=>formatDate(row.createdAt)}]} onOpen={row=>setSelected(text(row,'id'))} rowActions={row=><button className="secondary-button" onClick={()=>setSelected(text(row,'id'))}>Ver contagens</button>}/>{selected&&<Modal title="Contagens do inventário" onClose={()=>setSelected(null)}><InventoryDetail id={selected}/></Modal>}</div>;
}
