'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';

export function FilterDisclosure({ children, activeCount = 0 }: { children: ReactNode; activeCount?: number }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  return <div className={`responsive-filters${expanded ? ' filters-expanded' : ''}`}>
    <button className="mobile-filter-toggle" type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M4 7h6m4 0h6M4 17h10m4 0h2M10 4v6m4 4v6" /></svg>
      <span>Filtros{activeCount > 0 && <span className="filter-count">{activeCount}<span className="sr-only">{activeCount === 1 ? ' ativo' : ' ativos'}</span></span>}</span>
      <span className="filter-toggle-state">{expanded ? 'Ocultar' : 'Mostrar'}</span>
    </button>
    <div className="responsive-filter-content" id={id}>{children}</div>
  </div>;
}
