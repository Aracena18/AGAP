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

it('installs decision and payment storage with scoped reads and immutable history through the default migrator', async () => {
  const tables = ['decisions.records', 'decisions.documents', 'decisions.acceptances',
    'servicing.originations', 'servicing.money_commands', 'servicing.money_revisions', 'servicing.postings'];
  const installed = await owner.query<{ name: string; relation: string | null }>(
    'SELECT name,to_regclass(name)::text AS relation FROM unnest($1::text[]) AS name', [tables]);
  expect(installed.rows).toEqual(tables.map(name => ({ name, relation: name })));

  const protection = await owner.query(`SELECT n.nspname||'.'||c.relname AS name,
    c.relrowsecurity AS scoped,c.relforcerowsecurity AS forced,
    has_table_privilege('agap_runtime',c.oid,'SELECT') AS raw_read,
    has_table_privilege('agap_runtime',c.oid,'UPDATE') AS history_update,
    has_table_privilege('agap_runtime',c.oid,'DELETE') AS history_delete
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname||'.'||c.relname=ANY($1::text[]) ORDER BY name`, [tables]);
  expect(protection.rows).toEqual([...tables].sort().map(name => ({
    name, scoped: true, forced: true, raw_read: false, history_update: false, history_delete: false,
  })));
  const projections = await owner.query(`SELECT
    to_regprocedure('decisions.staff_current(uuid)')::text AS staff_decision,
    to_regprocedure('decisions.member_current(uuid)')::text AS member_decision,
    to_regprocedure('servicing.member_loans(date)')::text AS member_loans,
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='servicing.money_commands'::regclass
      AND tgname='money_command_complete' AND tgdeferrable AND tginitdeferred) AS complete_command`);
  expect(projections.rows[0]).toEqual({
    staff_decision: 'decisions.staff_current(uuid)', member_decision: 'decisions.member_current(uuid)',
    member_loans: 'servicing.member_loans(date)', complete_command: true,
  });
});

it.each([
  'apps/api/src/modules/accounting/migrations/003-configuration-locks.sql',
  'apps/api/src/modules/decisions/migrations/005-staff-current-read.sql',
  'apps/api/src/modules/servicing/migrations/007-money-command-completeness.sql',
])('refuses a changed applied migration checksum: %s', async name => {
  const previous = await owner.query<{ checksum: string }>('SELECT checksum FROM public.agap_migrations WHERE name=$1', [name]);
  expect(previous.rowCount).toBe(1);
  try {
    await owner.query('UPDATE public.agap_migrations SET checksum=$1 WHERE name=$2', ['fictional-tampered-checksum', name]);
    await expect(migrate(owner)).rejects.toThrow(`Integrated migration changed: ${name}`);
  } finally {
    await owner.query('UPDATE public.agap_migrations SET checksum=$1 WHERE name=$2', [previous.rows[0].checksum, name]);
  }
});
