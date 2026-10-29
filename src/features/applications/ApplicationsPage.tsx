import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowForward, Search, Description } from '../../shared/icons';
import { useWorkspace } from '../../app/WorkspaceContext';
import { caseStatus } from '../../app/caseStatus';
import { Badge, Button, Money } from '../../shared/ui';
import { dateLabel } from '../../domain/format';
import styles from './ApplicationsPage.module.css';

export default function ApplicationsPage() {
  const { records,storageWarning } = useWorkspace();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const query = search.trim().toLowerCase();
  const visible = records.filter(record => `${record.member.name} ${record.id}`.toLowerCase().includes(query) && (status === 'all' || caseStatus(record).label === status));
  return <>
    <div className="page-heading">
      <div><h1>Loan applications</h1></div>
      <span className={styles.cycle}><span className={styles.dot} /> November 2026 cycle</span>
    </div>
    <section className="panel" aria-label="Applications">
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <label htmlFor="application-search">Search</label>
          <div className={styles.searchInput}><Search size={20} aria-hidden="true" /><input id="application-search" type="search" placeholder="Name or application ID" value={search} onChange={event => setSearch(event.target.value)} /></div>
        </div>
        <div className={styles.filter}><label htmlFor="application-status">Review status</label><select id="application-status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All applications</option>{['Needs information', 'In review', 'Ready for reviewer', 'Decision recorded', 'Clarification requested', 'Review again'].map(label => <option key={label}>{label}</option>)}</select></div>
        <p className={styles.count} aria-live="polite">{visible.length} {visible.length === 1 ? 'application' : 'applications'}</p>
      </div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Loan application table">
        <table className={styles.table}>
          <caption className="sr-only">Fictional loan applications and review progress</caption>
          <thead><tr><th scope="col">Applicant</th><th scope="col">Purpose</th><th scope="col" className="numeric">Requested amount</th><th scope="col">Review status</th><th scope="col">Received</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
          <tbody>{visible.map(record => {
            const state = caseStatus(record);
            return <tr key={record.id}>
              <td><div className={styles.member}><span className={styles.avatar} aria-hidden="true">{record.member.initials}</span><div><strong>{record.member.name}</strong><p className="small subtle">{record.id}</p></div></div></td>
              <td>{record.purpose}</td>
              <td className="numeric"><Money value={record.offers[0].principal} /></td>
              <td><Badge tone={state.tone}>{state.label}</Badge></td>
              <td className="subtle">{dateLabel(record.createdAt)}</td>
              <td><Link className={styles.review} to={`/applications/${record.id}/evidence`} aria-label={`Review ${record.member.name}`}>Review <ArrowForward size={16} aria-hidden="true" /></Link></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {visible.length === 0 && <div className={styles.empty}><Description size={32} aria-hidden="true" /><h2>No matching applications</h2><p className="subtle">Try another name or review status.</p><Button variant="secondary" onClick={() => { setSearch(''); setStatus('all'); }}>Clear filters</Button></div>}
      <div className={styles.tableFooter}>Demo data · {storageWarning?'Local changes only':'Saved in this browser'}</div>
    </section>

  </>;
}
