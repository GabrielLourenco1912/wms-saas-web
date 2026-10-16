'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function PublicNavigation() {
  const pathname = usePathname();
  return <nav className="public-navigation" aria-label="Documentação pública">
    <Link href="/documentacao/api" aria-current={pathname === '/documentacao/api' ? 'page' : undefined}>Documentação da API</Link>
    <Link href="/documentacao/modelo-relacional" aria-current={pathname === '/documentacao/modelo-relacional' ? 'page' : undefined}>Modelo relacional</Link>
  </nav>;
}
