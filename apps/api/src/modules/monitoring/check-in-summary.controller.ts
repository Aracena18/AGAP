import { Controller, Get, Inject, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { ApiError } from '../../platform/errors.js';
import { CheckInSummaryService } from './support-expansion.service.js';
export const CHECK_IN_SUMMARY = Symbol('CHECK_IN_SUMMARY');
@Controller('check-in-summary')
export class CheckInSummaryController {
    constructor(
    @Inject(CHECK_IN_SUMMARY)
    private readonly service: CheckInSummaryService) { }
    @Get()
    get(
    @Req()
    request: Request & {
        staff?: {
            actor: ActorContext;
        };
    },
    @Query()
    query: unknown) { if (!request.staff)
        throw new ApiError(401, 'authentication_required', 'Sign in to staff support.'); return this.service.get(request.staff.actor, query); }
}
