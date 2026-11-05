import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowForward, Search, Description } from '../../shared/icons';
import { useWorkspace } from '../../app/WorkspaceContext';
import { caseStatus } from '../../app/caseStatus';
import { Badge, Button, Money } from '../../shared/ui';
import { dateLabel } from '../../domain/format';
import styles from './ApplicationsPage.module.css';
import { compareReviewQueue, evaluateReview, REVIEW_CAPABILITY_STATUS } from '../../domain/priorityReview';

export default function ApplicationsPage() {
  const { records,storageWarning } = useWorkspace();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const query = search.trim().toLowerCase();
  const visible = records.filter(record => {
    const review = evaluateReview(record);
    return `${record.member.name} ${record.id}`.toLowerCase().includes(query) && (status === 'all' || (status === 'active' ? !review.completed : review.paths.some(path => path === status) || caseStatus(record).label === status));
  }).sort(compareReviewQueue);
  return <>
    <div className="page-heading">
      <div><h1>Loan applications</h1><p>Priority review <Badge>{REVIEW_CAPABILITY_STATUS}</Badge></p></div>
      <span className={styles.cycle}><span className={styles.dot} /> November 2026 cycle</span>
    </div>
    <section className="panel" aria-label="Applications">
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <label htmlFor="application-search">Search</label>
          <div className={styles.searchInput}><Search size={20} aria-hidden="true" /><input id="application-search" type="search" placeholder="Name or application ID" value={search} onChange={event => setSearch(event.target.value)} /></div>
        </div>
        <div className={styles.filter}><label htmlFor="application-status">Review status</label><select id="application-status" value={status} onChange={event => setStatus(event.target.value)}><option value="active">Active queue</option><option value="all">All applications</option>{['Needs clarification', 'Awaiting concern check', 'Escalated review', 'Ready for approval', 'In review', 'Decision recorded', 'Clarification requested', 'Review again'].map(label => <option key={label}>{label}</option>)}</select></div>
        <p className={styles.count} aria-live="polite">{visible.length} {visible.length === 1 ? 'application' : 'applications'}</p>
      </div>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Loan application table">
        <table className={styles.table}>
          <caption className="sr-only">Fictional loan applications and review progress</caption>
          <thead><tr><th scope="col">Applicant</th><th scope="col">Purpose</th><th scope="col" className="numeric">Requested amount</th><th scope="col">Review paths and next actions</th><th scope="col">Originally received</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
          <tbody>{visible.map(record => {
            const state = caseStatus(record);
            const review = evaluateReview(record);
            return <tr key={record.id}>
              <td><div className={styles.member}><span className={styles.avatar} aria-hidden="true">{record.member.initials}</span><div><strong>{record.member.name}</strong><p className="small subtle">{record.id}</p></div></div></td>
              <td data-label="Purpose">{record.purpose}</td>
              <td className="numeric" data-label="Requested amount"><Money value={record.offers[0].principal} /></td>
              <td data-label="Review paths and next actions"><div className={styles.paths}>
                {review.paths.length ? review.paths.map(path => <Badge key={path} tone={path === 'Ready for approval' ? 'brand' : 'warning'}>{path}</Badge>) : <Badge tone={state.tone}>{state.label}</Badge>}
                {record.decisions.at(-1) && record.decisions.at(-1)!.caseVersion !== record.version && <Badge tone="warning">Review again</Badge>}
              </div>{!review.completed && <ul className={styles.actions}>
                {review.needsClarification && <li>Mara: clarify evidence.</li>}
                {!review.confirmed && <li>Mara: confirm evidence currentness.</li>}
                {review.pendingConcerns.length > 0 && <li>Mara: check simulated AI concern.</li>}
                {!review.recommendation && <li>Mara: prepare recommendation.</li>}
                {review.escalated && <li>{review.assignment ? 'Luis: investigate and verify resolution.' : 'Mara: assign reviewer.'}</li>}
                {review.ready && <li>Luis: make the separate lending decision.</li>}
              </ul>}{!review.completed && <details className={styles.concerns}><summary>Concerns and sources</summary>
                <ul>{review.assessment.status === 'incomplete' && review.assessment.issues.map((issue, index) => <li key={`issue-${index}`}>{issue.message}</li>)}
                  {review.pendingConcerns.map(concern => <li key={concern.id}>Simulated AI: {concern.text}</li>)}
                  {review.failures.map(check => <li key={check.policyId}>{check.detail}</li>)}
                  {review.escalated && review.failures.length === 0 && <li>Earlier material findings require Luis’s recheck.</li>}
                </ul>
                <ul>{[...new Set([...record.facts.flatMap(fact => fact.sourceId ? [fact.sourceId] : []), ...review.pendingConcerns.flatMap(concern => concern.sourceIds)])].map(sourceId => <li key={sourceId}>{record.sources.filter(source => source.id === sourceId).length === 1 ? <Link to={`/applications/${record.id}/evidence#source-${sourceId}`}>{record.sources.find(source => source.id === sourceId)!.title}</Link> : 'Supporting source unavailable or ambiguous'}</li>)}</ul>
              </details>}</td>
              <td className="subtle" data-label="Received">{dateLabel(record.createdAt)}</td>
              <td><Link className={styles.review} to={`/applications/${record.id}/summary`} aria-label={`Review ${record.member.name}`}>Review <ArrowForward size={16} aria-hidden="true" /></Link></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {visible.length === 0 && <div className={styles.empty}><Description size={32} aria-hidden="true" /><h2>No matching applications</h2><p className="subtle">Try another name or review status.</p><Button variant="secondary" onClick={() => { setSearch(''); setStatus('active'); }}>Clear filters</Button></div>}
      <div className={styles.tableFooter}><span>Material concerns first; otherwise original submission date and application ID.</span><span>Demo data · {storageWarning?'Local changes only':'Saved in this browser'}</span></div>
    </section>

  </>;
}
