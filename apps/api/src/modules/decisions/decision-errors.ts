import { ZodError } from 'zod';
import { ApiError } from '../../platform/errors.js';
import { DecisionRuleError } from './rules.js';

export async function decisionOperation<T>(work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof ZodError) throw new ApiError(422, 'invalid_decision_input', 'Check the decision fields and current references.',
      error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })));
    if (error instanceof DecisionRuleError) {
      const denied = ['actor_scope', 'role_required', 'assignment_required', 'self_approval', 'outcome_forbidden', 'exception_forbidden', 'member_scope'];
      throw new ApiError(error.code === 'stale_version' ? 412 : denied.includes(error.code) ? 403 : 409, error.code, error.message);
    }
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if(code==='AG412')throw new ApiError(412,'stale_version','Reload the current application before a new action.');
    if (code === 'AG403' || code === '42501') throw new ApiError(403, 'decision_forbidden', 'This action is not available to the current account.');
    if (code === 'AG412') throw new ApiError(412,'stale_version','The application changed. Reload before a new submission.');
    if (code === 'AG409' || code === '23505') throw new ApiError(409, 'decision_conflict', 'The decision, acknowledgment or references changed. Reload before a new submission.');
    throw new ApiError(503, 'decision_backend_unavailable', 'The decision could not be recorded or verified. Retry the same submission if its result is uncertain.');
  }
}
