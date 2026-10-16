'use client';

import { useState } from 'react';
import { normalizeSearch, type Heading } from './documentation-model';

export function DocumentationNavigation({ headings }: { headings: Heading[] }) {
  const [query, setQuery] = useState('');
  const search = normalizeSearch(query);
  const visible = headings.filter(heading => search ? normalizeSearch(`${heading.title} ${heading.id}`).includes(search) : heading.depth === 2);
  return <aside className="docs-sidebar"><div className="docs-sidebar-label">NESTE GUIA</div><label className="docs-topic-search"><span className="sr-only">Pesquisar tópicos ou modelos</span><input type="search" placeholder="Pesquisar tópico ou modelo…" value={query} onChange={event => setQuery(event.target.value)} /></label><nav aria-label="Índice do guia"><ul>{visible.map(heading => <li key={heading.id}><a href={`#${heading.id}`}><span>{heading.title}</span>{search && heading.depth > 2 && <small>{heading.id.startsWith('modelo-') ? 'Modelo de dados' : 'Neste guia'}</small>}</a></li>)}</ul>{visible.length === 0 && <p className="docs-no-topics" role="status">Nenhum tópico encontrado. Tente outro termo.</p>}</nav><a className="docs-back-top" href="#inicio">Voltar ao início ↑</a></aside>;
}
