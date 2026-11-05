import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { ApiError } from '../../platform/errors.js';
import { TrialBalanceService } from './trial-balance.service.js';
export const TRIAL_BALANCES = Symbol('TRIAL_BALANCES');
interface StaffRequest extends Request {
    staff?: {
        actor: ActorContext;
    };
}
function actor(r: StaffRequest) { if (!r.staff)
    throw new ApiError(401, 'authentication_required', 'Sign in to staff accounting.'); return r.staff.actor; }
@Controller('accounting/trial-balances')
export class TrialBalanceController {
    constructor(
    @Inject(TRIAL_BALANCES)
    private readonly service: TrialBalanceService) { }
    @Post()
    create(
    @Req()
    r: StaffRequest,
    @Body()
    body: unknown) { return this.service.create(actor(r), body, r.headers['idempotency-key']); }
    @Get()
    list(
    @Req()
    r: StaffRequest,
    @Query()
    q: unknown) { return this.service.list(actor(r), q); }
    @Get(':id')
    get(
    @Req()
    r: StaffRequest,
    @Param('id')
    id: string) { return this.service.get(actor(r), id); }
}
