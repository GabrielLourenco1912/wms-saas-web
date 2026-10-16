import type { Metadata } from 'next';
import Link from 'next/link';
import content from '@/features/documentation/content/api-documents.json';
import { prepareDocument, extractEndpoints } from '@/features/documentation/documentation-model';
import { DocumentationNavigation } from '@/features/documentation/DocumentationNavigation';
import { ApiMarkdown } from '@/features/documentation/ApiMarkdown';

export const metadata: Metadata = { title: 'Documentação da API | WMS SaaS', description: 'Contratos completos, autenticação, endpoints, payloads, respostas, permissões e guias de consumo do WMS para web e mobile.' };

export default async function ApiDocumentationPage({ searchParams }: { searchParams: Promise<{ guia?: string }> }) {
  const { guia } = await searchParams;
  const selected = content.documents.find(document => document.id === guia) ?? content.documents[0];
  const document = prepareDocument(selected.markdown);
  const endpoints = extractEndpoints(prepareDocument(content.documents[0].markdown));
  return <div className="public-container" id="inicio">
    <section className="docs-hero docs-hero-compact"><Link className="public-breadcrumb" href="/documentacao">Documentação <span aria-hidden="true">/</span> Integração</Link><span className="public-label"><span aria-hidden="true" /> Referência para os clientes</span><h1>Documentação da API<span className="docs-title-dot">.</span></h1><p>Contratos, exemplos e regras de consumo para conectar os clientes ao WMS. Da primeira autenticação à confirmação de uma movimentação.</p><div className="docs-meta"><span>{endpoints.length} endpoints</span><span>REST · JSON</span><span>Páginas de 20 · seletores de 5</span><a href={selected.download} download className="docs-download">Baixar este guia em Markdown ↓</a></div></section>
    <nav className="docs-guide-tabs" aria-label="Guias de integração">{content.documents.map(guide => <Link key={guide.id} href={guide.id === 'api' ? '/documentacao/api' : `/documentacao/api?guia=${guide.id}`} aria-current={selected.id === guide.id ? 'page' : undefined}>{guide.title}</Link>)}</nav>
    <div className="docs-reading-layout" key={selected.id}><DocumentationNavigation headings={document.headings} /><article className="docs-article" aria-label={selected.title}><div className="docs-article-kicker"><span className="eyebrow">{selected.title}</span><span>Consulta pública</span></div><ApiMarkdown document={document} guide={selected.id} endpoints={endpoints} /><div className="docs-article-footer"><Link href="/documentacao/modelo-relacional">Explore também o modelo relacional <span aria-hidden="true">→</span></Link><a href="#inicio">Voltar ao início ↑</a></div></article></div>
  </div>;
}
