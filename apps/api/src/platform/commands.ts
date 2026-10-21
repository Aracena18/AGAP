import { createHash, randomUUID } from 'node:crypto';
import type { TransactionContext } from '../../../../packages/contracts/src/ports.js';
import { ApiError } from './errors.js';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a<b?-1:a>b?1:0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function expectedVersion(value: unknown): number {
  if (value === undefined) throw new ApiError(428, 'precondition_required', 'Reload the record and submit its current If-Match version.');
  if (typeof value !== 'string' || !/^"[1-9][0-9]*"$/.test(value)) throw new ApiError(400, 'invalid_version', 'If-Match must contain one quoted positive integer version.');
  const version = Number(value.slice(1, -1));
  if (!Number.isSafeInteger(version)) throw new ApiError(400, 'invalid_version', 'The record version is outside the supported range.');
  return version;
}
export async function command<T>(tx: TransactionContext, operation: string, key: unknown, request: unknown, execute: () => Promise<T>): Promise<T> {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) throw new ApiError(400, 'idempotency_key_required', 'Supply a new Idempotency-Key of 16–128 letters, digits, underscores or hyphens. Reuse it only to retry the same command.');
  const hash = createHash('sha256').update(canonical(request)).digest('hex');
  const scope = `${tx.actor.userId}:${operation}:${key}`;
  const inserted = await tx.query('INSERT INTO platform.idempotency (organization_id, scope, request_hash) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING scope', [tx.actor.organizationId, scope, hash]);
  if (inserted.rowCount === 0) {
    const previous = await tx.query<{ request_hash: string; response: T }>('SELECT request_hash, response FROM platform.idempotency WHERE organization_id=$1 AND scope=$2', [tx.actor.organizationId, scope]);
    if (previous.rows[0]?.request_hash !== hash) throw new ApiError(409, 'idempotency_conflict', 'This key was used for a different command.');
    return previous.rows[0].response;
  }
  const response = await execute();
  await tx.query('UPDATE platform.idempotency SET response=$3 WHERE organization_id=$1 AND scope=$2', [tx.actor.organizationId, scope, JSON.stringify(response)]);
  return response;
}
export async function recordEvent(tx: TransactionContext, type: string, aggregateId: string, version: number) {
  const id = randomUUID();
  const payload = { id, type, schemaVersion: 1, organizationId: tx.actor.organizationId, aggregateId, aggregateVersion: version, occurredAt: new Date().toISOString(), correlationId: tx.actor.correlationId, payload: {} };
  await tx.query('INSERT INTO platform.audit_events (id,organization_id,user_id,event_type,aggregate_id,aggregate_version,correlation_id) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id, tx.actor.organizationId, tx.actor.userId, type, aggregateId, version, tx.actor.correlationId]);
  await tx.query('INSERT INTO platform.outbox (id,organization_id,event_type,payload) VALUES ($1,$2,$3,$4)', [id, tx.actor.organizationId, type, JSON.stringify(payload)]);
}
