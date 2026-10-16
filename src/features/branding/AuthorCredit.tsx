import Image from 'next/image';
import brand from './content/brand.json';

export function AuthorCredit({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return <a className={`wms-author-credit ${inverse ? 'wms-author-inverse' : ''} ${compact ? 'wms-author-compact' : ''}`} href={brand.author.portfolio} target="_blank" rel="noreferrer" aria-label={`Desenvolvido por ${brand.author.name} — abrir portfólio`}><Image src={`/branding/author/icons/01-monograma-gl-${inverse ? 'dark' : 'light'}-mono.svg`} width={32} height={32} alt="" unoptimized /><span><small>Desenvolvido por</small><strong>{brand.author.name}</strong></span></a>;
}
