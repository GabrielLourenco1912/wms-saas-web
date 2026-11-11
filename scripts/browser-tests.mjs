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
const app=spawn(process.execPath,standalone?['.next/standalone/server.js']:['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,WEB_ORIGIN:base,WMS_API_BASE_URL:fixture.url,HOSTNAME:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']});let log='';app.stdout.on('data',chunk=>{log+=chunk;});app.stderr.on('data',chunk=>{log+=chunk;});
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
 await scenario('proxy aceita origem pública configurada com Host e protocolo internos diferentes',async()=>{
  const before=fixture.calls.length;const response=await fetch(base+'/api/backend/auth/login',{method:'POST',headers:{Origin:base,Host:'web:3000','X-Forwarded-Proto':'https','Content-Type':'application/json'},body:JSON.stringify({email:'gestor@example.test',password:'senha123'})});assert.equal(response.status,202);assert.equal(fixture.calls.length,before+1);assert.equal(fixture.calls.at(-1).path,'/api/auth/login');
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
 const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),mobilePage=await mobileContext.newPage();
 mobilePage.on('pageerror',error=>runtimeErrors.push(error.message));
 await scenario('acesso e recuperação de senha cabem em 320/390 com campos legíveis',async()=>{
  for(const width of [320,390]){
   await mobilePage.setViewportSize({width,height:844});
   for(const route of ['/auth/login','/auth/forgot-password']){
    await mobilePage.goto(base+route);await mobilePage.getByRole('heading',{name:route.endsWith('/login')?'Entrar no WMS':'Recuperar senha',exact:true}).waitFor();assert(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}: ${route}`);assert(Number.parseFloat(await mobilePage.locator('input[type="email"]').evaluate(element=>getComputedStyle(element).fontSize))>=16);
   }
  }
 });
 await scenario('menu mobile contém o foco, fecha por Escape e toque fora, e devolve o foco',async()=>{
  await login(mobilePage);
  await mobilePage.waitForFunction(()=>[...document.querySelectorAll('.metric-card strong')].every(element=>element.textContent!=='…'));
  await mobilePage.screenshot({path:path.join(out,'dashboard-mobile.png'),fullPage:true});
  const opener=mobilePage.getByRole('button',{name:'Abrir menu',exact:true});await opener.click();const drawer=mobilePage.getByRole('dialog',{name:'Navegação do painel'});await drawer.waitFor();
  assert.equal(await mobilePage.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
  for(let i=0;i<22;i++){await mobilePage.keyboard.press('Tab');assert(await drawer.evaluate(element=>element.contains(document.activeElement)),'O foco deve permanecer no menu.');}
  for(let i=0;i<22;i++){await mobilePage.keyboard.press('Shift+Tab');assert(await drawer.evaluate(element=>element.contains(document.activeElement)),'O foco reverso deve permanecer no menu.');}
  await mobilePage.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});assert(await opener.evaluate(element=>element===document.activeElement));
  await mobilePage.getByRole('button',{name:'Todos os módulos',exact:true}).click();await mobilePage.screenshot({path:path.join(out,'menu-mobile.png'),animations:'disabled'});
  await mobilePage.mouse.click(386,420);await drawer.waitFor({state:'hidden'});assert.notEqual(await mobilePage.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
 });
 await scenario('atalhos e menu mobile navegam e liberam a página ao mudar para desktop',async()=>{
  await mobilePage.getByRole('button',{name:'Abrir menu',exact:true}).click();await mobilePage.getByRole('dialog').getByRole('link',{name:'Produtos Catálogo e embalagens'}).click();await mobilePage.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();assert.equal(await mobilePage.locator('dialog[open]').count(),0);
  await mobilePage.getByRole('navigation',{name:'Acesso rápido'}).getByRole('link',{name:'Estoque',exact:true}).click();await mobilePage.getByRole('heading',{name:'Estoque',exact:true}).waitFor();assert.equal(await mobilePage.getByRole('navigation',{name:'Acesso rápido'}).getByRole('link',{name:'Estoque',exact:true}).getAttribute('aria-current'),'page');
  await mobilePage.getByRole('button',{name:'Todos os módulos',exact:true}).click();await mobilePage.setViewportSize({width:1024,height:844});await mobilePage.getByRole('dialog').waitFor({state:'hidden'});assert.notEqual(await mobilePage.evaluate(()=>getComputedStyle(document.body).overflow),'hidden');
  await mobilePage.setViewportSize({width:390,height:844});await mobilePage.goto(base+'/gestao/products');await mobilePage.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();
 });
 await scenario('lista mobile conserva dados e ações, permite comparar em tabela e pagina para o início dos resultados',async()=>{
  const region=mobilePage.getByRole('region',{name:'Tabela Produtos',exact:true});assert(await region.evaluate(element=>element.scrollWidth<=element.clientWidth));
  assert(await mobilePage.locator('.data-table tbody tr').first().getByText('Ativo',{exact:true}).isVisible());
  const view=mobilePage.getByRole('group',{name:'Visualização dos registros'});await view.getByRole('button',{name:'Tabela',exact:true}).click();assert(await region.evaluate(element=>element.scrollWidth>element.clientWidth));assert(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await view.getByRole('button',{name:'Lista',exact:true}).click();assert(await region.evaluate(element=>element.scrollWidth<=element.clientWidth));
  await mobilePage.getByRole('button',{name:'Próxima',exact:true}).click();await mobilePage.getByRole('cell',{name:'SKU-021',exact:true}).waitFor();const searchBounds=await mobilePage.getByRole('searchbox',{name:'Pesquisar SKU, nome ou código de barras'}).boundingBox();assert(searchBounds.y>=0&&searchBounds.y<180,'A próxima página deve retornar aos resultados, sem exigir rolagem de volta.');
  await mobilePage.getByRole('button',{name:'Anterior',exact:true}).click();await mobilePage.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();
 });
 await scenario('filtros mobile podem ser recolhidos sem perder a seleção e ficam visíveis no desktop',async()=>{
  await mobilePage.goto(base+'/gestao/products');await mobilePage.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();const filter=mobilePage.getByRole('button',{name:/^Filtros/});const status=mobilePage.getByLabel('Situação do cadastro');assert.equal(await status.isVisible(),false);
  await filter.click();await status.selectOption('true');await mobilePage.getByRole('button',{name:/Filtrar por categoria ativa.*Selecionar/}).click();await Promise.all([mobilePage.waitForResponse(response=>{const url=new URL(response.url());return url.pathname==='/api/backend/products'&&url.searchParams.get('active')==='true'&&url.searchParams.has('categoryId');}),mobilePage.getByRole('button',{name:'Categoria 1',exact:true}).click()]);await mobilePage.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();
  assert((await filter.innerText()).includes('2'));await filter.click();assert.equal(await status.isVisible(),false);assert(fixture.calls.some(call=>call.path==='/api/products'&&call.query.active==='true'&&call.query.categoryId));
  await mobilePage.setViewportSize({width:1280,height:844});assert(await status.isVisible());assert.equal(await status.inputValue(),'true');await mobilePage.setViewportSize({width:390,height:844});assert.equal(await status.isVisible(),false);
 });
 await scenario('formulário e seletor cabem em 320/390, com ações e fechamento ao alcance',async()=>{
  for(const width of [320,390]){
   await mobilePage.setViewportSize({width,height:844});await mobilePage.getByRole('button',{name:'Adicionar produto',exact:true}).click();const dialog=mobilePage.getByRole('dialog');const bounds=await dialog.boundingBox();assert.equal(Math.round(bounds.x),0);assert(Math.round(bounds.width)<=width);assert(Math.round(bounds.y+bounds.height)<=844);
   const save=await dialog.getByRole('button',{name:'Salvar cadastro',exact:true}).boundingBox();assert(save.y>=0&&save.y+save.height<=844);assert(Number.parseFloat(await dialog.getByLabel('Nome do produto',{exact:false}).evaluate(element=>getComputedStyle(element).fontSize))>=16);
   await dialog.getByRole('button',{name:/Categoria.*Selecionar/}).click();await dialog.getByRole('button',{name:'Categoria 1',exact:true}).waitFor();const options=await dialog.locator('.lookup-options').boundingBox();assert(options.x>=0&&options.x+options.width<=width);await dialog.getByRole('searchbox',{name:'Pesquisar Categoria'}).fill('Categoria 12');await dialog.getByRole('button',{name:'Categoria 12',exact:true}).click();
   await dialog.getByLabel('Nome do produto',{exact:false}).fill('Produto no celular');if(width===390)await mobilePage.screenshot({path:path.join(out,'product-form-mobile.png')});await dialog.getByRole('button',{name:'Cancelar',exact:true}).click();await dialog.waitFor({state:'detached'});
  }
 });
 await scenario('todos os módulos cabem em celulares, tablet e desktop sem overflow de página',async()=>{
  for(const width of [320,390,768,1280]){
   await mobilePage.setViewportSize({width,height:844});
   for(const section of ['dashboard','warehouse','products','partners','receipts','orders','tasks','monitoring','stock','transfers','inventories','audit','users','account']){
    await mobilePage.goto(section==='dashboard'?base:`${base}/gestao/${section}`);await mobilePage.locator('#main-content').waitFor();await mobilePage.waitForLoadState('networkidle');assert(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow em ${width}px: ${section}`);
   }
  }
  await mobilePage.setViewportSize({width:390,height:844});await mobilePage.goto(base+'/gestao/products');await mobilePage.getByRole('searchbox',{name:'Pesquisar SKU, nome ou código de barras'}).fill('Produto 01');await mobilePage.getByRole('cell',{name:'SKU-001',exact:true}).waitFor();await mobilePage.getByText('1 registro',{exact:true}).waitFor();await mobilePage.screenshot({path:path.join(out,'products-mobile.png'),fullPage:true});assert.deepEqual(runtimeErrors,[]);
 });
 await mobileContext.close();
 await scenario('permissões reais escondem módulos e protegem navegação direta',async()=>{
  const readerContext=await browser.newContext({viewport:{width:1280,height:900}}),readerPage=await readerContext.newPage();await login(readerPage,'leitura@example.test');assert.equal(await readerPage.getByRole('link',{name:'Usuários Contas e perfis de acesso'}).count(),0);const before=fixture.calls.filter(call=>call.path==='/api/users').length;await readerPage.goto(base+'/gestao/users');await readerPage.getByText('Seu perfil não permite acessar este módulo.',{exact:false}).waitFor();assert.equal(fixture.calls.filter(call=>call.path==='/api/users').length,before);await readerContext.close();
 });
 await scenario('documentação pública abre sem renovar sessão e permite voltar ao painel autenticado',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();await page.waitForLoadState('networkidle');const before=fixture.calls.length;
  await page.getByRole('link',{name:'Documentação do projeto ↗',exact:true}).click();await page.getByRole('heading',{name:/Conheça o projeto.*Explore suas conexões/}).waitFor();await page.waitForLoadState('networkidle');assert.equal(fixture.calls.length,before);
  await page.getByRole('link',{name:'Entrar no painel',exact:false}).click();await page.waitForURL(base+'/');await page.getByRole('heading',{name:'Visão geral',exact:true}).waitFor();assert.equal(await page.locator('.account-link').innerText(),'Marina Gestora');
 });
 await scenario('logout revoga refresh, limpa painel e mantém recuperação de senha pública',async()=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto(base);await page.getByRole('button',{name:'Sair da conta'}).click();await page.waitForURL('**/auth/login');await page.getByLabel('E-mail',{exact:true}).waitFor();assert.equal((await context.cookies()).some(cookie=>cookie.name==='refresh_token'),false);await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'login-mobile.png'),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.getByRole('link',{name:'Esqueci minha senha'}).click();await page.getByRole('button',{name:'Enviar código'}).waitFor();
 });
 console.log(`${passed} cenários de navegador aprovados. Capturas: ${out}`);
}catch(error){if(browser){for(const context of browser.contexts()){for(const page of context.pages()){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>undefined);}}}console.error(error);console.error(log.slice(-2500));process.exitCode=1;}finally{await browser?.close();app.kill('SIGTERM');await fixture.close();}
