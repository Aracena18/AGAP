import { z } from 'zod';
import { CheckInSummaryQuerySchema, CheckInSummarySchema, Id, MemberSupportSchema, SupportCheckInSchema, SupportCorrectionCreateSchema, SupportCorrectionLinkSchema } from '../../../../../packages/contracts/src/schemas.js';
import type { ActorContext, MemberTransactionContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { memberCommand } from '../../platform/member-commands.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { requireRoles } from '../identity/identity.service.js';
import type { LoanReads } from '../servicing/loan-reads.js';
import { supportOperation } from './monitoring.errors.js';
export class SupportCorrections {
    constructor(private readonly loans: Pick<LoanReads, 'memberLoans'>) { }
    link(tx: MemberTransactionContext, id: string) { return supportOperation(async () => SupportCorrectionLinkSchema.parse((await tx.query('SELECT monitoring.correction_link($1) AS body', [Id.parse(id)])).rows[0].body)); }
    correct(tx: MemberTransactionContext, id: string, input: unknown, key: string) {
        return supportOperation(async () => {
            const prior = Id.parse(id), data = SupportCorrectionCreateSchema.parse(input);
            // Own-record visibility is rechecked before command replay; no cross-member ID oracle.
            await this.link(tx, prior);
            const receipt = await memberCommand(tx, 'support.correct', key, { prior, ...data }, async () => {
                let position: unknown = null;
                if (data.loanId) {
                    const inventory = await this.loans.memberLoans(tx);
                    if (inventory.state !== 'available')
                        throw new ApiError(501, 'module_not_available', 'The linked loan cannot be checked yet.');
                    const loan = inventory.data.find(l => l.id === data.loanId);
                    if (!loan)
                        throw notFound();
                    position = loan.position;
                }
                const result = await tx.query('SELECT monitoring.correct_support($1,$2::jsonb,$3::jsonb,$4) AS id', [prior, JSON.stringify(data), position === null ? null : JSON.stringify(position), tx.actor.correlationId]);
                return { id: Id.parse(result.rows[0].id) };
            });
            const row = (await tx.query('SELECT * FROM monitoring.member_history WHERE id=$1', [receipt.id])).rows[0];
            if (!row)
                throw notFound();
            // Only immutable submitted fields are replayed, even after staff responses.
            return MemberSupportSchema.parse({ id: row.id, submittedAt: (row.submitted_at as Date).toISOString(), status: 'submitted', message: row.message, response: null, checkIn: row.check_in, loanId: row.loan_id });
        });
    }
}
export class CheckInSummaryService {
    constructor(private readonly snapshots: UnitOfWork) { }
    get(actor: ActorContext, input: unknown) {
        return supportOperation(async () => {
            requireRoles(actor, ['officer']);
            const dates = CheckInSummaryQuerySchema.parse(input);
            return this.snapshots.run(actor, async (tx) => {
                if ((await tx.query('SHOW transaction_isolation')).rows[0].transaction_isolation !== 'repeatable read')
                    throw new ApiError(503, 'snapshot_required', 'A consistent summary snapshot is unavailable.');
                const cutoffAt = (await tx.query('SELECT clock_timestamp() AS cutoff')).rows[0].cutoff as Date;
                const raw = (await tx.query('SELECT monitoring.summary_inputs($1::date,$2::date) AS inputs', [dates.fromDate, dates.throughDate])).rows[0].inputs;
                const base = { ...dates, cutoffAt: cutoffAt.toISOString(), scope: 'currently-assigned-submissions' as const };
                if (raw === null)
                    return CheckInSummarySchema.parse({ ...base, state: 'unavailable', message: 'More than 1,000 assigned submissions are in scope. Choose a shorter range; partial counts are unavailable.', submissionCount: null, answers: null });
                const inputs = z.array(SupportCheckInSchema).max(1000).safeParse(raw);
                if (!inputs.success)
                    throw new ApiError(503, 'summary_unavailable', 'The recorded answers could not be validated.');
                const answers = { canMeetEssentials: { yes: 0, no: 0, declined: 0, unavailable: 0 }, borrowedToRepay: { yes: 0, no: 0, declined: 0, unavailable: 0 }, financialStrain: { reported: 0, not_reported: 0, declined: 0, unavailable: 0 } };
                for (const row of inputs.data) {
                    answers.canMeetEssentials[row.canMeetEssentials]++;
                    answers.borrowedToRepay[row.borrowedToRepay]++;
                    answers.financialStrain[row.financialStrain]++;
                }
                return CheckInSummarySchema.parse({ ...base, state: 'available', message: 'Submission counts for your current assignments, including original and corrected submissions. Repeated submissions are not unique members or measured outcomes.', submissionCount: inputs.data.length, answers });
            });
        });
    }
}
