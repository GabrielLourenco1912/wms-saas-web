import { ExactDecimal, parseJson, stringifyJson } from './decimal';
import type { Query } from './types';

export class ApiError extends Error {
  readonly statusCode: number;
  constructor(message: string, readonly status = 0, readonly fieldErrors: {field: string; message: string}[] = []) {
    super(message); this.name = 'ApiError'; this.statusCode = status;
  }
}
type RequestOptions = { method?: string; body?: unknown; auth?: boolean; signal?: AbortSignal; headers?: Record<string,string> };
let accessToken: string | null = null;
let epoch = 0;
let refreshPromise: Promise<void> | null = null;
let channel: BroadcastChannel | null = null;
const listeners = new Set<(token: string | null) => void>();
const pendingKeys = new Map<string,string>();
const inFlight = new Map<string,Promise<unknown>>();
const subject = (token: string | null) => {
  try { return token ? JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub as string : null; } catch { return null; }
};
function notify() { for (const listener of listeners) listener(accessToken); }
function startChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined' || channel) return;
  channel = new BroadcastChannel('wms-session');
  channel.onmessage = event => {
    if (event.data?.type === 'session-changed' || event.data?.type === 'logout') {
      accessToken = null; epoch++; pendingKeys.clear(); notify();
    }
  };
}
export function getAccessToken() { return accessToken; }
export function subscribeSession(listener: (token:string|null) => void) {
  startChannel(); listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setAccessToken(token:string|null) {
  startChannel(); accessToken = token; epoch++; pendingKeys.clear(); notify();
  channel?.postMessage({type: token ? 'session-changed' : 'logout'});
}
function expire(expectedEpoch: number) { if (epoch === expectedEpoch) setAccessToken(null); }
function pathUrl(path:string, query?:Query) {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://') || path.includes('..')) throw new ApiError('Caminho de API inválido.');
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(query ?? {})) if (value !== undefined && value !== null && value !== '') params.set(key,String(value));
  return `/api/backend${path}${params.size ? '?' + params.toString() : ''}`;
}
async function transport<T>(path:string, options:RequestOptions = {}, query?:Query):Promise<T> {
  let response: Response;
  const requestEpoch = epoch;
  try {
    response = await fetch(pathUrl(path, query), {
      method: options.method ?? 'GET', credentials:'include', cache:'no-store',
      headers: {Accept:'application/json', ...(options.body !== undefined ? {'Content-Type':'application/json'} : {}),
        ...(options.auth !== false && accessToken ? {Authorization:`Bearer ${accessToken}`} : {}), ...options.headers},
      body: options.body === undefined ? undefined : stringifyJson(options.body),
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError('Não foi possível concluir a comunicação. Verifique a conexão e consulte o estado antes de repetir uma operação.');
  }
  let envelope: {data?:T; message?:string};
  try { envelope = parseJson(await response.text()) as typeof envelope; }
  catch { throw new ApiError('Resposta inválida do servidor. Atualize a consulta antes de repetir uma operação.', response.ok ? 0 : response.status); }
  if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
    throw new ApiError('Resposta inválida do servidor. Atualize a consulta antes de repetir uma operação.', response.ok ? 0 : response.status);
  }
  if (!response.ok) {
    const fieldErrors = Array.isArray(envelope.data) ? envelope.data.filter((item):item is {field:string;message:string} => item && typeof item.field === 'string' && typeof item.message === 'string') : [];
    const message = [envelope.message ?? `Falha na solicitação (${response.status}).`, ...fieldErrors.map(item => `${item.field}: ${item.message}`)].join('\n');
    throw new ApiError(message,response.status,fieldErrors);
  }
  if (options.auth !== false && epoch !== requestEpoch) throw new ApiError('A sessão mudou. Atualize esta página antes de continuar.',401);
  if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) throw new ApiError('Envelope de resposta inválido.');
  return envelope.data as T;
}
async function cookieLock<T>(run:()=>Promise<T>):Promise<T> {
  return typeof navigator !== 'undefined' && navigator.locks
    ? await navigator.locks.request('wms-auth-cookie',run) : run();
}
async function refresh(failedToken: string | null):Promise<void> {
  if (refreshPromise) return refreshPromise;
  const revision = epoch;
  const previousSubject = subject(accessToken);
  const execute = async () => {
    if (epoch !== revision) throw new ApiError('Sua sessão mudou. Entre novamente.',401);
    if (failedToken && accessToken && failedToken !== accessToken) return;
    try {
      const result = await transport<{token:string;subject:string}>('/auth/refresh',{method:'POST',auth:false});
      if (epoch !== revision) throw new ApiError('Sua sessão mudou. Entre novamente.',401);
      if (!result?.token || (previousSubject && result.subject !== previousSubject)) {
        expire(revision); throw new ApiError('A conta da sessão mudou. Entre novamente.',401);
      }
      accessToken = result.token; notify();
    } catch (error) {
      if (error instanceof ApiError && [400,401,403].includes(error.status)) expire(revision);
      throw error;
    }
  };
  refreshPromise = cookieLock(execute).finally(() => { refreshPromise = null; });
  return refreshPromise;
}
export async function restoreSession() { await refresh(null); }
async function request<T>(path:string, options:RequestOptions = {}, query?:Query):Promise<T> {
  const revision = epoch, failedToken = accessToken;
  try { return await transport<T>(path,options,query); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || options.auth === false || path.startsWith('/auth/') || revision !== epoch) throw error;
    await refresh(failedToken);
    if (revision !== epoch) throw new ApiError('A sessão mudou. Atualize a página antes de continuar.',401);
    try { return await transport<T>(path,options,query); }
    catch (retryError) {
      if (retryError instanceof ApiError && retryError.status === 401) expire(revision);
      throw retryError;
    }
  }
}
function canonical(value: unknown):unknown {
  if (value instanceof ExactDecimal) return value;
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => [key,canonical(item)]));
  return value;
}
export const api = {
  get: <T>(path:string,query?:Query,signal?:AbortSignal) => request<T>(path,{signal},query),
  request: <T>(path:string,options?:RequestOptions):Promise<T> => {
    if (path === '/auth/logout') setAccessToken(null);
    return ['/auth/challenge/verify','/auth/logout','/auth/reset-password'].includes(path)
      ? cookieLock(() => request<T>(path,options)) : request<T>(path,options);
  },
  command: <T>(path:string,body?:unknown,options:{keyInBody?:boolean;method?:string} = {}):Promise<T> => {
    const revision = epoch;
    const identity = stringifyJson([revision, options.method ?? 'POST',path,options.keyInBody ?? false,canonical(body ?? null)]);
    const active = inFlight.get(identity); if (active) return active as Promise<T>;
    const key = pendingKeys.get(identity) ?? crypto.randomUUID();
    pendingKeys.set(identity,key);
    const promise = request<T>(path,{method:options.method ?? 'POST',
      body: options.keyInBody ? {...(body as object ?? {}),idempotencyKey:key} : body,
      headers: options.keyInBody ? {} : {'Idempotency-Key':key}})
      .then(result => { pendingKeys.delete(identity); return result; })
      .catch(error => { if (error instanceof ApiError && [400,401,403,404,422].includes(error.status)) pendingKeys.delete(identity); throw error; })
      .finally(() => { inFlight.delete(identity); });
    inFlight.set(identity,promise); return promise;
  },
};
