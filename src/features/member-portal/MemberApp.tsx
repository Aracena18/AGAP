import { useEffect,useRef } from 'react';
import { Link,NavLink,Route,Routes,useLocation } from 'react-router-dom';
import { MemberProvider,useMember } from './MemberContext';
import { HomePage,ApplicationsPage,ApplicationFormPage,ApplicationPage,LoansPage,HelpPage } from './MemberPages';
import { Button,Notice } from '../../shared/ui';
import { Description,FindInPage,Info } from '../../shared/icons';
import { WorkspaceHeader } from '../../shared/navigation/WorkspaceHeader';
import { Gabay } from '../../shared/ui/Gabay';
import styles from './MemberApp.module.css';
function Workspace(){
  const {session,loading,error,signedOut}=useMember(),location=useLocation(),main=useRef<HTMLElement>(null);
  const signInReason=new URLSearchParams(location.search).get('signin');
  const signInMessage=signInReason==='access'?'This sign-in is not linked to an active member account. Contact the cooperative to verify enrollment or recover access.':signInReason==='retry'?'Your sign-in could not be completed. Start a new sign-in from this page.':'';
  useEffect(()=>{document.title='Your member account · AGAP';main.current?.focus();},[location.pathname]);
  return <><a className={styles.skip} href="#member-main" onClick={e=>{e.preventDefault();main.current?.focus();}}>Skip to main content</a>
    <WorkspaceHeader workspace="member" account={session?{name:session.principal.displayName,kind:'member',csrfToken:session.csrfToken,signedOut}:undefined}/>
    <main ref={main} id="member-main" tabIndex={-1} className={`${styles.main} ${!session ? styles.entryMain : ''}`}>{loading?<p role="status">Opening your account…</p>:!session?<section className={styles.welcome}><div className={styles.welcomeContent}><div className={styles.intro}><h1>Welcome to AGAP</h1><p>Your next step, made clearer.</p><ul className={styles.welcomeActions}><li><Description size={24}/><span>Apply</span></li><li><FindInPage size={24}/><span>Track</span></li><li><Info size={24}/><span>Get help</span></li></ul></div>{signInMessage&&<Notice tone="warning" role="alert">{signInMessage}</Notice>}{error?<Notice tone="warning" role="alert">{error} <Button variant="quiet" onClick={()=>window.location.reload()}>Try again</Button></Notice>:<a className={styles.primaryLink} href="/api/v1/member/auth/login">Sign in</a>}<details className={styles.accessHelp}><summary>Need access?</summary><p>Ask your cooperative to activate your account.</p></details></div><div className={styles.welcomeArt}><Gabay/></div></section>:<>
      <nav className={styles.nav} aria-label="Member account"><NavLink end to="/member">Home</NavLink><NavLink to="/member/applications">Applications</NavLink><NavLink to="/member/loans">My loans</NavLink><NavLink to="/member/help">Payment help</NavLink></nav>
      <Routes><Route path="/member" element={<HomePage/>}/><Route path="/member/applications" element={<ApplicationsPage/>}/><Route path="/member/apply" element={<ApplicationFormPage/>}/><Route path="/member/applications/:id" element={<ApplicationPage/>}/><Route path="/member/applications/:id/edit" element={<ApplicationFormPage/>}/><Route path="/member/loans" element={<LoansPage/>}/><Route path="/member/help" element={<HelpPage/>}/><Route path="*" element={<section className="stack"><h1>Page not found</h1><Link to="/member">Return to your account</Link></section>}/></Routes>
    </>}</main><footer className={styles.footer}>{session?.recordMode==='real'?'Cooperative member account':'Fictional environment · Fictional records'}</footer></>;
}
export default function MemberApp(){return <MemberProvider><Workspace/></MemberProvider>;}
