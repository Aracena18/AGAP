import { useEffect,useRef,useState } from 'react';
import { Link,NavLink,Navigate,Route,Routes,useLocation } from 'react-router-dom';
import { StaffProvider,useStaff } from '../features/access/StaffContext';
import MembersPage from '../features/members/MembersPage';
import IntakePage from '../features/applications/IntakePage';
import AccessPage from '../features/access/AccessPage';
import { Button,Notice } from '../shared/ui';
import { NorthEast } from '../shared/icons';
import styles from './StaffApp.module.css';

function StaffWorkspace(){
  const {session,loading,error,signedOut}=useStaff();
  const location=useLocation();const main=useRef<HTMLElement>(null);
  const [signOutError,setSignOutError]=useState('');
  useEffect(()=>{document.title=`${location.pathname.includes('applications')?'Applications':location.pathname.includes('access')?'Staff access':'Members'} · AGAP staff`;main.current?.focus();},[location.pathname]);
  async function signOut(){
    if(!window.dispatchEvent(new Event('agap:signout',{cancelable:true})))return;
    setSignOutError('');
    try{const result=await fetch('/api/v1/auth/logout',{method:'POST',headers:{'X-CSRF-Token':session!.csrfToken},credentials:'same-origin'});if(!result.ok&&result.status!==401)throw new Error();signedOut();}catch{setSignOutError('Sign-out could not be confirmed. Try again.');}
  }
  return <>
    <a className={styles.skip} href="#staff-main" onClick={event=>{event.preventDefault();main.current?.focus();main.current?.scrollIntoView({block:'start'});}}>Skip to main content</a>
    <header className={styles.header}><Link className={styles.brand} to="/staff"><NorthEast size={24}/>AGAP<span>Staff workspace</span></Link>{session&&<div className={styles.account}><span>{session.user.displayName}</span><Button variant="quiet" onClick={()=>void signOut()}>Sign out</Button></div>}</header>
    <main ref={main} id="staff-main" tabIndex={-1} className={styles.main}>
      {loading?<p role="status">Opening staff workspace…</p>:!session?<section className={`panel panel-body ${styles.signIn}`}><p className="eyebrow">Cooperative staff</p><h1>Sign in to your workspace</h1><p>Manage member records and prepare loan applications with your assigned access.</p>{error?<Notice tone="warning" role="alert">{error} <Button variant="quiet" onClick={()=>window.location.reload()}>Try again</Button></Notice>:<a className={styles.primaryLink} href="/api/v1/auth/login">Sign in</a>}<Link to="/applications">Open the fictional review demo</Link></section>:<>
        <nav className={styles.nav} aria-label="Staff workspace"><NavLink to="/staff/members">Members</NavLink><NavLink to="/staff/applications">Applications</NavLink>{session.user.roles.includes('administrator')&&<NavLink to="/staff/access">Staff access</NavLink>}</nav>
        {signOutError&&<Notice tone="danger" role="alert">{signOutError}</Notice>}
        <Routes><Route path="/staff" element={<Navigate to="/staff/members" replace/>}/><Route path="/staff/members" element={<MembersPage/>}/><Route path="/staff/applications" element={<IntakePage/>}/><Route path="/staff/access" element={<AccessPage/>}/><Route path="*" element={<section><h1>Page not found</h1><Link to="/staff/members">Return to members</Link></section>}/></Routes>
      </>}
    </main>
    <footer className={styles.footer}>Development workspace · Use fictional records only. <Link to="/applications">Review demo</Link></footer>
  </>;
}
export default function StaffApp(){return <StaffProvider><StaffWorkspace/></StaffProvider>;}
