import type { CaseRecord } from '../domain/types';
import { evaluateReview } from '../domain/priorityReview';

export function caseStatus(record: CaseRecord): { label: string; tone: 'neutral' | 'warning' | 'brand' | 'success' } {
  const latest = record.decisions.at(-1);
  if (latest && latest.caseVersion !== record.version) return { label: 'Review again', tone: 'warning' };
  if (latest) return latest.input.outcome === 'return'
    ? { label: 'Clarification requested', tone: 'warning' }
    : { label: 'Decision recorded', tone: 'success' };
  const review = evaluateReview(record);
  if (review.ready) return { label: 'Ready for approval', tone: 'brand' };
  if (review.paths.length) return { label: review.paths[0], tone: 'warning' };
  return { label: 'In review', tone: 'neutral' };
}
