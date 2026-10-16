import Link from 'next/link';
import { PublicNavigation } from '@/features/documentation/PublicNavigation';
import { BrandMark } from '@/features/branding/BrandMark';
import { AuthorCredit } from '@/features/branding/AuthorCredit';
import './documentation.css';

export default function DocumentationLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-shell">
    <a className="skip-link" href="#documentation-content">Pular para o conteúdo</a>
    <header className="public-header">
      <div className="public-header-inner">
        <Link className="brand-block public-brand" href="/documentacao" aria-label="WMS SaaS — documentação"><BrandMark size={42} /><span><strong>WMS SaaS</strong><span>Documentação do projeto</span></span></Link>
        <PublicNavigation />
        <Link className="secondary-button public-login" href="/auth/login">Entrar no painel <span aria-hidden="true">↗</span></Link>
      </div>
    </header>
    <main id="documentation-content" className="public-main" tabIndex={-1}>{children}</main>
    <footer className="public-footer"><AuthorCredit /><nav aria-label="Links do projeto"><Link href="/documentacao/api">API</Link><Link href="/documentacao/modelo-relacional">Modelo relacional</Link><Link href="/documentacao/branding">Branding</Link><Link href="/auth/login">Painel de gestão</Link></nav></footer>
  </div>;
}
