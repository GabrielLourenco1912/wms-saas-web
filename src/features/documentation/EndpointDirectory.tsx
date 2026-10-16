'use client';

import { useState } from 'react';
import { filterEndpoints, type Endpoint } from './documentation-model';

export function EndpointDirectory({ endpoints }: { endpoints: Endpoint[] }) {
  const [query, setQuery] = useState('');
  const [method, setMethod] = useState('ALL');
  const active = query.trim().length > 0 || method !== 'ALL';
  const matches = filterEndpoints(endpoints, query, method);
  return <section className="endpoint-directory" aria-label="Pesquisa de endpoints"><h3>Encontre o endpoint que você precisa</h3><p>Pesquise pelo caminho, recurso, payload ou permissão. Os contratos completos estão nas tabelas abaixo.</p><div className="endpoint-search"><label><span className="sr-only">Pesquisar endpoints</span><input type="search" placeholder="Ex.: /stock, InventoryDetail, WAVE_CREATE…" value={query} onChange={event => setQuery(event.target.value)} /></label><label><span className="sr-only">Método HTTP</span><select value={method} onChange={event => setMethod(event.target.value)}><option value="ALL">Todos os métodos</option>{Array.from(new Set(endpoints.map(endpoint => endpoint.method))).sort().map(value => <option key={value}>{value}</option>)}</select></label></div><p className="endpoint-result-count" role="status">{active ? `${matches.length} de ${endpoints.length} endpoints encontrados` : `${endpoints.length} endpoints documentados`}</p>{active && <div className="endpoint-results">{matches.map(endpoint => <a href={`#${endpoint.anchor}`} className="endpoint-result" key={`${endpoint.method} ${endpoint.path}`}><span className={`http-method method-${endpoint.method.toLowerCase()}`}>{endpoint.method}</span><div><code>{endpoint.path}</code><span>{endpoint.group} · HTTP {endpoint.status}</span><small>{endpoint.permission} · {endpoint.idempotency === '—' ? 'Sem chave de idempotência' : `Idempotência: ${endpoint.idempotency}`}</small></div><span aria-hidden="true">↗</span></a>)}{matches.length === 0 && <p>Nenhum endpoint corresponde aos filtros.</p>}</div>}</section>;
}
