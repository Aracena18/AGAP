import { afterAll, beforeAll, expect, it } from 'vitest';
import { PostgresUnitOfWork } from '../src/platform/database.js';
import { PostgresMemberUnitOfWork } from '../src/platform/member-database.js';
import { materialLockKey } from '../src/platform/material-guard.js';
import { lendingTransactionGuard } from '../src/platform/lending-transaction.js';
import { owner, runtimePool, prepareDatabase, resetFixtures, closePools } from './database.js';
import { memberFixture } from './member-fixtures.js';

beforeAll(prepareDatabase);
afterAll(closePools);

it('fences both staff/member lending protocols against the same operator and worker material lock', async () => {
  const f = await resetFixtures(), member = await memberFixture(f.officer.actor);
  const probe = await owner.connect();
  async function assertFenced() {
    await probe.query('BEGIN');
    try {
      const result = await probe.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS acquired', [materialLockKey(f.org)]);
      expect(result.rows[0].acquired).toBe(false);
    } finally { await probe.query('ROLLBACK'); }
  }
  try {
    for (const lendingGuard of [false, true]) {
      const options = { lendingGuard, materialGuard: !lendingGuard };
      await new PostgresUnitOfWork(runtimePool, options).run(f.officer.actor, async tx => {
        expect(lendingTransactionGuard in tx).toBe(lendingGuard);
        await assertFenced();
      });
      await new PostgresMemberUnitOfWork(runtimePool, options).run(member.actor, async tx => {
        expect(lendingTransactionGuard in tx).toBe(lendingGuard);
        await assertFenced();
      });
    }
    await probe.query('BEGIN');
    const result = await probe.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS acquired', [materialLockKey(f.org)]);
    expect(result.rows[0].acquired).toBe(true);
    await probe.query('ROLLBACK');
  } finally { probe.release(); }
});
