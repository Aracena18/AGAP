import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { ApplicationSchema } from '../../../../../packages/contracts/src/schemas.js';
import { owner, runtimePool, uow, resetFixtures, prepareDatabase, closePools } from '../../../test/database.js';
import { memberFixture } from '../../../test/member-fixtures.js';
import { PostgresMemberUnitOfWork } from '../../platform/member-database.js';
import { migrationDirectories } from '../../platform/migrate.js';
import { fictionalBasis, fictionalPorts } from './backend.test-fixture.js';
import { DecisionsService } from './decisions.service.js';
import { DecisionStaffReads } from './staff-read.service.js';
let fixture: Awaited<ReturnType<typeof resetFixtures>>, member: Awaited<ReturnType<typeof memberFixture>>, reviewer: ActorContext;
let app: string, basis: ReturnType<typeof fictionalBasis>, reads: DecisionStaffReads, decisions: DecisionsService;
const key = () => randomUUID();
async function version() { return Number((await owner.query('SELECT version FROM applications.applications WHERE id=$1', [app])).rows[0].version); }
async function approve() {
  const recommendation = await decisions.recommend(fixture.officer.actor, app, { assessmentId: basis.assessment!.id, inputVersion: 1, offerVersionId: basis.offers[0].id, reason: 'Fictional officer reason.' }, await version(), key());
  const body = { outcome: 'approve' as const, assessmentId: basis.assessment!.id, recommendationId: recommendation.id, offerVersionId: basis.offers[0].id,
    rationale: 'Reviewed member-facing reason.', departureReason: '', exceptions: [], reviewDate: '2026-12-01' };
  const v = await version(), preview = await decisions.preview(reviewer, app, body, v, key());
  return decisions.record(reviewer, app, { ...body, explanationReviewed: true }, v, key(), preview.id);
}
beforeAll(async () => {
  const dir = 'apps/api/src/modules/decisions/migrations'; migrationDirectories.push(dir);
  try { await prepareDatabase(); } finally { migrationDirectories.splice(migrationDirectories.indexOf(dir), 1); }
  await owner.query(`CREATE TABLE IF NOT EXISTS decisions.test_basis(organization_id uuid NOT NULL REFERENCES platform.organizations(id),application_id uuid PRIMARY KEY,body jsonb NOT NULL);
    ALTER TABLE decisions.test_basis ENABLE ROW LEVEL SECURITY; ALTER TABLE decisions.test_basis FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS fixture_scope ON decisions.test_basis;
    CREATE POLICY fixture_scope ON decisions.test_basis USING(organization_id=platform.current_organization());
    GRANT SELECT,UPDATE ON decisions.test_basis TO agap_runtime;`);
});
beforeEach(async () => {
  fixture = await resetFixtures(); member = await memberFixture(fixture.officer.actor);
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['reviewer'] WHERE id=$1", [fixture.revocationTarget.actor.userId]);
  reviewer = { ...fixture.revocationTarget.actor, roles: ['reviewer'] }; app = randomUUID(); const at = new Date().toISOString();
  const application = ApplicationSchema.parse({ id: app, organizationId: fixture.org, branchId: fixture.branch, memberId: member.record.id, memberName: member.record.fullName,
    purpose: 'Fictional staff-read case', requestedPrincipalCentavos: 1_000_000, requestedTermMonths: 1, currency: 'PHP', status: 'assessment_ready', version: 1,
    assessmentInputVersion: 1, assignedOfficerId: fixture.officer.actor.userId, createdAt: at, updatedAt: at });
  await owner.query(`INSERT INTO applications.applications(id,organization_id,branch_id,member_id,purpose,requested_principal_centavos,requested_term_months,currency,status,version,assessment_input_version,assigned_officer_id)
    VALUES($1,$2,$3,$4,$5,1000000,1,'PHP','assessment_ready',1,1,$6)`, [app, fixture.org, fixture.branch, member.record.id, application.purpose, fixture.officer.actor.userId]);
  basis = fictionalBasis(application, reviewer.userId);
  if (basis.assessment?.status === 'complete') basis.assessment.scenarios[0].policyChecks[0].detail = 'PRIVATE POLICY NOTE MUST NOT PRINT';
  await owner.query('INSERT INTO decisions.test_basis VALUES($1,$2,$3)', [fixture.org, app, JSON.stringify(basis)]);
  reads = new DecisionStaffReads(uow, fictionalPorts()); decisions = new DecisionsService(uow, fictionalPorts());
});
afterAll(closePools);
describe('Phase 3 staff reads with real runtime role and explicitly fictional producer adapters', () => {
  it('defaults unavailable without owner adapters', async () => {
    await expect(new DecisionStaffReads(uow).workspace(reviewer, app)).rejects.toMatchObject({ status: 501 });
  });
  it('reads coherent current basis without creating a stream, preview, decision or audit event', async () => {
    const before = (await owner.query('SELECT count(*) FROM platform.audit_events')).rows[0].count;
    const view = await reads.workspace(fixture.officer.actor, app);
    expect(view.offers[0].recommend).toBe(true); expect(view.offers[0].outcomes).toEqual([]);
    expect(view.application.assessmentInputVersion).toBe(1);
    expect((await owner.query('SELECT count(*) FROM decisions.streams')).rows[0].count).toBe('0');
    expect((await owner.query('SELECT count(*) FROM decisions.previews')).rows[0].count).toBe('0');
    expect((await owner.query('SELECT count(*) FROM platform.audit_events')).rows[0].count).toBe(before);
  });
  it('uses Phase 1 guards for reviewer outcomes and respects restricted conflicts', async () => {
    await decisions.recommend(fixture.officer.actor, app, { assessmentId: basis.assessment!.id, inputVersion: 1, offerVersionId: basis.offers[0].id, reason: 'Fictional reason.' }, 1, key());
    expect((await reads.workspace(reviewer, app)).offers[0].outcomes).toEqual(['approve', 'decline']);
    basis.conflicts.find(c => c.userId === reviewer.userId)!.status = 'restricted';
    await owner.query('UPDATE decisions.test_basis SET body=$2 WHERE application_id=$1', [app, JSON.stringify(basis)]);
    const held = await reads.workspace(reviewer, app);
    expect(held.canReturn).toBe(false); expect(held.offers[0].outcomes).toEqual([]); expect(held.blockedReason).toBeTruthy();
    expect((await owner.query('SELECT count(*) FROM decisions.records')).rows[0].count).toBe('0');
  });
  it('keeps clarification available on incomplete evidence without inventing figures', async () => {
    basis.assessment = null; basis.sources = []; basis.facts = [];
    await owner.query('UPDATE decisions.test_basis SET body=$2 WHERE application_id=$1', [app, JSON.stringify(basis)]);
    const view = await reads.workspace(reviewer, app);
    expect(view.canReturn).toBe(true); expect(view.assessment).toBeNull(); expect(view.offers[0].checked).toBeNull(); expect(view.offers[0].outcomes).toEqual([]);
  });
  it('returns a safe immutable historical brief distinct from raw staff snapshot and current facts', async () => {
    const d = await approve(), brief = await reads.brief(reviewer, app, d.id);
    expect(brief.explanation).toContain('Reviewed member-facing reason.'); expect(brief.considered!.checked.totalRepaymentCentavos).toBe(1_000_000);
    const text = JSON.stringify(brief);
    expect(text).not.toContain('PRIVATE POLICY NOTE'); expect(text).not.toContain('fictional-reviewer-declaration'); expect(text).not.toContain('Fictional statement');
    expect(text).not.toContain('approvalLimitCentavos'); expect(brief.sources[0].effectiveDates).toEqual(['2026-11-01']);
    basis.offers[0].principalCentavos = 1;
    await owner.query('UPDATE decisions.test_basis SET body=$2 WHERE application_id=$1', [app, JSON.stringify(basis)]);
    expect(await reads.brief(reviewer, app, d.id)).toEqual(brief);
  });
  it('paginates scoped history by stable saved identity and rejects unrelated cursor/selection', async () => {
    const first = await approve();
    // Test-only producer recovery; no production reopen command is implied.
    await owner.query("UPDATE applications.applications SET status='assessment_ready',version=version+1 WHERE id=$1", [app]);
    const second = await approve();
    const page = await reads.history(reviewer, app, { limit: 1 });
    expect(page.items.map(i => i.id)).toEqual([second.id]); expect(page.nextCursor).toBe(second.id);
    const next = await reads.history(reviewer, app, { limit: 1, cursor: page.nextCursor });
    expect(next.items.map(i => i.id)).toEqual([first.id]); expect(next.nextCursor).toBeNull();
    await expect(reads.history(reviewer, app, { cursor: randomUUID() })).rejects.toMatchObject({ status: 404 });
    await expect(reads.brief(reviewer, app, randomUUID())).rejects.toMatchObject({ status: 404 });
    await expect(reads.history(reviewer, app, { limit: 51 })).rejects.toMatchObject({ status: 422 });
  });
  it('permits scoped auditor history/brief and exact staff terms without member impersonation', async () => {
    const d = await approve(), doc = await reads.document(fixture.auditor.actor, app, d.id);
    expect(doc.bytes.toString()).toContain('Reviewed member-facing reason.');
    expect((await reads.brief(fixture.auditor.actor, app, d.id)).document?.sha256).toBe(doc.sha256);
    expect((await reads.history(fixture.auditor.actor, app)).items[0].accepted).toBe(false);
    const b = await reads.brief(reviewer, app, d.id);
    const muow = new PostgresMemberUnitOfWork(runtimePool);
    await muow.run(member.actor, tx => decisions.memberAccept(tx, app, { decisionId: d.id, documentVersionId: b.document!.id, acknowledgment: true }, 3, key()));
    expect((await reads.history(fixture.auditor.actor, app)).items[0].accepted).toBe(true);
  });
  it('denies cross-organization reads, role-only administration and revoked actors', async () => {
    const d = await approve();
    await expect(reads.history(fixture.other.actor, app)).rejects.toMatchObject({ status: 404 });
    await expect(reads.document(fixture.other.actor, app, d.id)).rejects.toMatchObject({ status: 404 });
    await expect(reads.brief(fixture.administrator.actor, app, d.id)).rejects.toMatchObject({ status: 403 });
    await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1', [reviewer.userId]);
    await expect(reads.brief(reviewer, app, d.id)).rejects.toMatchObject({ status: 401 });
  });
  it('reads current pointers with a non-superuser definer under runtime RLS', async () => {
    await approve();
    await owner.query("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='agap_decisions_read_owner') THEN CREATE ROLE agap_decisions_read_owner NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$; GRANT USAGE ON SCHEMA decisions,platform TO agap_decisions_read_owner; GRANT SELECT ON decisions.streams TO agap_decisions_read_owner; GRANT EXECUTE ON FUNCTION decisions.staff_role(text),platform.current_organization(),platform.current_member(),platform.allowed_branch(uuid) TO agap_decisions_read_owner; ALTER FUNCTION decisions.staff_current(uuid) OWNER TO agap_decisions_read_owner;");
    try { expect((await reads.workspace(reviewer, app)).currentDecisionId).toBeTruthy(); }
    finally { await owner.query('ALTER FUNCTION decisions.staff_current(uuid) OWNER TO agap_owner'); }
  });
  it('keeps bounded current-pointer reads inaccessible in member context', async () => {
    await approve(); const muow = new PostgresMemberUnitOfWork(runtimePool);
    await expect(muow.run(member.actor, tx => tx.query('SELECT decisions.staff_current($1)', [app]))).rejects.toMatchObject({ code: 'AG403' });
  });
  it('labels stale assessments and withholds their figures from current readiness', async () => {
    await owner.query('UPDATE applications.applications SET assessment_input_version=2,version=version+1 WHERE id=$1', [app]);
    const view = await reads.workspace(reviewer, app);
    expect(view.assessment?.state).toBe('stale'); expect(view.offers[0].checked).toBeNull(); expect(view.offers[0].outcomes).toEqual([]); expect(view.canReturn).toBe(true);
  });
});
