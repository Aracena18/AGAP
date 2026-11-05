import { lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { StaffProvider, useStaff } from '../features/access/StaffContext';
import { StaffSignIn } from '../features/access/StaffSignIn';
import './workspace.css';
import { PreviewProvider } from '../features/review-preview/PreviewContext';

const DemoRoot = lazy(() => import('./DemoRoot'));
const StaffApp = lazy(() => import('./StaffApp'));
const MemberApp = lazy(() => import('../features/member-portal/MemberApp'));

function StaffDemoRoutes() {
  const { pathname } = useLocation();
  const { session } = useStaff();
  return pathname === '/staff' || pathname.startsWith('/staff/') ? <StaffApp/> : session ? <DemoRoot/> : <StaffSignIn review/>;
}
export default function WorkspaceRoutes() {
  const { pathname } = useLocation();
  const member = pathname === '/member' || pathname.startsWith('/member/');
  return <PreviewProvider><div data-agap-workspace data-workspace-kind={member ? 'member' : pathname.startsWith('/staff') ? 'staff' : 'demo'}>{member ? <MemberApp/> : <StaffProvider><StaffDemoRoutes/></StaffProvider>}</div></PreviewProvider>;
}
