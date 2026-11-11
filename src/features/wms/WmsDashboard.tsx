'use client';
import Link from 'next/link';
import {BrandMark} from '@/features/branding/BrandMark';
import {AuthorCredit} from '@/features/branding/AuthorCredit';
import {useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import {useAuth} from '@/features/auth/AuthProvider';
import {WarehouseScreen,ProductsScreen,PartnersScreen} from '@/features/catalog/CatalogScreens';
import {ReceiptsScreen,OrdersScreen,TasksScreen,MonitoringScreen} from '@/features/planning';
import {UsersScreen} from '@/features/users/UsersScreen';
import {ProfilesScreen} from '@/features/users/ProfilesScreen';
import {StockScreen,TransfersScreen} from '@/features/stock/StockScreen';
import {AuditScreen} from '@/features/stock/AuditScreen';
import {InventoriesScreen} from '@/features/inventory/InventoriesScreen';
import {DashboardHome} from '@/features/dashboard/DashboardHome';
import {DetailGrid,Loading,Notice,Panel} from '@/components/wms/primitives';
import {permissionLabel} from '@/features/users/admin-models';
import {navigation,sectionUrl} from './navigation';
import {DashboardNavigation} from './DashboardNavigation';
import {NavigationIcon} from './NavigationIcon';

function AccessManagement(){const {can}=useAuth(),[selected,setSelected]=useState('users');const section=selected==='users'&&can('USER_VIEW')?'users':selected==='profiles'&&can('PROFILE_VIEW')?'profiles':can('USER_VIEW')?'users':'profiles';return <div className="screen-stack"><nav className="tab-list" aria-label="Administração de acesso">{can('USER_VIEW')&&<button className={section==='users'?'active':''} onClick={()=>setSelected('users')} aria-pressed={section==='users'}>Usuários</button>}{can('PROFILE_VIEW')&&<button className={section==='profiles'?'active':''} onClick={()=>setSelected('profiles')} aria-pressed={section==='profiles'}>Perfis e permissões</button>}</nav>{section==='users'?<UsersScreen/>:<ProfilesScreen/>}</div>;}
function Account(){const {user,reloadUser}=useAuth(),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);return <Panel title="Minha conta" description="Os acessos refletem as permissões atuais do seu perfil." actions={<button className="secondary-button" disabled={busy} onClick={async()=>{setBusy(true);try{await reloadUser();setMessage('Permissões atualizadas.');}catch(error){setMessage(error instanceof Error?error.message:'Não foi possível atualizar.');}finally{setBusy(false);}}}>{busy?'Atualizando…':'Atualizar permissões'}</button>}><div className="panel-body">{message&&<Notice>{message}</Notice>}<DetailGrid values={{Nome:user?.name,'E-mail':user?.email,Perfil:user?.profileCode,Situação:user?.status}}/><h3>Permissões do perfil</h3><ul className="permission-summary">{user?.permissions.map(code=><li key={code}>{permissionLabel(code)}</li>)}</ul></div></Panel>;}
function Screen({section}:{section:string}){switch(section){case'warehouse':return <WarehouseScreen/>;case'products':return <ProductsScreen/>;case'partners':return <PartnersScreen/>;case'receipts':return <ReceiptsScreen/>;case'orders':return <OrdersScreen/>;case'tasks':return <TasksScreen/>;case'monitoring':return <MonitoringScreen/>;case'stock':return <StockScreen/>;case'transfers':return <TransfersScreen/>;case'inventories':return <InventoriesScreen/>;case'audit':return <AuditScreen/>;case'users':return <AccessManagement/>;case'account':return <Account/>;default:return <DashboardHome/>;}}
export function WmsDashboard({section='dashboard'}:{section?:string}){
 const auth=useAuth(),router=useRouter(),[menuOpen,setMenuOpen]=useState(false),[leaving,setLeaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(auth.status==='unauthenticated')router.replace('/auth/login');},[auth.status,router]);
 if(auth.status==='loading'||auth.status==='unauthenticated')return <main className="session-state"><Loading message="Verificando acesso ao painel…"/></main>;
 if(auth.status==='error')return <main className="session-state"><Panel title="Não foi possível recuperar sua sessão"><Notice tone="error">{auth.error}</Notice><div className="form-actions"><button className="primary-button" onClick={()=>void auth.retrySession()}>Tentar novamente</button><Link className="secondary-button button-link" href="/auth/login">Ir para o acesso</Link></div></Panel></main>;
 const modules=navigation.filter(item=>item.permissions.length===0||item.permissions.some(permission=>auth.can(permission)));
 const current=navigation.find(item=>item.id===section)??navigation[0],allowed=current.permissions.length===0||current.permissions.some(permission=>auth.can(permission));
 async function logout(){setLeaving(true);setError('');try{await auth.logout();router.replace('/auth/login');}catch{router.replace('/auth/login?logout=unconfirmed');}finally{setLeaving(false);}}
 return <div className="app-shell">
  <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
  <DashboardNavigation modules={modules} section={section} user={auth.user} leaving={leaving} onLogout={logout} open={menuOpen} onClose={()=>setMenuOpen(false)} onOpen={()=>setMenuOpen(true)}/>
  <section className="workspace">
   <header className="topbar"><div className="topbar-title"><span className="topbar-brand" aria-hidden="true"><BrandMark size={28}/></span><div><span className="eyebrow"><span className="desktop-eyebrow">Painel de gestão</span><span className="mobile-eyebrow">WMS SaaS</span></span><h1>{current.label}</h1></div></div><div className="topbar-actions"><Link className="account-link" href={sectionUrl('account')}>{auth.user?.name}</Link><button className="secondary-button menu-toggle" type="button" aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={()=>setMenuOpen(true)}><NavigationIcon name="menu"/><span>Menu</span></button></div></header>
   <main id="main-content" tabIndex={-1}>{error&&<Notice tone="error">{error}</Notice>}{allowed?<div className="screen-stack"><Screen section={section}/></div>:<Notice>Seu perfil não permite acessar este módulo. Escolha uma opção disponível no menu.</Notice>}</main>
   <footer className="workspace-footer"><AuthorCredit compact/><Link href="/documentacao">Documentação do projeto ↗</Link></footer>
  </section>
 </div>;
}
