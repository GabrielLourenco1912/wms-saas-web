export type Heading = { id: string; title: string; depth: number; line: number };
export type PreparedDocument = { markdown: string; headings: Heading[] };
export type Endpoint = {
  method: string; path: string; request: string; status: string; response: string;
  permission: string; idempotency: string; group: string; anchor: string;
};

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function plain(value: string): string {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*]/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\\\|/g, '|').trim();
}

/** Keep the published anchors, including every DTO link, without allowing raw HTML. */
export function prepareDocument(source: string): PreparedDocument {
  const headings: Heading[] = [];
  const used = new Set<string>();
  let pending = '', fence = '', skipIndex = false;
  const lines = source.split('\n').map((original, index) => {
    const marker = original.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = '';
      return skipIndex ? '' : original;
    }
    if (fence) return skipIndex ? '' : original;
    const anchor = original.match(/^<a id="([a-zA-Z0-9_-]+)"><\/a>\s*$/);
    if (anchor) { pending = anchor[1]; skipIndex = false; return ''; }
    const heading = original.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const depth = heading[1].length;
      if (depth === 1) return '';
      skipIndex = depth === 2 && normalizeSearch(heading[2]) === 'indice';
      if (skipIndex) return '';
      const title = plain(heading[2]);
      const base = pending || normalizeSearch(title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'secao';
      let id = base, suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
      used.add(id); pending = '';
      headings.push({ id, title, depth, line: index + 1 });
    }
    return skipIndex ? '' : original;
  });
  return { markdown: lines.join('\n'), headings };
}

export function extractEndpoints(document: PreparedDocument): Endpoint[] {
  const result: Endpoint[] = [];
  let catalog = false, group = '', anchor = '';
  const byLine = new Map(document.headings.map(heading => [heading.line, heading]));
  for (const [index, line] of document.markdown.split('\n').entries()) {
    const heading = byLine.get(index + 1);
    if (heading?.depth === 2) catalog = heading.id === 'endpoints';
    if (!catalog) continue;
    if (heading) { group = heading.title; anchor = heading.id; }
    const route = line.match(/^\|\s*`(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+([^`]+)`\s*\|/);
    if (!route) continue;
    const cells = line.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(plain);
    result.push({ method: route[1], path: route[2], request: cells[1] ?? '—', status: cells[2] ?? '', response: cells[3] ?? '', permission: cells[4] ?? '', idempotency: cells[5] ?? '—', group, anchor });
  }
  return result;
}

export function filterEndpoints(endpoints: Endpoint[], query: string, method = 'ALL'): Endpoint[] {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return endpoints.filter(endpoint => (method === 'ALL' || endpoint.method === method) && terms.every(term => normalizeSearch(Object.values(endpoint).join(' ')).includes(term)));
}

/** Local source-file links become labels; published documents and anchors remain navigable. */
export function publicDocumentationHref(href: string | undefined, guide: string): string | null {
  if (!href) return null;
  if (href.startsWith('#') || /^https?:\/\//.test(href)) return href;
  const file = href.split('#')[0].split('/').pop();
  if (file === 'API_CLIENTS.md') return '/documentacao/api';
  if (file === 'INTEGRACAO_API.md') return `/documentacao/api?guia=${href.includes('wms_saas_mobile') || guide === 'mobile' ? 'mobile' : 'web'}`;
  return null;
}
