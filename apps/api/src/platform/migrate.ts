import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Pool } from 'pg';

/** New owner modules register migrations here; integrated files are never edited. */
export const migrationDirectories = ['apps/api/src/platform/migrations'];
export async function migrate(pool: Pool, root = process.cwd()) {
  const client = await pool.connect();
  let discard=false;
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('agap:migrations'))");
    await client.query('CREATE TABLE IF NOT EXISTS public.agap_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const directory of migrationDirectories) {
      for (const file of (await readdir(resolve(root, directory))).filter(name => name.endsWith('.sql')).sort()) {
        const name = `${directory}/${file}`;
        const sql = await readFile(resolve(root, name), 'utf8');
        const checksum = createHash('sha256').update(sql).digest('hex');
        const previous = await client.query<{ checksum: string }>('SELECT checksum FROM public.agap_migrations WHERE name=$1', [name]);
        if (previous.rowCount) {
          if (previous.rows[0].checksum !== checksum) throw new Error(`Integrated migration changed: ${name}`);
          continue;
        }
        await client.query('BEGIN');
        try { await client.query(sql); await client.query('INSERT INTO public.agap_migrations(name,checksum) VALUES($1,$2)', [name,checksum]); await client.query('COMMIT'); }
        catch (error) { await client.query('ROLLBACK'); throw error; }
      }
    }
  } finally {
    try{await client.query("SELECT pg_advisory_unlock(hashtext('agap:migrations'))");}catch{discard=true;}
    client.release(discard);
  }
}
