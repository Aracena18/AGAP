import { useEffect, useId, useRef } from 'react';
import { WorkflowFactInput } from '../../../packages/contracts/src/workflow';
import { isCalendarDate } from '../../domain/format';
import { Button } from '../../shared/ui';
import styles from './preview.module.css';

export type CashDateEntry = { id: string; value: string };
export const cashDateEntry = (value = ''): CashDateEntry => ({ id: crypto.randomUUID(), value });

export function CashDateFields({ label, dates, start, end, onChange }: {
  label: string; dates: CashDateEntry[]; start: string; end: string; onChange: (dates: CashDateEntry[]) => void;
}) {
  const uid = useId(), inputs = useRef(new Map<string, HTMLInputElement>()), focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (focusNext.current) { inputs.current.get(focusNext.current)?.focus(); focusNext.current = null; }
  }, [dates]);
  const minimum = isCalendarDate(start) ? start : undefined, maximum = isCalendarDate(end) ? end : undefined;
  // Probe capacity with a valid review day; never insert that day into an input.
  const canAdd = WorkflowFactInput.shape.cashDates.safeParse(Array.from({ length: dates.length + 1 }, () => start)).success;
  function add() {
    const entry = cashDateEntry(); focusNext.current = entry.id; onChange([...dates, entry]);
  }
  function remove(id: string, index: number) {
    const remaining = dates.filter(date => date.id !== id);
    focusNext.current = remaining[Math.min(index, remaining.length - 1)]?.id ?? null; onChange(remaining);
  }
  return <fieldset className={styles.cashDates} aria-describedby={`${uid}-hint`}>
    <legend>{label} cash dates</legend>
    <div className={styles.dateList}>
      {dates.map((entry, index) => {
        const problem = !entry.value ? '' : !isCalendarDate(entry.value) ? 'Choose a valid calendar date.'
          : minimum && entry.value < minimum || maximum && entry.value > maximum ? 'Choose a date within the review period.'
          : dates.some(other => other.id !== entry.id && other.value === entry.value) ? 'This date is already selected. Choose another date or remove it.' : '';
        return <div key={entry.id}>
          <div className={styles.dateRow}>
            <label className="sr-only" htmlFor={`${uid}-${entry.id}`}>{label} cash date {index + 1}</label>
            <input id={`${uid}-${entry.id}`} type="date" required value={entry.value} min={minimum} max={maximum}
              aria-invalid={problem ? true : undefined} aria-describedby={`${uid}-hint${problem ? ` ${uid}-${entry.id}-error` : ''}`}
              ref={node => { if (node) { inputs.current.set(entry.id, node); node.setCustomValidity(problem); } else inputs.current.delete(entry.id); }}
              onChange={event => onChange(dates.map(date => date.id === entry.id ? { ...date, value: event.target.value } : date))}/>
            {dates.length > 1 && <Button variant="quiet" aria-label={`Remove ${label.toLowerCase()} date ${index + 1}`} onClick={() => remove(entry.id, index)}>Remove</Button>}
          </div>
          {problem && <p id={`${uid}-${entry.id}-error`} className={styles.dateError}>{problem}</p>}
        </div>;
      })}
    </div>
    <div className={styles.dateActions}>
      <Button variant="secondary" disabled={!canAdd} aria-label={`Add ${label.toLowerCase()} date`} onClick={add}>Add date</Button>
      <p id={`${uid}-hint`}>Same amount on every selected date.</p>
    </div>
    <span className="sr-only" role="status">{dates.length} {dates.length === 1 ? 'date field' : 'date fields'} for {label.toLowerCase()}.</span>
  </fieldset>;
}
