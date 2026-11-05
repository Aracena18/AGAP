import { createHash, randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { Id, TrialBalanceCreateSchema, TrialBalancePageSchema, TrialBalanceRunSchema } from '../../../../../packages/contracts/src/schemas.js';
import type { ActorContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { canonical, command } from '../../platform/commands.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { requireReconciliationScope, requireReportingSnapshot } from './ledger-reader.js';
import { trialBalance } from './trial-balance.js';
async function operation<T>(work: () => Promise<T>) { try {
    return await work();
}
catch (error) {
    if (error instanceof ApiError)
        throw error;
    if (error instanceof ZodError)
        throw new ApiError(422, 'invalid_report', 'Check the report dates or cursor.');
    if (error && typeof error === 'object' && 'code' in error && error.code === '42501')
        throw new ApiError(403, 'report_forbidden', 'Complete organization auditor scope is required.');
    throw new ApiError(503, 'report_unavailable', 'The report could not be confirmed. Retry the same submission.');
} }
export class TrialBalanceService {
    constructor(private readonly uow: UnitOfWork) { }
    create(actor: ActorContext, input: unknown, key: unknown) {
        return operation(async () => {
            const request = TrialBalanceCreateSchema.parse(input);
            return this.uow.run(actor, async (tx) => {
                await requireReconciliationScope(tx);
                await requireReportingSnapshot(tx);
                const receipt = await command(tx, 'accounting.trial_balance.create', key, request, async () => {
                    const meta = (await tx.query<{
                        cutoff: string;
                        snapshot: string;
                    }>(`SELECT to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cutoff,pg_current_snapshot()::text AS snapshot`)).rows[0];
                    const rows = (await tx.query(`WITH aggregates AS (
     SELECT l.account_id,COALESCE(sum(l.amount_centavos) FILTER(WHERE j.effective_date<$2::date AND l.side='debit'),0)::text AS opening_debit,
      COALESCE(sum(l.amount_centavos) FILTER(WHERE j.effective_date<$2::date AND l.side='credit'),0)::text AS opening_credit,
      COALESCE(sum(l.amount_centavos) FILTER(WHERE j.effective_date>=$2::date AND l.side='debit'),0)::text AS debit,
      COALESCE(sum(l.amount_centavos) FILTER(WHERE j.effective_date>=$2::date AND l.side='credit'),0)::text AS credit
     FROM accounting.journal_lines l JOIN accounting.journals j ON j.organization_id=l.organization_id AND j.id=l.journal_id
     WHERE j.organization_id=$1 AND j.effective_date<=$3::date AND j.posted_at<=$4::timestamptz GROUP BY l.account_id)
     SELECT a.id,a.code,a.label,a.currency,a.active,COALESCE(g.opening_debit,'0') AS opening_debit,COALESCE(g.opening_credit,'0') AS opening_credit,
      COALESCE(g.debit,'0') AS debit,COALESCE(g.credit,'0') AS credit FROM accounting.accounts a LEFT JOIN aggregates g ON g.account_id=a.id
      WHERE a.organization_id=$1 ORDER BY a.code,a.id LIMIT 5001`, [actor.organizationId, request.fromDate, request.throughDate, meta.cutoff])).rows;
                    const source = (await tx.query<{
                        journals: string;
                        lines: string;
                        posted: string | null;
                    }>(`SELECT count(DISTINCT j.id)::text AS journals,count(l.line_number)::text AS lines,max(j.posted_at)::text AS posted FROM accounting.journals j
     LEFT JOIN accounting.journal_lines l ON l.organization_id=j.organization_id AND l.journal_id=j.id WHERE j.organization_id=$1 AND j.effective_date<=$2::date AND j.posted_at<=$3::timestamptz`, [actor.organizationId, request.throughDate, meta.cutoff])).rows[0];
                    const calculated = trialBalance(rows), body = { id: randomUUID(), organizationId: actor.organizationId, createdBy: actor.userId, createdAt: meta.cutoff, engineVersion: 'trial-balance-v1',
                        evidenceSha256: createHash('sha256').update(canonical({ request, meta, rows, source })).digest('hex'), ...request, cutoffAt: meta.cutoff, databaseSnapshot: meta.snapshot, currency: 'PHP', ...calculated,
                        sourceJournalCount: Number(source.journals), sourceLineCount: Number(source.lines), postedThrough: source.posted === null ? null : new Date(source.posted).toISOString() };
                    const checked = TrialBalanceRunSchema.safeParse(body);
                    if (!checked.success)
                        throw new ApiError(503, 'report_unavailable', 'The report evidence could not be validated.');
                    const result = await tx.query('SELECT accounting.save_trial_balance($1::jsonb,$2) AS body', [JSON.stringify(checked.data), actor.correlationId]);
                    return { id: TrialBalanceRunSchema.parse(result.rows[0].body).id };
                });
                const id = Id.parse(receipt.id), saved = (await tx.query('SELECT body FROM accounting.trial_balance_runs WHERE organization_id=$1 AND id=$2', [actor.organizationId, id])).rows[0];
                if (!saved)
                    throw new ApiError(503, 'report_unavailable', 'The saved report could not be read. Retry the same submission.');
                return TrialBalanceRunSchema.parse(saved.body);
            });
        });
    }
    get(actor: ActorContext, value: unknown) { return operation(async () => this.uow.run(actor, async (tx) => { await requireReconciliationScope(tx); const row = (await tx.query('SELECT body FROM accounting.trial_balance_runs WHERE organization_id=$1 AND id=$2', [actor.organizationId, Id.parse(value)])).rows[0]; if (!row)
        throw notFound(); return TrialBalanceRunSchema.parse(row.body); })); }
    list(actor: ActorContext, value: unknown) {
        return operation(async () => {
            const query = z.strictObject({ cursor: Id.optional(), limit: z.coerce.number().int().min(1).max(20).default(20) }).parse(value);
            return this.uow.run(actor, async (tx) => {
                await requireReconciliationScope(tx);
                if (query.cursor && !(await tx.query('SELECT 1 FROM accounting.trial_balance_runs WHERE organization_id=$1 AND id=$2', [actor.organizationId, query.cursor])).rowCount)
                    throw new ApiError(422, 'invalid_report_cursor', 'Refresh report history before loading older reports.');
                const result = await tx.query(`SELECT body FROM accounting.trial_balance_runs WHERE organization_id=$1 AND ($2::uuid IS NULL OR (created_at,id)<(SELECT created_at,id FROM accounting.trial_balance_runs WHERE organization_id=$1 AND id=$2)) ORDER BY created_at DESC,id DESC LIMIT $3`, [actor.organizationId, query.cursor ?? null, query.limit + 1]), items = result.rows.slice(0, query.limit).map(r => { const v = TrialBalanceRunSchema.parse(r.body); return { id: v.id, createdBy: v.createdBy, createdAt: v.createdAt, fromDate: v.fromDate, throughDate: v.throughDate, status: v.status, balanced: v.balanced }; });
                return TrialBalancePageSchema.parse({ items, nextCursor: result.rows.length > query.limit ? items.at(-1)!.id : null });
            });
        });
    }
}
