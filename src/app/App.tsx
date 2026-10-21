import { useEffect, useRef } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ArrowBack, NorthEast, Description, RestartAlt } from '../shared/icons';
import { useWorkspace } from './WorkspaceContext';
import { caseStatus } from './caseStatus';
import { Badge, Button, Money, Notice } from '../shared/ui';
import ApplicationsPage from '../features/applications/ApplicationsPage';
import EvidencePage from '../features/evidence/EvidencePage';
import ComparisonPage from '../features/comparison/ComparisonPage';
import DecisionPage from '../features/decision/DecisionPage';
import styles from './App.module.css';

function CasePage({ screen }: { screen: 'evidence' | 'comparison' | 'decision' }) {
  const { id } = useParams();
  const { records } = useWorkspace();
  const record = records.find(item => item.id === id);
  if (!record) return <section className="panel panel-body stack"><h1>Application not found</h1><Link to="/applications">Return to applications</Link></section>;
  const status = caseStatus(record);
  return <>
    <div className={`${styles.caseHeader} no-print`}>
      <Link to="/applications" className={styles.back}><ArrowBack size={16} aria-hidden="true" /> Applications</Link>
      <div className={styles.caseIdentity}><div className={styles.member}><span className={styles.avatar} aria-hidden="true">{record.member.initials}</span><div><p className={styles.memberName}>{record.member.name}</p><p className="small subtle">{record.id} <span className={styles.separator}>/</span> {record.member.occupation}</p></div><Badge tone={status.tone}>{status.label}</Badge></div><div className={styles.request}><p className="small subtle">Requested loan</p><p><Money value={record.offers[0].principal} /><span>{record.offers[0].termMonths} months</span></p></div></div>
      <nav className={styles.steps} aria-label="Application review">
        {[['evidence', 'Evidence'], ['comparison', 'Repayment comparison'], ['decision', 'Decision & explanation']].map(([path, label], index) => <NavLink key={path} to={`/applications/${record.id}/${path}`} className={({ isActive }) => `${styles.step} ${isActive ? styles.active : ''}`}><span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>{label}</NavLink>)}
      </nav>
    </div>
    <div key={`${record.id}-${screen}`}>{screen === 'evidence' ? <EvidencePage record={record} /> : screen === 'comparison' ? <ComparisonPage record={record} /> : <DecisionPage record={record} />}</div>
  </>;
}
function RouteFocus() {
  const { pathname } = useLocation();
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current !== pathname) {
      document.getElementById('main-content')?.focus();
      window.scrollTo({ top: 0 });
      previous.current = pathname;
    }
    document.title = `${pathname.includes('comparison') ? 'Repayment comparison' : pathname.includes('decision') ? 'Decision' : pathname.includes('evidence') ? 'Evidence' : 'Applications'} · AGAP`;
  }, [pathname]);
  return null;
}
export default function App() {
  const { ready, role, setRole, actor, resetDemo, storageWarning } = useWorkspace();
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <a className={`${styles.skip} no-print`} href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to main content</a>
    <header className={`${styles.header} no-print`}>
      <div className={styles.headerInner}>
        <Link to="/applications" className={styles.brand} aria-label="AGAP home"><span className={styles.brandMark} aria-hidden="true"><NorthEast size={24} /></span>AGAP<span className={styles.brandSubtitle}>Financial health loan review</span></Link>
        <div className={styles.headerActions}><Link to="/staff">Staff workspace</Link><Badge tone="brand">Fictional demo</Badge><div className={styles.role}><label htmlFor="demo-role">Demo role</label><select id="demo-role" value={role} onChange={event => setRole(event.target.value as 'officer' | 'reviewer')}><option value="officer">Loan officer</option><option value="reviewer">Reviewer</option></select></div><span className={styles.userAvatar} title={`${actor.name} · fictional staff member`} aria-label={`${actor.name}, fictional staff member`}>{actor.name.split(' ').map(part => part[0]).join('')}</span></div>
      </div>
    </header>
    <main id="main-content" className={styles.main} tabIndex={-1}>
      <RouteFocus />
      {storageWarning && <div className={`${styles.storage} no-print`}><Notice tone="warning" role="status">{storageWarning} <button className={styles.inlineButton} onClick={() => dialog.current?.showModal()}>Reset demo</button></Notice></div>}
      {!ready ? <p role="status">Opening workspace…</p> : <Routes>
        <Route path="/applications" element={<ApplicationsPage />} />
        <Route path="/applications/:id/evidence" element={<CasePage screen="evidence" />} />
        <Route path="/applications/:id/comparison" element={<CasePage screen="comparison" />} />
        <Route path="/applications/:id/decision" element={<CasePage screen="decision" />} />
        <Route path="/" element={<Navigate to="/applications" replace />} />
        <Route path="*" element={<section className="panel panel-body stack"><h1>Page not found</h1><Link to="/applications">Return to applications</Link></section>} />
      </Routes>}
    </main>
    <footer className={`${styles.footer} no-print`}><span><Description size={16} aria-hidden="true" /> AGAP <span className={styles.separator}>/</span> Fictional data. Human decisions.</span><Button variant="quiet" onClick={() => dialog.current?.showModal()}><RestartAlt size={16} aria-hidden="true" /> Reset demo</Button></footer>
    <dialog ref={dialog} className={`${styles.dialog} no-print`} aria-labelledby="reset-heading">
      <h2 id="reset-heading">Reset this demo?</h2><p>Your changes and recorded decisions in this browser will be replaced with the original three fictional cases.</p>
      <div className="actions"><Button variant="secondary" autoFocus onClick={() => dialog.current?.close()}>Keep changes</Button><Button onClick={async () => { await resetDemo(); dialog.current?.close(); }}>Reset demo</Button></div>
    </dialog>
  </>;
}
