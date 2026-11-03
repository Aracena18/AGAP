import { lazy } from 'react';
import { useLocation } from 'react-router-dom';
import { StaffProvider, useStaff } from '../features/access/StaffContext';
import { StaffSignIn } from '../features/access/StaffSignIn';

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
  return pathname === '/member' || pathname.startsWith('/member/') ? <MemberApp/> : <StaffProvider><StaffDemoRoutes/></StaffProvider>;
}
