import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closePools, config, owner, prepareDatabase } from './database.js';

beforeAll(prepareDatabase);
afterAll(closePools);

describe('API startup rejects application table owners in either connection', () => {
  for (const schema of ['platform', 'identity', 'members', 'applications', 'portal', 'evidence', 'credit', 'decisions', 'servicing', 'accounting', 'monitoring']) {
    for (const role of ['agap_runtime', 'agap_identity']) it(`rejects ${role} owning a ${schema} table`, async () => {
      // All names are fixed test constants; no operational table ownership is changed.
      const table = `${schema}.credential_safety_probe`;
      await owner.query(`CREATE TABLE ${table}(id integer); ALTER TABLE ${table} OWNER TO ${role}`);
      try { await expect(createApp(config)).rejects.toThrow('must not own application tables'); }
      finally { await owner.query(`DROP TABLE ${table}`); }
    });
  }

  it('rejects inherited financial-table ownership even without INHERIT', async () => {
    await owner.query(`CREATE ROLE agap_credential_owner_probe NOLOGIN NOSUPERUSER NOBYPASSRLS;
      CREATE TABLE servicing.credential_safety_probe(id integer);
      ALTER TABLE servicing.credential_safety_probe OWNER TO agap_credential_owner_probe;
      GRANT agap_credential_owner_probe TO agap_runtime`);
    try { await expect(createApp(config)).rejects.toThrow('inherit their owner role'); }
    finally {
      await owner.query(`DROP TABLE servicing.credential_safety_probe;
        REVOKE agap_credential_owner_probe FROM agap_runtime; DROP ROLE agap_credential_owner_probe`);
    }
  });
});
