import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { owner, ownerUrl, uow, prepareDatabase, resetFixtures, closePools } from '../../../test/database.js';
import { migrationDirectories } from '../../platform/migrate.js';
import { PostgresUnitOfWork, createPool } from '../../platform/database.js';
import { canonical } from '../../platform/commands.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { ServicingService } from './servicing.service.js';
import { ServicingRepository } from './servicing.repository.js';
import { OperationContextSchema, type OperationContext } from './context.js';
import type { ServicingBackendPorts } from './backend-contracts.js';
import { fingerprint } from './command-rules.js';
import { reviewBasisHash } from '../decisions/rules.js';
import { ruleFixture, times } from './testing/fixtures.js';
import { FictionalManualDriver } from './testing/manual-simulation.js';

let f: ReturnType<typeof ruleFixture>, service: ServicingService, at: string;
let baseline: Awaited<ReturnType<typeof resetFixtures>>;
const key = () => randomUUID();
const clock = () => new Date(at);
/** Fictional producer only: the row stands in for accepted owner guards. */
const ports: ServicingBackendPorts = {
  async authorize(tx, app) {
    if (!(await tx.query('SELECT id FROM applications.applications WHERE organization_id=$1 AND id=$2', [tx.actor.organizationId, app])).rowCount) throw notFound();
  },
  async operation(tx, app) {
    const row = (await tx.query<{ body: OperationContext }>('SELECT body FROM servicing.test_context WHERE organization_id=$1 AND application_id=$2 FOR SHARE', [tx.actor.organizationId, app])).rows[0];
    if (!row) throw new ApiError(501, 'module_not_available', 'Fictional owner adapter unavailable.');
    return OperationContextSchema.parse(row.body);
  },
  async observationAuthority(tx, app) {
    const row = (await tx.query<{ body: OperationContext }>('SELECT body FROM servicing.test_context WHERE organization_id=$1 AND application_id=$2 FOR SHARE', [tx.actor.organizationId, app])).rows[0];
    if (!row) throw notFound();
    return row.body.authority;
  },
};
async function changeContext(change: (c: OperationContext) => void) {
  change(f.context);
  await owner.query('UPDATE servicing.test_context SET body=$2 WHERE application_id=$1', [f.context.basis.current.application.id, JSON.stringify(f.context)]);
}
async function seedFixture() {
  f = ruleFixture(); const a = f.context.basis.current.application;
  await owner.query('INSERT INTO platform.organizations VALUES($1,$2)', [a.organizationId, 'Fictional Phase 4 cooperative']);
  await owner.query('INSERT INTO platform.branches VALUES($1,$2,$3)', [a.branchId, a.organizationId, 'Fictional branch']);
  for (const actor of [f.cashier, f.authorizer, f.officer, f.reviewer]) {
    await owner.query('INSERT INTO identity.staff_users(id,organization_id,issuer,subject,display_name,branch_ids,roles) VALUES($1,$2,$3,$1::uuid::text,$4,$5,$6)',
      [actor.userId, actor.organizationId, 'fictional-phase4', 'Fictional staff', actor.branchIds, actor.roles]);
    await owner.query("INSERT INTO identity.sessions(id,token_hash,user_id,authenticated_at,methods,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '30 minutes')",
      [actor.sessionId, key(), actor.userId, actor.authenticatedAt, actor.authenticationMethods]);
  }
  await owner.query("INSERT INTO members.members(id,organization_id,branch_id,external_reference,full_name,notice_version) VALUES($1,$2,$3,$1::uuid::text,$4,'fictional')", [a.memberId, a.organizationId, a.branchId, a.memberName]);
  await owner.query(`INSERT INTO applications.applications(id,organization_id,branch_id,member_id,purpose,requested_principal_centavos,requested_term_months,currency,status,version,assessment_input_version,assigned_officer_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,'PHP','decision_recorded',3,1,$8)`, [a.id, a.organizationId, a.branchId, a.memberId, a.purpose, a.requestedPrincipalCentavos, a.requestedTermMonths, a.assignedOfficerId]);
  await owner.query('INSERT INTO servicing.test_context VALUES($1,$2,$3)', [a.organizationId, a.id, JSON.stringify(f.context)]);
}
async function origin() { return service.originate(f.cashier, f.context.basis.current.application.id, { method: 'cash' }, key()); }
async function prepared() {
  const loan = await origin();
  const input = { loanId: loan.id, amountCentavos: loan.offer.netReceivedCentavos, currency: 'PHP', effectiveDate: '2026-11-02', method: 'cash', instrumentReference: 'FICTIONAL-VOUCHER', reason: 'Fictional release only.' };
  return { loan, input, command: await service.prepare(f.cashier, loan.id, input, key()) };
}
async function submitted() {
  const p = await prepared(); at = times.authorize;
  await service.authorize(f.authorizer, p.command.id, 1, key()); at = times.submit;
  return service.submitIntent(f.cashier, p.command.id, 2, key());
}
async function count(table: string) { return Number((await owner.query(`SELECT count(*) FROM servicing.${table}`)).rows[0].count); }
beforeAll(async () => {
  const directories = ['apps/api/src/modules/accounting/migrations', 'apps/api/src/modules/servicing/migrations']; migrationDirectories.push(...directories);
  try { await prepareDatabase(); } finally { for (const directory of directories) migrationDirectories.splice(migrationDirectories.indexOf(directory), 1); }
  await owner.query(`CREATE TABLE IF NOT EXISTS servicing.test_context(organization_id uuid NOT NULL REFERENCES platform.organizations(id),application_id uuid PRIMARY KEY,body jsonb NOT NULL);
    ALTER TABLE servicing.test_context ENABLE ROW LEVEL SECURITY; ALTER TABLE servicing.test_context FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS fixture_scope ON servicing.test_context;
    CREATE POLICY fixture_scope ON servicing.test_context USING(organization_id=platform.current_organization());
    GRANT SELECT,UPDATE ON servicing.test_context TO agap_runtime;`);
});
beforeEach(async () => { baseline = await resetFixtures(); await seedFixture(); at = times.prepare; service = new ServicingService(uow, ports, undefined, clock); });
afterAll(closePools);

describe('Phase 4 durable simulation with real runtime-role database and fictional producers', () => {
  it('defaults unavailable without registering a producer or creating records', async () => {
    await expect(new ServicingService(uow).originate(f.cashier, f.context.basis.current.application.id, { method: 'cash' }, key())).rejects.toMatchObject({ status: 501 });
    expect(await count('originations')).toBe(0);
  });
  it('persists the original pending schedule, stable command identities and distinct authorization', async () => {
    const p = await prepared(); at = times.authorize;
    const authorized = await service.authorize(f.authorizer, p.command.id, 1, key());
    expect(authorized.authorizedBy).toBe(f.authorizer.userId);
    expect(authorized.origination.offer).toEqual(p.loan.offer);
    expect(await count('release_claims')).toBe(1); expect(await count('command_revisions')).toBe(2);
    expect(authorized.receiptId).toBeNull(); expect(authorized.journalId).toBeNull();
  });
  it('replays concurrent same-key originations and rejects a new alias/key', async () => {
    const app = f.context.basis.current.application.id, k = key();
    const [a, b] = await Promise.all([service.originate(f.cashier, app, { method: 'cash' }, k), service.originate(f.cashier, app, { method: 'cash' }, k)]);
    expect(a).toEqual(b); expect(await count('originations')).toBe(1);
    await expect(service.originate(f.cashier, app, { method: 'bank' }, key())).rejects.toMatchObject({ code: 'origination_exists' });
    await expect(service.originate(f.cashier, app, { method: 'bank' }, k)).rejects.toMatchObject({ code: 'idempotency_conflict' });
  });
  it('allows one first-release claim under competing distinct request keys', async () => {
    const loan = await origin(), input = { loanId: loan.id, amountCentavos: 1_000_000, currency: 'PHP', effectiveDate: '2026-11-02', method: 'cash', instrumentReference: 'FICTIONAL', reason: 'Fictional race' };
    const results = await Promise.allSettled([service.prepare(f.cashier, loan.id, input, key()), service.prepare(f.cashier, loan.id, input, key())]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await count('release_claims')).toBe(1); expect(await count('command_revisions')).toBe(1);
  });
  it('rolls back claim, revision, audit/outbox and idempotency when the transaction fails', async () => {
    const loan = await origin();
    const failing: UnitOfWork = { run: (actor, work) => uow.run(actor, async tx => { await work(tx); throw new Error('PRIVATE injected failure'); }) };
    const broken = new ServicingService(failing, ports, undefined, clock);
    const before = Number((await owner.query('SELECT count(*) FROM platform.idempotency')).rows[0].count);
    await expect(broken.prepare(f.cashier, loan.id, { loanId: loan.id, amountCentavos: 1_000_000, currency: 'PHP', effectiveDate: '2026-11-02', method: 'cash', instrumentReference: 'FICTIONAL', reason: 'Fictional rollback' }, key())).rejects.toMatchObject({ status: 503 });
    expect(await count('release_claims')).toBe(0); expect(await count('command_revisions')).toBe(0);
    expect(Number((await owner.query('SELECT count(*) FROM platform.idempotency')).rows[0].count)).toBe(before);
    expect(Number((await owner.query("SELECT count(*) FROM platform.audit_events WHERE event_type='servicing.release_prepared'")).rows[0].count)).toBe(0);
    expect(Number((await owner.query("SELECT count(*) FROM platform.outbox WHERE event_type='servicing.release_prepared'")).rows[0].count)).toBe(0);
  });
  it('rechecks current basis before authorization and keeps saved terms intact', async () => {
    const p = await prepared(); await changeContext(c => { c.basis.current.application.assessmentInputVersion++; }); at = times.authorize;
    await expect(service.authorize(f.authorizer, p.command.id, 1, key())).rejects.toMatchObject({ code: 'renewed_review_required' });
    expect((await service.read(f.cashier, p.command.id)).command.origination.offer).toEqual(p.loan.offer);
  });
  it('rejects actual execution and an authenticated multi-role preparer authorizing their own command', async () => {
    await changeContext(c => { if (c.execution.status === 'configured') c.execution.mode = 'actual'; });
    await expect(origin()).rejects.toMatchObject({ code: 'actual_execution_unavailable' });
    await changeContext(c => { if (c.execution.status === 'configured') c.execution.mode = 'simulation'; });
    const p = await prepared(); at = times.authorize;
    const both = { ...f.cashier, roles: ['cashier', 'financial_authorizer'] as typeof f.cashier.roles };
    await owner.query('UPDATE identity.staff_users SET roles=$2 WHERE id=$1', [both.userId, both.roles]);
    await changeContext(c => { if (c.authority.status === 'configured') c.authority.grants.find(g => g.userId === both.userId)!.actions.push('authorize'); });
    await expect(service.authorize(both, p.command.id, 1, key())).rejects.toMatchObject({ status: 403, code: 'self_authorization' });
  });
  it('commits one submission intent; identical retry survives changed prerequisites and preview age', async () => {
    const p = await prepared(); at = times.authorize; await service.authorize(f.authorizer, p.command.id, 1, key());
    at = times.submit; const k = key(), intent = await service.submitIntent(f.cashier, p.command.id, 2, k);
    await changeContext(c => { c.basis.current.application.assessmentInputVersion++; }); at = times.later;
    expect(await service.submitIntent(f.cashier, p.command.id, 2, k)).toEqual(intent);
    await expect(service.submitIntent(f.cashier, p.command.id, 3, key())).rejects.toBeInstanceOf(ApiError);
    expect(await count('command_revisions')).toBe(3);
  });
  it('preserves field, forbidden and stale-version errors without exposing SQL details', async () => {
    await expect(service.originate(f.cashier, f.context.basis.current.application.id, { method: 'provider' }, key())).rejects.toMatchObject({ status: 422, code: 'invalid_servicing_input' });
    const p = await prepared(); at = times.authorize;
    await expect(service.authorize(f.authorizer, p.command.id, 2, key())).rejects.toMatchObject({ status: 412, code: 'stale_version' });
    await expect(service.authorize(f.officer, p.command.id, 1, key())).rejects.toMatchObject({ status: 403 });
    expect(await count('command_revisions')).toBe(1);
  });
  it('persists unknown after response loss and reconstructs recovery using a new pool/service', async () => {
    const command = await submitted(); at = times.observe;
    const observation = new FictionalManualDriver().submit(command, { observationId: key(), movementId: key(), at, outcome: 'unknown' });
    await service.observe(f.cashier, command.id, observation, 3, key());
    const url = new URL(ownerUrl); url.username = 'agap_runtime'; url.password = 'development-runtime';
    const pool = createPool(url.href);
    try {
      const fresh = new ServicingService(new PostgresUnitOfWork(pool), ports, undefined, clock);
      const read = await fresh.read(f.cashier, command.id);
      expect(read.command.state).toBe('unknown'); expect(read.command.providerReference).toBeNull();
      expect(read.recovery.nextAction).toBe('operator_reconciliation_required'); expect(read.recovery.canResubmit).toBe(false);
      expect(read.command.submission).toEqual(command.submission);
    } finally { await pool.end(); }
  });
  it('retains a committed intent if the process stops before any outcome is stored', async () => {
    const intent = await submitted();
    const read = await new ServicingService(uow, ports, undefined, clock).read(f.cashier, intent.id);
    expect(read.command.state).toBe('submitted'); expect(read.command.observations).toEqual([]);
    expect(read.recovery.nextAction).toBe('operator_reconciliation_required');
    expect(read.recovery.canResubmit).toBe(false);
    await expect(service.submitIntent(f.cashier, intent.id, intent.version, key())).rejects.toMatchObject({ code: 'workflow_state' });
    expect(await count('command_revisions')).toBe(3);
  });
  it('serializes competing submitters into one durable intent and provider key', async () => {
    const p = await prepared(); at = times.authorize; await service.authorize(f.authorizer, p.command.id, 1, key()); at = times.submit;
    const attempts = await Promise.allSettled([service.submitIntent(f.cashier, p.command.id, 2, key()), service.submitIntent(f.authorizer, p.command.id, 2, key())]);
    expect(attempts.filter(a => a.status === 'fulfilled')).toHaveLength(1);
    expect(await count('command_revisions')).toBe(3);
    expect((await service.read(f.cashier, p.command.id)).command.providerKey).toBe(p.command.providerKey);
  });
  it('holds the fictional source guard until submission commits, then blocks changed-basis new actions', async () => {
    const p = await prepared(); at = times.authorize; await service.authorize(f.authorizer, p.command.id, 1, key()); at = times.submit;
    let release!: () => void, loaded!: () => void;
    const ready = new Promise<void>(resolve => { loaded = resolve; }), hold = new Promise<void>(resolve => { release = resolve; });
    const guarded = new ServicingService(uow, { ...ports, operation: async (tx, app) => { const c = await ports.operation(tx, app); loaded(); await hold; return c; } }, undefined, clock);
    const submitting = guarded.submitIntent(f.cashier, p.command.id, 2, key());
    await ready;
    const client = await owner.connect();
    try {
      await client.query('BEGIN'); await client.query("SET LOCAL lock_timeout='100ms'");
      await expect(client.query('UPDATE servicing.test_context SET body=body WHERE application_id=$1', [p.command.applicationId])).rejects.toMatchObject({ code: '55P03' });
      await client.query('ROLLBACK');
    } finally { client.release(); release(); }
    expect((await submitting).state).toBe('submitted');
    await changeContext(c => { c.basis.current.application.assessmentInputVersion++; });
    expect((await service.read(f.cashier, p.command.id)).command.origination.assessmentInputVersion).toBe(1);
  });
  it('retains known settlement after source/execution changes with no loan activation or posted receipt', async () => {
    const command = await submitted(); at = times.observe;
    const evidence = new FictionalManualDriver().submit(command, { observationId: key(), movementId: key(), at, outcome: 'confirmed' });
    await changeContext(c => { c.basis.current.application.assessmentInputVersion++; c.execution = { status: 'unavailable', reason: 'Fictional posting disabled.' }; });
    const result = await service.observe(f.cashier, command.id, evidence, 3, key());
    expect(result.command.state).toBe('confirmed_unposted'); expect(await count('observations')).toBe(1);
    expect(result.command.receiptId).toBeNull(); expect(result.command.origination.state).toBe('pending_release');
    expect((await service.read(f.cashier, command.id)).recovery.knownSettlement).toBe(true);
  });
  it('deduplicates observation IDs and underlying movements without another release', async () => {
    const command = await submitted(); at = times.observe;
    const evidence = new FictionalManualDriver().submit(command, { observationId: key(), movementId: key(), at, outcome: 'confirmed' });
    const result = await service.observe(f.cashier, command.id, evidence, 3, key());
    expect((await service.observe(f.cashier, command.id, evidence, 3, key())).disposition).toBe('duplicate');
    const next = await service.observe(f.cashier, command.id, { ...evidence, id: key() }, result.command.version, key());
    expect(next.disposition).toBe('duplicate_movement'); expect(await count('observations')).toBe(2);
    expect(await count('movement_claims')).toBe(1); expect(await count('release_claims')).toBe(1);
  });
  it('retains a movement reported against another command as conflict evidence', async () => {
    const first = await submitted();
    const c = structuredClone(f.context), app = key(), decision = key();
    for (const basis of [c.basis.current, c.basis.saved.snapshot.basis]) {
      basis.application.id = app; basis.assessment!.applicationId = app;
      basis.sources.forEach(s => { s.applicationId = app; });
      basis.recommendation!.applicationId = app; basis.recommendation!.basisHash = reviewBasisHash(basis);
    }
    c.basis.currentDecisionId = decision; c.basis.saved.snapshot.id = decision; c.basis.acceptance.decisionId = decision;
    c.basis.saved.snapshotHash = fingerprint(c.basis.saved.snapshot); c.basis.acceptance.snapshotHash = c.basis.saved.snapshotHash;
    const a = c.basis.current.application;
    await owner.query(`INSERT INTO applications.applications(id,organization_id,branch_id,member_id,purpose,requested_principal_centavos,requested_term_months,currency,status,version,assessment_input_version,assigned_officer_id)
      VALUES($1,$2,$3,$4,$5,1000000,1,'PHP','decision_recorded',3,1,$6)`, [app, a.organizationId, a.branchId, a.memberId, a.purpose, a.assignedOfficerId]);
    await owner.query('INSERT INTO servicing.test_context VALUES($1,$2,$3)', [a.organizationId, app, JSON.stringify(c)]);
    at = times.prepare; const loan = await service.originate(f.cashier, app, { method: 'cash' }, key());
    const secondPrepared = await service.prepare(f.cashier, loan.id, { ...first.payload, loanId: loan.id }, key());
    at = times.authorize; await service.authorize(f.authorizer, secondPrepared.id, 1, key()); at = times.submit;
    const second = await service.submitIntent(f.cashier, secondPrepared.id, 2, key());
    at = times.observe; const evidence = new FictionalManualDriver().submit(first, { observationId: key(), movementId: key(), at, outcome: 'confirmed' });
    await service.observe(f.cashier, first.id, evidence, 3, key());
    const reported = { ...evidence, id: key(), commandId: second.id, businessEventId: second.businessEventId, providerKey: second.providerKey };
    const result = await service.observe(f.cashier, second.id, reported, 3, key());
    expect(result.disposition).toBe('conflict'); expect(result.command.conflicts).toContain('movement_conflict');
    expect(result.command.state).toBe('submitted'); expect(await count('observations')).toBe(2);
    expect(await count('movement_claims')).toBe(1);
    expect((await service.read(f.cashier, second.id)).recovery.nextAction).toBe('review_conflicting_evidence');
  });
  it('preserves conflicting and late settlement evidence instead of downgrading or retrying it', async () => {
    const command = await submitted(); at = times.observe;
    const driver = new FictionalManualDriver(), failed = driver.submit(command, { observationId: key(), movementId: key(), at, outcome: 'failed' });
    const result = await service.observe(f.cashier, command.id, failed, 3, key()); at = times.later;
    const confirmed = new FictionalManualDriver().submit(command, { observationId: key(), movementId: key(), at, outcome: 'confirmed' });
    const late = await service.observe(f.cashier, command.id, confirmed, result.command.version, key());
    expect(late.command.conflicts).toContain('late_settlement'); expect(await count('observations')).toBe(2);
    const read = await service.read(f.cashier, command.id);
    expect(read.recovery.knownSettlement).toBe(true); expect(read.recovery.nextAction).toBe('review_conflicting_evidence');
  });
  it('rolls back incomplete observation persistence while earlier committed movement remains intact', async () => {
    const command = await submitted(); at = times.observe;
    const evidence = new FictionalManualDriver().submit(command, { observationId: key(), movementId: key(), at, outcome: 'confirmed' });
    class BrokenRepository extends ServicingRepository { override async insertObservation() { throw new Error('PRIVATE before evidence insert'); } }
    const broken = new ServicingService(uow, ports, new BrokenRepository(), clock);
    await expect(broken.observe(f.cashier, command.id, evidence, 3, key())).rejects.toMatchObject({ status: 503 });
    expect(await count('observations')).toBe(0); expect(await count('command_revisions')).toBe(3);
    await service.observe(f.cashier, command.id, evidence, 3, key());
    // A later failed operation cannot roll back the separately committed observation.
    await expect(service.authorize(f.authorizer, command.id, 4, key())).rejects.toBeInstanceOf(ApiError);
    expect(await count('observations')).toBe(1);
  });
  it('rechecks revoked identities before serving a cached submission', async () => {
    const app = f.context.basis.current.application.id, k = key(); await service.originate(f.cashier, app, { method: 'cash' }, k);
    await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1', [f.cashier.userId]);
    await expect(service.originate(f.cashier, app, { method: 'cash' }, k)).rejects.toMatchObject({ status: 401 });
  });
  it('rejects a revoked original authorizer through the guarded producer projection', async () => {
    const p = await prepared(); at = times.authorize; await service.authorize(f.authorizer, p.command.id, 1, key());
    await changeContext(c => { if (c.originalAuthorizer.status === 'current') c.originalAuthorizer.active = false; }); at = times.submit;
    await expect(service.submitIntent(f.cashier, p.command.id, 2, key())).rejects.toMatchObject({ code: 'authorizer_unavailable' });
    expect(await count('command_revisions')).toBe(2);
  });
  it('rejects a reused observation ID with altered evidence without erasing its original', async () => {
    const command = await submitted(); at = times.observe;
    const evidence = new FictionalManualDriver().submit(command, { observationId: key(), movementId: key(), at, outcome: 'confirmed' });
    await service.observe(f.cashier, command.id, evidence, 3, key());
    await expect(service.observe(f.cashier, command.id, { ...evidence, amountMinorUnits: 1 }, 4, key())).rejects.toMatchObject({ code: 'observation_id_conflict' });
    expect(await count('observations')).toBe(1);
    expect((await service.read(f.cashier, command.id)).command.observations[0].input).toEqual(evidence);
  });
  it('continues to enforce FORCE RLS with non-superuser/non-BYPASSRLS function owners', async () => {
    const role = 'agap_phase4_definer';
    await owner.query(`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='${role}') THEN CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
      GRANT USAGE ON SCHEMA servicing,platform,identity,applications TO ${role};
      GRANT SELECT ON ALL TABLES IN SCHEMA servicing TO ${role};
      GRANT SELECT ON identity.staff_users,applications.applications TO ${role};
      GRANT EXECUTE ON FUNCTION platform.current_organization(),platform.allowed_branch(uuid),platform.current_member(),servicing.staff_role(text) TO ${role};`);
    const functions = ['staff_role(text)', 'validate_origin()', 'validate_revision()', 'require_observation()', 'require_claim_revision()', 'validate_observation()', 'movement_conflict(text,uuid,uuid)', 'require_movement_evidence()'];
    try {
      for (const fn of functions) await owner.query(`ALTER FUNCTION servicing.${fn} OWNER TO ${role}`);
      const c = await submitted(); at = times.observe;
      const evidence = new FictionalManualDriver().submit(c, { observationId: key(), movementId: key(), at, outcome: 'confirmed' });
      expect((await service.observe(f.cashier, c.id, evidence, 3, key())).command.state).toBe('confirmed_unposted');
      await expect(uow.run(f.officer, tx => tx.query('SELECT * FROM servicing.command_revisions'))).resolves.toMatchObject({ rowCount: 0 });
      await expect(uow.run(f.cashier, tx => tx.query('SELECT * FROM servicing.movement_claims'))).rejects.toMatchObject({ code: '42501' });
    } finally { for (const fn of functions) await owner.query(`ALTER FUNCTION servicing.${fn} OWNER TO agap_owner`); }
  });
  it('denies other organizations/branches and non-financial staff', async () => {
    const command = await submitted();
    await expect(service.read(f.officer, command.id)).rejects.toMatchObject({ status: 403 });
    const other = { ...baseline.other.actor, roles: ['cashier'] as typeof f.cashier.roles };
    await owner.query("UPDATE identity.staff_users SET roles=ARRAY['cashier'] WHERE id=$1", [other.userId]);
    await expect(service.read(other, command.id)).rejects.toMatchObject({ status: 404 });
    const branch = key(); await owner.query('INSERT INTO platform.branches VALUES($1,$2,$3)', [branch, f.cashier.organizationId, 'Other fictional branch']);
    await owner.query('UPDATE identity.staff_users SET branch_ids=$2 WHERE id=$1', [f.cashier.userId, [branch]]);
    await expect(service.read({ ...f.cashier, branchIds: [branch] }, command.id)).rejects.toMatchObject({ status: 404 });
  });
  it('SQL rejects mutation, skipped revisions, posted success and an alias first-release claim', async () => {
    const p = await prepared(), c = p.command;
    await expect(uow.run(f.cashier, tx => tx.query('UPDATE servicing.command_revisions SET state=$1 WHERE command_id=$2', ['confirmed_unposted', c.id]))).rejects.toMatchObject({ code: '42501' });
    await expect(owner.query('DELETE FROM servicing.originations WHERE id=$1', [p.loan.id])).rejects.toMatchObject({ code: '23514' });
    await expect(uow.run(f.cashier, tx => tx.query('INSERT INTO servicing.release_claims VALUES($1,$2,$3,$4,$5,$6)', [key(), c.organizationId, c.branchId, c.loanId, key(), key()]))).rejects.toMatchObject({ code: '23505' });
    for (const body of [{ ...c, version: 3 }, { ...c, state: 'confirmed' }]) {
      await expect(uow.run(f.cashier, tx => tx.query('INSERT INTO servicing.command_revisions VALUES($1,$2,$3,$4,$5,$6,$7,DEFAULT,$8)',
        [c.organizationId, c.branchId, c.id, body.version, body.state, f.cashier.userId, canonical(body), fingerprint(body)]))).rejects.toHaveProperty('code');
    }
  });
});
