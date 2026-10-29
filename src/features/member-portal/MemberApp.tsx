import { useEffect,useRef,useState } from 'react';
import { Link,NavLink,Route,Routes,useLocation } from 'react-router-dom';
import { MemberProvider,useMember } from './MemberContext';
import { HomePage,ApplicationsPage,ApplicationFormPage,ApplicationPage,LoansPage,HelpPage } from './MemberPages';
import { Button,Notice } from '../../shared/ui';
import { NorthEast } from '../../shared/icons';
import styles from './MemberApp.module.css';
function Workspace(){
  const {session,loading,error,signedOut}=useMember(),location=useLocation(),main=useRef<HTMLElement>(null);
  const [signOutError,setSignOutError]=useState('');
  const signInReason=new URLSearchParams(location.search).get('signin');
  const signInMessage=signInReason==='access'?'This sign-in is not linked to an active member account. Contact the cooperative to verify enrollment or recover access.':signInReason==='retry'?'Your sign-in could not be completed. Start a new sign-in from this page.':'';
  useEffect(()=>{document.title='Your member account · AGAP';main.current?.focus();},[location.pathname]);
  async function signOut(){
    if(!window.dispatchEvent(new Event('agap:signout',{cancelable:true})))return;
    try{const response=await fetch('/api/v1/member/auth/logout',{method:'POST',credentials:'same-origin',headers:{'X-CSRF-Token':session!.csrfToken}});if(!response.ok&&response.status!==401)throw new Error();signedOut();}catch{setSignOutError('Sign-out could not be confirmed. Try again.');}
  }
  return <><a className={styles.skip} href="#member-main" onClick={e=>{e.preventDefault();main.current?.focus();}}>Skip to main content</a>
    <header className={styles.header}><div className={styles.headerInner}><Link className={styles.brand} to="/member"><NorthEast size={24} aria-hidden="true"/>AGAP<span>Member services</span></Link>{session&&<div className={styles.account}><span>{session.principal.displayName}</span><Button variant="quiet" onClick={()=>void signOut()}>Sign out</Button></div>}</div></header>
    <main ref={main} id="member-main" tabIndex={-1} className={styles.main}>{loading?<p role="status">Opening your account…</p>:!session?<section className={`panel panel-body stack ${styles.narrow}`}><div className={styles.intro}><p className="eyebrow">Your cooperative, on your phone</p><h1>Welcome to AGAP</h1><p>Apply for a loan, check your progress and ask for payment help.</p></div>{signInMessage&&<Notice tone="warning" role="alert">{signInMessage}</Notice>}{error?<Notice tone="warning" role="alert">{error} <Button variant="quiet" onClick={()=>window.location.reload()}>Try again</Button></Notice>:<a className={styles.primaryLink} href="/api/v1/member/auth/login">Sign in to my account</a>}<p className="small subtle">First visit or trouble signing in? Ask the cooperative to verify your account. A phone number or uploaded document alone cannot provide access.</p><Link className={styles.link} to="/applications">Open the fictional review demo</Link></section>:<>
      <nav className={styles.nav} aria-label="Member account"><NavLink end to="/member">Home</NavLink><NavLink to="/member/applications">Applications</NavLink><NavLink to="/member/loans">My loans</NavLink><NavLink to="/member/help">Payment help</NavLink></nav>
      {signOutError&&<Notice tone="danger" role="alert">{signOutError}</Notice>}
      <Routes><Route path="/member" element={<HomePage/>}/><Route path="/member/applications" element={<ApplicationsPage/>}/><Route path="/member/apply" element={<ApplicationFormPage/>}/><Route path="/member/applications/:id" element={<ApplicationPage/>}/><Route path="/member/applications/:id/edit" element={<ApplicationFormPage/>}/><Route path="/member/loans" element={<LoansPage/>}/><Route path="/member/help" element={<HelpPage/>}/><Route path="*" element={<section className="stack"><h1>Page not found</h1><Link to="/member">Return to your account</Link></section>}/></Routes>
    </>}</main><footer className={styles.footer}>Development workspace · Use fictional records only. <Link to="/applications">Review demo</Link></footer></>;
}
export default function MemberApp(){return <MemberProvider><Workspace/></MemberProvider>;}
