import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import type { ActorContext, MemberActorContext } from '../../../../../packages/contracts/src/ports.js';
import { DecisionCandidateSchema, type DecisionPreparation, type ReviewContext } from './context.js';
import {
  DecisionRuleError, prepareDecision, prepareMemberAcceptance, prepareRecommendation,
  reviewBasisHash, reviewChangeEffect,
} from './rules.js';

// Independent fictional unit-test inputs, not a second Ana/Ben/Cora registry,
// institutional policy, authentication fixture or checked finance implementation.
const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const at = '2026-11-01T00:00:00Z';
const officer: ActorContext = {
  userId: id(1), organizationId: id(3), branchIds: [id(4)], roles: ['officer'], sessionId: id(7),
  authenticatedAt: new Date(at), authenticationMethods: ['mfa'], correlationId: 'fictional-rule-test',
};
const reviewer: ActorContext = { ...officer, userId: id(2), roles: ['reviewer'] };
const member: MemberActorContext = { kind: 'member', memberId: id(6), organizationId: id(3), linkId: id(8), sessionId: id(9), correlationId: 'fictional-member-rule-test' };
function base(): ReviewContext {
  return {
    application: {
      id: id(5), organizationId: id(3), branchId: id(4), memberId: id(6), memberName: 'Fictional rule-test member',
      purpose: 'Fictional household purchase', requestedPrincipalCentavos: 100_000, requestedTermMonths: 1,
      currency: 'PHP', version: 2, assessmentInputVersion: 1, assignedOfficerId: officer.userId,
      status: 'assessment_ready', createdAt: at, updatedAt: at,
    }, periodStart: '2026-11-01', periodEnd: '2026-11-30', currentAssessmentPolicyVersionId: id(11),
    assessment: {
      id: id(10), applicationId: id(5), inputVersion: 1, engineVersion: 'fictional-checked-fixture-v1',
      policyVersionId: id(11), createdAt: at, status: 'complete', warnings: [], scenarios: [{
        offerVersionId: id(12), monthlyRemainingCentavos: 100_000, lowestBalanceCentavos: 50_000,
        closingBalanceCentavos: 150_000, totalRepaymentCentavos: 100_000, financingCostCentavos: 0,
        shortageDates: [], policyChecks: [{ policyId: 'fictional-capacity', passed: true, detail: 'Supplied fictional checked result', overridable: false }],
      }],
    },
    offers: [{ id: id(12), productVersionId: id(13), label: 'Fictional principal-only offer', principalCentavos: 100_000,
      netReceivedCentavos: 100_000, feesPaidSeparatelyCentavos: 0, termMonths: 1,
      payments: [{ date: '2026-11-25', amountCentavos: 100_000 }], available: true }],
    sources: [{ sourceId: id(14), sourceVersion: 1, applicationId: id(5), sha256: digest('fictional statement'),
      excerpt: 'Fictional member statement supplied for unit testing.', verification: 'unavailable' }],
    facts: [{ factId: id(15), value: { availability: 'recorded', amountCentavos: 300_000 }, sourceId: id(14), sourceVersion: 1,
      effectiveDate: '2026-11-01', cashDate: '2026-11-15', critical: true, confirmation: 'accepted' }],
    authority: { status: 'configured', versionId: id(16), effectiveFrom: '2026-11-01', effectiveThrough: '2026-12-31',
      requiredApprovers: 1, approvalValidity: { kind: 'until', date: '2026-11-30' },
      grants: [{ userId: reviewer.userId, outcomes: ['approve', 'decline', 'return'], approvalLimitCentavos: 100_000, exceptionPolicyIds: [] }] },
    conflicts: [{ userId: officer.userId, status: 'clear', reference: 'fictional-officer-declaration' },
      { userId: reviewer.userId, status: 'clear', reference: 'fictional-reviewer-declaration' }], recommendation: null,
  };
}
function assessment(c: ReviewContext) { if (c.assessment?.status !== 'complete') throw new Error('Test needs a complete fixture'); return c.assessment; }
function makeIncomplete(c: ReviewContext) {
  const a = assessment(c);
  c.assessment = { id: a.id, applicationId: a.applicationId, inputVersion: a.inputVersion,
    engineVersion: a.engineVersion, policyVersionId: a.policyVersionId, createdAt: a.createdAt,
    status: 'incomplete', issues: [{ factId: id(15), message: 'Missing required input' }] };
}
function policy(c: ReviewContext) { if (c.authority.status !== 'configured') throw new Error('Test needs configured authority'); return c.authority; }
function recommended(change: (c: ReviewContext) => void = () => {}) {
  const c = base(); change(c);
  const r = prepareRecommendation(officer, c, {
    id: id(17), at, expectedVersion: c.application.version,
    request: { assessmentId: assessment(c).id, offerVersionId: id(12), inputVersion: 1, reason: 'Use the supplied checked offer and preserve its concerns.' },
  });
  c.recommendation = { ...r }; c.application.status = 'recommended'; c.application.version += 1;
  return c;
}
function preparation(c: ReviewContext, outcome: 'approve' | 'decline' | 'return' = 'approve'): DecisionPreparation {
  return { id: id(18), at, expectedVersion: c.application.version,
    request: { outcome, assessmentId: c.assessment?.id ?? null, recommendationId: c.recommendation?.id ?? null,
      offerVersionId: outcome === 'return' ? null : id(12), rationale: 'Recorded fictional reviewer rationale.',
      departureReason: outcome === 'approve' ? '' : 'Recorded reason for departing from the recommendation.',
      exceptions: [], reviewDate: '2026-12-01', explanationReviewed: true },
    document: outcome === 'approve' ? { id: id(19), sha256: digest('fictional accepted terms v1') } : null,
    explanation: { origin: 'template', text: 'Review the recorded fictional sources, checked result and remaining concerns.',
      sourceIds: c.sources.map(s => s.sourceId), basisHash: reviewBasisHash(c), reviewedBy: reviewer.userId },
  };
}
function acceptancePreparation(c: ReviewContext) {
  return { at, expectedVersion: c.application.version, currentDecisionId: id(18),
    publishedDocument: { id: id(19), sha256: digest('fictional accepted terms v1') },
    request: { decisionId: id(18), documentVersionId: id(19), acknowledgment: true as const } };
}
function recorded(change: (c: ReviewContext) => void = () => {}) {
  const c = recommended(change), p = preparation(c), d = prepareDecision(reviewer, c, p);
  c.application.status = 'decision_recorded'; c.application.version += 1;
  return { c, p, d };
}
function fails(work: () => unknown, code: string) {
  try { work(); throw new Error('Expected a decision rule failure'); }
  catch (error) { expect(error).toBeInstanceOf(DecisionRuleError); expect((error as DecisionRuleError).code).toBe(code); }
}

describe('recommendation prerequisites', () => {
  it('prepares an immutable candidate from an exact current checked basis without changing workflow state', () => {
    const c = base(), before = structuredClone(c);
    const r = prepareRecommendation(officer, c, { id: id(17), at, expectedVersion: 2,
      request: { assessmentId: id(10), offerVersionId: id(12), inputVersion: 1, reason: '  Reviewed fictional option.  ' } });
    expect(r).toMatchObject({ preparedBy: officer.userId, reason: 'Reviewed fictional option.', inputVersion: 1 });
    expect(r.basisHash).toBe(reviewBasisHash(c)); expect(Object.isFrozen(r)).toBe(true); expect(c).toEqual(before);
  });
  it.each(['unassigned', 'other officer', 'wrong role', 'wrong branch', 'wrong organization'])(
    'rejects %s as preparer', kind => {
      const c = base(), a = { ...structuredClone(officer) };
      if (kind === 'unassigned') c.application.assignedOfficerId = null;
      if (kind === 'other officer') a.userId = id(20);
      if (kind === 'wrong role') a.roles = ['administrator'];
      if (kind === 'wrong branch') a.branchIds = [id(21)];
      if (kind === 'wrong organization') a.organizationId = id(22);
      expect(() => prepareRecommendation(a, c, { id: id(17), at, expectedVersion: 2,
        request: { assessmentId: id(10), offerVersionId: id(12), inputVersion: 1, reason: 'Fictional review.' } })).toThrow(DecisionRuleError);
    });
  it.each(['no assessment', 'incomplete', 'stale input', 'stale policy', 'unavailable offer', 'missing scenario', 'future assessment', 'missing evidence', 'draft state'])(
    'rejects %s', kind => {
      const c = base();
      if (kind === 'no assessment') c.assessment = null;
      if (kind === 'incomplete') makeIncomplete(c);
      if (kind === 'stale input') c.application.assessmentInputVersion += 1;
      if (kind === 'stale policy') c.currentAssessmentPolicyVersionId = id(23);
      if (kind === 'unavailable offer') c.offers[0].available = false;
      if (kind === 'missing scenario') assessment(c).scenarios[0].offerVersionId = id(24);
      if (kind === 'future assessment') assessment(c).createdAt = '2026-11-02T00:00:00Z';
      if (kind === 'missing evidence') { c.sources = []; c.facts = []; }
      if (kind === 'draft state') c.application.status = 'draft';
      expect(() => prepareRecommendation(officer, c, { id: id(17), at, expectedVersion: 2,
        request: { assessmentId: id(10), offerVersionId: id(12), inputVersion: 1, reason: 'Fictional review.' } })).toThrow(DecisionRuleError);
    });
  it('does not treat unavailable or unresolved critical values as zero or overrideable', () => {
    for (const missing of [true, false]) {
      const c = recommended();
      if (missing) c.facts[0].value = { availability: 'unavailable', reason: 'Member cannot yet supply the amount' };
      else c.facts[0].confirmation = 'unresolved';
      fails(() => prepareDecision(reviewer, c, preparation(c)), 'critical_evidence_gap');
    }
  });
});

describe('reviewer authority and decision guards', () => {
  it('records a reviewed approval at the exact configured limit without recalculating supplied financial results', () => {
    const c = recommended(), d = prepareDecision(reviewer, c, preparation(c));
    expect(d.snapshot.input.outcome).toBe('approve'); expect(d.snapshot.basis.assessment).toEqual(c.assessment);
    expect(d.snapshot.basis.sources[0].verification).toBe('unavailable');
    expect(d.snapshot.reviewerId).toBe(reviewer.userId); expect(d.snapshotHash).toMatch(/^[a-f0-9]{64}$/);
  });
  it('blocks same-person review even with both roles, a reassignment, and an explicit authority grant', () => {
    const c = recommended(); c.application.assignedOfficerId = id(25);
    policy(c).grants.push({ ...policy(c).grants[0], userId: officer.userId });
    const actor = { ...officer, roles: ['officer', 'reviewer'] as ActorContext['roles'] };
    const p = preparation(c); p.explanation.reviewedBy = officer.userId;
    fails(() => prepareDecision(actor, c, p), 'self_approval');
  });
  it('does not give an administrator financial authority', () => {
    const c = recommended(); fails(() => prepareDecision({ ...reviewer, roles: ['administrator'] }, c, preparation(c)), 'role_required');
  });
  it.each(['restricted', 'unavailable', 'absent'])( 'blocks %s conflict clearance', state => {
    const c = recommended();
    if (state === 'absent') c.conflicts = c.conflicts.filter(x => x.userId !== reviewer.userId);
    else c.conflicts[1].status = state as 'restricted' | 'unavailable';
    fails(() => prepareDecision(reviewer, c, preparation(c)), 'conflict_clearance_required');
  });
  it('blocks a preparer who became restricted after recommending', () => {
    const c = recommended(); c.conflicts[0].status = 'restricted';
    fails(() => prepareDecision(reviewer, c, preparation(c)), 'conflict_clearance_required');
  });
  it('requires configured authority without guessing a cooperative default', () => {
    const c = recommended(); c.authority = { status: 'unavailable', reason: 'Cooperative confirmation pending' };
    fails(() => prepareDecision(reviewer, c, preparation(c)), 'authority_unavailable');
  });
  it.each(['limit unavailable', 'limit exceeded', 'quorum', 'expiry unavailable', 'expired approval', 'authority expired', 'authority not yet effective', 'outcome forbidden'])(
    'blocks %s', kind => {
      const c = recommended(c => {
        const p = policy(c);
        if (kind === 'limit unavailable') p.grants[0].approvalLimitCentavos = null;
        if (kind === 'limit exceeded') p.grants[0].approvalLimitCentavos = 99_999;
        if (kind === 'quorum') p.requiredApprovers = 2;
        if (kind === 'expiry unavailable') p.approvalValidity = { kind: 'unavailable', reason: 'Pending rule' };
        if (kind === 'expired approval') p.approvalValidity = { kind: 'until', date: '2026-10-31' };
        if (kind === 'authority expired') { p.effectiveFrom = '2026-10-01'; p.effectiveThrough = '2026-10-31'; }
        if (kind === 'authority not yet effective') p.effectiveFrom = '2026-11-02';
        if (kind === 'outcome forbidden') p.grants[0].outcomes = ['return'];
      });
      expect(() => prepareDecision(reviewer, c, preparation(c))).toThrow(DecisionRuleError);
    });
  it('checks aggregate concurrency separately from assessment input versions', () => {
    const c = recommended(), p = preparation(c); p.expectedVersion -= 1;
    fails(() => prepareDecision(reviewer, c, p), 'stale_version');
    c.application.assessmentInputVersion += 1;
    fails(() => prepareDecision(reviewer, c, preparation(c)), 'stale_assessment');
  });
  it('allows authorized clarification without a recommendation, assessment, evidence or numeric result', () => {
    const c = base(); c.application.status = 'evidence_review'; c.assessment = null; c.sources = []; c.facts = [];
    const d = prepareDecision(reviewer, c, preparation(c, 'return'));
    expect(d.snapshot.input).toMatchObject({ outcome: 'return', assessmentId: null, recommendationId: null, offerVersionId: null });
    expect(d.snapshot.basis.assessment).toBeNull(); expect(d.snapshot.document).toBeNull();
  });
  it('allows clarification while the supplied assessment is incomplete, but not approval or decline', () => {
    const c = recommended(); makeIncomplete(c);
    expect(prepareDecision(reviewer, c, preparation(c, 'return')).snapshot.input.outcome).toBe('return');
    for (const outcome of ['approve', 'decline'] as const) fails(() => prepareDecision(reviewer, c, preparation(c, outcome)), 'assessment_incomplete');
  });
  it('requires a current recommendation and records departure reasons for a decline', () => {
    const c = recommended(), p = preparation(c, 'decline'); p.request.departureReason = '  ';
    fails(() => prepareDecision(reviewer, c, p), 'departure_reason');
    p.request.departureReason = 'A recorded human reason for declining the considered option.';
    expect(prepareDecision(reviewer, c, p).snapshot.input.outcome).toBe('decline');
    c.recommendation = null; fails(() => prepareDecision(reviewer, c, preparation(c)), 'stale_recommendation');
  });
  it('rejects a stale recommendation when source content changes even if an upstream input version was not advanced', () => {
    const c = recommended(); c.sources[0].excerpt = 'Material correction after the officer review.';
    fails(() => prepareDecision(reviewer, c, preparation(c)), 'stale_recommendation');
  });
  it('requires a departure reason when the reviewer chooses a different checked available offer', () => {
    const c = recommended(c => {
      c.offers.push({ ...c.offers[0], id: id(26), label: 'Another explicit fictional offer' });
      assessment(c).scenarios.push({ ...assessment(c).scenarios[0], offerVersionId: id(26) });
    });
    const p = preparation(c); p.request.offerVersionId = id(26);
    fails(() => prepareDecision(reviewer, c, p), 'departure_reason');
    p.request.departureReason = 'Reviewed the other explicitly supplied scenario.';
    expect(prepareDecision(reviewer, c, p).snapshot.input.offerVersionId).toBe(id(26));
  });
  it('requires the reviewed explanation to match the reviewer, exact basis and existing sources', () => {
    const c = recommended(), p = preparation(c); p.explanation.basisHash = 'a'.repeat(64);
    fails(() => prepareDecision(reviewer, c, p), 'explanation_review');
    p.explanation = preparation(c).explanation; p.explanation.reviewedBy = officer.userId;
    fails(() => prepareDecision(reviewer, c, p), 'explanation_review');
    p.explanation = preparation(c).explanation; p.explanation.sourceIds = [id(27)];
    fails(() => prepareDecision(reviewer, c, p), 'explanation_source');
  });
  it.each(['blank rationale', 'blank exception reason', 'invalid date', 'unreviewed explanation', 'fractional money', 'unsafe money'])(
    'rejects malformed input: %s', kind => {
      const c = recommended(), p = preparation(c);
      if (kind === 'blank rationale') p.request.rationale = ' ';
      if (kind === 'blank exception reason') p.request.exceptions = [{ policyId: 'fictional-capacity', reason: ' ' }];
      if (kind === 'invalid date') p.request.reviewDate = '2026-02-30';
      if (kind === 'unreviewed explanation') Reflect.set(p.request, 'explanationReviewed', false);
      if (kind === 'fractional money') c.offers[0].principalCentavos = 100.5;
      if (kind === 'unsafe money') c.offers[0].principalCentavos = Number.MAX_SAFE_INTEGER + 1;
      expect(() => prepareDecision(reviewer, c, p)).toThrow(ZodError);
    });
  it('rejects a next review date before the assessed horizon end', () => {
    const c = recommended(), p = preparation(c); p.request.reviewDate = '2026-11-29';
    fails(() => prepareDecision(reviewer, c, p), 'review_date');
  });
});

describe('explicit policy exception authority', () => {
  function failed(overridable = true, authorized = true) {
    return recommended(c => {
      assessment(c).scenarios[0].policyChecks[0] = { policyId: 'fictional-capacity', passed: false, detail: 'Supplied fictional shortfall concern', overridable };
      if (authorized) policy(c).grants[0].exceptionPolicyIds = ['fictional-capacity'];
    });
  }
  it('preserves the failed check and the authorized reason without changing checked figures', () => {
    const c = failed(), p = preparation(c); p.request.exceptions = [{ policyId: 'fictional-capacity', reason: 'Explicit fictional exception rationale.' }];
    const d = prepareDecision(reviewer, c, p);
    expect(d.snapshot.basis.assessment).toEqual(c.assessment); expect(d.snapshot.input.exceptions).toEqual(p.request.exceptions);
  });
  it('does not allow a reason to override a non-overridable check', () => {
    const c = failed(false), p = preparation(c); p.request.exceptions = [{ policyId: 'fictional-capacity', reason: 'Still prohibited.' }];
    fails(() => prepareDecision(reviewer, c, p), 'non_overridable_check');
  });
  it('requires individual exception authority and a reason for each failing check', () => {
    const c = failed(true, false), p = preparation(c); p.request.exceptions = [{ policyId: 'fictional-capacity', reason: 'Not authorized.' }];
    fails(() => prepareDecision(reviewer, c, p), 'exception_forbidden');
    const allowed = failed(); fails(() => prepareDecision(reviewer, allowed, preparation(allowed)), 'exception_required');
  });
  it('rejects irrelevant and duplicate exceptions and exceptions on a clarification', () => {
    const c = failed(), p = preparation(c); p.request.exceptions = [{ policyId: 'unrelated', reason: 'Unrelated.' }];
    fails(() => prepareDecision(reviewer, c, p), 'irrelevant_exception');
    p.request.exceptions = [{ policyId: 'fictional-capacity', reason: 'One.' }, { policyId: 'fictional-capacity', reason: 'Two.' }];
    fails(() => prepareDecision(reviewer, c, p), 'duplicate_exception');
    const returned = preparation(c, 'return'); returned.request.exceptions = [p.request.exceptions[0]];
    fails(() => prepareDecision(reviewer, c, returned), 'clarification_terms');
  });
  it('requires a separate authorized exception reason for each failed check', () => {
    const c = failed(); assessment(c).scenarios[0].policyChecks.push({ policyId: 'fictional-timing', passed: false, detail: 'A second explicit supplied concern', overridable: true });
    policy(c).grants[0].exceptionPolicyIds.push('fictional-timing');
    // Reprepare against the changed basis rather than bypassing freshness.
    c.application.status = 'assessment_ready';
    const r = prepareRecommendation(officer, c, { id: id(17), at, expectedVersion: c.application.version,
      request: { assessmentId: id(10), offerVersionId: id(12), inputVersion: 1, reason: 'Reviewed both supplied concerns.' } });
    c.recommendation = { ...r }; c.application.status = 'recommended';
    const p = preparation(c); p.request.exceptions = [{ policyId: 'fictional-capacity', reason: 'Only the first concern addressed.' }];
    fails(() => prepareDecision(reviewer, c, p), 'exception_required');
    p.request.exceptions.push({ policyId: 'fictional-timing', reason: 'Second concern explicitly addressed.' });
    expect(prepareDecision(reviewer, c, p).snapshot.input.exceptions).toHaveLength(2);
  });
});

describe('saved basis, material changes and reference integrity', () => {
  it('deeply detaches/freezes the saved basis and preserves historical content when callers change inputs', () => {
    const { c, p, d } = recorded(), before = JSON.stringify(d);
    c.sources[0].excerpt = 'Later correction'; c.offers[0].payments[0].amountCentavos = 1;
    c.facts[0].value = { availability: 'unavailable', reason: 'Later unknown' }; p.request.rationale = 'Later text';
    expect(JSON.stringify(d)).toBe(before); expect(Object.isFrozen(d.snapshot.basis.offers[0].payments)).toBe(true);
    expect(Reflect.set(d.snapshot.basis.sources[0], 'verification', 'supported')).toBe(false);
  });
  it('retains recommendation validity across assignment/concurrency-only changes, without allowing the new preparer to self-review', () => {
    const c = recommended(); c.application.assignedOfficerId = id(28); c.application.version += 1; c.application.updatedAt = '2026-11-01T00:01:00Z';
    expect(prepareDecision(reviewer, c, preparation(c)).snapshot.input.outcome).toBe('approve');
  });
  it.each(['source text', 'source version', 'verification', 'accepted amount', 'policy', 'offer terms', 'horizon', 'input version'])(
    'requires renewed review for changed %s and preserves released contracts', change => {
      const { c, d } = recorded();
      if (change === 'source text') c.sources[0].excerpt = 'Different exact excerpt';
      if (change === 'source version') { c.sources[0].sourceVersion += 1; c.facts[0].sourceVersion = 2; }
      if (change === 'verification') c.sources[0].verification = 'supported';
      if (change === 'accepted amount') c.facts[0].value = { availability: 'recorded', amountCentavos: 1 };
      if (change === 'policy') c.currentAssessmentPolicyVersionId = id(29);
      if (change === 'offer terms') c.offers[0].payments[0].amountCentavos += 1;
      if (change === 'horizon') c.periodEnd = '2026-12-01';
      if (change === 'input version') c.application.assessmentInputVersion += 1;
      expect(reviewChangeEffect(d, c, 'unreleased')).toMatchObject({ changed: true, holdUnreleasedLoan: true, action: 'renew_review', preserveSnapshot: true });
      expect(reviewChangeEffect(d, c, 'released')).toMatchObject({ changed: true, holdUnreleasedLoan: false, action: 'preserve_contract_and_refer', preserveSnapshot: true });
    });
  it('treats explicit unknown as different from a recorded zero', () => {
    const c = base(), original = reviewBasisHash(c); c.facts[0].value = { availability: 'recorded', amountCentavos: 0 };
    const zero = reviewBasisHash(c); c.facts[0].value = { availability: 'unavailable', reason: 'Not supplied' };
    expect(zero).not.toBe(original); expect(reviewBasisHash(c)).not.toBe(zero);
  });
  it.each(['source scope', 'source version', 'assessment scope', 'duplicate source', 'duplicate conflict', 'duplicate grant', 'duplicate policy check'])(
    'rejects invalid %s', kind => {
      const c = recommended();
      if (kind === 'source scope') c.sources[0].applicationId = id(30);
      if (kind === 'source version') c.facts[0].sourceVersion = 2;
      if (kind === 'assessment scope') assessment(c).applicationId = id(30);
      if (kind === 'duplicate source') c.sources.push({ ...c.sources[0] });
      if (kind === 'duplicate conflict') c.conflicts.push({ ...c.conflicts[0] });
      if (kind === 'duplicate grant') policy(c).grants.push({ ...policy(c).grants[0] });
      if (kind === 'duplicate policy check') assessment(c).scenarios[0].policyChecks.push({ ...assessment(c).scenarios[0].policyChecks[0] });
      expect(() => reviewBasisHash(c)).toThrow(DecisionRuleError);
    });
  it('detects changed saved snapshot content instead of accepting a stale checksum', () => {
    const { c, d } = recorded(), changed = DecisionCandidateSchema.parse(d);
    changed.snapshot.input.rationale = 'Altered after recording';
    fails(() => reviewChangeEffect(changed, c, 'unreleased'), 'snapshot_changed');
  });
  it('does not assume an unknown loan stage is already released', () => {
    const { c, d } = recorded();
    expect(() => reviewChangeEffect(d, c, 'unknown' as 'released')).toThrow(ZodError);
  });
  it('holds an unreleased loan when the recommendation or a participant conflict clearance changes after approval', () => {
    const first = recorded(); first.c.recommendation!.reason = 'A changed recommendation needs renewed review.';
    expect(reviewChangeEffect(first.d, first.c, 'unreleased').holdUnreleasedLoan).toBe(true);
    const second = recorded(); second.c.conflicts[0].status = 'restricted';
    expect(reviewChangeEffect(second.d, second.c, 'unreleased').holdUnreleasedLoan).toBe(true);
    fails(() => prepareMemberAcceptance(member, second.c, second.d, acceptancePreparation(second.c)), 'renewed_review_required');
  });
});

describe('exact-version member acceptance', () => {
  it('accepts the matching published terms without authorizing release or changing the saved decision', () => {
    const { c, d } = recorded(), before = JSON.stringify(d);
    const result = prepareMemberAcceptance(member, c, d, acceptancePreparation(c));
    expect(result).toMatchObject({ decisionId: id(18), documentVersionId: id(19), memberId: member.memberId, acceptedOn: '2026-11-01' });
    expect(result).not.toHaveProperty('releaseAuthorized'); expect(JSON.stringify(d)).toBe(before); expect(Object.isFrozen(result)).toBe(true);
  });
  it.each(['other member', 'other organization', 'superseded decision', 'wrong document version', 'changed document bytes', 'stale application', 'before decision', 'changed source'])(
    'rejects %s', kind => {
      const { c, d } = recorded(), p = acceptancePreparation(c), a = { ...member };
      if (kind === 'other member') a.memberId = id(31);
      if (kind === 'other organization') a.organizationId = id(31);
      if (kind === 'superseded decision') p.currentDecisionId = id(31);
      if (kind === 'wrong document version') p.request.documentVersionId = id(31);
      if (kind === 'changed document bytes') p.publishedDocument.sha256 = digest('changed document bytes');
      if (kind === 'stale application') p.expectedVersion -= 1;
      if (kind === 'before decision') p.at = '2026-10-31T23:59:59Z';
      if (kind === 'changed source') c.sources[0].verification = 'supported';
      expect(() => prepareMemberAcceptance(a, c, d, p)).toThrow(DecisionRuleError);
    });
  it('uses inclusive Asia/Manila expiry rather than the UTC day', () => {
    const { c, d } = recorded(), p = acceptancePreparation(c);
    p.at = '2026-11-30T15:59:59Z'; expect(prepareMemberAcceptance(member, c, d, p).acceptedOn).toBe('2026-11-30');
    p.at = '2026-11-30T16:00:00Z'; fails(() => prepareMemberAcceptance(member, c, d, p), 'approval_expired');
  });
  it('normalizes recording instants to UTC while retaining the Manila acceptance date', () => {
    const { c, d } = recorded(), p = acceptancePreparation(c); p.at = '2026-11-02T00:30:00+08:00';
    expect(prepareMemberAcceptance(member, c, d, p)).toMatchObject({ acceptedAt: '2026-11-01T16:30:00.000Z', acceptedOn: '2026-11-02' });
  });
  it('distinguishes an explicitly configured no-expiry policy from an unavailable policy', () => {
    const { c, d } = recorded(c => { policy(c).approvalValidity = { kind: 'no_expiry' }; });
    const p = acceptancePreparation(c); p.at = '2027-01-01T00:00:00Z';
    expect(prepareMemberAcceptance(member, c, d, p).acceptedOn).toBe('2027-01-01');
  });
  it.each(['decline', 'return'] as const)('cannot accept a %s decision', outcome => {
    const c = recommended(), d = prepareDecision(reviewer, c, preparation(c, outcome));
    c.application.status = 'decision_recorded'; c.application.version += 1;
    fails(() => prepareMemberAcceptance(member, c, d, acceptancePreparation(c)), 'not_approved');
  });
  it('rejects staff impersonation and an unchecked member acknowledgment', () => {
    const { c, d } = recorded(), p = acceptancePreparation(c);
    expect(() => prepareMemberAcceptance(reviewer as unknown as MemberActorContext, c, d, p)).toThrow(ZodError);
    Reflect.set(p.request, 'acknowledgment', false);
    expect(() => prepareMemberAcceptance(member, c, d, p)).toThrow(ZodError);
  });
});
