import type { Metadata, Viewport } from 'next';
import { brandMono, brandSans } from '@/features/branding/fonts';
import './globals.css';
import '@/features/branding/brand-tokens.css';
import '@/features/branding/brand-system.css';
import './responsive.css';
export const metadata: Metadata = { title: 'WMS SaaS | Painel de gestão', applicationName: 'WMS SaaS', description: 'Cada movimento, sob controle. Gestão, planejamento e rastreabilidade para armazéns e distribuidores de pequeno e médio porte.' };
export const viewport: Viewport = { themeColor: '#14251E', colorScheme: 'light', viewportFit: 'cover' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="pt-BR" className={`${brandSans.variable} ${brandMono.variable}`}><body>{children}</body></html>; }
