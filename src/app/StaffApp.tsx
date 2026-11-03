import { useEffect,useRef } from 'react';
import { Link,NavLink,Navigate,Route,Routes,useLocation } from 'react-router-dom';
import { useStaff } from '../features/access/StaffContext';
import StaffWorkflowPage from '../features/workflow/WorkflowPanel';
import MembersPage from '../features/members/MembersPage';
import IntakePage from '../features/applications/IntakePage';
import AccessPage from '../features/access/AccessPage';
import { WorkspaceHeader } from '../shared/navigation/WorkspaceHeader';
import { StaffSignIn } from '../features/access/StaffSignIn';
import styles from './StaffApp.module.css';

function StaffWorkspace(){
  const {session,signedOut}=useStaff();
  const location=useLocation();const main=useRef<HTMLElement>(null);
  useEffect(()=>{document.title=`${location.pathname.includes('applications')?'Applications':location.pathname.includes('access')?'Staff access':'Members'} · AGAP staff`;main.current?.focus();},[location.pathname]);
  if(!session)return <StaffSignIn/>;
  return <>
    <a className={styles.skip} href="#staff-main" onClick={event=>{event.preventDefault();main.current?.focus();main.current?.scrollIntoView({block:'start'});}}>Skip to main content</a>
    <WorkspaceHeader workspace="staff" account={{name:session.user.displayName,kind:'staff',csrfToken:session.csrfToken,signedOut}}/>
    <main ref={main} id="staff-main" tabIndex={-1} className={styles.main}>
        <nav className={styles.nav} aria-label="Staff workspace"><NavLink to="/staff/members">Members</NavLink><NavLink to="/staff/applications">Applications</NavLink>{session.user.roles.includes('administrator')&&<NavLink to="/staff/access">Staff access</NavLink>}</nav>
        <div className={styles.content}><Routes><Route path="/staff" element={<Navigate to="/staff/members" replace/>}/><Route path="/staff/members" element={<MembersPage/>}/><Route path="/staff/applications" element={<IntakePage/>}/><Route path="/staff/applications/:id/evidence" element={<StaffWorkflowPage/>}/><Route path="/staff/access" element={<AccessPage/>}/><Route path="*" element={<section><h1>Page not found</h1><Link to="/staff/members">Return to members</Link></section>}/></Routes></div>
    </main>
    <footer className={styles.footer}>{session.recordMode==='real'?'Cooperative workspace':'Fictional environment · Fictional records'}</footer>
  </>;
}
export default function StaffApp(){return <StaffWorkspace/>;}
