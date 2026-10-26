import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowForward, CalendarToday, FindInPage, Edit, History } from '../../shared/icons';
import type { CaseRecord, EvidenceFact, EvidenceStatus } from '../../domain/types';
import { dateLabel } from '../../domain/format';
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
  const pending = record.facts.filter(fact => fact.critical && (
    fact.status === 'missing' || fact.status === 'conflicting' || fact.value === null || !fact.sourceId
  ));
  const firstFact = record.facts.find(fact => fact.sourceId === requestedSource) ?? pending[0] ?? record.facts[0];
  const [selectedFactId, setSelectedFactId] = useState(firstFact?.id);
  const [sourceId, setSourceId] = useState<string | null>(firstFact?.sourceId ?? null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const source = record.sources.find(item => item.id === sourceId);
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
      <Badge tone={pending.length ? 'warning' : 'success'}>
        {pending.length ? `${pending.length} ${pending.length === 1 ? 'fact needs' : 'facts need'} attention` : 'Evidence ready'}
      </Badge>
    </div>
    <div className={styles.notices}>
      {role === 'reviewer' && <Notice>Read-only review. Ask the loan officer to correct missing or conflicting information.</Notice>}
      {pending.length > 0 && <Notice tone="warning">
        <strong>{unresolvedIncome ? 'Income mismatch.' : 'Missing information.'}</strong>{' '}
        {unresolvedIncome
          ? 'Check both sources.'
          : 'Add a supported value before comparing repayments.'}
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
            {record.facts.filter(fact => fact.category === group.category).map(fact => {
              const factSource = record.sources.find(item => item.id === fact.sourceId);
              const action = fact.status === 'conflicting' ? 'Resolve conflict' : fact.status === 'missing' ? 'Clarify' : 'Correct';
              return <div key={fact.id} className={styles.fact}>
                <div className={styles.factTop}>
                  <h3>{fact.label}</h3><span className={styles.amount}><FactValue fact={fact} /></span>
                </div>
                <div className={styles.factMetadata}>
                  <Badge tone={fact.status === 'conflicting' || fact.status === 'missing' ? 'warning' : 'neutral'}>{statusLabels[fact.status]}</Badge>
                  <span className={`${styles.cashDate} small subtle`}><CalendarToday size={16}/>{fact.category==='opening'?'Opening':'Cash date'} {dateLabel(fact.cashDate)}</span>
                </div>
                <div className={styles.factBottom}>
                  <div className={styles.provenance}>
                    {factSource ? <Button variant="quiet" className={styles.sourceButton} aria-label={`View source for ${fact.label}: ${factSource.title}`} onClick={() => inspect(fact)}>
                      <FindInPage size={16} aria-hidden="true" />{factSource.title}
                    </Button> : <span className="small subtle">No source recorded</span>}
                  </div>
                  {role === 'officer' && editingId !== fact.id && <Button variant={pending[0]?.id===fact.id?'primary':'quiet'}
                    aria-label={`${action}${fact.status === 'conflicting' ? ' for' : ''} ${fact.label}`}
                    onClick={() => { inspect(fact); setEditingId(fact.id); setSaved(''); }}>
                    <Edit size={16} aria-hidden="true" />{action}
                  </Button>}
                </div>
                <details className={styles.factDetails}><summary>Details<span className="sr-only"> for {fact.label}</span></summary><p className="small subtle">Effective {dateLabel(fact.effectiveDate)}</p></details>
                {fact.category === 'obligation' && <p className="small subtle">{fact.alreadyDeducted ? 'Already deducted · counted once.' : 'Separate payment · included once.'}</p>}
                {editingId === fact.id && role === 'officer' && <CorrectionForm key={fact.id} record={record} fact={fact} onSourceChange={setSourceId}
                  onCancel={() => setEditingId(null)}
                  onSaved={() => { setEditingId(null); setSaved('Correction saved.'); }} />}
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
              <div className={styles.factTop}><h3>{correction.after.label}</h3><span className="small subtle">{dateLabel(correction.at)}</span></div>
              <p className={styles.change}><FactValue fact={correction.before} /><ArrowForward size={16} aria-label="changed to" /><FactValue fact={correction.after} /></p>
              <p>{correction.reason}</p>
              <dl className={styles.historySources}>
                {[['Previous', correction.before], ['Updated', correction.after]].map(([label, item]) => {
                  const fact = item as EvidenceFact;
                  const origin = record.sources.find(candidate => candidate.id === fact.sourceId);
                  return <div key={label as string}><dt>{label as string}</dt><dd>{origin?.title ?? 'No source recorded'} · {statusLabels[fact.status]} · Effective {dateLabel(fact.effectiveDate)}</dd></div>;
                })}
              </dl>
              <p className="small subtle">Recorded by {correction.actor.name} · Demo {correction.actor.role}</p>
            </article>)}</div>
          </details>}
        </section>
        <div className={styles.nextStep}>
          {pending.length === 0 ? <><p className="small subtle">Ready to compare repayments.</p><Link to="../comparison" relative="path" className={styles.nextLink}>Compare repayments<ArrowForward size={20} aria-hidden="true" /></Link></>
            : <p className="small subtle"><strong>Next:</strong> {pending[0].status === 'conflicting' ? 'Resolve' : 'Clarify'} {pending[0].label.toLowerCase()} before comparing repayments.</p>}
        </div>
      </div>
      <aside ref={sourcePanel} id={source ? `source-${source.id}` : undefined} tabIndex={-1} aria-label="Source details" className={`panel ${styles.sourcePanel}`}>
        <div className="panel-header"><h2>Source details</h2><FindInPage size={20} aria-hidden="true" /></div>
        <div className={`panel-body ${styles.sourceBody}`}>
          <div aria-live="polite">
            <h3>{source?.title ?? 'No source recorded'}</h3>
            {source && <p className="small subtle">{source.kind === 'statement' ? 'Member statement' : source.kind === 'worksheet' ? 'Assessment worksheet' : 'Document'} · {dateLabel(source.date)}</p>}
          </div>
          <p className={styles.sourceExcerpt}>{source?.excerpt ?? 'No supporting source. Ask the member for clarification.'}</p>
          {selectedFact && <div className={styles.sourceContext}><p className="small subtle">For {selectedFact.label}</p></div>}
          <p className="small subtle">A source link does not establish authenticity.</p>
        </div>
      </aside>
    </div>
  </>;
}
