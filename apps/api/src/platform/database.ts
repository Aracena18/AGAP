import { Pool, type PoolConfig } from 'pg';
import type { ActorContext, TransactionContext, UnitOfWork } from '../../../../packages/contracts/src/ports.js';
import { ApiError } from './errors.js';
import { lockPilotMaterial } from './material-guard.js';

export function createPool(connectionString: string, options: PoolConfig = {}) {
  return new Pool({ connectionString, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30_000, ...options });
}
export class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool, private readonly options: { isolation?: 'repeatable read'; materialGuard?: boolean } = {}) {}
  async run<T>(actor: ActorContext, work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const attempts = this.options.isolation === 'repeatable read' ? 3 : 1;
    for (let attempt = 0; ; attempt++) {
      try { return await this.attempt(actor, work); }
      catch (error) {
        const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
        if (attempt + 1 >= attempts || !['40001','40P01'].includes(code)) throw error;
      }
    }
  }
  private async attempt<T>(actor: ActorContext, work: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let discard = false;
    try {
      await client.query(this.options.isolation === 'repeatable read' ? 'BEGIN ISOLATION LEVEL REPEATABLE READ' : 'BEGIN');
      await client.query("SELECT set_config('agap.organization_id', $1, true), set_config('agap.user_id', $2, true), set_config('agap.branch_ids', $3, true),set_config('agap.member_id','',true),set_config('agap.member_link_id','',true)", [actor.organizationId, actor.userId, JSON.stringify(actor.branchIds)]);
      await client.query("SET LOCAL statement_timeout = '10s'");
      await client.query("SET LOCAL lock_timeout = '5s'");
      const current = await client.query<{ authorized: boolean }>('SELECT identity.assert_actor($1,$2,$3,$4,$5) AS authorized',[actor.sessionId,actor.userId,actor.organizationId,[...actor.branchIds],[...actor.roles]]);
      if (!current.rows[0].authorized) throw new ApiError(401,'access_changed','Your staff access changed. Reload and sign in again.');
      const tx: TransactionContext = { actor, query: async (sql, values) => client.query(sql, values ? [...values] : undefined) };
      if (this.options.materialGuard) await lockPilotMaterial(tx);
      const result = await work(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { discard = true; }
      throw error;
    } finally { client.release(discard); }
  }
}
