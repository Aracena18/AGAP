import { useLocation } from 'react-router-dom';
import { lazy,Suspense } from 'react';
const DemoRoot=lazy(()=>import('./DemoRoot'));
const StaffApp=lazy(()=>import('./StaffApp'));
export default function Root(){const {pathname}=useLocation();return <Suspense fallback={<p className="panel-body" role="status">Opening AGAP…</p>}>{pathname==='/staff'||pathname.startsWith('/staff/')?<StaffApp/>:<DemoRoot/>}</Suspense>;}
