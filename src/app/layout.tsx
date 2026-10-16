import type { Metadata } from 'next';
import {AuthProvider} from '@/features/auth/AuthProvider';
import './globals.css';
export const metadata:Metadata={title:'WMS SaaS | Painel de gestão',description:'Cadastros, planejamento e acompanhamento do armazém.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><AuthProvider>{children}</AuthProvider></body></html>;}
