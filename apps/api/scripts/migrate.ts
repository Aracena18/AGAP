import { createPool } from '../src/platform/database.js';
import { migrate } from '../src/platform/migrate.js';
if (!process.env.MIGRATION_DATABASE_URL) throw new Error('MIGRATION_DATABASE_URL is required for the dedicated migration command.');
const pool = createPool(process.env.MIGRATION_DATABASE_URL);
try { await migrate(pool); console.log('Database migrations are current.'); } finally { await pool.end(); }
