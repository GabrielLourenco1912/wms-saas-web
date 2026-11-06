import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const resources = new Set(['auth','users','profiles','permissions','warehouses','zones','positions','categories','products','product-packages','partners','pre-receipts','receipts','putaway-tasks','orders','waves','picking-tasks','divergences','shipments','stock','stock-blocks','lpns','transfers','tasks','stock-transactions','inventories','search','lookups']);
function error(status:number,message:string) { return NextResponse.json({timestamp:new Date().toISOString(),status:String(status),message,data:null},{status,headers:{'Cache-Control':'no-store'}}); }
async function proxy(request:NextRequest, context:{params:Promise<{path:string[]}>}) {
  const {path} = await context.params;
  if (!path.length || !resources.has(path[0]) || path.some(segment => segment === '.' || segment === '..' || /[\\/]/.test(segment))) return error(404,'Recurso não encontrado.');
  if (request.method !== 'GET') {
    let expectedOrigin: string;
    try {
      const configured = new URL(process.env.WEB_ORIGIN ?? '');
      if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password ||
          configured.pathname !== '/' || configured.search || configured.hash) throw new Error();
      expectedOrigin = configured.origin;
    } catch {
      return error(503, 'A origem pública do painel não está configurada corretamente.');
    }
    const origin = request.headers.get('origin');
    try {
      if (!origin || new URL(origin).origin !== expectedOrigin) return error(403, 'Origem da solicitação inválida.');
    } catch {
      return error(403, 'Origem da solicitação inválida.');
    }
  }
  const configured = process.env.WMS_API_BASE_URL ?? 'http://localhost:8080';
  let base:URL;
  try { base = new URL(configured); if (!['http:','https:'].includes(base.protocol)) throw new Error(); }
  catch { return error(503,'A conexão com a API não está configurada corretamente.'); }
  const target = new URL(`/api/${path.map(encodeURIComponent).join('/')}`,base);
  target.search = request.nextUrl.search;
  const headers = new Headers({Accept:'application/json','X-Client-Type':'WEB'});
  for (const header of ['authorization','idempotency-key','content-type']) {
    const value = request.headers.get(header); if (value) headers.set(header,value);
  }
  if (path[0] === 'auth') {
    const cookie = request.cookies.get('refresh_token');
    if (cookie) headers.set('cookie',`refresh_token=${cookie.value}`);
  }
  try {
    const body = request.method === 'GET' ? undefined : await request.text();
    if (body && Buffer.byteLength(body,'utf8') > 6 * 1024 * 1024) return error(413,'O arquivo ou formulário excede o tamanho permitido.');
    const upstream = await fetch(target,{method:request.method,headers,body:body || undefined,cache:'no-store',redirect:'manual',signal:AbortSignal.any([request.signal,AbortSignal.timeout(20000)])});
    if (upstream.status >= 300 && upstream.status < 400) return error(502,'Resposta inesperada da API.');
    const responseHeaders = new Headers({'Content-Type':upstream.headers.get('content-type') ?? 'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append('set-cookie',cookie.replace(/Path=\/api\/auth(?=;|$)/i,'Path=/api/backend/auth'));
    return new NextResponse(await upstream.arrayBuffer(),{status:upstream.status,headers:responseHeaders});
  } catch { return error(503,'A API está indisponível ou demorou para responder. Tente novamente.'); }
}
export { proxy as GET, proxy as POST, proxy as PUT };
