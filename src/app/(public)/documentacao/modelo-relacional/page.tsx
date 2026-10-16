import type { Metadata } from 'next';
import Link from 'next/link';
import { RelationalExplorer } from '@/features/documentation/RelationalExplorer';

export const metadata: Metadata = { title: 'Modelo relacional | WMS SaaS', description: 'Explore as 29 tabelas, 276 campos e 91 relacionamentos do modelo WMS, com pesquisa por área, campos, chaves e diagrama ampliável.' };

export default function RelationalModelPage() {
  return <div className="public-container model-container"><section className="docs-hero docs-hero-compact"><Link className="public-breadcrumb" href="/documentacao">Documentação <span aria-hidden="true">/</span> Modelagem</Link><span className="public-label"><span aria-hidden="true" /> Modelo relacional · versão 2</span><h1>Do processo ao dado<span className="docs-title-dot">.</span></h1><p>Entenda o que cada tabela guarda e como as informações se conectam, do recebimento ao histórico de movimentações.</p><div className="docs-meta"><span>29 tabelas</span><span>276 campos</span><span>91 relacionamentos</span><a href="/documentacao/modelo-relacional-wms-v2.png" download className="docs-download">Baixar o diagrama ↓</a></div></section><RelationalExplorer /></div>;
}
