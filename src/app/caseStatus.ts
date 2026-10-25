import type { CaseRecord } from '../domain/types';

export function caseStatus(record: CaseRecord): { label: string; tone: 'neutral' | 'warning' | 'brand' | 'success' } {
  const latest = record.decisions.at(-1);
  if (latest && latest.caseVersion !== record.version) return { label: 'Review again', tone: 'warning' };
  if (latest) return latest.input.outcome === 'return'
    ? { label: 'Clarification requested', tone: 'warning' }
    : { label: 'Decision recorded', tone: 'success' };
  if (record.facts.some(fact => fact.critical && (fact.value === null || ['missing', 'conflicting'].includes(fact.status)))) return { label: 'Needs information', tone: 'warning' };
  if (record.recommendation?.caseVersion === record.version) return { label: 'Ready for reviewer', tone: 'brand' };
  return { label: 'In review', tone: 'neutral' };
}
