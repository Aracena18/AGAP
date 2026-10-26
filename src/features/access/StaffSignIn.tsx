import { useEffect,useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { WorkspaceHeader } from '../../shared/navigation/WorkspaceHeader';
import { Button,Notice } from '../../shared/ui';
import { useStaff } from './StaffContext';
import { staffLoginHref } from './staffLogin';
import styles from '../../app/StaffApp.module.css';

export function StaffSignIn({review=false}:{review?:boolean}){
  const {loading,error}=useStaff(),location=useLocation(),main=useRef<HTMLElement>(null);
  useEffect(()=>{document.title=`${review?'Review sign-in':'Staff sign-in'} · AGAP`;main.current?.focus();},[location.pathname,review,loading]);
  const returnTo=location.pathname==='/'?'/applications':location.pathname+location.hash;
  return <><a className={styles.skip} href="#staff-main" onClick={event=>{event.preventDefault();main.current?.focus();}}>Skip to main content</a><WorkspaceHeader workspace={review?'demo':'staff'}/>
    <main ref={main} id="staff-main" tabIndex={-1} className={styles.main}>{loading?<p role="status">Opening workspace…</p>:<section className={`panel panel-body ${styles.signIn}`}><h1>{review?'Sign in to review':'Sign in to your workspace'}</h1>{review&&<p className="small subtle">Fictional review data</p>}{error?<Notice tone="warning" role="alert">{error} <Button variant="quiet" onClick={()=>window.location.reload()}>Try again</Button></Notice>:<a className={styles.primaryLink} href={staffLoginHref(returnTo)}>Sign in</a>}</section>}</main>
  </>;
}
