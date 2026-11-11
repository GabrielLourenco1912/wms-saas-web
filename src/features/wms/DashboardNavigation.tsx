'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { BrandMark } from '@/features/branding/BrandMark';
import { navigation, sectionUrl } from './navigation';
import { NavigationIcon } from './NavigationIcon';

type NavigationItem = typeof navigation[number];
type NavigationProps = {
  modules: NavigationItem[];
  section: string;
  user: { name: string; profileCode: string } | null;
  leaving: boolean;
  onLogout: () => Promise<void>;
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
};

const groups = [
  { label: 'Seu painel', ids: ['dashboard'] },
  { label: 'Operação', ids: ['receipts', 'orders', 'tasks', 'monitoring', 'transfers'] },
  { label: 'Estrutura e estoque', ids: ['warehouse', 'products', 'partners', 'stock', 'inventories', 'audit'] },
  { label: 'Administração', ids: ['users', 'account'] },
];

function ModuleLinks({ modules, section, onNavigate }: Pick<NavigationProps, 'modules' | 'section'> & { onNavigate?: () => void }) {
  return <nav className="sidebar-nav" aria-label="Módulos">{groups.map(group => {
    const items = group.ids.flatMap(id => modules.filter(item => item.id === id));
    return items.length > 0 && <div className="navigation-group" key={group.label}>
      <p className="navigation-group-label">{group.label}</p>
      {items.map(item => <Link key={item.id} href={sectionUrl(item.id)} aria-current={section === item.id ? 'page' : undefined} className={section === item.id ? 'active' : ''} onClick={onNavigate}>
        <NavigationIcon name={item.id} /><div><span>{item.label}</span><small>{item.hint}</small></div>
      </Link>)}
    </div>;
  })}</nav>;
}

function UserMenu({ user, leaving, onLogout }: Pick<NavigationProps, 'user' | 'leaving' | 'onLogout'>) {
  return <div className="sidebar-user"><strong>{user?.name}</strong><span>{user?.profileCode === 'GESTOR' ? 'Gestor' : user?.profileCode === 'OPERADOR' ? 'Operador' : user?.profileCode}</span><button type="button" className="sidebar-logout" onClick={() => void onLogout()} disabled={leaving}>{leaving ? 'Saindo…' : 'Sair da conta'}</button></div>;
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return <Link className="brand-block" href="/" onClick={onNavigate}><div className="brand-mark"><BrandMark /></div><div><strong>WMS SaaS</strong><span>Gestão de armazéns</span></div></Link>;
}

export function DashboardNavigation({ modules, section, user, leaving, onLogout, open, onClose, onOpen }: NavigationProps) {
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = drawer.current;
    if (open && !dialog?.open) {
      dialog?.showModal();
      dialog?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
    } else if (!open && dialog?.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 861px)');
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [onClose]);

  const shortcuts = ['dashboard', 'stock', 'tasks', 'products', 'orders', 'account']
    .flatMap(id => modules.filter(item => item.id === id)).slice(0, 3);
  const otherSection = !shortcuts.some(item => item.id === section);

  function cycleDrawerFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return <>
    <aside className="sidebar" aria-label="Navegação principal"><Brand /><ModuleLinks modules={modules} section={section} /><UserMenu user={user} leaving={leaving} onLogout={onLogout} /></aside>
    <dialog ref={drawer} id="mobile-navigation" className="navigation-drawer" aria-labelledby="navigation-title" onClose={onClose} onKeyDown={cycleDrawerFocus} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="navigation-drawer-content">
        <header className="navigation-drawer-header"><Brand onNavigate={onClose} /><button className="drawer-close" type="button" aria-label="Fechar menu" onClick={onClose} autoFocus><NavigationIcon name="close" /></button></header>
        <h2 id="navigation-title" className="sr-only">Navegação do painel</h2>
        <ModuleLinks modules={modules} section={section} onNavigate={onClose} />
        <UserMenu user={user} leaving={leaving} onLogout={onLogout} />
      </div>
    </dialog>
    <nav className="mobile-bottom-nav" aria-label="Acesso rápido">{shortcuts.map(item => <Link key={item.id} href={sectionUrl(item.id)} aria-current={section === item.id ? 'page' : undefined}><NavigationIcon name={item.id} /><span>{item.id === 'dashboard' ? 'Início' : item.id === 'account' ? 'Conta' : item.label}</span></Link>)}<button type="button" className={otherSection ? 'active' : ''} aria-label="Todos os módulos" aria-expanded={open} aria-controls="mobile-navigation" onClick={onOpen}><NavigationIcon name="menu" /><span>Menu</span></button></nav>
  </>;
}
