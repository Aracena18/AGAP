import { Body, Controller, Get, Inject, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { expectedVersion } from '../../platform/commands.js';
import { ApiError } from '../../platform/errors.js';
import { ReviewService } from './reviews.service.js';
export const REVIEWS=Symbol('REVIEWS');
interface ReviewRequest extends Request {staff?:{actor:ActorContext}}
@Controller()
export class ReviewsController {
 constructor(@Inject(REVIEWS) private readonly service:ReviewService|null){}
 private get enabled(){if(!this.service)throw new ApiError(501,'module_not_available','Priority review is not enabled in this environment.');return this.service;}
 private actor(r:ReviewRequest){if(!r.staff)throw new ApiError(401,'authentication_required','Sign in to the staff workspace.');return r.staff.actor;}
 @Get('review-queue')queue(@Req() r:ReviewRequest,@Query() query:unknown){return this.enabled.queue(this.actor(r),query);}
 @Get('applications/:id/review-summary')summary(@Req() r:ReviewRequest,@Param('id') id:string){return this.enabled.summary(this.actor(r),id);}
 @Get('applications/:id/review-history')history(@Req() r:ReviewRequest,@Param('id') id:string){return this.enabled.history(this.actor(r),id);}
 @Get('applications/:id/eligible-reviewers')reviewers(@Req() r:ReviewRequest,@Param('id') id:string){return this.enabled.reviewers(this.actor(r),id);}
 @Post('applications/:id/source-reviews')review(@Req() r:ReviewRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.request(this.actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/rule-concerns')rule(@Req() r:ReviewRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.rule(this.actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/source-review-recoveries')recover(@Req()r:ReviewRequest,@Param('id')id:string,@Body()body:unknown){return this.enabled.recover(this.actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/concern-checks')check(@Req() r:ReviewRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.check(this.actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/escalations')assign(@Req() r:ReviewRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.assign(this.actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Post('applications/:id/escalation-dispositions')disposition(@Req() r:ReviewRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.disposition(this.actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
 @Get('review-notices')notices(@Req() r:ReviewRequest){return this.enabled.notices(this.actor(r));}
 @Post('review-notices/:id/acknowledgments')acknowledge(@Req() r:ReviewRequest,@Param('id') id:string,@Body() body:unknown){return this.enabled.acknowledge(this.actor(r),id,body,expectedVersion(r.headers['if-match']),r.headers['idempotency-key']);}
}
