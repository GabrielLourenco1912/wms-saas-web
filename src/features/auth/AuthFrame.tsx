import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from '@/features/branding/BrandMark';
import { AuthorCredit } from '@/features/branding/AuthorCredit';

export function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <main className="login-shell">
    <section className="login-hero" aria-label="WMS SaaS">
      <Link className="back-link" href="/" aria-label="WMS SaaS · Gestão de armazéns"><BrandMark inverse size={40} /><span>WMS SaaS · Gestão de armazéns</span></Link>
      <div><span className="eyebrow">Painel de gestão</span><h1>Cada movimento, sob controle.</h1><p>Planeje recebimentos e saídas, acompanhe saldos e mantenha a rastreabilidade do seu armazém.</p></div>
      <p>O acesso é concedido pelo gestor. Cada pessoa utiliza sua própria conta e as permissões do seu perfil.</p>
    </section>
    <section className="login-panel" aria-labelledby="auth-title">
      <div className="login-card"><div className="brand-block login-brand"><div className="brand-mark"><BrandMark /></div><div><h2 id="auth-title">{title}</h2><span>{subtitle}</span></div></div>{children}<div className="auth-public-resources"><Link className="auth-documentation-link" href="/documentacao">Documentação pública: API, modelo relacional e branding ↗</Link><AuthorCredit compact /></div></div>
    </section>
  </main>;
}
