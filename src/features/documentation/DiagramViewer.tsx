'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { clampZoom } from './relational-model';

export function DiagramViewer() {
  const [zoom, setZoom] = useState(100);
  const [dragging, setDragging] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  function changeZoom(value: number) {
    const element = viewport.current;
    const next = clampZoom(value), ratio = next / zoom;
    const left = element ? (element.scrollLeft + element.clientWidth / 2) * ratio - element.clientWidth / 2 : 0;
    const top = element ? (element.scrollTop + element.clientHeight / 2) * ratio - element.clientHeight / 2 : 0;
    setZoom(next);
    requestAnimationFrame(() => { if (viewport.current) viewport.current.scrollTo({ left: Math.max(0, left), top: Math.max(0, top) }); });
  }
  return <section className="diagram-viewer" aria-label="Diagrama completo do modelo relacional"><div className="diagram-toolbar"><div><h2>O modelo completo</h2><p>Amplie para ler os campos. Arraste com o mouse ou use as barras de rolagem para percorrer o desenho.</p></div><div className="diagram-controls"><button type="button" className="secondary-button" aria-label="Diminuir zoom" disabled={zoom <= 50} onClick={() => changeZoom(zoom - 25)}>−</button><output aria-label="Nível de zoom">{zoom}%</output><button type="button" className="secondary-button" aria-label="Aumentar zoom" disabled={zoom >= 300} onClick={() => changeZoom(zoom + 25)}>+</button><button type="button" className="secondary-button" onClick={() => changeZoom(100)}>Ajustar à largura</button></div></div><div ref={viewport} className={`diagram-stage ${dragging ? 'is-dragging' : ''}`} tabIndex={0} role="region" aria-label="Imagem ampliável: use as setas do teclado para rolar" onPointerDown={event => {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    const element = event.currentTarget; drag.current = { x: event.clientX, y: event.clientY, left: element.scrollLeft, top: element.scrollTop }; element.setPointerCapture(event.pointerId); setDragging(true);
  }} onPointerMove={event => {
    if (!drag.current) return;
    event.currentTarget.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
    event.currentTarget.scrollTop = drag.current.top - (event.clientY - drag.current.y);
  }} onPointerUp={() => { drag.current = null; setDragging(false); }} onPointerCancel={() => { drag.current = null; setDragging(false); }} onLostPointerCapture={() => { drag.current = null; setDragging(false); }}><div className="diagram-image" style={{ width: `${zoom}%` }}><Image src="/documentacao/modelo-relacional-wms-v2.png" alt="Modelo relacional WMS V2 aprovado no artigo, com 29 tabelas e seus relacionamentos." width={1916} height={1363} unoptimized draggable={false} /></div></div><div className="diagram-caption"><span>Figura original do modelo V2 · MySQL Workbench</span><a href="/documentacao/modelo-relacional-wms-v2.png" download>Baixar imagem PNG ↓</a></div></section>;
}
