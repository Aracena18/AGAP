import { useState, type ReactNode } from 'react';
import { Link,useLocation } from 'react-router-dom';
import { Notice } from '../ui';
import { Dropdown } from './Dropdown';
import styles from './navigation.module.css';

interface Account {presentation?:boolean;name:string;kind:'member'|'staff';csrfToken:string;signedOut:()=>void}
export function WorkspaceHeader({workspace,account,showWorkspaceSwitcher=true,actions}:{workspace:'member'|'staff'|'demo';account?:Account;showWorkspaceSwitcher?:boolean;actions?:ReactNode}){
  const {pathname}=useLocation(),[error,setError]=useState(''),[saving,setSaving]=useState(false);
  const initials=account?.name.split(' ').map(part=>part[0]).slice(0,2).join('')??'';
  const labels={member:'Member',staff:'Staff',demo:'Review demo'},home={member:'/member',staff:'/staff',demo:'/applications'};
  async function signOut(){
    if(!account||saving||!window.dispatchEvent(new Event('agap:signout',{cancelable:true})))return;
    setSaving(true);setError('');
    try{
      const response=await fetch(`/api/v1/${account.kind==='member'?'member/':''}auth/logout`,{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':account.csrfToken}});
      if(!response.ok&&response.status!==401)throw new Error();account.signedOut();
    }catch{setError('Could not confirm sign-out. Try again.');}finally{setSaving(false);}
  }
  return <><header className={`${styles.header} ${workspace==='member'?styles.memberHeader:''} no-print`}><div className={styles.inner}>
    <Link className={styles.brand} to={home[workspace]} aria-label="AGAP home"><span className={styles.mark} aria-hidden="true"><span/><span/><span/></span>AGAP</Link>
    {showWorkspaceSwitcher&&<nav aria-label="Workspaces"><Dropdown key={`workspace-${pathname}`} label={`Switch workspace, current: ${labels[workspace]}`} trigger={labels[workspace]}>
      <Link role="menuitem" to="/member" aria-current={workspace==='member'?'page':undefined}>Member portal</Link>
      <Link role="menuitem" to="/staff" aria-current={workspace==='staff'?'page':undefined}>Staff workspace</Link>
      <Link role="menuitem" to="/applications" aria-current={workspace==='demo'?'page':undefined}>Review demo</Link>
    </Dropdown></nav>}
    {actions}
    {account?.presentation&&<span className={styles.presentation}>Presentation mode</span>}
    {account&&!account.presentation&&<Dropdown key={`account-${pathname}`} label={`${initials} — Account menu for ${account.name}`} trigger={<span className={styles.avatar} aria-hidden="true">{initials}</span>}>
      <div className={styles.identity} role="presentation"><strong>{account.name}</strong><span>{account.kind==='member'?'Member account':'Staff account'}</span></div>
      <button role="menuitem" disabled={saving} onClick={()=>void signOut()}>{saving?'Signing out…':'Sign out'}</button>
    </Dropdown>}
  </div></header>{error&&<div className={styles.error}><Notice tone="danger" role="alert">{error}</Notice></div>}</>;
}
