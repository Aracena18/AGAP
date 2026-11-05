import { useEffect,useRef } from 'react';
import { Link,NavLink,Navigate,Route,Routes,useLocation,useParams } from 'react-router-dom';
import { useStaff } from '../features/access/StaffContext';
import StaffWorkflowPage from '../features/workflow/WorkflowPanel';
import ConnectedDecisionPage from '../features/decision/ConnectedDecisionPage';
import DecisionNoticesPage from '../features/decision/DecisionNoticesPage';
import MembersPage from '../features/members/MembersPage';
import IntakePage from '../features/applications/IntakePage';
import AccessPage from '../features/access/AccessPage';
import LendingPage from '../features/loans/LendingPage';
import ConnectedLoanPage from '../features/loans/ConnectedLoanPage';
import SupportQueuePage from '../features/monitoring/SupportQueuePage';
import CheckInSummaryPage from '../features/monitoring/CheckInSummaryPage';
import { PriorityQueuePage } from '../features/reviews/PriorityQueuePage';
import { PriorityReviewPage } from '../features/reviews/PriorityReviewPage';
import { ReviewNotices } from '../features/reviews/ReviewNotices';
import PilotStaffPage,{PilotMoneyQueuePage} from '../features/pilot/PilotStaffPage';
import { Notice } from '../shared/ui';
import ReconciliationPage from '../features/accounting/ReconciliationPage';
import TrialBalancePage from '../features/accounting/TrialBalancePage';
import { WorkspaceHeader } from '../shared/navigation/WorkspaceHeader';
import { StaffSignIn } from '../features/access/StaffSignIn';
import styles from './StaffApp.module.css';
import { PreviewQueuePage,StaffPreviewPage } from '../features/review-preview/PreviewPages';

function PriorityReviewRoute(){const {id}=useParams(),{client,session}=useStaff();return session?.fictionalPilot?<PriorityReviewPage applicationId={id!} gateway={client}/>:<Notice>Priority review is not enabled.</Notice>;}
function StaffWorkspace(){
  const {session,signedOut,presentation,client}=useStaff();
  const location=useLocation();const main=useRef<HTMLElement>(null);
  useEffect(()=>{document.title=`${location.pathname.includes('/loans/')?'Loan and payments':location.pathname.includes('/lending')?'Lending and payments':location.pathname.includes('decision-notices')?'Review notices':location.pathname.endsWith('/decision')?'Decision review':location.pathname.includes('check-in-summary')?'Check-in summary':location.pathname.includes('trial-balances')?'Trial balance':location.pathname.includes('review-queue')?'Review queue':location.pathname.includes('review-notices')?'Review notices':location.pathname.includes('money')?'Financial operations':location.pathname.includes('support-requests')?'Support requests':location.pathname.includes('reconciliation')?'Reconciliation':location.pathname.includes('applications')?'Applications':location.pathname.includes('access')?'Staff access':'Members'} · AGAP staff`;main.current?.focus();},[location.pathname]);
  if(!session)return <StaffSignIn/>;
  const start=session.fictionalPilot?(session.user.roles.some(r=>r==='cashier'||r==='financial_authorizer')?'/staff/money':session.user.roles.some(r=>['officer','reviewer','auditor'].includes(r))?'/staff/review-queue':'/staff/members'):'/staff/members';
  return <>
    <a className={styles.skip} href="#staff-main" onClick={event=>{event.preventDefault();main.current?.focus();main.current?.scrollIntoView({block:'start'});}}>Skip to main content</a>
    <WorkspaceHeader workspace="staff" account={{name:session.user.displayName,kind:'staff',csrfToken:session.csrfToken,signedOut,presentation}}/>
    <main ref={main} id="staff-main" tabIndex={-1} className={styles.main}>
        <nav className={styles.nav} aria-label="Staff workspace">
          <NavLink to="/staff/members">Members</NavLink>
          <NavLink to="/staff/applications">Applications</NavLink>
          {session.recordMode!=='real'&&session.user.roles.some(r=>['officer','reviewer','auditor'].includes(r))&&<NavLink to="/staff/analysis-queue">Analysis queue</NavLink>}
          {!session.fictionalPilot&&session.user.roles.some(role=>['cashier','financial_authorizer','auditor'].includes(role))&&<NavLink to="/staff/lending">Lending and payments</NavLink>}
          {session.fictionalPilot&&session.user.roles.some(r=>['officer','reviewer','auditor'].includes(r))&&<><NavLink to="/staff/review-queue">Review queue</NavLink>
          <NavLink to="/staff/review-notices">Review notices</NavLink></>}
          {session.fictionalPilot&&session.user.roles.some(r=>r==='cashier'||r==='financial_authorizer')&&<NavLink to="/staff/money">Financial operations</NavLink>}
          {!session.fictionalPilot&&session.user.roles.includes('reviewer')&&<NavLink to="/staff/decision-notices">Review notices</NavLink>}
          {session.user.roles.includes('auditor')&&<><NavLink to="/staff/reconciliations">Reconciliation</NavLink>
          <NavLink to="/staff/trial-balances">Trial balance</NavLink></>}
          {session.user.roles.includes('administrator')&&<NavLink to="/staff/access">Staff access</NavLink>}
          {session.user.roles.some(role=>role==='officer'||role==='administrator')&&<NavLink to="/staff/support-requests">Support requests</NavLink>}
          {session.user.roles.includes('officer')&&<NavLink to="/staff/check-in-summary">Check-in summary</NavLink>}
        </nav>
        <div className={styles.content}>
          <Routes>
            <Route path="/staff/analysis-queue" element={<PreviewQueuePage/>}/>
            <Route path="/staff/applications/:id/analysis" element={<StaffPreviewPage/>}/>
            <Route path="/staff/lending" element={session.fictionalPilot?<Notice>Use the configured financial operations workspace.</Notice>:<LendingPage/>}/>
            <Route path="/staff/loans/:id" element={session.fictionalPilot?<Notice>Use the configured financial operations workspace.</Notice>:<ConnectedLoanPage/>}/>
            <Route path="/staff/applications/:id/decision" element={<ConnectedDecisionPage/>}/>
            <Route path="/staff/decision-notices" element={<DecisionNoticesPage/>}/>
            <Route path="/staff/check-in-summary" element={<CheckInSummaryPage/>}/>
            <Route path="/staff/trial-balances" element={<TrialBalancePage/>}/>
            <Route path="/staff" element={<Navigate to={start} replace/>}/>
            <Route path="/staff/members" element={<MembersPage/>}/>
            <Route path="/staff/applications" element={<IntakePage/>}/>
            <Route path="/staff/applications/:id/evidence" element={<StaffWorkflowPage/>}/>
            <Route path="/staff/review-queue" element={session.fictionalPilot?<PriorityQueuePage gateway={client}/>:<Notice>Priority review is not enabled.</Notice>}/>
            <Route path="/staff/review-notices" element={session.fictionalPilot?<ReviewNotices gateway={client}/>:<Notice>Review notices are not enabled.</Notice>}/>
            <Route path="/staff/applications/:id/review" element={<PriorityReviewRoute/>}/>
            <Route path="/staff/applications/:id/lifecycle" element={<PilotStaffPage/>}/>
            <Route path="/staff/money" element={<PilotMoneyQueuePage/>}/>
            <Route path="/staff/access" element={<AccessPage/>}/>
            <Route path="/staff/reconciliations" element={<ReconciliationPage/>}/>
            <Route path="*" element={<section><h1>Page not found</h1><Link to="/staff/members">Return to members</Link></section>}/>
            <Route path="/staff/support-requests" element={<SupportQueuePage/>}/>
          </Routes>
        </div>
    </main>
    <footer className={styles.footer}>{session.recordMode==='real'?'Cooperative workspace':'Fictional environment · Fictional records'}</footer>
  </>;
}
export default function StaffApp(){return <StaffWorkspace/>;}
