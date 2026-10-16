'use client';

import { useState } from 'react';

export function CodeBlock({ value, language }: { value: string; language: string }) {
  const [status, setStatus] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(value); setStatus('Copiado'); }
    catch { setStatus('Selecione o trecho para copiar.'); }
  }
  return <div className="docs-code-block"><div className="docs-code-toolbar"><span>{language || 'Exemplo'}</span><span role="status">{status}</span><button type="button" onClick={() => void copy()} aria-label="Copiar exemplo de código">Copiar</button></div><pre tabIndex={0}><code>{value}</code></pre></div>;
}
