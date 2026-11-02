import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { ApplicationSchema } from '../../../../../packages/contracts/src/schemas.js';
import { owner, runtimePool, uow, resetFixtures, prepareDatabase, closePools } from '../../../test/database.js';
import { memberFixture } from '../../../test/member-fixtures.js';
import { PostgresMemberUnitOfWork } from '../../platform/member-database.js';
import { migrationDirectories } from '../../platform/migrate.js';
import { DecisionsService } from './decisions.service.js';
import { fictionalBasis, fictionalPorts } from './backend.test-fixture.js';
import type { ReviewContext } from './context.js';

const muow = new PostgresMemberUnitOfWork(runtimePool);
let fixture: Awaited<ReturnType<typeof resetFixtures>>, member: Awaited<ReturnType<typeof memberFixture>>;
let reviewer: ActorContext, basis: ReviewContext, app: string, service: DecisionsService;
const key = () => randomUUID();
function gate() { let release!: () => void; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
async function waitForLock(pid: number) {
  for (let i = 0; i < 100; i++) {
    if ((await owner.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [pid])).rows[0]?.wait_event_type === 'Lock') return;
    await delay(10);
  }
  throw new Error('Expected competing database operation to wait on the guard lock.');
}
async function version() { return Number((await owner.query('SELECT version FROM applications.applications WHERE id=$1', [app])).rows[0].version); }
async function count(table: string) { return Number((await owner.query(`SELECT count(*) FROM ${table}`)).rows[0].count); }
async function recommend(s = service) {
  const a = basis.assessment!;
  return s.recommend(fixture.officer.actor, app, { assessmentId: a.id, offerVersionId: basis.offers[0].id, inputVersion: a.inputVersion, reason: 'Reviewed fictional checked offer.' }, await version(), key());
}
function request(outcome: 'approve' | 'decline' | 'return' = 'approve') {
  return { outcome, assessmentId: outcome === 'return' ? null : basis.assessment!.id, recommendationId: null as string | null,
    offerVersionId: outcome === 'return' ? null : basis.offers[0].id, rationale: 'Recorded fictional human reason.',
    departureReason: outcome === 'approve' ? '' : 'Human reason for departing from recommendation.', exceptions: [], reviewDate: '2026-12-01' };
}
async function approved(s = service) {
  const r = await recommend(s), data = { ...request(), recommendationId: r.id }, v = await version();
  const preview = await s.preview(reviewer, app, data, v, key());
  const input = { ...data, explanationReviewed: true as const }, commandKey = key();
  const d = await s.record(reviewer, app, input, v, commandKey, preview.id);
  const m = await muow.run(member.actor, tx => s.memberDecision(tx, app));
  if (m.state !== 'available' || !m.data?.documentVersionId) throw new Error('Test expects published terms');
  return { d, preview, data, input, v, commandKey, documentId: m.data.documentVersionId };
}
async function changeBasis(change: (c: ReviewContext) => void) {
  const c = structuredClone(basis); change(c); basis = c;
  await owner.query('UPDATE decisions.test_basis SET body=$2 WHERE application_id=$1', [app, JSON.stringify(c)]);
}
beforeAll(async () => {
  const dir = 'apps/api/src/modules/decisions/migrations'; migrationDirectories.push(dir);
  try { await prepareDatabase(); } finally { migrationDirectories.splice(migrationDirectories.indexOf(dir), 1); }
  // Test-only upstream producer data. No such source/cache is registered in runtime.
  await owner.query(`CREATE TABLE IF NOT EXISTS decisions.test_basis(organization_id uuid NOT NULL REFERENCES platform.organizations(id),application_id uuid PRIMARY KEY,body jsonb NOT NULL);
    ALTER TABLE decisions.test_basis ENABLE ROW LEVEL SECURITY; ALTER TABLE decisions.test_basis FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS fixture_scope ON decisions.test_basis;
    CREATE POLICY fixture_scope ON decisions.test_basis USING(organization_id=platform.current_organization());
    GRANT SELECT,UPDATE ON decisions.test_basis TO agap_runtime;`);
});
beforeEach(async () => {
  fixture = await resetFixtures(); member = await memberFixture(fixture.officer.actor);
  await owner.query("UPDATE identity.staff_users SET roles=ARRAY['reviewer'] WHERE id=$1", [fixture.revocationTarget.actor.userId]);
  reviewer = { ...fixture.revocationTarget.actor, roles: ['reviewer'] }; app = randomUUID();
  const at = new Date().toISOString();
  const application = ApplicationSchema.parse({ id: app, organizationId: fixture.org, branchId: fixture.branch, memberId: member.record.id,
    memberName: member.record.fullName, purpose: 'Fictional integration purchase', requestedPrincipalCentavos: 1_000_000, requestedTermMonths: 1,
    currency: 'PHP', version: 1, assessmentInputVersion: 1, assignedOfficerId: fixture.officer.actor.userId, status: 'assessment_ready', createdAt: at, updatedAt: at });
  await owner.query(`INSERT INTO applications.applications(id,organization_id,branch_id,member_id,purpose,requested_principal_centavos,requested_term_months,currency,status,version,assessment_input_version,assigned_officer_id)
    VALUES($1,$2,$3,$4,$5,1000000,1,'PHP','assessment_ready',1,1,$6)`, [app, fixture.org, fixture.branch, member.record.id, application.purpose, fixture.officer.actor.userId]);
  basis = fictionalBasis(application, reviewer.userId);
  await owner.query('INSERT INTO decisions.test_basis VALUES($1,$2,$3)', [fixture.org, app, JSON.stringify(basis)]);
  service = new DecisionsService(uow, fictionalPorts());
});
afterAll(closePools);

describe('Phase 2 real persistence with explicitly fictional owner adapters', () => {
  it('fails closed without upstream adapters and never enables shared operations', async () => {
    const s = new DecisionsService(uow);
    await expect(recommend(s)).rejects.toMatchObject({ status: 501, code: 'module_not_available' });
    expect(await count('decisions.recommendations')).toBe(0);
  });
  it('records a recommendation, exact reviewer preview/decision and private document atomically', async () => {
    const a = await approved();
    expect(await count('decisions.records')).toBe(1); expect(await count('decisions.documents')).toBe(1);
    expect(await count('platform.audit_events')).toBe(4); // member creation plus recommendation/preview/decision
    const saved = await service.saved(reviewer, app, a.d.id);
    expect(saved.snapshotHash).toBe(a.d.snapshotHash); expect(saved.snapshot.basis.sources[0].verification).toBe('unavailable');
    const doc = await muow.run(member.actor, tx => service.memberDocument(tx, app, a.documentId));
    expect(doc.bytes.toString('utf8')).toBe(a.preview.terms); expect(doc.bytes.toString()).not.toContain('fictional-reviewer-declaration');
    expect(doc.bytes.toString()).toContain('\nMember: '); expect(doc.bytes.toString()).not.toContain('\\n');
    const view = await muow.run(member.actor, tx => service.memberDecision(tx, app));
    expect(JSON.stringify(view)).not.toContain('Fictional checked fixture');
    expect(saved.snapshot.basis.assessment).toMatchObject({ scenarios: [{ policyChecks: [{ detail: 'Fictional checked fixture' }] }] });
  });
  it('replays concurrent recommendations and rejects changed key content', async () => {
    const data = { assessmentId: basis.assessment!.id, offerVersionId: basis.offers[0].id, inputVersion: 1, reason: 'Fictional checked offer.' }, k = key();
    const results = await Promise.all(Array.from({ length: 4 }, () => service.recommend(fixture.officer.actor, app, data, 1, k)));
    expect(new Set(results.map(x => x.id)).size).toBe(1); expect(await count('decisions.recommendations')).toBe(1);
    await expect(service.recommend(fixture.officer.actor, app, { ...data, reason: 'Different' }, 1, k)).rejects.toMatchObject({ code: 'idempotency_conflict' });
  });
  it('replays a committed decision before stale-version/preview-expiry checks but still rechecks revoked identity', async () => {
    const a = await approved();
    const late = new DecisionsService(uow, fictionalPorts(), undefined, () => new Date(Date.now() + 3600_000));
    expect(await late.record(reviewer, app, a.input, a.v, a.commandKey, a.preview.id)).toEqual(a.d);
    expect(await count('decisions.records')).toBe(1);
    await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1', [reviewer.userId]);
    await expect(late.record(reviewer, app, a.input, a.v, a.commandKey, a.preview.id)).rejects.toMatchObject({ code: 'access_changed' });
  });
  it.each(['request', 'basis', 'expiry'])('rejects a changed %s after preview', async kind => {
    const r = await recommend(), data = { ...request(), recommendationId: r.id }, v = await version();
    const p = await service.preview(reviewer, app, data, v, key());
    if (kind === 'basis') await changeBasis(c => { c.sources[0].excerpt = 'A changed exact source statement.'; });
    const s = kind === 'expiry' ? new DecisionsService(uow, fictionalPorts(), undefined, () => new Date(Date.now() + 3600_000)) : service;
    await expect(s.record(reviewer, app, { ...data, rationale: kind === 'request' ? 'Different reason' : data.rationale, explanationReviewed: true }, v, key(), p.id)).rejects.toMatchObject({ code: 'review_preview_changed' });
    expect(await count('decisions.records')).toBe(0); expect(await count('decisions.documents')).toBe(0);
  });
  it('rolls back decision, document, pointer, audit and command claim after an owner-transition failure', async () => {
    const r = await recommend(), data = { ...request(), recommendationId: r.id }, v = await version();
    const p = await service.preview(reviewer, app, data, v, key()), before = await count('platform.idempotency');
    const broken = new DecisionsService(uow, fictionalPorts({ failTransition: true }));
    await expect(broken.record(reviewer, app, { ...data, explanationReviewed: true }, v, key(), p.id)).rejects.toMatchObject({ code: 'decision_backend_unavailable' });
    expect(await count('decisions.records')).toBe(0); expect(await count('decisions.documents')).toBe(0);
    expect(await count('platform.idempotency')).toBe(before); expect(await version()).toBe(v);
  });
  it('rejects self-review, auditor writes and scoped cross-organization reads', async () => {
    const r = await recommend(), data = { ...request(), recommendationId: r.id };
    await expect(service.preview({ ...fixture.officer.actor, roles: ['officer', 'reviewer'] }, app, data, await version(), key())).rejects.toMatchObject({ code: 'access_changed' });
    await expect(service.preview(fixture.auditor.actor, app, data, await version(), key())).rejects.toMatchObject({ status: 403 });
    const a = await approved();
    await expect(service.saved(fixture.other.actor, app, a.d.id)).rejects.toMatchObject({ status: 404 });
  });
  it('records authorized incomplete-data clarification without document or numeric decision terms', async () => {
    await changeBasis(c => { c.assessment = null; c.facts = []; c.sources = []; });
    await owner.query("UPDATE applications.applications SET status='evidence_review' WHERE id=$1", [app]);
    const data = request('return'), p = await service.preview(reviewer, app, data, 1, key());
    const d = await service.record(reviewer, app, { ...data, explanationReviewed: true }, 1, key(), p.id);
    expect(d.outcome).toBe('return'); expect(await count('decisions.documents')).toBe(0);
  });
  it('acknowledges own exact terms once and replays an identical receipt after later input changes', async () => {
    const a = await approved(), data = { decisionId: a.d.id, documentVersionId: a.documentId, acknowledgment: true }, v = await version(), k = key();
    const send = () => muow.run(member.actor, tx => service.memberAccept(tx, app, data, v, k));
    const receipts = await Promise.all([send(), send()]); expect(receipts[0]).toEqual(receipts[1]);
    expect(await count('decisions.acceptances')).toBe(1); expect(await count('portal.events')).toBe(1);
    await owner.query('UPDATE applications.applications SET assessment_input_version=assessment_input_version+1,version=version+1 WHERE id=$1', [app]);
    expect(await send()).toEqual(receipts[0]);
    await expect(muow.run(member.actor, tx => service.memberAccept(tx, app, data, v, key()))).rejects.toMatchObject({ code: 'stale_version' });
  });
  it('rolls back a member acknowledgment and portal command/event together', async () => {
    const a = await approved(), v = await version(), broken = new DecisionsService(uow, fictionalPorts({ failTransition: true }));
    await expect(muow.run(member.actor, tx => broken.memberAccept(tx, app, { decisionId: a.d.id, documentVersionId: a.documentId, acknowledgment: true }, v, key()))).rejects.toMatchObject({ status: 503 });
    expect(await count('decisions.acceptances')).toBe(0); expect(await count('portal.events')).toBe(0); expect(await count('portal.commands')).toBe(0);
  });
  it.each(['document', 'basis', 'conflict', 'version'])('rejects a new member acknowledgment with changed %s', async kind => {
    const a = await approved(), v = await version();
    if (kind === 'basis') await changeBasis(c => { c.sources[0].verification = 'supported'; });
    if (kind === 'conflict') await changeBasis(c => { c.conflicts[0].status = 'restricted'; });
    await expect(muow.run(member.actor, tx => service.memberAccept(tx, app, { decisionId: a.d.id,
      documentVersionId: kind === 'document' ? randomUUID() : a.documentId, acknowledgment: true }, kind === 'version' ? v - 1 : v, key()))).rejects.toMatchObject({ status: kind === 'version' ? 412 : 409 });
    expect(await count('decisions.acceptances')).toBe(0);
  });
  it('does not display stale approved terms as currently ready, while retaining exact historical document access', async () => {
    const a = await approved(); await changeBasis(c => { c.sources[0].verification = 'supported'; });
    expect(await muow.run(member.actor, tx => service.memberDecision(tx, app))).toMatchObject({ state: 'unavailable' });
    expect((await muow.run(member.actor, tx => service.memberDocument(tx, app, a.documentId))).bytes.toString()).toBe(a.preview.terms);
  });
  it('blocks a new acknowledgment when the application has been returned to review without changing financial input version', async () => {
    const a = await approved(); await owner.query("UPDATE applications.applications SET status='clarification',version=version+1 WHERE id=$1", [app]);
    const v = await version();
    await expect(muow.run(member.actor, tx => service.memberAccept(tx, app, { decisionId: a.d.id, documentVersionId: a.documentId, acknowledgment: true }, v, key()))).rejects.toMatchObject({ code: 'decision_review_required' });
    expect(await muow.run(member.actor, tx => service.memberDecision(tx, app))).toMatchObject({ state: 'unavailable' });
  });
  it('keeps approval valid through its configured Manila expiry day', async () => {
    const today = (await owner.query("SELECT (clock_timestamp() AT TIME ZONE 'Asia/Manila')::date::text AS day")).rows[0].day as string;
    await changeBasis(c => { if (c.authority.status === 'configured') c.authority.approvalValidity = { kind: 'until', date: today }; });
    const a = await approved(), v = await version();
    await muow.run(member.actor, tx => service.memberAccept(tx, app, { decisionId: a.d.id, documentVersionId: a.documentId, acknowledgment: true }, v, key()));
    expect(await count('decisions.acceptances')).toBe(1);
  });
  it('withholds expired terms from new acceptance while retaining their historical document', async () => {
    const yesterday = (await owner.query("SELECT ((clock_timestamp() AT TIME ZONE 'Asia/Manila')::date-1)::text AS day")).rows[0].day as string;
    const at = new Date(`${yesterday}T12:00:00+08:00`);
    await changeBasis(c => {
      if (c.authority.status === 'configured') c.authority.approvalValidity = { kind: 'until', date: yesterday };
      c.assessment!.createdAt = new Date(at.getTime() - 1000).toISOString();
    });
    const historical = new DecisionsService(uow, fictionalPorts(), undefined, () => at);
    const r = await recommend(historical), data = { ...request(), recommendationId: r.id }, v = await version();
    const p = await historical.preview(reviewer, app, data, v, key());
    const d = await historical.record(reviewer, app, { ...data, explanationReviewed: true }, v, key(), p.id);
    const doc = (await owner.query('SELECT document_id FROM decisions.records WHERE id=$1', [d.id])).rows[0].document_id as string;
    expect(await muow.run(member.actor, tx => service.memberDecision(tx, app))).toMatchObject({ state: 'unavailable' });
    await expect(muow.run(member.actor, tx => service.memberAccept(tx, app, { decisionId: d.id, documentVersionId: doc, acknowledgment: true }, v + 1, key()))).rejects.toMatchObject({ code: 'decision_conflict' });
    expect((await muow.run(member.actor, tx => service.memberDocument(tx, app, doc))).bytes.toString()).toBe(p.terms);
    expect(await count('decisions.acceptances')).toBe(0);
  });
  it('does not expose staff snapshots/raw tables, and denies direct immutable writes', async () => {
    const a = await approved();
    await expect(muow.run(member.actor, tx => tx.query('SELECT * FROM decisions.records'))).rejects.toMatchObject({ code: '42501' });
    expect((await muow.run(member.actor, tx => tx.query('SELECT * FROM decisions.staff_records'))).rows).toHaveLength(0);
    await expect(muow.run(member.actor, tx => tx.query('INSERT INTO platform.outbox(id,organization_id,event_type,payload) VALUES($1,$2,$3,$4)', [randomUUID(), fixture.org, 'forbidden', '{}']))).rejects.toMatchObject({ code: '42501' });
    for (const table of ['decisions.records', 'decisions.documents', 'decisions.acceptances']) {
      await expect(uow.run(reviewer, tx => tx.query(`DELETE FROM ${table}`))).rejects.toMatchObject({ code: '42501' });
    }
    await expect(owner.query("UPDATE decisions.records SET snapshot_text='{}' WHERE id=$1", [a.d.id])).rejects.toMatchObject({ code: '23514' });
  });
  it('denies another member and rejects revoked linkage even for cached commands', async () => {
    const a = await approved(), other = await memberFixture(fixture.officer.actor), v = await version(), data = { decisionId: a.d.id, documentVersionId: a.documentId, acknowledgment: true }, k = key();
    await expect(muow.run(other.actor, tx => service.memberAccept(tx, app, data, v, key()))).rejects.toBeDefined();
    await muow.run(member.actor, tx => service.memberAccept(tx, app, data, v, k));
    await owner.query('UPDATE identity.member_links SET active=false WHERE id=$1', [member.linkId]);
    await expect(muow.run(member.actor, tx => service.memberAccept(tx, app, data, v, k))).rejects.toMatchObject({ code: 'access_changed' });
  });
  it('rejects actual multi-role self-review after real identity membership is updated', async () => {
    const r = await recommend();
    await owner.query("UPDATE identity.staff_users SET roles=ARRAY['officer','reviewer'] WHERE id=$1", [fixture.officer.actor.userId]);
    const dual: ActorContext = { ...fixture.officer.actor, roles: ['officer', 'reviewer'] };
    await expect(service.preview(dual, app, { ...request(), recommendationId: r.id }, await version(), key())).rejects.toMatchObject({ code: 'self_approval' });
    expect(await count('decisions.records')).toBe(0);
  });
  it('enforces permanent acceptance uniqueness even with a fresh transport key and current version', async () => {
    const a = await approved(), data = { decisionId: a.d.id, documentVersionId: a.documentId, acknowledgment: true };
    const v = await version(); await muow.run(member.actor, tx => service.memberAccept(tx, app, data, v, key()));
    const current = await version();
    await expect(muow.run(member.actor, tx => service.memberAccept(tx, app, data, current, key()))).rejects.toMatchObject({ code: 'decision_conflict' });
    expect(await count('decisions.acceptances')).toBe(1); expect(await count('portal.events')).toBe(1);
  });
  it('rechecks a source change that obtained its guard lock before decision recording', async () => {
    const r = await recommend(), data = { ...request(), recommendationId: r.id }, v = await version(), p = await service.preview(reviewer, app, data, v, key());
    const client = await owner.connect(), started = gate(), ports = fictionalPorts(); let pid = 0;
    try {
      await client.query('BEGIN'); const changed = structuredClone(basis); changed.sources[0].excerpt = 'Concurrent fictional correction.';
      await client.query('UPDATE decisions.test_basis SET body=$2 WHERE application_id=$1', [app, JSON.stringify(changed)]);
      const guarded = new DecisionsService(uow, { ...ports, loadStaffBasis: async (tx, id) => {
        pid = Number((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0].pid); started.release(); return ports.loadStaffBasis(tx, id);
      } });
      const recording = guarded.record(reviewer, app, { ...data, explanationReviewed: true }, v, key(), p.id);
      const rejected = expect(recording).rejects.toMatchObject({ code: 'review_preview_changed' });
      await started.promise; await waitForLock(pid); await client.query('COMMIT'); await rejected;
      expect(await count('decisions.records')).toBe(0);
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
  it('holds the fictional source guard through commit and retains the original snapshot after a later correction', async () => {
    const r = await recommend(), data = { ...request(), recommendationId: r.id }, v = await version(), p = await service.preview(reviewer, app, data, v, key());
    const loaded = gate(), finish = gate(), client = await owner.connect();
    const guarded = new DecisionsService(uow, fictionalPorts({ afterLoad: async () => { loaded.release(); await finish.promise; } }));
    const recording = guarded.record(reviewer, app, { ...data, explanationReviewed: true }, v, key(), p.id);
    try {
      await loaded.promise; await client.query('BEGIN'); const pid = Number((await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
      const changed = structuredClone(basis); changed.sources[0].excerpt = 'Correction after decision guard acquired.';
      const updating = client.query('UPDATE decisions.test_basis SET body=$2 WHERE application_id=$1', [app, JSON.stringify(changed)]);
      await waitForLock(pid); finish.release(); const d = await recording; await updating; await client.query('COMMIT');
      expect((await service.saved(reviewer, app, d.id)).snapshot.basis.sources[0].excerpt).toBe(basis.sources[0].excerpt);
      expect((await service.reviewBasis(reviewer, app, d.id)).review.holdUnreleasedLoan).toBe(true);
    } finally { finish.release(); await recording.catch(() => {}); await client.query('ROLLBACK'); client.release(); }
  });
  it('works under FORCE RLS when definer/view owners are non-superusers without BYPASSRLS', async () => {
    const role = 'agap_decisions_test_owner';
    await owner.query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='agap_decisions_test_owner') THEN CREATE ROLE agap_decisions_test_owner NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
      GRANT USAGE ON SCHEMA platform,identity,applications,members TO agap_decisions_test_owner;
      GRANT SELECT ON identity.staff_users,identity.member_links TO agap_decisions_test_owner;
      GRANT EXECUTE ON FUNCTION platform.current_organization(),platform.current_member(),platform.allowed_branch(uuid) TO agap_decisions_test_owner;`);
    const transfer = async (target: string) => {
      // Test-only operator action. No owner role is loaded by runtime services.
      await owner.query(`ALTER SCHEMA decisions OWNER TO ${target}`);
      for (const row of (await owner.query("SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='decisions' AND c.relkind IN ('r','v')")).rows) {
        await owner.query(`ALTER ${row.relkind === 'v' ? 'VIEW' : 'TABLE'} decisions.${row.relname} OWNER TO ${target}`);
      }
      for (const row of (await owner.query("SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS args FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='decisions'")).rows) {
        await owner.query(`ALTER FUNCTION decisions.${row.proname}(${row.args}) OWNER TO ${target}`);
      }
    };
    try {
      await transfer(role); const a = await approved(), v = await version();
      await muow.run(member.actor, tx => service.memberAccept(tx, app, { decisionId: a.d.id, documentVersionId: a.documentId, acknowledgment: true }, v, key()));
      expect(await count('decisions.acceptances')).toBe(1);
      expect((await muow.run(member.actor, tx => service.memberDocument(tx, app, a.documentId))).bytes.toString()).toBe(a.preview.terms);
      await expect(muow.run(member.actor, tx => tx.query('SELECT * FROM decisions.records'))).rejects.toMatchObject({ code: '42501' });
    } finally { await transfer('agap_owner'); }
  });
});
