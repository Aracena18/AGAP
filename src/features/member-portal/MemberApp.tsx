import { useEffect,useRef } from 'react';
import { Link,Route,Routes,useLocation } from 'react-router-dom';
import {MemberAssistedCheckIns} from './MemberAssistedCheckIns';
import { MemberProvider,useMember } from './MemberContext';
import { HomePage,ApplicationsPage,ApplicationFormPage,ApplicationPage,LoansPage,HelpPage } from './MemberPages';
import { Button,Notice } from '../../shared/ui';
import { Description,FindInPage,Info } from '../../shared/icons';
import { WorkspaceHeader } from '../../shared/navigation/WorkspaceHeader';
import { Gabay } from '../../shared/ui/Gabay';
import { MemberConnection,MemberInstallation,MemberNavigation } from './MemberShell';
import styles from './MemberApp.module.css';
function Workspace(){
  const {session,loading,error,signedOut,presentation,retrySession}=useMember(),location=useLocation(),main=useRef<HTMLElement>(null);
  const signInReason=new URLSearchParams(location.search).get('signin');
  const signInMessage=signInReason==='access'?'This sign-in is not linked to an active member account. Contact the cooperative to verify enrollment or recover access.':signInReason==='retry'?'Your sign-in could not be completed. Start a new sign-in from this page.':'';
  useEffect(()=>{document.title=`${location.pathname.includes('/apply')?'Apply for a loan':location.pathname.includes('/applications')?'My applications':location.pathname.includes('/loans')?'My loans':location.pathname.includes('/help')?'Payment help':'Your member account'} · AGAP`;main.current?.focus({preventScroll:true});main.current?.scrollTo({top:0});window.scrollTo({top:0});},[location.pathname]);
  return <div data-member-shell className={`${styles.shell} ${session?styles.memberShell:''}`}><a className={styles.skip} href="#member-main" onClick={e=>{e.preventDefault();main.current?.focus();}}>Skip to main content</a>
    <WorkspaceHeader workspace="member" showWorkspaceSwitcher={false} actions={<MemberInstallation/>} account={session?{name:session.principal.displayName,kind:'member',csrfToken:session.csrfToken,signedOut,presentation}:undefined}/>
    <main ref={main} id="member-main" tabIndex={-1} className={`${styles.main} ${!session ? styles.entryMain : styles.signedIn}`}><MemberConnection/>{loading?<p role="status">Opening your account…</p>:!session?<section className={styles.welcome}><div className={styles.welcomeContent}><div className={styles.intro}><h1>Welcome to AGAP</h1><p>I’m Gabay. Let’s take it one step at a time.</p><ul className={styles.welcomeActions}><li><Description size={24}/><span>Apply</span></li><li><FindInPage size={24}/><span>Track</span></li><li><Info size={24}/><span>Get help</span></li></ul></div>{!presentation&&signInMessage&&<Notice tone="warning" role="alert">{signInMessage}</Notice>}{error?<Notice tone="warning" role="alert">{error} <Button variant="quiet" onClick={retrySession}>Try again</Button></Notice>:!presentation&&<a className={styles.primaryLink} href="/api/v1/member/auth/login">Sign in</a>}{!presentation&&<details className={styles.accessHelp}><summary>Need access?</summary><p>Ask your cooperative to activate your account.</p></details>}</div><div className={styles.welcomeArt}><Gabay/></div></section>:<>
      <MemberNavigation/>
      <Routes><Route path="/member" element={<HomePage/>}/><Route path="/member/applications" element={<ApplicationsPage/>}/><Route path="/member/apply" element={<ApplicationFormPage/>}/><Route path="/member/applications/:id" element={<ApplicationPage/>}/><Route path="/member/applications/:id/edit" element={<ApplicationFormPage/>}/><Route path="/member/loans" element={<LoansPage/>}/><Route path="/member/help" element={<HelpPage/>}/><Route path="/member/help/assisted" element={<MemberAssistedCheckIns/>}/><Route path="*" element={<section className="stack"><h1>Page not found</h1><Link to="/member">Return to your account</Link></section>}/></Routes>
    </>}<footer className={styles.footer}>{session?.recordMode==='real'?'Cooperative member account':'Fictional environment · Fictional records'}</footer></main></div>;
}
export default function MemberApp(){return <MemberProvider><Workspace/></MemberProvider>;}
