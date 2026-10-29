import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useWorkspace } from '../../app/WorkspaceContext';
import { applyCorrection, EvidenceCorrectionError, parsePesoInput, type CorrectionErrors } from '../../domain/evidence';
import { dateLabel, isCalendarDate } from '../../domain/format';
import type { CaseRecord, EvidenceFact, FactCorrectionInput } from '../../domain/types';
import { Button, Money, Notice } from '../../shared/ui';
import styles from './evidence.module.css';

interface Props {
  record: CaseRecord;
  fact: EvidenceFact;
  onSourceChange: (sourceId: string | null) => void;
  onSaved: () => void;
  onCancel: () => void;
}

export default function CorrectionForm({ record, fact, onSourceChange, onSaved, onCancel }: Props) {
  const { actor, saveCase } = useWorkspace();
  const [amount, setAmount] = useState(fact.value === null ? '' : String(fact.value / 100));
  const [sourceId, setSourceId] = useState(fact.sourceId ?? '');
  const [status, setStatus] = useState<FactCorrectionInput['status'] | ''>(fact.status === 'conflicting' || fact.status === 'missing' ? '' : fact.status);
  const [effectiveDate, setEffectiveDate] = useState(fact.effectiveDate);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<CorrectionErrors>({});
  const [saving, setSaving] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const missing = status === 'missing';

  useEffect(() => { form.current?.querySelector<HTMLInputElement>('input')?.focus(); }, []);
  useEffect(() => {
    if (errors.form) errorSummary.current?.focus();
    else if (Object.keys(errors).length) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  function chooseSource(id: string) {
    setSourceId(id);
    onSourceChange(id || null);
    const sources = record.sources.filter(item => item.id === id);
    if (sources.length !== 1) return;
    const candidates = fact.candidates?.filter(item => item.sourceId === id) ?? [];
    const candidate = candidates.length === 1 ? candidates[0] : undefined;
    const source = sources[0];
    if (candidate) setAmount(String(candidate.value / 100));
    setEffectiveDate(candidate?.effectiveDate ?? source.date);
  }

  function fieldProps(field: keyof FactCorrectionInput) {
    return { id: `correction-${fact.id}-${field}`, 'aria-invalid': !!errors[field], 'aria-describedby': errors[field] ? `error-${fact.id}-${field}` : undefined };
  }
  function fieldError(field: keyof FactCorrectionInput) {
    return errors[field] ? <p id={`error-${fact.id}-${field}`} className="field-error">{errors[field]}</p> : null;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    let value = null;
    let validationErrors: CorrectionErrors = {};
    let next: CaseRecord | undefined;
    if (!missing) {
      try { value = parsePesoInput(amount); }
      catch (error) { if (error instanceof EvidenceCorrectionError) validationErrors = error.errors; }
    }
    try {
      next = applyCorrection(record, { factId: fact.id, value, sourceId: missing ? null : sourceId || null,
        status: status as FactCorrectionInput['status'], effectiveDate, reason }, actor, new Date().toISOString());
    } catch (error) {
      validationErrors = { ...(error instanceof EvidenceCorrectionError ? error.errors : { form: 'The correction could not be prepared.' }), ...validationErrors };
    }
    setErrors(validationErrors);
    if (!next || Object.keys(validationErrors).length) return;
    setSaving(true);
    try { await saveCase(next); onSaved(); }
    catch (error) { setErrors({ form: error instanceof Error ? error.message : 'The correction could not be saved. Try again.' }); }
    finally { setSaving(false); }
  }

  return <form ref={form} aria-label={`Correct ${fact.label}`} onSubmit={submit} noValidate className={styles.editor}>
    <h3>Correct {fact.label.toLowerCase()}</h3>
    {fact.status === 'conflicting' && fact.candidates && <div>
      <p className="small subtle">Compare the recorded sources. Choosing a source fills its candidate amount and date; review them before saving.</p>
      <div className={styles.candidates}>{fact.candidates.map((candidate, index) => {
        const sources = record.sources.filter(item => item.id === candidate.sourceId);
        const source = sources.length === 1 ? sources[0] : undefined;
        return <div key={`${candidate.sourceId}-${index}`} className={styles.candidate}>
          <span className="small subtle">{source?.title ?? (sources.length > 1 ? `Ambiguous source reference (${candidate.sourceId})` : `Unavailable source (${candidate.sourceId})`)}</span>
          <strong><Money value={candidate.value} /></strong>
          <span className="small subtle">{isCalendarDate(candidate.effectiveDate) ? dateLabel(candidate.effectiveDate) : 'Unavailable date'}</span>
        </div>;
      })}</div>
    </div>}
    <fieldset disabled={saving} className={styles.formFields}>
      <legend className="sr-only">Correction details</legend>
      <div className={styles.formGrid}>
        <div className="field"><label htmlFor={`correction-${fact.id}-value`}>Amount (PHP)</label>
          <input {...fieldProps('value')} inputMode="decimal" value={missing ? '' : amount} onChange={event => setAmount(event.target.value)} disabled={missing} placeholder={missing ? 'Unavailable' : 'e.g. 24000.00'} />
          {fieldError('value')}
        </div>
        <div className="field"><label htmlFor={`correction-${fact.id}-status`}>Evidence status</label>
          <select {...fieldProps('status')} value={status} onChange={event => setStatus(event.target.value as typeof status)}>
            <option value="">Choose a status</option><option value="document-supported">Document-supported</option>
            <option value="member-reported">Member-reported</option><option value="missing">Missing / unavailable</option>
          </select>{fieldError('status')}
        </div>
        <div className="field"><label htmlFor={`correction-${fact.id}-sourceId`}>Supporting source</label>
          <select {...fieldProps('sourceId')} value={missing ? '' : sourceId} onChange={event => chooseSource(event.target.value)} disabled={missing}>
            <option value="">Choose a source</option>{[...new Set(record.sources.map(source => source.id))].map(id => {
              const sources = record.sources.filter(source => source.id === id);
              return <option key={id} value={id}>{sources.length === 1 ? sources[0].title : `Ambiguous source reference (${id})`}</option>;
            })}
          </select>{fieldError('sourceId')}
        </div>
        <div className="field"><label htmlFor={`correction-${fact.id}-effectiveDate`}>Effective date</label>
          <input {...fieldProps('effectiveDate')} type="date" value={effectiveDate} onChange={event => setEffectiveDate(event.target.value)} />{fieldError('effectiveDate')}
        </div>
      </div>
      {missing && <p className="small subtle">The amount and source will be recorded as unavailable. Missing information is never treated as zero.</p>}
      <div className="field"><label htmlFor={`correction-${fact.id}-reason`}>Reason for correction</label>
        <textarea {...fieldProps('reason')} value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain what changed and why this evidence applies." />{fieldError('reason')}
      </div>
      {record.decisions.length > 0 && <Notice tone="warning">This correction will require renewed review. Previously recorded decisions keep their original evidence.</Notice>}
      {errors.form && <div ref={errorSummary} tabIndex={-1} role="alert"><Notice tone="danger">{errors.form}</Notice></div>}
      <div className="actions"><Button type="submit" disabled={saving}>{saving ? 'Saving correction…' : 'Save correction'}</Button><Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button></div>
    </fieldset>
  </form>;
}
