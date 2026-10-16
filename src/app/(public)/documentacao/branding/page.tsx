import type { Metadata } from 'next';
import { BrandingGuide } from '@/features/branding/BrandingGuide';
import '@/features/branding/branding-guide.css';

export const metadata: Metadata = { title: 'Branding e identidade visual | WMS SaaS', description: 'Conceito, cores, tipografia, símbolo, assinatura e recursos oficiais da identidade visual do projeto WMS SaaS.' };

export default function BrandingPage() { return <BrandingGuide />; }
