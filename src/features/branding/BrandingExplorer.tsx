'use client';

import Image from 'next/image';
import { useState } from 'react';

export type PaletteColor = { name: string; value: string; usage: string; inverse: boolean };

export function BrandPalette({ colors }: { colors: PaletteColor[] }) {
  const [notice, setNotice] = useState('');
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setNotice(`${value} copiado.`); }
    catch { setNotice(`Código da cor: ${value}. Selecione o texto para copiar.`); }
  }
  return <><div className="branding-palette">{colors.map(color => <button type="button" key={color.name} onClick={() => void copy(color.value)} aria-label={`Copiar ${color.name}, ${color.value}`}><span className="branding-color-sample" style={{ background: color.value, color: color.inverse ? '#FFFFFF' : '#18251F' }} aria-hidden="true">Aa<span>↗</span></span><span className="branding-color-label"><strong>{color.name}</strong><code>{color.value}</code><small>{color.usage}</small></span></button>)}</div><p className="branding-interaction-help" role="status">{notice || 'Selecione uma amostra para copiar seu hexadecimal.'}</p></>;
}

export function BrandTypeLab() {
  const [family, setFamily] = useState('sans'), [size, setSize] = useState(40), [text, setText] = useState('Organização, precisão, movimento.');
  return <div className="branding-type-lab"><div className="branding-lab-controls"><label className="field" htmlFor="branding-font-family">Família<select id="branding-font-family" value={family} onChange={event => setFamily(event.target.value)}><option value="sans">Manrope</option><option value="mono">DM Mono</option></select></label><label className="field branding-range" htmlFor="branding-font-size">Tamanho da amostra <output>{size} px</output><input id="branding-font-size" type="range" min="24" max="64" value={size} onChange={event => setSize(Number(event.target.value))} /></label></div><div className="field"><label htmlFor="branding-type-sample">Experimente palavras e códigos</label><textarea id="branding-type-sample" rows={3} value={text} onChange={event => setText(event.target.value)} style={{ fontFamily: family === 'mono' ? 'var(--font-geist-mono)' : 'var(--font-geist-sans)', fontSize: size, fontWeight: family === 'mono' ? 400 : 600 }} /></div></div>;
}

const iconVariants = {
  lime: { file: 'symbol-lime.svg', background: '#14251E', label: 'Lima sobre floresta' },
  green: { file: 'symbol-green.svg', background: '#F5F6F0', label: 'Verde sobre papel' },
  dark: { file: 'symbol-dark.svg', background: '#FFFFFF', label: 'Monocromático escuro' },
  white: { file: 'symbol-white.svg', background: '#14251E', label: 'Monocromático branco' },
  tile: { file: 'app-icon.svg', background: '#EEF1EB', label: 'Ícone com fundo' },
};

export function BrandIconExplorer() {
  const [variant, setVariant] = useState<keyof typeof iconVariants>('lime'), [mask, setMask] = useState('square'), [size, setSize] = useState(160);
  const preset = iconVariants[variant], tile = variant === 'tile';
  const file = tile && mask !== 'square' ? 'maskable.svg' : preset.file;
  const source = `/branding/symbols/${file}`;
  return <div className="branding-icon-explorer"><div className={`branding-preview-stage ${tile ? `branding-mask-${mask}` : ''}`} style={{ background: preset.background }}><Image src={source} alt={preset.label} width={size} height={size} unoptimized /></div><div className="branding-preview-controls"><label className="field" htmlFor="branding-icon-variant">Variante do símbolo<select id="branding-icon-variant" value={variant} onChange={event => setVariant(event.target.value as keyof typeof iconVariants)}>{Object.entries(iconVariants).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></label><label className="field branding-range" htmlFor="branding-icon-size">Tamanho da prévia <output>{size} px</output><input id="branding-icon-size" type="range" min="48" max="192" step="8" value={size} onChange={event => setSize(Number(event.target.value))} /></label><label className="field" htmlFor="branding-icon-mask">Recorte do ícone<select id="branding-icon-mask" disabled={!tile} value={mask} onChange={event => setMask(event.target.value)}><option value="square">Quadrado</option><option value="round">Arredondado</option><option value="circle">Circular</option></select></label><p>Nos recortes, o ícone utiliza a variante maskable, com margem própria para preservar o desenho.</p><a className="branding-download-link" href={source} download>Baixar esta variante em SVG ↓</a></div></div>;
}
