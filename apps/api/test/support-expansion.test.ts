import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { IdentityService } from '../src/modules/identity/identity.service.js';
import { CheckInSummaryService, SupportCorrections } from '../src/modules/monitoring/support-expansion.service.js';
import { PostgresUnitOfWork } from '../src/platform/database.js';
import { PostgresMemberUnitOfWork } from '../src/platform/member-database.js';
import { config, identityPool, owner, prepareDatabase, resetFixtures, closePools, runtimePool, uow } from './database.js';
import { memberFixture } from './member-fixtures.js';
let app: INestApplication, base: string, f: Awaited<ReturnType<typeof resetFixtures>>, member: Awaited<ReturnType<typeof memberFixture>>, other: typeof member;
beforeAll(async () => { await prepareDatabase(); app = await createApp(config); await app.listen(0, '127.0.0.1'); base = await app.getUrl(); });
beforeEach(async () => { f = await resetFixtures(); member = await memberFixture(f.officer.actor); other = await memberFixture(f.officer.actor); });
afterAll(async () => { await app?.close(); await closePools(); });
const input = () => ({ loanId: null, message: 'Fictional confirmed request', contactPreference: 'portal', sharingConfirmed: true, noticeVersion: config.PRIVACY_NOTICE_VERSION, checkIn: { canMeetEssentials: 'no', borrowedToRepay: 'declined', financialStrain: 'unavailable' } });
async function call(path: string, options: {
    method?: string;
    body?: unknown;
    key?: string;
    token?: string;
    staff?: boolean;
    csrf?: boolean;
    version?: number;
} = {}) { const token = options.token ?? member.token, headers: Record<string, string> = { Cookie: `${options.staff ? 'agap_session' : 'agap_member_session'}=${token}`, Origin: config.PUBLIC_ORIGIN }; if (options.body !== undefined)
    headers['Content-Type'] = 'application/json'; if (options.key)
    headers['Idempotency-Key'] = options.key; if (options.version)
    headers['If-Match'] = `"${options.version}"`; if (options.csrf !== false)
    headers['X-CSRF-Token'] = new IdentityService(identityPool, config).csrfToken(token); const result = await fetch(`${base}/api/v1${path}`, { method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) }); return { status: result.status, body: await result.json() }; }
async function submit() { const r = await call('/member/support-requests', { method: 'POST', body: input(), key: randomUUID() }); expect(r.status).toBe(201); return r.body.id as string; }
async function assign(id: string) { expect((await call(`/support-requests/${id}/assignments`, { staff: true, token: f.administrator.token, method: 'POST', version: 1, key: randomUUID(), body: { officerId: f.officer.actor.userId, reason: 'Fictional assignment' } })).status).toBe(201); }
const correct = (id: string, key = randomUUID(), body: unknown = { ...input(), reason: 'Member confirmed a corrected answer', message: 'Corrected fictional request' }) => call(`/member/support-requests/${id}/corrections`, { method: 'POST', body, key });
const summaryPath = () => { const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()); return `/check-in-summary?fromDate=${today}&throughDate=${today}`; };
const summary = () => call(summaryPath(), { staff: true, token: f.officer.token });
describe('confirmed corrections and scoped descriptive summaries', () => {
    it('does not turn a missing disclosure into a zero count', async () => { const id = await submit(); await assign(id); await owner.query('INSERT INTO monitoring.requests(id,organization_id,member_id,branch_id,assigned_officer_id) SELECT gen_random_uuid(),organization_id,member_id,branch_id,assigned_officer_id FROM monitoring.requests WHERE id=$1', [id]); expect((await summary()).status).toBe(503); });
    it('links a new unassigned disclosure without altering the original or any financial record', async () => { const id = await submit(); await assign(id); const before = (await owner.query('SELECT * FROM monitoring.disclosures WHERE request_id=$1', [id])).rows[0]; const correction = await correct(id); expect(correction.status).toBe(201); expect((await call(`/member/support-requests/${id}/correction-link`)).body).toEqual({ requestId: id, replacesId: null, replacedById: correction.body.id }); expect((await call(`/member/support-requests/${correction.body.id}/correction-link`)).body.replacesId).toBe(id); expect((await owner.query('SELECT * FROM monitoring.disclosures WHERE request_id=$1', [id])).rows[0]).toEqual(before); expect((await owner.query('SELECT assigned_officer_id FROM monitoring.requests WHERE id=$1', [correction.body.id])).rows[0].assigned_officer_id).toBeNull(); expect((await owner.query('SELECT count(*) FROM accounting.journals')).rows[0].count).toBe('0'); expect((await call(`/support-requests/${correction.body.id}`, { staff: true, token: f.officer.token })).status).toBe(404); });
    it('replays one correction exactly, rejects changed keys and serializes competing corrections', async () => { const id = await submit(), key = randomUUID(), first = await correct(id, key); await assign(first.body.id); expect((await correct(id, key)).body).toEqual(first.body); expect((await correct(id, key, { ...input(), reason: 'Different reason' })).status).toBe(409); expect((await correct(id)).status).toBe(409); const latest = first.body.id, results = await Promise.all([correct(latest), correct(latest)]); expect(results.map(r => r.status).sort()).toEqual([201, 409]); expect((await owner.query('SELECT count(*) FROM monitoring.corrections')).rows[0].count).toBe('2'); const receipts = (await owner.query("SELECT response FROM portal.commands WHERE scope LIKE 'support.correct:%'")).rows; expect(receipts.every(r => Object.keys(r.response).join(',') === 'id')).toBe(true); });
    it('requires current notice, confirmation and CSRF and hides links from other members and staff', async () => { const id = await submit(); for (const body of [{ ...input(), reason: 'Fix', sharingConfirmed: false }, { ...input(), reason: 'Fix', noticeVersion: 'old' }])
        expect([409, 422]).toContain((await correct(id, randomUUID(), body)).status); expect((await call(`/member/support-requests/${id}/corrections`, { method: 'POST', body: { ...input(), reason: 'Fix' }, key: randomUUID(), csrf: false })).status).toBe(403); expect((await call(`/member/support-requests/${id}/correction-link`, { token: other.token })).status).toBe(404); expect((await call(`/member/support-requests/${id}/corrections`, { method: 'POST', body: { ...input(), reason: 'Fix' }, key: randomUUID(), token: other.token })).status).toBe(404); });
    it('rolls back correction link, disclosure, event and receipt together', async () => { const id = await submit(), key = randomUUID(), service = new SupportCorrections({ memberLoans: async () => ({ state: 'unavailable', message: 'Not supplied' }) }), members = new PostgresMemberUnitOfWork(runtimePool); await expect(members.run(member.actor, async (tx) => { await service.correct(tx, id, { ...input(), reason: 'Fictional correction' }, key); throw new Error('Fictional rollback'); })).rejects.toThrow('Fictional rollback'); expect((await owner.query('SELECT count(*) FROM monitoring.requests')).rows[0].count).toBe('1'); expect((await owner.query('SELECT count(*) FROM monitoring.corrections')).rows[0].count).toBe('0'); expect((await correct(id, key)).status).toBe(201); });
    it('counts only current assignments and keeps declined, missing and no distinct', async () => { const a = await submit(); await submit(); expect((await summary()).body.submissionCount).toBe(0); await assign(a); const result = await summary(); expect(result.status).toBe(200); expect(result.body).toMatchObject({ state: 'available', submissionCount: 1, answers: { canMeetEssentials: { yes: 0, no: 1, declined: 0, unavailable: 0 }, borrowedToRepay: { declined: 1 }, financialStrain: { unavailable: 1 } } }); expect(JSON.stringify(result.body)).not.toContain(input().message); expect(JSON.stringify(result.body)).not.toContain(member.actor.memberId); for (const token of [f.auditor.token, f.administrator.token])
        expect((await call(summaryPath(), { staff: true, token })).status).toBe(403); expect((await call(summaryPath(), { staff: true, token: f.other.token })).body.submissionCount).toBe(0); });
    it('rejects malformed dates, ordinary transactions and revoked sessions', async () => { expect((await call('/check-in-summary?fromDate=bad&throughDate=2026-11-05', { staff: true, token: f.officer.token })).status).toBe(422); await expect(new CheckInSummaryService(uow).get(f.officer.actor, { fromDate: '2026-11-05', throughDate: '2026-11-05' })).rejects.toMatchObject({ status: 503 }); await owner.query('UPDATE identity.staff_users SET active=false WHERE id=$1', [f.officer.actor.userId]); expect((await summary()).status).toBe(401); });
    it('returns no partial counts above the request bound', async () => { const id = await submit(); await assign(id); await owner.query("INSERT INTO monitoring.requests(id,organization_id,member_id,branch_id,assigned_officer_id) SELECT gen_random_uuid(),r.organization_id,r.member_id,r.branch_id,r.assigned_officer_id FROM monitoring.requests r CROSS JOIN generate_series(1,1000) WHERE r.id=$1", [id]); expect((await summary()).body).toMatchObject({ state: 'unavailable', submissionCount: null, answers: null }); });
    it('holds current assignments while an aggregate is read', async () => { const id = await submit(); await assign(id); const snapshot = new PostgresUnitOfWork(runtimePool, { isolation: 'repeatable read' }); let unlock!: () => void, ready!: () => void; const pause = new Promise<void>(r => unlock = r), locked = new Promise<void>(r => ready = r); const reading = snapshot.run(f.officer.actor, async (tx) => { const inputs = (await tx.query("SELECT monitoring.summary_inputs((now() AT TIME ZONE 'Asia/Manila')::date,(now() AT TIME ZONE 'Asia/Manila')::date) AS inputs")).rows[0].inputs; ready(); await pause; return inputs; }); await locked; const client = await owner.connect(); try {
        await client.query('BEGIN');
        await client.query("SET LOCAL lock_timeout='100ms'");
        await expect(client.query('UPDATE monitoring.requests SET assigned_officer_id=NULL WHERE id=$1', [id])).rejects.toMatchObject({ code: '55P03' });
    }
    finally {
        await client.query('ROLLBACK');
        client.release();
        unlock();
    } expect(await reading).toHaveLength(1); });
});
