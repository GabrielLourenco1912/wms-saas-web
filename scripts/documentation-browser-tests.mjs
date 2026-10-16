import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

if (!fs.existsSync('.next/BUILD_ID')) throw new Error('Execute npm run build antes dos testes de documentação.');
const listener = net.createServer();
await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const base = `http://127.0.0.1:${port}`;
const model = JSON.parse(fs.readFileSync('src/features/documentation/content/relational-model.json', 'utf8'));
const out = process.env.WMS_DOCS_SCREENSHOT_DIR ?? '/tmp/wms-public-documentation';
fs.mkdirSync(out, { recursive: true });
fs.cpSync('.next/static', '.next/standalone/.next/static', { recursive: true });
fs.cpSync('public', '.next/standalone/public', { recursive: true });
// An unreachable API proves that documentation never depends on a backend/session.
const app = spawn(process.execPath, ['.next/standalone/server.js'], { env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: String(port), WMS_API_BASE_URL: 'http://127.0.0.1:1' }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = '', browser, passed = 0;
app.stdout.on('data', chunk => log += chunk); app.stderr.on('data', chunk => log += chunk);
async function scenario(title, action) { await action(); console.log(`✓ ${title}`); passed++; }
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/documentacao')).ok) break; } catch {} if (i === 99) throw new Error(log); await delay(200); }
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}), args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage(), errors = [], apiRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/backend/')) apiRequests.push(request.url()); });
  await scenario('rotas públicas carregam sem sessão e com API indisponível', async () => {
    for (const route of ['/documentacao', '/documentacao/api', '/documentacao/modelo-relacional']) {
      const response = await page.goto(base + route); assert.equal(response.status(), 200); await page.waitForLoadState('networkidle'); assert.equal(new URL(page.url()).pathname, route);
    }
    assert.equal(apiRequests.length, 0);
    assert.equal((await context.cookies()).length, 0);
    assert.equal(await page.locator('[data-table]').count(), 29);
    await page.screenshot({ path: path.join(out, 'model-desktop.png') });
  });
  await scenario('referência mantém todos os links de modelos e exemplos copiáveis', async () => {
    await page.goto(base + '/documentacao/api'); await page.getByRole('heading', { name: 'Documentação da API.', exact: true }).waitFor();
    const missing = await page.locator('.docs-markdown').evaluate(root => [...root.querySelectorAll('a[href^="#"]')].map(anchor => anchor.hash.slice(1)).filter(id => id && !document.getElementById(decodeURIComponent(id))));
    assert.deepEqual(missing, []);
    assert(await page.locator('.docs-markdown table').count() > 50);
    const firstCopy = page.getByRole('button', { name: 'Copiar exemplo de código' }).first(); await firstCopy.click(); await page.getByText('Copiado', { exact: true }).first().waitFor(); assert((await page.evaluate(() => navigator.clipboard.readText())).length > 10);
    await page.screenshot({ path: path.join(out, 'api-desktop.png') });
  });
  await scenario('pesquisa encontra endpoint por método e permissão e navega ao contrato', async () => {
    await page.getByRole('searchbox', { name: 'Pesquisar endpoints', exact: true }).fill('inventories INVENTORY_EXECUTE');
    await page.getByRole('combobox', { name: 'Método HTTP', exact: true }).selectOption('POST');
    const result = page.locator('.endpoint-result').filter({ hasText: '/api/inventories/{id}/counts' }); await result.waitFor(); assert.equal(await result.count(), 1); await result.click();
    assert(page.url().includes('#inventario-2'));
    await page.getByRole('searchbox', { name: 'Pesquisar tópicos ou modelos' }).fill('InventoryCountsRequest');
    await page.getByRole('navigation', { name: 'Índice do guia' }).getByRole('link', { name: 'InventoryCountsRequest' }).click();
    await page.locator('#modelo-inventorycountsrequest').waitFor(); assert(page.url().endsWith('#modelo-inventorycountsrequest'));
  });
  await scenario('guias web e mobile e downloads estão publicados', async () => {
    await page.getByRole('navigation', { name: 'Guias de integração' }).getByRole('link', { name: 'Consumo no web' }).click(); await page.locator('.docs-article').getByRole('heading', { name: /Ambiente e transporte/ }).waitFor();
    await page.getByRole('navigation', { name: 'Guias de integração' }).getByRole('link', { name: 'Consumo no mobile' }).click(); await page.locator('.docs-article').getByRole('heading', { name: /Telas, endpoints e permissões/ }).waitFor();
    for (const asset of ['api-reference.md','integracao-web.md','integracao-mobile.md','modelo-relacional-wms-v2.png']) { const response = await fetch(base + '/documentacao/' + asset); assert.equal(response.status, 200); assert((await response.arrayBuffer()).byteLength > 1000); }
  });
  await scenario('modelo filtra tabelas, navega em FK e conserva seleção por URL', async () => {
    await page.goto(base + '/documentacao/modelo-relacional');
    await page.getByRole('combobox', { name: 'Área do sistema' }).selectOption('estoque'); assert.equal(await page.locator('[data-table]').count(), model.groups.find(group => group.id === 'estoque').tables.length);
    await page.locator('[data-table="estoque"]').click(); await page.getByRole('heading', { name: 'Saldos de estoque', exact: true }).waitFor();
    await page.getByRole('button', { name: '→ lpns.id', exact: true }).click(); await page.getByRole('heading', { name: model.tables.lpns.title, exact: true }).waitFor();
    assert(page.url().endsWith('#tabela-lpns')); await page.reload(); await page.getByRole('heading', { name: model.tables.lpns.title, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Copiar link da tabela ↗', exact: true }).click(); await page.getByText('Link copiado', { exact: true }).waitFor(); assert((await page.evaluate(() => navigator.clipboard.readText())).endsWith('#tabela-lpns'));
    await page.getByRole('button', { name: 'Fechar detalhes da tabela' }).click(); await page.getByRole('searchbox', { name: 'Encontre uma tabela ou campo' }).fill('nada-encontrado'); await page.getByRole('heading', { name: 'Nenhuma tabela encontrada' }).waitFor();
    await page.getByRole('button', { name: 'Mostrar todas as tabelas' }).click(); assert.equal(await page.locator('[data-table]').count(), 29);
    await page.locator('[data-table="transacoes_estoque"]').click(); await page.screenshot({ path: path.join(out, 'model-detail.png') });
  });
  await scenario('diagrama aprovado permite zoom e navegação sem ampliar o corpo da página', async () => {
    await page.getByRole('button', { name: 'Diagrama completo', exact: true }).click();
    await page.getByRole('button', { name: 'Aumentar zoom' }).click(); await page.getByRole('button', { name: 'Aumentar zoom' }).click();
    assert.equal(await page.getByLabel('Nível de zoom').innerText(), '150%');
    const stage = page.locator('.diagram-stage'); assert(await stage.evaluate(element => element.scrollWidth > element.clientWidth));
    await page.getByRole('button', { name: 'Ajustar à largura' }).click(); assert.equal(await page.getByLabel('Nível de zoom').innerText(), '100%');
    await page.screenshot({ path: path.join(out, 'diagram-desktop.png') });
  });
  await scenario('documentação e modelo acessíveis em 320 e 390 pixels', async () => {
    for (const width of [390,320]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ['/documentacao', '/documentacao/api', '/documentacao/modelo-relacional']) { await page.goto(base + route); await page.waitForLoadState('networkidle'); assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}: ${route}`); }
      await page.locator('[data-table="estoque"]').click(); await page.getByRole('heading', { name: 'Saldos de estoque', exact: true }).waitFor(); assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      const closeBounds = await page.getByRole('button', { name: 'Fechar detalhes da tabela' }).boundingBox(); const headerBounds = await page.locator('.public-header').boundingBox(); assert(closeBounds.y >= headerBounds.y + headerBounds.height, 'O cabeçalho não pode encobrir o botão de fechar detalhes.');
      if (width === 390) await page.screenshot({ path: path.join(out, 'model-mobile.png') });
    }
    await page.goto(base + '/documentacao/api'); await page.screenshot({ path: path.join(out, 'api-mobile.png') });
    assert.deepEqual(errors, []); assert.equal(apiRequests.length, 0);
  });
  console.log(`${passed} cenários de documentação pública aprovados. Capturas: ${out}`);
} catch (error) {
  if (browser) for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {});
  console.error(error); console.error(log.slice(-2000)); process.exitCode = 1;
} finally { await browser?.close(); app.kill('SIGTERM'); }
