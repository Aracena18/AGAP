import { useLocation } from 'react-router-dom';
import { lazy,Suspense } from 'react';
const LandingPage=lazy(()=>import('../features/landing/LandingPage'));
const WorkspaceRoutes=lazy(()=>import('./WorkspaceRoutes'));
export default function Root(){const {pathname}=useLocation();return <Suspense fallback={<p className="panel-body" role="status">Opening AGAP…</p>}>{pathname==='/'?<LandingPage/>:<WorkspaceRoutes/>}</Suspense>;}
