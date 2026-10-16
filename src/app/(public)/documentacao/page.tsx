import type { Metadata } from 'next';
import Link from 'next/link';
import api from '@/features/documentation/content/api-documents.json';
import { extractEndpoints, prepareDocument } from '@/features/documentation/documentation-model';
import { BrandMark } from '@/features/branding/BrandMark';

export const metadata: Metadata = { title: 'Documentação | WMS SaaS', description: 'Explore os contratos da API, o modelo relacional e a identidade visual do WMS.' };

export default function DocumentationHome() {
  const endpoints = extractEndpoints(prepareDocument(api.documents[0].markdown));
  return <div className="public-container docs-home">
    <section className="docs-hero"><span className="public-label"><span aria-hidden="true" /> Acesso público · sem login</span><h1>Conheça o projeto.<br />Explore suas conexões.</h1><p>Dos contratos da API à identidade visual. Explore as decisões que conectam planejamento, execução e rastreabilidade de estoque.</p></section>
    <div className="docs-home-grid">
      <Link className="docs-entry-card" href="/documentacao/api"><span className="docs-entry-symbol" aria-hidden="true">{'{ }'}</span><span className="eyebrow">Integração</span><h2>Documentação da API</h2><p>Autenticação, endpoints, permissões, exemplos de consumo e todos os campos de requisição e resposta.</p><span className="docs-entry-stats">{endpoints.length} endpoints · guias web e mobile</span><span className="docs-entry-action">Consultar a documentação <span aria-hidden="true">→</span></span></Link>
      <Link className="docs-entry-card" href="/documentacao/modelo-relacional"><span className="docs-entry-symbol" aria-hidden="true">▦</span><span className="eyebrow">Modelagem</span><h2>Modelo relacional</h2><p>Uma visão por áreas do armazém. Encontre tabelas, entenda seus campos e percorra os vínculos entre elas.</p><span className="docs-entry-stats">29 tabelas · 276 campos · 91 relacionamentos</span><span className="docs-entry-action">Explorar o modelo <span aria-hidden="true">→</span></span></Link>
      <Link className="docs-entry-card" href="/documentacao/branding"><span className="docs-entry-symbol"><BrandMark size={40} /></span><span className="eyebrow">Identidade</span><h2>Branding do projeto</h2><p>Conceito, cores, tipografia, símbolo e autoria. Conheça a marca e baixe os recursos preparados para web e mobile.</p><span className="docs-entry-stats">Guia visual · SVG, PNG e ICO</span><span className="docs-entry-action">Explorar a identidade <span aria-hidden="true">→</span></span></Link>
    </div>
    <div className="docs-home-note"><strong>Um sistema, duas formas de operar.</strong><p>O painel web concentra gestão e planejamento. O aplicativo móvel orienta a execução no armazém. Ambos compartilham as regras da API e o histórico de movimentações.</p></div>
  </div>;
}
