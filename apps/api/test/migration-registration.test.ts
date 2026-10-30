import { afterAll, beforeAll, expect, it } from 'vitest';
import { migrate } from '../src/platform/migrate.js';
import { closePools, owner, prepareDatabase, resetFixtures } from './database.js';

// Keep regression changes inside the guarded fictional database.
beforeAll(async () => { await prepareDatabase(); await resetFixtures(); });
afterAll(closePools);

it('installs the ledger through the default migrator and preserves applied history on replay', async () => {
  const installed = await owner.query(`SELECT to_regclass('accounting.journals') AS journals,
    to_regprocedure('accounting.post_journal(jsonb,text)') AS posting,
    has_table_privilege('agap_runtime','accounting.journals','INSERT') AS runtime_insert,
    (SELECT count(*)::int FROM accounting.accounts) AS configured_accounts,
    (SELECT count(*)::int FROM accounting.periods) AS configured_periods`);
  expect(installed.rows[0]).toEqual({
    journals: 'accounting.journals', posting: 'accounting.post_journal(jsonb,text)',
    runtime_insert: false, configured_accounts: 0, configured_periods: 0,
  });
  const history = await owner.query('SELECT name,checksum,applied_at FROM public.agap_migrations ORDER BY name');
  expect(history.rows.filter(row => String(row.name).startsWith('apps/api/src/modules/accounting/')).map(row => row.name)).toEqual([
    'apps/api/src/modules/accounting/migrations/001-ledger.sql',
    'apps/api/src/modules/accounting/migrations/002-posting.sql',
    'apps/api/src/modules/accounting/migrations/003-configuration-locks.sql',
  ]);

  await migrate(owner);
  expect((await owner.query('SELECT name,checksum,applied_at FROM public.agap_migrations ORDER BY name')).rows).toEqual(history.rows);
});

it('checks applied ledger checksums even when a module test already installed the schema', async () => {
  const name = 'apps/api/src/modules/accounting/migrations/003-configuration-locks.sql';
  const previous = await owner.query<{ checksum: string }>('SELECT checksum FROM public.agap_migrations WHERE name=$1', [name]);
  expect(previous.rowCount).toBe(1);
  try {
    await owner.query('UPDATE public.agap_migrations SET checksum=$1 WHERE name=$2', ['fictional-tampered-checksum', name]);
    await expect(migrate(owner)).rejects.toThrow(`Integrated migration changed: ${name}`);
  } finally {
    await owner.query('UPDATE public.agap_migrations SET checksum=$1 WHERE name=$2', [previous.rows[0].checksum, name]);
  }
});
