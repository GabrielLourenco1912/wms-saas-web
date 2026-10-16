'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import snapshot from './content/relational-model.json';
import { DiagramViewer } from './DiagramViewer';
import { matchesTable, relatedTables, tableFromHash, tableRelationships, type RelationalModel, type Relationship } from './relational-model';

const model: RelationalModel = snapshot;
function subscribeHash(callback: () => void) {
  window.addEventListener('hashchange', callback); window.addEventListener('popstate', callback);
  return () => { window.removeEventListener('hashchange', callback); window.removeEventListener('popstate', callback); };
}
function hashSnapshot() { return window.location.hash; }
function serverSnapshot() { return ''; }
function navigateTable(name: string | null, push = true) {
  const url = new URL(window.location.href); url.hash = name ? `tabela-${name}` : '';
  if (url.href === window.location.href) return;
  window.history[push ? 'pushState' : 'replaceState'](null, '', url); window.dispatchEvent(new HashChangeEvent('hashchange'));
}

type ConnectionPath = { id: string; path: string; label: string; x: number; y: number };

export function RelationalExplorer() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [view, setView] = useState<'explore' | 'diagram'>('explore');
  const [paths, setPaths] = useState<ConnectionPath[]>([]);
  const [copied, setCopied] = useState('');
  const hash = useSyncExternalStore(subscribeHash, hashSnapshot, serverSnapshot);
  const selected = tableFromHash(model, hash);
  const selectedTable = selected ? model.tables[selected] : null;
  const canvas = useRef<HTMLDivElement>(null);
  const visibleGroups = useMemo(() => model.groups.filter(item => group === 'all' || item.id === group).map(item => ({ ...item, tables: item.tables.filter(name => matchesTable(model.tables[name], query)) })).filter(item => item.tables.length > 0), [group, query]);
  const count = visibleGroups.reduce((total, item) => total + item.tables.length, 0);
  const related = selected ? relatedTables(model, selected) : new Set<string>();
  const connections = selected ? tableRelationships(model, selected) : [];

  useEffect(() => {
    const element = canvas.current;
    if (!element || view !== 'explore') return;
    let frame = 0;
    function measure() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!element) return;
        const base = element.getBoundingClientRect();
        const routes = selected ? tableRelationships(model, selected) : model.relationships.filter(relation => relation.essential);
        const measured: ConnectionPath[] = [];
        for (const [index, relation] of routes.entries()) {
          const a = element.querySelector<HTMLElement>(`[data-table="${relation.parent}"]`), b = element.querySelector<HTMLElement>(`[data-table="${relation.child}"]`);
          if (!a || !b) continue;
          const parent = a.getBoundingClientRect(), child = b.getBoundingClientRect();
          const x1 = parent.left + parent.width / 2 - base.left, y1 = parent.bottom - base.top;
          const x2 = child.left + child.width / 2 - base.left, y2 = child.top - base.top;
          const mid = (y1 + y2) / 2;
          const path = relation.parent === relation.child ? `M ${x1} ${y1} C ${x1 + 90} ${y1 + 45}, ${x1 + 90} ${y1 - 90}, ${x1 + 45} ${y1 - 80}` : `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`;
          measured.push({ id: `${relation.child}-${relation.field}-${index}`, path, label: relation.unique ? '1 : 0..1' : '1 : N', x: (x1 + x2) / 2, y: mid });
        }
        setPaths(measured);
      });
    }
    const observer = new ResizeObserver(measure); observer.observe(element);
    element.querySelectorAll('[data-table]').forEach(card => observer.observe(card));
    measure();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [selected, visibleGroups, view]);

  function select(name: string, reveal = false) {
    if (reveal) { setQuery(''); setGroup('all'); }
    setCopied(''); setView('explore'); navigateTable(name);
    requestAnimationFrame(() => {
      const title = document.getElementById('model-details-title'); title?.focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 1100px)').matches) document.querySelector('.model-inspector')?.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  }
  function clearSelection() {
    const last = selected; navigateTable(null);
    requestAnimationFrame(() => { document.querySelector<HTMLButtonElement>(`[data-table="${last}"]`)?.focus(); });
  }
  function reset() { setQuery(''); setGroup('all'); navigateTable(null, false); }
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied('Link copiado'); }
    catch { setCopied('Copie o endereço na barra do navegador.'); }
  }
  function relationLink(relation: Relationship, outgoing: boolean) {
    const target = outgoing ? relation.parent : relation.child;
    return <button type="button" className="model-relation-link" key={`${relation.child}-${relation.field}-${relation.parent}`} onClick={() => select(target, true)}><strong>{model.tables[target].title} <span aria-hidden="true">↗</span></strong><code>{relation.child}.{relation.field} → {relation.parent}.{relation.parentField}</code><span>{outgoing ? `Referencia ${relation.optional ? 'zero ou um' : 'um'} registro` : `Pode ter ${relation.unique ? 'zero ou um registro' : 'vários registros'}`}</span></button>;
  }

  return <>
    <div className="model-view-tabs" role="group" aria-label="Visualização do modelo"><button type="button" aria-pressed={view === 'explore'} onClick={() => setView('explore')}>Explorar por área</button><button type="button" aria-pressed={view === 'diagram'} onClick={() => setView('diagram')}>Diagrama completo</button></div>
    {view === 'diagram' ? <DiagramViewer /> : <>
      <div className="model-toolbar"><label className="model-search"><span>Encontre uma tabela ou campo</span><input type="search" value={query} placeholder="Ex.: estoque, lote, quantidade…" onChange={event => { setQuery(event.target.value); navigateTable(null, false); }} /></label><label className="model-area-select"><span>Área do sistema</span><select value={group} onChange={event => { setGroup(event.target.value); navigateTable(null, false); }}><option value="all">Todas as áreas</option>{model.groups.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><button type="button" className="secondary-button" onClick={reset}>Limpar filtros</button><span className="model-result-count" role="status">{count} de 29 tabelas</span></div>
      <div className={`model-workspace ${selected ? 'has-selection' : ''}`}>
        <div className="model-map" ref={canvas} aria-label="Tabelas agrupadas por área"><svg className={`model-links ${selected ? 'is-selected' : ''}`} aria-hidden="true"><defs><marker id="model-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>{paths.map(path => <g key={path.id}><path d={path.path} markerEnd="url(#model-arrow)" />{selected && <g className="model-cardinality" transform={`translate(${path.x},${path.y})`}><rect x="-27" y="-10" width="54" height="20" rx="5" /><text textAnchor="middle" y="4">{path.label}</text></g>}</g>)}</svg>
          {visibleGroups.map(item => <section className="model-group" key={item.id} style={{ '--group-color': item.color } as CSSProperties}><header><span className="model-group-number" aria-hidden="true">{String(model.groups.findIndex(original => original.id === item.id) + 1).padStart(2, '0')}</span><div><span className="eyebrow">{item.label}</span><h2>{item.name}</h2><p>{item.tip}</p></div><span className="model-group-count">{item.tables.length}</span></header><div className="model-cards">{item.tables.map(name => {
            const table = model.tables[name], isSelected = selected === name;
            return <button type="button" className={`model-table-card ${isSelected ? 'is-selected' : related.has(name) ? 'is-related' : selected ? 'is-muted' : ''}`} key={name} data-table={name} id={`tabela-${name}`} aria-pressed={isSelected} onClick={() => select(name)}><span className="model-card-title"><strong>{table.title}</strong><span aria-hidden="true">↗</span></span><code className="model-table-name">{name}</code><p>{table.purpose}</p><div className="model-card-fields">{table.summary.map(field => <span key={field}>{field}</span>)}</div><span className="model-card-footer"><span>{table.fields.length} campos</span><span>{isSelected ? 'Selecionada' : 'Explorar tabela'}</span></span></button>;
          })}</div></section>)}
          {count === 0 && <div className="model-empty"><h2>Nenhuma tabela encontrada</h2><p>Tente outro nome de tabela ou campo, ou volte a exibir todas as áreas.</p><button type="button" className="primary-button" onClick={reset}>Mostrar todas as tabelas</button></div>}
        </div>
        <aside className="model-inspector" aria-label="Detalhes das tabelas">{selectedTable ? <><header className="model-detail-header"><div className="model-detail-kicker"><span className="eyebrow">Tabela selecionada</span><button type="button" className="model-close" aria-label="Fechar detalhes da tabela" onClick={clearSelection}>×</button></div><h2 tabIndex={-1} id="model-details-title">{selectedTable.title}</h2><code>{selectedTable.name}</code><p>{selectedTable.purpose}</p><span className="model-rules">{selectedTable.rules}</span><button type="button" className="model-copy-link" onClick={() => void copyLink()}>Copiar link da tabela ↗</button>{copied && <span className="model-copy-status" role="status">{copied}</span>}</header><div className="model-detail-scroll" tabIndex={0} role="region" aria-label="Campos e relacionamentos"><section className="model-detail-section"><h3>{selectedTable.fields.length} campos</h3><p className="model-field-legend">PK: chave primária · FK: chave estrangeira · UQ: valor único.</p>{selectedTable.fields.map(field => <div className="model-field-row" key={field.name}><div><code>{field.name}</code><span className="model-key-flags">{field.pk && <span className="key-pk">PK</span>}{field.ref && <span className="key-fk">FK</span>}{field.unique && <span>UQ</span>}</span></div><span className="model-field-type">{field.type} · {field.nullable ? 'opcional' : 'obrigatório'}</span>{field.ref && <button type="button" className="model-field-target" onClick={() => select(field.ref!, true)}>→ {field.ref}.{field.refField}</button>}{field.note && <p>{field.note}</p>}</div>)}</section>
          {connections.some(relation => relation.child === selected) && <section className="model-detail-section"><h3>Esta tabela referencia</h3>{connections.filter(relation => relation.child === selected).map(relation => relationLink(relation, true))}</section>}
          {connections.some(relation => relation.parent === selected) && <section className="model-detail-section"><h3>Referenciada por</h3>{connections.filter(relation => relation.parent === selected).map(relation => relationLink(relation, false))}</section>}
          {selectedTable.constraints.length > 0 && <section className="model-detail-section"><h3>Regras de integridade</h3><ul>{selectedTable.constraints.map(constraint => <li key={constraint}>{constraint}</li>)}</ul></section>}</div></> : <div className="model-welcome"><span className="eyebrow">Como ler o modelo</span><h2>Uma área<br />de cada vez.</h2><p>Cada cartão representa uma tabela. A cor reúne tabelas com o mesmo papel na operação.</p><ol><li><strong>Escolha uma área</strong><span>Use o filtro para se concentrar em um processo.</span></li><li><strong>Selecione uma tabela</strong><span>Veja seus campos e destaque os vínculos.</span></li><li><strong>Percorra as referências</strong><span>Clique em uma FK para entender a tabela relacionada.</span></li></ol><div className="model-reading-note"><strong>Físico ≠ disponível</strong><p>Disponível considera as reservas ativas e os bloqueios. Picking prepara a mercadoria; despacho registra a saída.</p></div><p className="model-small-note"><strong>LPN</strong> identifica uma unidade logística, como um pallet ou volume, que pode reunir vários produtos.</p><p className="model-small-note">O <strong>livro razão</strong> preserva o histórico. Correções acrescentam transações compensatórias.</p></div>}</aside>
      </div>
    </>}
    <details className="model-implementation-note"><summary>Sobre o modelo do artigo e o banco implementado</summary><p>Esta visualização apresenta as 29 tabelas do modelo relacional aprovado. Campos, tipos e referências acompanham o arquivo MySQL Workbench; as descrições explicam as regras do domínio. A versão física implantada pelo Flyway contém 30 tabelas, incluindo autenticação e sessão.</p><p>Na implementação, usuários e perfis são mapeados para <code>users</code>, <code>access_profiles</code> e <code>profile_permissions</code>; o catálogo de permissões é definido em código. <code>refresh_tokens</code> e <code>auth_challenges</code> mantêm renovação e códigos de acesso. As migrations são a referência para implantação.</p></details>
  </>;
}
