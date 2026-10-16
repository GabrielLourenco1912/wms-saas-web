import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
import {startFixture} from '../tests/browser-fixture.mjs';

if(!fs.existsSync('.next/BUILD_ID'))throw new Error('Execute npm run build antes dos testes de navegador.');
const fixture=await startFixture(),portServer=net.createServer();await new Promise(resolve=>portServer.listen(0,'127.0.0.1',resolve));const port=portServer.address().port;await new Promise(resolve=>portServer.close(resolve));
const base=`http://127.0.0.1:${port}`,out=process.env.WMS_SCREENSHOT_DIR??'/tmp/wms-web-review';fs.mkdirSync(out,{recursive:true});
const standalone=fs.existsSync('.next/standalone/server.js');
if(standalone){fs.cpSync('.next/static','.next/standalone/.next/static',{recursive:true});if(fs.existsSync('public'))fs.cpSync('public','.next/standalone/public',{recursive:true});}
const app=spawn(process.execPath,standalone?['.next/standalone/server.js']:['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,WMS_API_BASE_URL:fixture.url,HOSTNAME:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']});let log='';app.stdout.on('data',chunk=>{log+=chunk;});app.stderr.on('data',chunk=>{log+=chunk;});
let browser;const failures=[];let passed=0;
async function scenario(name,run){try{await run();console.log(`✓ ${name}`);passed++;}catch(error){failures.push(name);throw error;}}
async function login(page,email='gestor@example.test'){
 await page.goto(`${base}/auth/login`);await page.getByLabel('E-mail',{exact:true}).fill(email);await page.getByLabel('Senha',{exact:true}).fill('senha123');await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByLabel('Código de verificação').fill('012345');await page.getByRole('button',{name:'Confirmar e entrar'}).click();await page.waitForURL(base+'/');await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();
}
try{
 for(let i=0;i<120;i++){try{const response=await fetch(base+'/auth/login');if(response.ok)break;}catch{}if(i===119)throw new Error('Next não iniciou: '+log);await delay(250);}
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();const runtimeErrors=[];page.on('pageerror',error=>runtimeErrors.push(error.message));
 await scenario('autenticação real do cliente: challenge202, código com zero e cookie HttpOnly pelo proxy',async()=>{
  await page.goto(base);await page.waitForURL('**/auth/login');await page.getByLabel('E-mail',{exact:true}).fill('gestor@example.test');await page.getByLabel('Senha',{exact:true}).fill('senha123');await page.getByRole('button',{name:'Continuar',exact:true}).click();await page.getByRole('heading',{name:'Confirme seu acesso'}).waitFor();assert(!fixture.calls.some(call=>call.path==='/api/users/me'));
  await page.getByLabel('Código de verificação').fill('012345');await page.getByRole('button',{name:'Confirmar e entrar'}).click();await page.waitForURL(base+'/');await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();
  const cookie=(await context.cookies()).find(cookie=>cookie.name==='refresh_token');assert(cookie?.httpOnly);assert.equal(cookie.path,'/api/backend/auth');assert.equal(await page.evaluate(()=>document.cookie.includes('refresh_token')),false);assert.equal(await page.evaluate(()=>Object.keys(localStorage).some(key=>/token/i.test(key))),false);
  await page.screenshot({path:path.join(out,'dashboard-desktop.png'),fullPage:true});
 });
 await scenario('paginação20, pesquisa na API, página seguinte e erro recuperável',async()=>{
  await page.goto(base+'/gestao/products');await page.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();assert(fixture.calls.some(call=>call.path==='/api/products'&&call.query.size==='20'));
  await page.getByRole('button',{name:'Próxima',exact:true}).click();await page.getByRole('cell',{name:'SKU-021',exact:true}).waitFor();
  const search=page.getByRole('searchbox',{name:'Pesquisar SKU, nome ou código de barras'});await search.fill('Produto 45');await page.getByRole('cell',{name:'SKU-045',exact:true}).waitFor();assert(fixture.calls.some(call=>call.path==='/api/products'&&call.query.q==='Produto 45'&&call.query.page==='0'));
  await search.fill('erro de rede');await page.getByRole('alert').filter({hasText:'Servidor temporariamente indisponível.'}).waitFor();await search.fill('');await page.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();await page.screenshot({path:path.join(out,'products-desktop.png'),fullPage:true});
 });
 await scenario('dropdown pesquisável5 e formulário de produto preservam vínculo selecionado',async()=>{
  await page.getByRole('button',{name:'Adicionar produto',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:/Categoria.*Selecionar/}).click();await dialog.getByRole('button',{name:'Categoria 1',exact:true}).waitFor();assert(fixture.calls.some(call=>call.path==='/api/lookups/categories'&&call.query.size==='5'));
  await dialog.getByRole('searchbox',{name:'Pesquisar Categoria'}).fill('Categoria 12');await dialog.getByRole('button',{name:'Categoria 12',exact:true}).click();await dialog.getByRole('button',{name:/Categoria.*Categoria 12/}).waitFor();const bounds=await dialog.boundingBox();assert(bounds.x>0&&bounds.y>0,'modal deve estar centralizado');await page.screenshot({path:path.join(out,'product-form.png')});await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await dialog.waitFor({state:'detached'});
 });
 await scenario('cadastro de armazém envia contrato completo e aparece após consulta',async()=>{
  await page.goto(base+'/gestao/warehouse');await page.getByRole('button',{name:'Adicionar armazém',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Nome',{exact:false}).fill('Armazém novo');await dialog.getByLabel('CNPJ',{exact:false}).fill('12.345.678/0001-90');await dialog.getByLabel('Endereço',{exact:false}).fill('Rua de testes, 42');await dialog.getByRole('button',{name:'Salvar cadastro'}).click();await dialog.waitFor({state:'detached'});await page.getByRole('button',{name:'Armazém novo',exact:true}).waitFor();
  const call=fixture.calls.findLast(call=>call.path==='/api/warehouses'&&call.method==='POST');assert.deepEqual(call.body,{name:'Armazém novo',taxId:'12345678000190',address:'Rua de testes, 42',active:true});
 });
 await scenario('401 protegido renova cookie uma vez e repete a consulta',async()=>{
  await page.goto(base+'/gestao/products');await page.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();const before=fixture.refreshes;fixture.expireProducts=true;await page.getByRole('button',{name:'Atualizar',exact:true}).click();await page.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();assert.equal(fixture.refreshes,before+1);
 });
 await scenario('abas concorrentes compartilham cookie rotativo com Web Locks',async()=>{
  const tab=await context.newPage();await tab.goto(base+'/gestao/products');await tab.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();const before=fixture.refreshes;
  await Promise.all([page.reload(),tab.reload()]);await Promise.all([page.getByRole('cell',{name:'SKU-001',exact:true}).waitFor(),tab.getByRole('cell',{name:'SKU-001',exact:true}).waitFor()]);assert.equal(fixture.refreshes,before+2);await tab.close();
 });
 await scenario('proxy rejeita mutação de origem diferente antes de alcançar a API',async()=>{
  const before=fixture.calls.length;const response=await fetch(base+'/api/backend/auth/logout',{method:'POST',headers:{Origin:'https://origem-invalida.example'}});assert.equal(response.status,403);assert.equal(fixture.calls.length,before);
 });
 await scenario('bloqueio exige justificativa e chave; saldo visual vem da resposta do servidor',async()=>{
  await page.goto(base+'/gestao/stock');await page.getByRole('button',{name:'Bloquear',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Motivo',{exact:false}).fill('Avaria identificada');await dialog.getByRole('button',{name:'Confirmar alteração',exact:true}).click();await dialog.waitFor({state:'detached'});await page.getByText('Comando confirmado pelo servidor.',{exact:false}).waitFor();const call=fixture.calls.findLast(call=>/\/stock\/.+\/block$/.test(call.path));assert.equal(call.body.reason,'Avaria identificada');assert.equal(call.headers['idempotency-key'].length,36);await page.getByRole('cell',{name:'Bloqueado',exact:true}).waitFor();
 });
 await scenario('convite administrativo conserva a identidade da gestora',async()=>{
  await page.goto(base+'/gestao/users');await page.getByRole('button',{name:'Convidar usuário',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Nome',{exact:true}).fill('Convidado');await dialog.getByLabel('E-mail',{exact:true}).fill('convidado@example.test');await dialog.getByLabel('Senha inicial',{exact:false}).fill('senha12345');await dialog.getByRole('button',{name:'Enviar convite'}).click();await dialog.waitFor({state:'detached'});await page.getByText('Convite criado.',{exact:false}).waitFor();assert.equal(await page.locator('.account-link').innerText(),'Marina Gestora');
 });
 await scenario('módulos gerenciais renderizam consultas sem erros de runtime',async()=>{
  for(const section of ['partners','receipts','orders','tasks','monitoring','transfers','inventories','audit','account']){await page.goto(`${base}/gestao/${section}`);await page.locator('#main-content').waitFor();await page.waitForLoadState('networkidle');assert.equal(await page.locator('#main-content').getByRole('alert').count(),0,section);}
  assert.deepEqual(runtimeErrors,[]);
 });
 await scenario('layout320/390 sem overflow de página e menu acessível',async()=>{
  await page.setViewportSize({width:390,height:844});await page.goto(base);await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();await page.getByRole('button',{name:'Abrir menu'}).click();await page.getByRole('link',{name:'Produtos Catálogo e embalagens'}).click();await page.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`overflow em ${width}px`);}await page.screenshot({path:path.join(out,'products-mobile.png'),fullPage:true});
 });
 await scenario('permissões reais escondem módulos e protegem navegação direta',async()=>{
  const readerContext=await browser.newContext({viewport:{width:1280,height:900}}),readerPage=await readerContext.newPage();await login(readerPage,'leitura@example.test');assert.equal(await readerPage.getByRole('link',{name:'Usuários Contas e perfis de acesso'}).count(),0);const before=fixture.calls.filter(call=>call.path==='/api/users').length;await readerPage.goto(base+'/gestao/users');await readerPage.getByText('Seu perfil não permite acessar este módulo.',{exact:false}).waitFor();assert.equal(fixture.calls.filter(call=>call.path==='/api/users').length,before);await readerContext.close();
 });
 await scenario('logout revoga refresh, limpa painel e mantém recuperação de senha pública',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.getByRole('button',{name:'Sair da conta'}).click();await page.waitForURL('**/auth/login');await page.getByLabel('E-mail',{exact:true}).waitFor();assert.equal((await context.cookies()).some(cookie=>cookie.name==='refresh_token'),false);await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'login-mobile.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.getByRole('link',{name:'Esqueci minha senha'}).click();await page.getByRole('button',{name:'Enviar código'}).waitFor();
 });
 console.log(`${passed} cenários de navegador aprovados. Capturas: ${out}`);
}catch(error){if(browser){for(const context of browser.contexts()){for(const page of context.pages()){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>undefined);}}}console.error(error);console.error(log.slice(-2500));process.exitCode=1;}finally{await browser?.close();app.kill('SIGTERM');await fixture.close();}
