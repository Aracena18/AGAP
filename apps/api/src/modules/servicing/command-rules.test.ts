import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FinancialCommandCreateSchema } from '../../../../../packages/contracts/src/schemas.js';
import { CommandSchema, PendingOriginationSchema, ObservationInputSchema, type OperationContext } from './context.js';
import { authorizeCommand, businessDay, fingerprint, inspectCommand, preparePendingOrigination, prepareReleaseCommand, prepareSubmission, recordObservation, recoveryAdvice } from './command-rules.js';
import { FictionalManualDriver } from './testing/manual-simulation.js';
import { authorized, prepared, ruleFixture, submitted, times } from './testing/fixtures.js';
function policy(c: OperationContext) { if (c.authority.status !== 'configured') throw new Error('Fictional configured policy required'); return c.authority; }
function observe(f = submitted(), outcome: 'confirmed' | 'failed' | 'unknown' = 'confirmed') {
  return new FictionalManualDriver().submit(f.command, { observationId: randomUUID(), movementId: randomUUID(), at: times.observe, outcome });
}
function intake(f = submitted(), observation = observe(f), at = times.observe, expectedVersion = f.command.version) {
  return recordObservation(f.cashier, { authority: f.context.authority }, f.command, { id: f.command.id, at, expectedVersion, observation, action: 'observe' });
}
describe('Phase 4 pure command rules — fictional inputs, not runtime/persistence authorization', () => {
  it('preserves an exact deeply immutable approved/accepted pending origination', () => {
    const f = prepared(); expect(f.loan.state).toBe('pending_release'); expect(f.loan.offer.payments).toEqual(f.context.basis.saved.snapshot.basis.offers[0].payments);
    expect(f.loan.acceptance.documentId).toBe(f.context.basis.publishedDocument.id);
    expect(Object.isFrozen(f.loan.offer.payments[0])).toBe(true); expect(() => { Object.assign(f.loan.offer.payments[0], { amountCentavos: 1 }); }).toThrow();
    expect(f.command.state).toBe('prepared'); expect(f.command.journalId).toBeNull(); expect(f.command.receiptId).toBeNull();
  });
  it.each(['current_decision', 'document', 'acknowledgment', 'member', 'acceptance_time', 'source', 'input', 'conflict', 'snapshot'] as const)('blocks origination on changed %s', kind => {
    const f = ruleFixture(), c = f.context;
    if (kind === 'current_decision') c.basis.currentDecisionId = randomUUID();
    if (kind === 'document') c.basis.publishedDocument.sha256 = 'b'.repeat(64);
    if (kind === 'acknowledgment') c.basis.acceptance.snapshotHash = 'b'.repeat(64);
    if (kind === 'member') c.basis.acceptance.memberId = randomUUID();
    if (kind === 'acceptance_time') c.basis.acceptance.acceptedAt = '2026-11-03T00:00:00Z';
    if (kind === 'source') c.basis.current.sources[0].excerpt = 'Changed exact statement.';
    if (kind === 'input') c.basis.current.application.assessmentInputVersion++;
    if (kind === 'conflict') c.basis.current.conflicts[0].status = 'restricted';
    if (kind === 'snapshot') c.basis.saved.snapshot.input.rationale = 'Tampered saved reason.';
    expect(() => preparePendingOrigination(f.cashier, c, { id: randomUUID(), method: 'cash', at: times.prepare, existingOriginationId: null })).toThrow();
  });
  it('prevents origination aliasing when the authoritative preflight reports an existing application origination', () => {
    const f = ruleFixture(); expect(() => preparePendingOrigination(f.cashier, f.context, { id: randomUUID(), method: 'cash', at: times.prepare, existingOriginationId: randomUUID() })).toThrow(/origination already exists/);
  });
  it.each(['reserved', 'settled', 'unavailable'] as const)('refuses another release when its preflight claim is %s', releaseClaim => {
    const f = prepared(); expect(() => prepareReleaseCommand(f.cashier, f.context, f.loan, { id: randomUUID(), businessEventId: randomUUID(), providerKey: randomUUID(), at: times.prepare, releaseClaim, request: f.command.payload })).toThrow(/first-release claim/);
  });
  it.each([null, 0, -1, Number.MAX_SAFE_INTEGER + 1, 1.5])('rejects invalid or missing delivered amount %s', amountCentavos => {
    const f = prepared(); expect(() => prepareReleaseCommand(f.cashier, f.context, f.loan, { id: randomUUID(), businessEventId: randomUUID(), providerKey: randomUUID(), at: times.prepare, releaseClaim: 'none', request: { ...f.command.payload, amountCentavos } })).toThrow();
  });
  it.each(['2026-02-30', '2026-13-01', '', null])('rejects invalid effective date %s', effectiveDate => {
    const f = prepared(); expect(() => prepareReleaseCommand(f.cashier, f.context, f.loan, { id: randomUUID(), businessEventId: randomUUID(), providerKey: randomUUID(), at: times.prepare, releaseClaim: 'none', request: { ...f.command.payload, effectiveDate } })).toThrow();
  });
  it.each(['amount', 'loan', 'schedule'] as const)('rejects changed %s while creating a command', kind => {
    const f = prepared(), loan = PendingOriginationSchema.parse(f.loan), request = FinancialCommandCreateSchema.parse(f.command.payload);
    if (kind === 'amount') request.amountCentavos++;
    if (kind === 'loan') request.loanId = randomUUID();
    if (kind === 'schedule') loan.offer.payments[0].amountCentavos++;
    expect(() => prepareReleaseCommand(f.cashier, f.context, loan, { id: randomUUID(), businessEventId: randomUUID(), providerKey: randomUUID(), at: times.prepare, releaseClaim: 'none', request })).toThrow();
  });
  it('requires explicit configured authority/execution and refuses actual/provider execution', () => {
    const f = prepared();
    f.context.execution = { status: 'unavailable', reason: 'Unreviewed component mapping' };
    expect(() => authorizeCommand(f.authorizer, f.context, f.command, { id: f.command.id, expectedVersion: 1, at: times.authorize })).toThrow(/unavailable/);
    f.context.execution = { status: 'configured', mode: 'actual', componentRuleVersionId: randomUUID() };
    expect(() => prepareReleaseCommand(f.cashier, f.context, f.loan, { id: randomUUID(), businessEventId: randomUUID(), providerKey: randomUUID(), at: times.prepare, releaseClaim: 'none', request: f.command.payload })).toThrow(/Actual financial execution/);
    f.context.authority = { status: 'unavailable', reason: 'Not reviewed' };
    expect(() => authorizeCommand(f.authorizer, f.context, f.command, { id: f.command.id, expectedVersion: 1, at: times.authorize })).toThrow(/explicitly configured/);
  });
  it.each(['officer', 'administrator', 'accountant', 'cashier'] as const)('does not grant %s implicit financial authorization', role => {
    const f = prepared(); expect(() => authorizeCommand({ ...f.authorizer, roles: [role] }, f.context, f.command, { id: f.command.id, expectedVersion: 1, at: times.authorize })).toThrow(/financial role/);
  });
  it('rejects the same preparer holding both roles, even with an explicit grant', () => {
    const f = prepared(); policy(f.context).grants.find(g => g.userId === f.cashier.userId)!.actions.push('authorize');
    expect(() => authorizeCommand({ ...f.cashier, roles: ['cashier', 'financial_authorizer'] }, f.context, f.command, { id: f.command.id, expectedVersion: 1, at: times.authorize })).toThrow(/preparer cannot authorize/);
  });
  it.each(['organization', 'branch', 'product', 'date', 'limit', 'grant', 'duplicate_grant', 'method', 'mfa', 'future_mfa'] as const)('blocks financial authorization with invalid %s', kind => {
    const f = prepared(), p = policy(f.context); const actor = { ...f.authorizer };
    if (kind === 'organization') actor.organizationId = randomUUID();
    if (kind === 'branch') actor.branchIds = [randomUUID()];
    if (kind === 'product') p.productVersionId = randomUUID();
    if (kind === 'date') p.effectiveThrough = '2026-11-01';
    if (kind === 'limit') p.grants.find(g => g.userId === actor.userId)!.maximumCentavos = 1;
    if (kind === 'grant') p.grants = [];
    if (kind === 'duplicate_grant') p.grants.push(structuredClone(p.grants[0]));
    if (kind === 'method') p.grants.find(g => g.userId === actor.userId)!.methods = ['bank'];
    if (kind === 'mfa') actor.authenticationMethods = [];
    if (kind === 'future_mfa') actor.authenticatedAt = new Date(times.later);
    expect(() => authorizeCommand(actor, f.context, f.command, { id: f.command.id, expectedVersion: 1, at: times.authorize })).toThrow();
  });
  it('binds separate authorization and a single submission intent to the immutable command and stable identities', () => {
    const f = submitted(); expect(f.command.state).toBe('submitted'); expect(f.command.authorizedBy).toBe(f.authorizer.userId);
    expect(f.command.preparedBy).not.toBe(f.command.authorizedBy); expect(f.command.authorization!.payloadHash).toBe(f.command.payloadHash);
    expect(f.command.submission!.claimVersion).toBe(3); expect(f.command.history.map(h => h.to)).toEqual(['prepared', 'authorized', 'submitted']);
    expect(() => prepareSubmission(f.cashier, f.context, f.command, { id: f.command.id, expectedVersion: 3, attemptId: randomUUID(), at: times.later })).toThrow(/Only one submission intent/);
  });
  it.each(['payload', 'key', 'event', 'amount', 'authorizer', 'history'] as const)('detects %s tampering after authorization', kind => {
    const f = authorized(), c = CommandSchema.parse(f.command);
    if (kind === 'payload') c.payload.instrumentReference = 'Changed';
    if (kind === 'key') c.providerKey = randomUUID();
    if (kind === 'event') c.businessEventId = randomUUID();
    if (kind === 'amount') c.amountCentavos++;
    if (kind === 'authorizer') c.authorizedBy = c.preparedBy;
    if (kind === 'history') c.history.pop();
    expect(() => prepareSubmission(f.cashier, f.context, c, { id: c.id, expectedVersion: c.version, attemptId: randomUUID(), at: times.submit })).toThrow();
  });
  it.each(['missing', 'inactive', 'wrong_user', 'scope', 'role', 'policy', 'original_mfa'] as const)('rechecks original authorizer at submission: %s', kind => {
    const f = authorized();
    if (kind === 'missing') f.context.originalAuthorizer = { status: 'unavailable' };
    else if (f.context.originalAuthorizer.status === 'current') {
      if (kind === 'inactive') f.context.originalAuthorizer.active = false;
      if (kind === 'wrong_user') f.context.originalAuthorizer.userId = randomUUID();
      if (kind === 'scope') f.context.originalAuthorizer.branchIds = [];
      if (kind === 'role') f.context.originalAuthorizer.roles = ['administrator'];
    }
    if (kind === 'policy') policy(f.context).versionId = randomUUID();
    const at = kind === 'original_mfa' ? '2026-11-02T01:30:00Z' : times.submit;
    const actor = kind === 'original_mfa' ? { ...f.cashier, authenticatedAt: new Date(at) } : f.cashier;
    expect(() => prepareSubmission(actor, f.context, f.command, { id: f.command.id, expectedVersion: 2, attemptId: randomUUID(), at })).toThrow();
  });
  it('rejects stale versions, backwards server time and unknown browser state patches', () => {
    const f = authorized();
    expect(() => prepareSubmission(f.cashier, f.context, f.command, { id: f.command.id, expectedVersion: 1, attemptId: randomUUID(), at: times.submit })).toThrow(/current command version/);
    expect(() => prepareSubmission(f.cashier, f.context, f.command, { id: f.command.id, expectedVersion: 2, attemptId: randomUUID(), at: times.prepare })).toThrow();
    expect(() => CommandSchema.parse({ ...f.command, state: 'confirmed', journalId: randomUUID() })).toThrow();
    expect(() => CommandSchema.parse({ ...f.command, active: true })).toThrow();
  });
  it('retains verified settlement as unposted, with no loan activation/receipt/journal authority', () => {
    const f = submitted(), result = intake(f);
    expect(result.command.state).toBe('confirmed_unposted'); expect(result.command.version).toBe(4);
    expect(result.command.origination.state).toBe('pending_release'); expect(result.command.journalId).toBeNull();
    expect(recoveryAdvice(result.command)).toMatchObject({ knownSettlement: true, nextAction: 'posting_integration_required', canResubmit: false, canActivateLoan: false, canPublishPostedReceipt: false, releaseAuthorized: false });
  });
  it('records known facts despite later changed approval/input/execution prerequisites', () => {
    const f = submitted(); f.context.basis.current.application.assessmentInputVersion++; f.context.basis.currentDecisionId = randomUUID();
    f.context.execution = { status: 'unavailable', reason: 'Period or execution configuration changed' };
    expect(intake(f).command.state).toBe('confirmed_unposted');
  });
  it('replays an identical observation ID without another version/history effect, but rejects changed evidence', () => {
    const f = submitted(), observation = observe(f), first = intake(f, observation);
    const next = recordObservation(f.cashier, { authority: f.context.authority }, first.command, { id: first.command.id, expectedVersion: 3, at: times.later, action: 'observe', observation });
    expect(next.disposition).toBe('duplicate'); expect(next.command).toEqual(first.command);
    expect(() => recordObservation(f.cashier, { authority: f.context.authority }, first.command, { id: first.command.id, expectedVersion: 4, at: times.later, action: 'observe', observation: { ...observation, amountMinorUnits: 1 } })).toThrow(/already identifies different/);
  });
  it('distinguishes duplicate notifications from the one underlying settlement', () => {
    const f = submitted(), o = observe(f), first = intake(f, o);
    const next = recordObservation(f.cashier, { authority: f.context.authority }, first.command, { id: first.command.id, expectedVersion: 4, at: times.later, action: 'observe', observation: { ...o, id: randomUUID() } });
    expect(next.disposition).toBe('duplicate_movement'); expect(next.command.observations).toHaveLength(2); expect(next.command.state).toBe('confirmed_unposted');
  });
  it.each(['amount', 'currency', 'date', 'earlier_movement', 'future_movement', 'second_movement', 'late_failure'] as const)('preserves contradictory %s evidence without posted effects', kind => {
    const f = submitted(), o = observe(f), first = intake(f, o), other = { ...o, id: randomUUID() };
    if (kind === 'amount') other.amountMinorUnits = other.amountMinorUnits! + 1;
    if (kind === 'currency') other.currency = 'USD';
    if (kind === 'date') other.effectiveDate = '2026-11-03';
    if (kind === 'earlier_movement') other.occurredAt = times.prepare;
    if (kind === 'future_movement') other.occurredAt = '2026-11-03T00:00:00Z';
    if (kind === 'second_movement') { other.movementId = randomUUID(); other.providerReference = 'ANOTHER-SIMULATED-MOVEMENT'; }
    if (kind === 'late_failure') other.state = 'failed';
    const result = recordObservation(f.cashier, { authority: f.context.authority }, first.command, { id: first.command.id, expectedVersion: 4, at: times.later, action: 'reconcile', observation: other });
    expect(result.disposition).toBe('conflict'); expect(result.command.observations[0].input).toEqual(o); expect(result.command.observations[1].input).toEqual(other);
    expect(recoveryAdvice(result.command)).toMatchObject({ nextAction: 'review_conflicting_evidence', knownSettlement: true, canResubmit: false });
    expect(result.command.state).toBe('confirmed_unposted');
  });
  it('retains a first known settlement with wrong amount as a visible conflict instead of losing the fact', () => {
    const f = submitted(), o = observe(f); o.amountMinorUnits = 1;
    const result = intake(f, o); expect(result.disposition).toBe('conflict'); expect(result.command.observations[0].input.amountMinorUnits).toBe(1);
    expect(recoveryAdvice(result.command).knownSettlement).toBe(true); expect(recoveryAdvice(result.command).canActivateLoan).toBe(false);
  });
  it('never interprets an unknown null reference as definitive failure or resubmission permission', () => {
    const f = submitted(), o = observe(f, 'unknown'), result = intake(f, o);
    expect(result.command.state).toBe('unknown'); expect(result.command.providerReference).toBeNull();
    expect(recoveryAdvice(result.command)).toMatchObject({ knownSettlement: false, nextAction: 'operator_reconciliation_required', canResubmit: false });
  });
  it('preserves an existing reference for status reconciliation without making a status call', () => {
    const f = submitted(), o = observe(f, 'unknown'); o.providerReference = 'SIMULATED-EXISTING-REFERENCE';
    const result = intake(f, o); expect(recoveryAdvice(result.command).nextAction).toBe('query_existing_reference');
  });
  it('can reconcile unknown to verified no movement; failed is never an automatic retry', () => {
    const f = submitted(), first = intake(f, observe(f, 'unknown')), failed = observe(f, 'failed');
    const result = recordObservation(f.cashier, { authority: f.context.authority }, first.command, { id: first.command.id, expectedVersion: 4, at: times.later, action: 'reconcile', observation: failed });
    expect(result.command.state).toBe('failed'); expect(recoveryAdvice(result.command).nextAction).toBe('review_failed_without_resubmission');
    expect(() => prepareSubmission(f.cashier, f.context, result.command, { id: result.command.id, expectedVersion: 5, attemptId: randomUUID(), at: times.later })).toThrow();
  });
  it('preserves a late known settlement after failed status as conflicting evidence', () => {
    const f = submitted(), first = intake(f, observe(f, 'failed')), confirmed = observe(f);
    const result = recordObservation(f.cashier, { authority: f.context.authority }, first.command, { id: first.command.id, expectedVersion: 4, at: times.later, action: 'reconcile', observation: confirmed });
    expect(result.command.conflicts).toContain('late_settlement'); expect(recoveryAdvice(result.command).knownSettlement).toBe(true); expect(recoveryAdvice(result.command).nextAction).toBe('review_conflicting_evidence');
  });
  it.each(['command', 'event', 'provider_key', 'mode', 'unverified', 'missing_evidence'] as const)('rejects unrelated or unsupported %s observation', kind => {
    const f = submitted(), o = observe(f);
    if (kind === 'command') o.commandId = randomUUID();
    if (kind === 'event') o.businessEventId = randomUUID();
    if (kind === 'provider_key') o.providerKey = randomUUID();
    if (kind === 'mode') o.mode = 'actual';
    if (kind === 'unverified') o.verified = false;
    if (kind === 'missing_evidence') o.evidence = null;
    expect(() => intake(f, o)).toThrow(); expect(f.command.observations).toEqual([]);
  });
  it('does not accept observation before durable submission or under an unrelated branch/role', () => {
    const s = submitted(), o = observe(s), f = authorized();
    expect(() => recordObservation(f.cashier, { authority: f.context.authority }, f.command, { id: f.command.id, expectedVersion: 2, at: times.observe, action: 'observe', observation: { ...o, commandId: f.command.id, businessEventId: f.command.businessEventId, providerKey: f.command.providerKey } })).toThrow(/prior durable submission/);
    expect(() => recordObservation({ ...s.cashier, branchIds: [] }, { authority: s.context.authority }, s.command, { id: s.command.id, expectedVersion: 3, at: times.observe, action: 'observe', observation: o })).toThrow(/actor cannot/);
  });
  it('retains command evidence through JSON serialization without claiming database durability', () => {
    const f = submitted(), result = intake(f), restored: unknown = JSON.parse(JSON.stringify(result.command));
    expect(recoveryAdvice(restored)).toEqual(recoveryAdvice(result.command)); expect(fingerprint(CommandSchema.parse(restored))).toBe(fingerprint(result.command));
  });
  it.each([['2026-11-02T15:59:59Z', '2026-11-02'], ['2026-11-02T16:00:00Z', '2026-11-03']])('uses the Manila calendar for %s', (at, day) => {
    expect(businessDay(at)).toBe(day);
  });
  it('never manufactures a verified outcome from a missing evidence amount', () => {
    const f = submitted(); expect(() => ObservationInputSchema.parse({ ...observe(f), amountMinorUnits: null })).toThrow();
  });
  it('keeps unknown observation amounts/currency/dates unknown, rather than intended request values', () => {
    const f = submitted(), observation = observe(f, 'unknown');
    expect(observation).toMatchObject({ amountMinorUnits: null, currency: null, effectiveDate: null, occurredAt: null, verified: false });
    expect(intake(f, observation).command.state).toBe('unknown');
  });
  it('preserves a contradictory failed response as evidence rather than conclusive no-movement status', () => {
    const f = submitted(), observation = observe(f, 'failed'); observation.amountMinorUnits = 1;
    const result = intake(f, observation); expect(result.disposition).toBe('conflict'); expect(result.command.state).toBe('submitted'); expect(result.command.conflicts).toContain('payload_mismatch');
  });
  it('uses delivered cash distinctly from principal without calculating or posting fee components', () => {
    const f = prepared(ruleFixture(true)); expect(f.loan.offer.principalCentavos).toBe(1_000_000); expect(f.command.amountCentavos).toBe(900_000);
    expect(f.command.origination.offer.netReceivedCentavos).toBe(900_000); expect(f.command.journalId).toBeNull();
  });
  it('honors the inclusive approval expiry on the Manila calendar', () => {
    const f = ruleFixture();
    expect(() => preparePendingOrigination(f.cashier, f.context, { id: randomUUID(), method: 'cash', existingOriginationId: null, at: '2026-12-31T15:59:59Z' })).not.toThrow();
    expect(() => preparePendingOrigination(f.cashier, f.context, { id: randomUUID(), method: 'cash', existingOriginationId: null, at: '2026-12-31T16:00:00Z' })).toThrow(/approved terms have expired/);
  });
  it('accepts explicit bank-method preparation without substituting a cash grant', () => {
    const f = ruleFixture(); policy(f.context).grants.find(g => g.userId === f.cashier.userId)!.methods = ['bank'];
    const loan = preparePendingOrigination(f.cashier, f.context, { id: randomUUID(), method: 'bank', existingOriginationId: null, at: times.prepare });
    expect(loan.state).toBe('pending_release');
    expect(() => preparePendingOrigination(f.cashier, f.context, { id: randomUUID(), method: 'cash', existingOriginationId: null, at: times.prepare })).toThrow();
  });
  it('binds the component-rule version so a new mapping cannot reuse old financial authorization', () => {
    const f = authorized();
    if (f.context.execution.status === 'configured') f.context.execution.componentRuleVersionId = randomUUID();
    expect(() => prepareSubmission(f.cashier, f.context, f.command, { id: f.command.id, expectedVersion: 2, attemptId: randomUUID(), at: times.submit })).toThrow(/component configuration changed/);
  });
  it('requires no live release/source packet merely to capture an authorized known observation', () => {
    const f = submitted(), observation = observe(f);
    const result = recordObservation(f.cashier, { authority: f.context.authority }, f.command, { id: f.command.id, expectedVersion: 3, at: times.observe, observation, action: 'observe' });
    expect(result.command.state).toBe('confirmed_unposted');
  });
  it('reports unavailable provider execution without treating it as a permitted manual method', () => {
    const f = prepared();
    expect(() => prepareReleaseCommand(f.cashier, f.context, f.loan, { id: randomUUID(), businessEventId: randomUUID(), providerKey: randomUUID(), at: times.prepare, releaseClaim: 'none', request: { ...f.command.payload, method: 'provider' } })).toThrow(/Provider execution is not enabled/);
  });
  it('does not allow later unknown evidence to silently resolve an existing late-settlement conflict', () => {
    const f = submitted(), failed = intake(f, observe(f, 'failed'));
    const late = recordObservation(f.cashier, { authority: f.context.authority }, failed.command, { id: f.command.id, expectedVersion: 4, at: times.later, action: 'reconcile', observation: observe(f) });
    const unknown = recordObservation(f.cashier, { authority: f.context.authority }, late.command, { id: f.command.id, expectedVersion: 5, at: times.later, action: 'reconcile', observation: observe(f, 'unknown') });
    expect(unknown.command.state).toBe('failed'); expect(unknown.command.conflicts).toContain('late_settlement'); expect(recoveryAdvice(unknown.command).nextAction).toBe('review_conflicting_evidence');
  });
  it('rejects restored history that bypasses authorization/submission ordering', () => {
    const f = submitted(), malformed = CommandSchema.parse(f.command); malformed.history[1].to = 'submitted'; malformed.history[2].from = 'submitted';
    expect(() => inspectCommand(malformed)).toThrow(/history/);
  });
  it('rejects invented posted history and observation history without evidence', () => {
    const f = submitted(), malformed = CommandSchema.parse(f.command);
    malformed.version++; malformed.history.push({ from: 'submitted', to: 'unknown', actorId: f.cashier.userId, action: 'observe', at: times.observe }); malformed.state = 'unknown';
    expect(() => inspectCommand(malformed)).toThrow(/observation count/);
    expect(() => CommandSchema.parse({ ...f.command, history: [...f.command.history, { from: 'submitted', to: 'confirmed', action: 'observe', actorId: f.cashier.userId, at: times.observe }] })).toThrow();
  });
});
