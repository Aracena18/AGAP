import { useEffect,useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { WorkspaceHeader } from '../../shared/navigation/WorkspaceHeader';
import { Button,Notice } from '../../shared/ui';
import { Gabay } from '../../shared/ui/Gabay';
import { useStaff } from './StaffContext';
import { staffLoginHref } from './staffLogin';
import styles from '../../app/StaffApp.module.css';

export function StaffSignIn({review=false}:{review?:boolean}){
  const {loading,error,retrySession}=useStaff(),location=useLocation(),main=useRef<HTMLElement>(null);
  useEffect(()=>{document.title=`${review?'Review sign-in':'Staff sign-in'} · AGAP`;main.current?.focus();},[location.pathname,review]);
  const returnTo=location.pathname==='/'?'/applications':location.pathname+location.hash;
  return <div className={styles.signInPage}><a className={styles.skip} href="#staff-main" onClick={event=>{event.preventDefault();main.current?.focus();}}>Skip to main content</a><WorkspaceHeader workspace={review?'demo':'staff'}/>
    <main ref={main} id="staff-main" tabIndex={-1} className={`${styles.main} ${styles.signInMain}`}><section className={styles.signIn}><div className={styles.signInContent}><h1>{review?'Sign in to review':'Sign in to your workspace'}</h1><p className="subtle">Evidence, cash flow and human review, together.</p>{review&&<p className="small subtle">Fictional review data</p>}{error?<div className={styles.signInRecovery}><Notice tone="warning" role="alert"><div className={styles.signInMessage}><strong>Sign-in is temporarily unavailable</strong><p>{error}</p></div></Notice><Button aria-disabled={loading||undefined} onClick={()=>{if(!loading)retrySession();}}>{loading?'Checking…':'Try again'}</Button></div>:!loading&&<a className={styles.primaryLink} href={staffLoginHref(returnTo)}>Sign in</a>}{loading&&<p role="status" className="small subtle">Checking sign-in…</p>}</div><div className={styles.signInArt}><Gabay/></div></section></main>
  </div>;
}
