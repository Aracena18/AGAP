import { useLocation } from 'react-router-dom';
import { StaffProvider,useStaff } from '../features/access/StaffContext';
import { StaffSignIn } from '../features/access/StaffSignIn';
import { lazy,Suspense } from 'react';
const DemoRoot=lazy(()=>import('./DemoRoot'));
const StaffApp=lazy(()=>import('./StaffApp'));
const MemberApp=lazy(()=>import('../features/member-portal/MemberApp'));
function StaffDemoRoutes(){const {pathname}=useLocation(),{session}=useStaff();return pathname==='/staff'||pathname.startsWith('/staff/')?<StaffApp/>:session?<DemoRoot/>:<StaffSignIn review/>;}
export default function Root(){const {pathname}=useLocation();return <Suspense fallback={<p className="panel-body" role="status">Opening AGAP…</p>}>{pathname==='/member'||pathname.startsWith('/member/')?<MemberApp/>:<StaffProvider><StaffDemoRoutes/></StaffProvider>}</Suspense>;}
