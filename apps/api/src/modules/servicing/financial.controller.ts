import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { expectedVersion } from '../../platform/commands.js';
import { ApiError } from '../../platform/errors.js';
import { FinancialActions } from './financial-actions.service.js';
import { LendingReads } from './lending-reads.service.js';
import { LoanReads } from './loan-reads.js';
export const FINANCIAL=Symbol('FINANCIAL');
export interface FinancialServices { actions:FinancialActions; applications:LendingReads; loans:LoanReads }
interface StaffRequest extends Request {staff?:{actor:ActorContext}}
function actor(r:StaffRequest){if(!r.staff)throw new ApiError(401,'authentication_required','Sign in to the staff workspace.');return r.staff.actor;}
const version=(r:Request)=>expectedVersion(r.headers['if-match']);
const key=(r:Request)=>r.headers['idempotency-key'];
@Controller()
export class FinancialController {
  constructor(@Inject(FINANCIAL) private readonly services:FinancialServices|null){}
  private get enabled(){if(!this.services)throw new ApiError(501,'module_not_available','Connected fictional financial operations are not enabled.');return this.services;}
  @Get('lending-applications') applications(@Req() r:StaffRequest,@Query() q:unknown){return this.enabled.applications.list(actor(r),q);}
  @Get('loans/:id/workspaces/:asOfDate') workspace(@Req() r:StaffRequest,@Param('id') id:string,@Param('asOfDate') day:string){return this.enabled.loans.workspace(actor(r),id,day);}
  @Post('loans/:id/release-preparations') prepare(@Req() r:StaffRequest,@Param('id') id:string,@Body() b:unknown){return this.enabled.actions.prepare(actor(r),id,b,key(r));}
  @Post('loans/:id/repayment-preparations') repayment(@Req() r:StaffRequest,@Param('id') id:string,@Body() b:unknown){return this.enabled.actions.prepareRepayment(actor(r),id,b,key(r));}
  @Post('loans/:id/commands/:commandId/authorizations') authorize(@Req() r:StaffRequest,@Param('id') id:string,@Param('commandId') command:string,@Body() b:unknown){return this.enabled.actions.transition(actor(r),id,command,b,version(r),key(r),'authorize');}
  @Post('loans/:id/commands/:commandId/submission-intents') submit(@Req() r:StaffRequest,@Param('id') id:string,@Param('commandId') command:string,@Body() b:unknown){return this.enabled.actions.transition(actor(r),id,command,b,version(r),key(r),'submit');}
  @Post('loans/:id/commands/:commandId/simulated-settlements') settle(@Req() r:StaffRequest,@Param('id') id:string,@Param('commandId') command:string,@Body() b:unknown){return this.enabled.actions.settlement.record(actor(r),id,command,b,version(r),key(r));}
  @Post('loans/:id/commands/:commandId/simulation-status-checks') status(@Req() r:StaffRequest,@Param('id') id:string,@Param('commandId') command:string,@Body() b:unknown){return this.enabled.actions.settlement.record(actor(r),id,command,b,version(r),key(r),true);}
  @Post('loans/:id/commands/:commandId/finalizations') finalize(@Req() r:StaffRequest,@Param('id') id:string,@Param('commandId') command:string,@Body() b:unknown){return this.enabled.actions.finalize(actor(r),id,command,b,version(r),key(r));}
}
