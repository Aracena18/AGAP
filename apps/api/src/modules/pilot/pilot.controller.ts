import { Body,Controller,Get,Inject,Param,Post,Query,Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ActorContext,MemberActorContext } from '../../../../../packages/contracts/src/ports.js';
import { expectedVersion } from '../../platform/commands.js';
import { ApiError } from '../../platform/errors.js';
import { businessDay } from '../servicing/command-rules.js';
import { PilotService } from './pilot.service.js';
export const PILOT=Symbol('PILOT');
interface PilotRequest extends Request{staff?:{actor:ActorContext};member?:{actor:MemberActorContext}}
@Controller()
export class PilotController{
 constructor(@Inject(PILOT) private readonly service:PilotService|null){}
 private get enabled(){if(!this.service)throw new ApiError(501,'module_not_available','The fictional lifecycle pilot is disabled.');return this.service;}
 private staff(r:PilotRequest){if(!r.staff)throw new ApiError(401,'authentication_required','Sign in to the staff workspace.');return r.staff.actor;}
 private member(r:PilotRequest){if(!r.member)throw new ApiError(401,'member_access_required','Sign in to the member workspace.');return r.member.actor;}
 @Get('pilot/financial-applications') moneyApplications(@Req()r:PilotRequest,@Query()query:unknown){return this.enabled.moneyApplications(this.staff(r),query);}
 @Get('applications/:id/pilot-money') moneyApplication(@Req()r:PilotRequest,@Param('id')id:string){return this.enabled.moneyApplication(this.staff(r),id);}
 @Get('applications/:id/pilot-workspace') workspace(@Req()r:PilotRequest,@Param('id')id:string){return this.enabled.workspace(this.staff(r),id);}
 @Post('applications/:id/pilot-conflicts') conflict(@Req()r:PilotRequest,@Param('id')id:string,@Body()body:unknown){return this.enabled.declareConflict(this.staff(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/pilot-recommendations') recommend(@Req()r:PilotRequest,@Param('id')id:string,@Body()body:unknown){return this.enabled.recommend(this.staff(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/pilot-decision-previews') preview(@Req()r:PilotRequest,@Param('id')id:string,@Body()body:unknown){return this.enabled.preview(this.staff(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/pilot-decisions') decision(@Req()r:PilotRequest,@Param('id')id:string,@Body()body:unknown){return this.enabled.record(this.staff(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/pilot-reopen') reopen(@Req()r:PilotRequest,@Param('id')id:string,@Body()body:unknown){return this.enabled.reopen(this.staff(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Get('applications/:id/pilot-decisions') history(@Req()r:PilotRequest,@Param('id')id:string){return this.enabled.history(this.staff(r),id);}
 @Get('applications/:id/pilot-decisions/:decisionId') saved(@Req()r:PilotRequest,@Param('id')id:string,@Param('decisionId')decisionId:string){return this.enabled.saved(this.staff(r),id,decisionId);}
 @Get('member/applications/:id/pilot-decision') memberDecision(@Req()r:PilotRequest,@Param('id')id:string){return this.enabled.memberDecision(this.member(r),id);}
 @Post('member/applications/:id/pilot-acceptances') accept(@Req()r:PilotRequest,@Param('id')id:string,@Body()body:unknown){return this.enabled.accept(this.member(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('pilot/originations') originate(@Req()r:PilotRequest,@Body()body:unknown){return this.enabled.originate(this.staff(r),body,r.headers['idempotency-key']);}
 @Post('pilot/loans/:id/disbursements') release(@Req()r:PilotRequest,@Param('id')id:string,@Body()body:unknown){return this.enabled.prepareRelease(this.staff(r),id,body,r.headers['idempotency-key']);}
 @Post('pilot/loans/:id/repayments') repayment(@Req()r:PilotRequest,@Param('id')id:string,@Body()body:unknown){return this.enabled.prepareRepayment(this.staff(r),id,body,r.headers['idempotency-key']);}
 @Get('pilot/commands/:id') read(@Req()r:PilotRequest,@Param('id')id:string){return this.enabled.readCommand(this.staff(r),id);}
 @Post('pilot/commands/:id/authorizations') authorize(@Req()r:PilotRequest,@Param('id')id:string){return this.enabled.authorize(this.staff(r),id,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('pilot/commands/:id/submissions') submit(@Req()r:PilotRequest,@Param('id')id:string){return this.enabled.submit(this.staff(r),id,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('pilot/commands/:id/simulations') simulate(@Req()r:PilotRequest,@Param('id')id:string,@Body()body:unknown){return this.enabled.simulate(this.staff(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('pilot/commands/:id/postings') finalize(@Req()r:PilotRequest,@Param('id')id:string){return this.enabled.finalize(this.staff(r),id,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Get('pilot/loans/:id') loan(@Req()r:PilotRequest,@Param('id')id:string,@Query('asOfDate')day?:string){return this.enabled.currentLoan(this.staff(r),id,day??businessDay(new Date().toISOString()));}
}
