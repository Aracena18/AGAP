import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from '@carbon/icons-react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { makeRecommendation } from '../../domain/review';
import type { CaseRecord, LoanOffer } from '../../domain/types';
import { Badge, Button, Notice } from '../../shared/ui';
import styles from './comparison.module.css';

export default function RecommendationForm({ record, offer }: { record: CaseRecord; offer: LoanOffer }) {
  const { actor, role, saveCase } = useWorkspace();
  const current = record.recommendation?.caseVersion === record.version;
  const [note, setNote] = useState(record.recommendation?.offerId === offer.id ? record.recommendation.note : '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSaved(false); setSaving(true);
    try {
      await saveCase(makeRecommendation(record, offer.id, note, actor, new Date().toISOString()));
      setSaved(true);
    } catch (error) { setError(error instanceof Error ? error.message : 'The recommendation could not be saved.'); }
    finally { setSaving(false); }
  }
  return <section className="panel" aria-labelledby="recommendation-heading">
    <div className="panel-header"><h2 id="recommendation-heading">Officer recommendation</h2>{record.recommendation && <Badge tone={current ? 'teal' : 'warning'}>{current ? 'Ready for reviewer' : 'Needs renewed review'}</Badge>}</div>
    <div className="panel-body stack">
      {record.recommendation && <div><p><strong>{record.offers.find(item => item.id === record.recommendation?.offerId)?.label}</strong></p><p className="small subtle">{record.recommendation.note}</p></div>}
      {role === 'officer' ? <form className="stack" onSubmit={submit} noValidate>
        <div className="field"><label htmlFor="recommendation-note">Recommendation reason</label><p className="small subtle" id="recommendation-help">For {offer.label}. Include the member discussion and any remaining concerns.</p><textarea id="recommendation-note" value={note} onChange={event => { setNote(event.target.value); setSaved(false); }} required aria-invalid={!!error} aria-describedby={error ? 'recommendation-error' : 'recommendation-help'} /></div>
        {error && <p id="recommendation-error" className="field-error" role="alert">{error}</p>}
        {saved && <Notice tone="success" role="status">Recommendation saved. The reviewer can now consider this option and its evidence.</Notice>}
        <div className="actions"><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save recommendation'}</Button>{(saved || current) && <Link className={styles.continueLink} to={`/applications/${record.id}/decision`}>Continue to decision <ArrowRight size={16} aria-hidden="true" /></Link>}</div>
      </form> : <Notice>The officer records the recommendation. Review it with the checked evidence before recording a decision.</Notice>}
    </div>
  </section>;
}
