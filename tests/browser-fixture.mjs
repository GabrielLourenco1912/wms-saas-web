import http from 'node:http';
const id=n=>'01J'+String(n).padStart(23,'0');
const now='2026-10-15T12:00:00Z';
export const permissions=['WAREHOUSE_VIEW','WAREHOUSE_CREATE','WAREHOUSE_EDIT','PRODUCT_VIEW','PRODUCT_CREATE','PRODUCT_EDIT','ORDER_VIEW','ORDER_CREATE','ORDER_EDIT','ORDER_CANCEL','WAVE_VIEW','WAVE_CREATE','WAVE_CANCEL','PRE_RECEIPT_VIEW','PRE_RECEIPT_CREATE','PRE_RECEIPT_EDIT','RECEIPT_VIEW','PUTAWAY_VIEW','PICKING_VIEW','TASK_VIEW','TASK_CANCEL','TASK_QUANTITY_OVERRIDE','SHIPMENT_VIEW','STOCK_VIEW','STOCK_BLOCK','STOCK_UNBLOCK','TRANSFER_VIEW','TRANSFER_EXECUTE','INVENTORY_VIEW','AUDIT_VIEW','USER_VIEW','USER_CREATE','USER_EDIT','USER_PROFILE_ASSIGN','PROFILE_VIEW','PROFILE_EDIT'];
const user=(userId,name,email,access)=>({id:userId,name,email,status:'ACTIVE',profileCode:'GESTOR',profileActive:true,permissions:access,emailVerifiedAt:now,createdAt:now,updatedAt:now,lastLoginAt:now,lockedUntil:null});
const jwt=subject=>`${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:subject})).toString('base64url')}.fixture`;
export async function startFixture(){
 const manager=user(id(1),'Marina Gestora','gestor@example.test',permissions),reader=user(id(2),'Ana Consulta','leitura@example.test',['PRODUCT_VIEW']);
 const records={
 warehouses:[{id:id(10),name:'Centro de distribuição',taxId:'12345678000190',address:'Rua do Armazém, 100',active:true,createdAt:now,updatedAt:now}],
 zones:[{id:id(11),warehouseId:id(10),name:'Estocagem',controlType:'PADRAO',active:true,createdAt:now,updatedAt:now}],
 positions:[{id:id(12),zoneId:id(11),code:'A-01-01',type:'PRATELEIRA',weightCapacityKg:1000,volumeCapacityM3:50,purpose:'ARMAZENAGEM',active:true,status:'LIVRE',createdAt:now,updatedAt:now}],
 categories:Array.from({length:12},(_,i)=>({id:id(100+i),name:`Categoria ${i+1}`,description:'Categoria de teste',active:true,createdAt:now,updatedAt:now})),
 products:Array.from({length:45},(_,i)=>({id:id(200+i),categoryId:id(100),sku:`SKU-${String(i+1).padStart(3,'0')}`,name:`Produto ${String(i+1).padStart(2,'0')}`,lotControlled:true,expiryControlled:true,shelfLifeDays:365,baseUnit:'UN',unitWeightKg:1,unitVolumeM3:.002,active:true,createdAt:now,updatedAt:now})),
 partners:[{id:id(20),legalName:'Distribuidora Exemplo',taxId:'12345678000190',type:'AMBOS',active:true,createdAt:now,updatedAt:now}],
 'product-packages':[{id:id(21),productId:id(200),type:'CX',conversionFactor:12,barcode:'7890000000011',weightKg:12,volumeM3:.024,active:true,createdAt:now,updatedAt:now}],
 'pre-receipts':[{id:id(30),warehouseId:id(10),partnerId:id(20),documentNumber:'NF-123',type:'ENTRADA',status:'PENDENTE',expectedAt:now,createdAt:now}],
 orders:[{id:id(31),warehouseId:id(10),partnerId:id(20),documentNumber:'PV-456',type:'SAIDA',status:'PENDENTE',expectedAt:now,createdAt:now,items:[{id:id(32),productId:id(200),sku:'SKU-001',productName:'Produto 01',requestedQuantity:24,fulfilledQuantity:0,pickedQuantity:0,reservedQuantity:0}]}],
 waves:[{id:id(33),warehouseId:id(10),code:'ONDA-01',status:'PENDENTE',createdAt:now,cancelledAt:null,orderIds:[id(31)],tasks:[]}],
 tasks:[{id:id(34),type:'PICKING',priority:1,waveId:id(33),orderId:id(31),assignedUserId:null,originPositionId:id(12),destinationPositionId:null,lpnId:id(40),productId:id(200),targetQuantity:24,actualQuantity:null,status:'PENDENTE',createdAt:now,startedAt:null,completedAt:null,cancelledAt:null,cancellationReason:null}],
 'putaway-tasks':[],'picking-tasks':[],divergences:[],shipments:[],
 lpns:[{id:id(40),trackingCode:'LPN-001',positionId:id(12),status:'ATIVO',outboundOrderId:null,createdAt:now}],
 stock:[{id:id(41),productId:id(200),sku:'SKU-001',productName:'Produto 01',lpnId:id(40),lpnCode:'LPN-001',positionId:id(12),positionCode:'A-01-01',lot:'LOTE-01',expiryDate:'2027-10-15',quantity:120,reservedQuantity:24,availableQuantity:96,blockStatus:'LIVRE',entryAt:now}],
 'stock-blocks':[],transfers:[],
 'stock-transactions':[{id:id(42),productId:id(200),userId:id(1),taskId:null,lpnId:id(40),movementType:'ENTRADA',quantity:120,previousPositionId:null,newPositionId:id(12),resultingBalance:120,occurredAt:now,operationId:id(43),sequence:1,stockId:id(41),recordedLot:'LOTE-01',recordedExpiryDate:'2027-10-15',recordedEntryAt:now,previousBalance:0,reason:'Conferência de entrada'}],
 inventories:[{id:id(44),warehouseId:id(10),positionId:id(12),responsibleUserId:id(2),status:'CONCLUIDO',createdAt:now,completedAt:now,cancelledAt:null}],
 users:[manager,reader],profiles:[{code:'GESTOR',name:'Gestor',active:true,permissions,createdAt:now,updatedAt:now},{code:'OPERADOR',name:'Operador',active:true,permissions:['WAREHOUSE_VIEW','PRODUCT_VIEW','STOCK_VIEW'],createdAt:now,updatedAt:now}],permissions:permissions.map(code=>({code,functionalRequirement:'RF016'})),
 };
 const calls=[],refreshCookies=new Map(),challenges=new Map(),idempotent=new Map();let sequence=1000,refreshes=0;
 const state={calls,records,get refreshes(){return refreshes;},expireProducts:false};
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://fixture'),path=url.pathname.split('/').filter(Boolean);let body='';for await(const chunk of req)body+=chunk;
  const data=body?JSON.parse(body):null;
  calls.push({method:req.method,path:url.pathname,query:Object.fromEntries(url.searchParams),body:data,rawBody:body,headers:req.headers});
  const send=(status,data,message='Operação confirmada',cookie)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',...(cookie?{'set-cookie':cookie}:{})});res.end(JSON.stringify({timestamp:now,status:`${status} OK`,message,data}));};
  if(req.headers['x-client-type']!=='WEB')return send(400,null,'Header WEB ausente.');
  const auth=path[1]==='auth',action=path[2];
  if(auth){
   if(action==='login'||action==='forgot-password'){
    const current=records.users.find(user=>user.email===data.email);if(!current)return send(400,null,'Conta indisponível.');
    const challengeId=id(sequence++);challenges.set(challengeId,current);return send(202,{challengeId,purpose:action==='login'?'MFA_LOGIN':'PASSWORD_RESET',maskedEmail:'m***@example.test',expiresAt:new Date(Date.now()+600000).toISOString(),maxAttempts:5});
   }
   const makeSession=(current)=>{const cookie=`fixture-${sequence++}`;refreshCookies.set(cookie,current);return send(200,{issuer:'fixture',issuedAt:now,expiresAt:new Date(Date.now()+900000).toISOString(),subject:current.id,token:jwt(current.id),refreshTokenExpiresAt:new Date(Date.now()+86400000).toISOString()},'Autenticado',`refresh_token=${cookie}; Path=/api/auth; HttpOnly; SameSite=Lax`);};
   if(action==='challenge'){
    const current=challenges.get(data.challengeId);if(!current||data.code!=='012345')return send(400,null,'Código inválido.');challenges.delete(data.challengeId);return makeSession(current);
   }
   if(action==='refresh'){
    refreshes++;const cookie=req.headers.cookie?.match(/(?:^|;\s*)refresh_token=([^;]+)/)?.[1];const current=refreshCookies.get(cookie);if(!current)return send(401,null,'Sessão indisponível.');refreshCookies.delete(cookie);return makeSession(current);
   }
   if(action==='logout'){const cookie=req.headers.cookie?.match(/refresh_token=([^;]+)/)?.[1];refreshCookies.delete(cookie);return send(200,null,'Sessão encerrada','refresh_token=; Path=/api/auth; Max-Age=0; HttpOnly; SameSite=Lax');}
   if(action==='reset-password')return send(200,null);
  }
  const token=req.headers.authorization?.split(' ')[1];let actor;
  try{actor=records.users.find(user=>user.id===JSON.parse(Buffer.from(token.split('.')[1],'base64url')).sub);}catch{}
  if(!actor)return send(401,null,'Não autenticado.');
  if(actor.id===reader.id&&!['products','categories','product-packages','lookups','search'].includes(path[1])&&!(path[1]==='users'&&path[2]==='me'))return send(403,null,'Sem permissão.');
  if(path[1]==='users'&&path[2]==='me')return send(200,actor);
  let resource=path[1],recordId=path[2],lookup=false;
  if(resource==='lookups'||resource==='search'){lookup=resource==='lookups';resource=path[2];recordId=undefined;}
  if(resource==='products'&&path[3]==='packages'){resource='product-packages';recordId=path[4];}
  if(state.expireProducts&&resource==='products'&&req.method==='GET'){state.expireProducts=false;return send(401,null,'Access token expirado.');}
  if(url.searchParams.get('q')==='erro de rede')return send(503,null,'Servidor temporariamente indisponível.');
  if(req.method==='GET'){
   if(resource==='tasks'&&path[3]==='history')return send(200,{content:[{id:id(50),taskId:recordId,previousStatus:null,newStatus:'PENDENTE',userId:manager.id,operationId:id(51),reason:'Tarefa gerada',recordedAt:now}],page:0,size:20,totalElements:1,totalPages:1,first:true,last:true});
   const list=records[resource];if(!list)return send(404,null,'Recurso não encontrado.');
   if(recordId){const row=list.find(row=>row.id===recordId||row.code===recordId);if(!row)return send(404,null,'Registro não encontrado.');
    if(resource==='pre-receipts')return send(200,{receipt:row,items:[{id:id(32),productId:id(200),sku:'SKU-001',productName:'Produto 01',requestedQuantity:24,fulfilledQuantity:0,remainingQuantity:24}],confirmations:[]});
    if(resource==='tasks')return send(200,{task:row,history:[]});
    if(resource==='inventories')return send(200,{inventory:row,items:[{id:id(55),sku:'SKU-001',lpnCode:'LPN-001',theoreticalQuantity:120,countedQuantity:120,countedAt:now,lot:'LOTE-01',expiryDate:'2027-10-15'}]});
    return send(200,row);
   }
   let filtered=list.filter(row=>{for(const [key,value]of url.searchParams){if(['page','size','q'].includes(key))continue;if(row[key]!==undefined&&String(row[key])!==value)return false;}return !url.searchParams.get('q')||JSON.stringify(row).toLowerCase().includes(url.searchParams.get('q').toLowerCase());});
   const page=Number(url.searchParams.get('page')??0),size=Number(url.searchParams.get('size')??(lookup?5:20));const totalElements=filtered.length;
   filtered=filtered.slice(page*size,page*size+size);if(lookup)filtered=filtered.map(row=>({id:row.id??row.code,label:row.name??row.legalName??row.trackingCode??row.code??row.sku??row.documentNumber??row.id}));
   return send(200,{content:filtered,page,size,totalElements,totalPages:Math.ceil(totalElements/size),first:page===0,last:(page+1)*size>=totalElements});
  }
  if(req.method==='POST'&&resource==='users'){records.users.push(user(id(sequence++),data.name,data.email,[]));return send(201,{challengeId:id(sequence++),purpose:'EMAIL_VERIFICATION',maskedEmail:'c***@example.test',expiresAt:new Date(Date.now()+600000).toISOString(),maxAttempts:5});}
  if(req.method==='POST'&&resource==='stock'&&path[3]==='block'){
   const key=req.headers['idempotency-key'];if(!key)return send(400,null,'Chave ausente.');if(idempotent.has(key))return send(200,idempotent.get(key));const stock=records.stock.find(row=>row.id===recordId);stock.blockStatus='BLOQUEADO';stock.availableQuantity=0;const block={id:id(sequence++),stockId:stock.id,type:'SALDO',active:true,reason:data.reason,createdAt:now};records['stock-blocks'].push(block);idempotent.set(key,block);return send(200,block);
  }
  if(req.method==='POST'&&records[resource]){const row={...data,id:id(sequence++),createdAt:now,updatedAt:now};records[resource].push(row);return send(201,row);}
  if(req.method==='PUT'&&records[resource]){const index=records[resource].findIndex(row=>row.id===recordId||row.code===recordId);if(index<0)return send(404,null);const row={...records[resource][index],...data,updatedAt:now};records[resource][index]=row;return send(200,row);}
  return send(404,null,'Operação não mapeada no fixture.');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {...state,get refreshes(){return refreshes;},get expireProducts(){return state.expireProducts;},set expireProducts(value){state.expireProducts=value;},url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
