import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowForward, CalendarToday, FindInPage, Edit, History, Info } from '../../shared/icons';
import type { CaseRecord, EvidenceFact, EvidenceStatus } from '../../domain/types';
import { dateLabel, isCalendarDate } from '../../domain/format';
import { validateEvidence } from '../../domain/evidence';
import { useWorkspace } from '../../app/WorkspaceContext';
import { Badge, Button, Money, Notice } from '../../shared/ui';
import CorrectionForm from './CorrectionForm';
import styles from './evidence.module.css';

const statusLabels: Record<EvidenceStatus, string> = {
  'document-supported': 'Document-supported', 'member-reported': 'Member-reported',
  conflicting: 'Conflicting', missing: 'Missing',
};
const groups: { category: EvidenceFact['category']; title: string }[] = [
  { category: 'income', title: 'Income' },
  { category: 'expense', title: 'Everyday expenses' },
  { category: 'obligation', title: 'Existing obligation' },
  { category: 'opening', title: 'Opening balance' },
];

function displayDate(value: string) {
  return isCalendarDate(value.slice(0, 10)) ? dateLabel(value) : 'Unavailable date';
}

function FactValue({ fact }: { fact: EvidenceFact }) {
  return fact.value === null ? <span className="subtle">Unavailable</span> : <Money value={fact.value} />;
}

export default function EvidencePage({ record }: { record: CaseRecord }) {
  const { hash } = useLocation();
  const requestedSource = hash.startsWith('#source-') ? hash.slice(8) : '';
  return <EvidenceWorkspace key={`${record.id}-${requestedSource}`} record={record} requestedSource={requestedSource} />;
}

function EvidenceWorkspace({ record, requestedSource }: { record: CaseRecord; requestedSource: string }) {
  const { role } = useWorkspace();
  const issues = validateEvidence(record);
  const ready = issues.length === 0;
  const pending = record.facts.filter(fact => issues.some(issue => issue.factId === fact.id));
  function uniqueSource(id: string | null) {
    const matches = record.sources.filter(item => item.id === id);
    return matches.length === 1 ? matches[0] : undefined;
  }
  const firstFact = record.facts.find(fact => fact.sourceId === requestedSource) ?? pending[0] ?? record.facts[0];
  const [selectedFactId, setSelectedFactId] = useState(firstFact?.id);
  const [sourceId, setSourceId] = useState<string | null>(firstFact?.sourceId ?? null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const source = uniqueSource(sourceId);
  const ambiguousSource = record.sources.filter(item => item.id === sourceId).length > 1;
  const selectedFact = record.facts.find(fact => fact.id === selectedFactId);
  const unresolvedIncome = pending.some(fact => fact.category === 'income' && fact.status === 'conflicting');
  const sourcePanel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (requestedSource) { sourcePanel.current?.focus(); sourcePanel.current?.scrollIntoView?.({ block: 'nearest' }); }
  }, [requestedSource]);

  function inspect(fact: EvidenceFact) {
    setSelectedFactId(fact.id);
    setSourceId(fact.sourceId);
  }

  return <>
    <div className="page-heading">
      <div><h1>Evidence</h1></div>
      <Badge tone={ready ? 'success' : 'warning'}>
        {ready ? 'Evidence ready' : 'Evidence needs attention'}
      </Badge>
    </div>
    <div className={styles.notices}>
      {role === 'reviewer' && <Notice>Read-only review. Ask the loan officer to correct missing or conflicting information.</Notice>}
      {!ready && <Notice tone="warning">
        <strong>{unresolvedIncome ? 'Income mismatch.' : 'Missing information.'}</strong>{' '}
        {unresolvedIncome
          ? 'Check both sources.'
          : 'Resolve the evidence issues below. Unavailable information stays unavailable.'}
        <ul aria-label="Evidence issues">{issues.map((issue, index) => <li key={`${issue.factId}-${index}`}>{issue.message}</li>)}</ul>
      </Notice>}
      {saved && <Notice tone="success" role="status">{saved}</Notice>}
    </div>
    <div className={styles.workspace}>
      <div className={styles.main}>
        <div className="panel">
          {groups.map(group => <section key={group.category} className={styles.group} aria-labelledby={`group-${group.category}`}>
            <div className={styles.groupHeading}>
              <h2 id={`group-${group.category}`}>{group.title}</h2>
            </div>
            {record.facts.filter(fact => fact.category === group.category).map((fact, index) => {
              const factKey = `${fact.category}-${index}`;
              const factSource = uniqueSource(fact.sourceId);
              const action = fact.status === 'conflicting' ? 'Resolve conflict' : fact.status === 'missing' ? 'Clarify' : 'Correct';
              return <div key={`${fact.id}-${index}`} className={styles.fact}>
                <div className={styles.factTop}>
                  <h3>{fact.label}</h3><span className={styles.amount}><FactValue fact={fact} /></span>
                </div>
                <div className={styles.factMetadata}>
                  <Badge tone={fact.status === 'conflicting' || fact.status === 'missing' ? 'warning' : 'neutral'}>{statusLabels[fact.status]}</Badge>
                  <span className={`${styles.cashDate} small subtle`}><CalendarToday size={16} aria-hidden="true" />{fact.category === 'opening' ? 'Opening' : 'Cash date'} {displayDate(fact.cashDate)}</span>
                </div>
                <div className={styles.factBottom}>
                  <div className={styles.provenance}>
                    {factSource ? <Button variant="quiet" className={styles.sourceButton} aria-label={`View source for ${fact.label}: ${factSource.title}`} onClick={() => inspect(fact)}>
                      <FindInPage size={16} aria-hidden="true" />{factSource.title}
                    </Button> : <span className="small subtle">{record.sources.filter(item => item.id === fact.sourceId).length > 1 ? 'Ambiguous source reference' : 'No source recorded'}</span>}
                  </div>
                  {role === 'officer' && editingKey !== factKey && <Button variant={pending[0] === fact ? 'primary' : 'quiet'}
                    aria-label={`${action}${fact.status === 'conflicting' ? ' for' : ''} ${fact.label}`}
                    onClick={() => { inspect(fact); setEditingKey(factKey); setSaved(''); }}>
                    <Edit size={16} aria-hidden="true" />{action}
                  </Button>}
                </div>
                <details className={styles.factDetails}><summary>Details<span className="sr-only"> for {fact.label}</span></summary><p className="small subtle">Effective {displayDate(fact.effectiveDate)}</p></details>
                {fact.category === 'obligation' && <p className="small subtle">{fact.alreadyDeducted ? 'Already deducted · counted once.' : 'Separate payment · included once.'}</p>}
                {editingKey === factKey && role === 'officer' && <CorrectionForm key={fact.id} record={record} fact={fact} onSourceChange={setSourceId}
                  onCancel={() => setEditingKey(null)}
                  onSaved={() => { setEditingKey(null); setSaved('Correction saved.'); }} />}
              </div>;
            })}
          </section>)}
        </div>
        <section className="panel" aria-label="Evidence correction history">
          {record.corrections.length === 0 ? <div className={styles.emptyHistory}>
            <History size={20} aria-hidden="true" /><div><h2>Correction history</h2><p className="small subtle">No corrections yet.</p></div>
          </div> : <details className={styles.history}>
            <summary>Correction history <span className="subtle">({record.corrections.length})</span></summary>
            <div className={styles.historyList}>{[...record.corrections].reverse().map(correction => <article key={correction.id} className={styles.historyEntry}>
              <div className={styles.factTop}><h3>{correction.after.label}</h3><span className="small subtle">{displayDate(correction.at)}</span></div>
              <p className={styles.change}><FactValue fact={correction.before} /><ArrowForward size={16} aria-label="changed to" /><FactValue fact={correction.after} /></p>
              <p>{correction.reason}</p>
              <dl className={styles.historySources}>
                {[['Previous', correction.before], ['Updated', correction.after]].map(([label, item]) => {
                  const fact = item as EvidenceFact;
                  const origin = uniqueSource(fact.sourceId);
                  return <div key={label as string}><dt>{label as string}</dt><dd>{origin?.title ?? 'No source recorded'} · {statusLabels[fact.status]} · Effective {displayDate(fact.effectiveDate)}</dd></div>;
                })}
              </dl>
              <p className="small subtle">Recorded by {correction.actor.name} · Demo {correction.actor.role}</p>
            </article>)}</div>
          </details>}
        </section>
        <div className={styles.nextStep}>
          {ready ? <><p className="small subtle">Ready to compare repayments.</p><Link to="../comparison" relative="path" className={styles.nextLink}>Compare repayments<ArrowForward size={20} aria-hidden="true" /></Link></>
            : <p className="small subtle"><strong>Next:</strong> Resolve the listed evidence issues before a complete repayment assessment. You can still move between review screens.</p>}
        </div>
      </div>
      <aside ref={sourcePanel} id={source ? `source-${source.id}` : undefined} tabIndex={-1} aria-label="Source details" className={`panel ${styles.sourcePanel}`}>
        <div className="panel-header"><h2>Source details</h2><FindInPage size={20} aria-hidden="true" /></div>
        <div className={`panel-body ${styles.sourceBody}`}>
          <div className={styles.sourceIdentity} aria-live="polite">
            <h3>{source?.title ?? (ambiguousSource ? 'Ambiguous source reference' : 'No source recorded')}</h3>
            {source && <dl className={styles.sourceMetadata}><div><dt>Type</dt><dd>{source.kind === 'statement' ? 'Member statement' : source.kind === 'worksheet' ? 'Assessment worksheet' : 'Document'}</dd></div><div><dt>Date</dt><dd>{displayDate(source.date)}</dd></div></dl>}
          </div>
          {source ? <figure className={styles.sourceExcerpt}><figcaption>Excerpt</figcaption><blockquote>{source.excerpt}</blockquote></figure>
            : <p className="small subtle">{ambiguousSource ? 'Multiple sources share this reference. Resolve the duplicate references before using this source; no source has been selected automatically.' : 'No supporting source. Ask the member for clarification.'}</p>}
          {selectedFact && <dl className={styles.sourceContext}><dt>Linked field</dt><dd>{selectedFact.label}</dd></dl>}
          <p className={styles.verificationNote}><Info size={16} aria-hidden="true" />Verification is separate.</p>
        </div>
      </aside>
    </div>
  </>;
}
