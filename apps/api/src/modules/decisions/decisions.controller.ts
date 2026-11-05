import { Body, Controller, Get, Inject, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { DecisionRecordCreateSchema } from '../../../../../packages/contracts/src/schemas.js';
import { expectedVersion } from '../../platform/commands.js';
import { ApiError } from '../../platform/errors.js';
import { DecisionReviewService } from './decision-review.service.js';
import { DecisionsService } from './decisions.service.js';
import { DecisionStaffReads } from './staff-read.service.js';

export const DECISIONS=Symbol('DECISIONS');
export interface DecisionServices { reads:DecisionStaffReads; commands:DecisionsService; reviews:DecisionReviewService }
interface StaffRequest extends Request {staff?:{actor:ActorContext}}
function actor(r:StaffRequest){if(!r.staff)throw new ApiError(401,'authentication_required','Sign in to the staff workspace.');return r.staff.actor;}
const version=(r:Request)=>expectedVersion(r.headers['if-match']);
const key=(r:Request)=>r.headers['idempotency-key'];
@Controller()
export class DecisionsController {
  constructor(@Inject(DECISIONS) private readonly services:DecisionServices|null){}
  private get enabled(){if(!this.services)throw new ApiError(501,'module_not_available','Connected lending is not enabled in this environment.');return this.services;}
  @Get('applications/:id/decision-workspace') workspace(@Req() r:StaffRequest,@Param('id') id:string){return this.enabled.reads.workspace(actor(r),id);}
  @Get('applications/:id/decisions') history(@Req() r:StaffRequest,@Param('id') id:string,@Query() q:unknown){return this.enabled.reads.history(actor(r),id,q);}
  @Get('applications/:id/decisions/:decisionId') brief(@Req() r:StaffRequest,@Param('id') id:string,@Param('decisionId') decision:string){return this.enabled.reads.brief(actor(r),id,decision);}
  @Get('applications/:id/decisions/:decisionId/document') async document(@Req() r:StaffRequest,@Param('id') id:string,@Param('decisionId') decision:string,@Res() response:Response){
    const doc=await this.enabled.reads.document(actor(r),id,decision);
    response.setHeader('Content-Type',doc.mediaType);response.setHeader('Content-Length',doc.bytes.byteLength);
    response.setHeader('Content-Disposition',`attachment; filename="terms-${doc.id}.txt"`);
    response.setHeader('X-Content-SHA256',doc.sha256);response.setHeader('Cache-Control','private, no-store');response.status(200).send(doc.bytes);
  }
  @Post('applications/:id/recommendations') recommend(@Req() r:StaffRequest,@Param('id') id:string,@Body() b:unknown){return this.enabled.commands.recommend(actor(r),id,b,version(r),key(r));}
  @Post('applications/:id/decision-previews') preview(@Req() r:StaffRequest,@Param('id') id:string,@Body() b:unknown){return this.enabled.commands.preview(actor(r),id,b,version(r),key(r));}
  @Post('applications/:id/decisions') record(@Req() r:StaffRequest,@Param('id') id:string,@Body() b:unknown){const proof=DecisionRecordCreateSchema.parse(b);return this.enabled.commands.record(actor(r),id,proof.decision,version(r),key(r),proof.previewId);}
  @Get('applications/:id/decision-review') review(@Req() r:StaffRequest,@Param('id') id:string){return this.enabled.reviews.get(actor(r),id);}
  @Get('applications/:id/decision-review/events') events(@Req() r:StaffRequest,@Param('id') id:string,@Query() q:unknown){return this.enabled.reviews.history(actor(r),id,q);}
  @Post('applications/:id/review-reassignments') reassign(@Req() r:StaffRequest,@Param('id') id:string,@Body() b:unknown){return this.enabled.reviews.reassignPreparation(actor(r),id,b,version(r),key(r));}
  @Post('applications/:id/decision-review/conflicts') conflict(@Req() r:StaffRequest,@Param('id') id:string,@Body() b:unknown){return this.enabled.reviews.declare(actor(r),id,b,version(r),key(r));}
  @Post('applications/:id/decision-review/confirmations') confirm(@Req() r:StaffRequest,@Param('id') id:string,@Body() b:unknown){return this.enabled.reviews.confirm(actor(r),id,b,version(r),key(r));}
  @Post('applications/:id/decision-review/concerns') concern(@Req() r:StaffRequest,@Param('id') id:string,@Body() b:unknown){return this.enabled.reviews.raise(actor(r),id,b,version(r),key(r));}
  @Post('applications/:id/decision-review/concerns/:concernId/checks') check(@Req() r:StaffRequest,@Param('id') id:string,@Param('concernId') concern:string,@Body() b:unknown){return this.enabled.reviews.check(actor(r),id,concern,b,version(r),key(r));}
  @Post('applications/:id/decision-review/concerns/:concernId/assignments') assign(@Req() r:StaffRequest,@Param('id') id:string,@Param('concernId') concern:string,@Body() b:unknown){return this.enabled.reviews.assign(actor(r),id,concern,b,version(r),key(r));}
  @Post('applications/:id/decision-review/concerns/:concernId/dispositions') dispose(@Req() r:StaffRequest,@Param('id') id:string,@Param('concernId') concern:string,@Body() b:unknown){return this.enabled.reviews.dispose(actor(r),id,concern,b,version(r),key(r));}
  @Get('decision-notices') notices(@Req() r:StaffRequest,@Query() q:unknown){return this.enabled.reviews.notices(actor(r),q);}
  @Post('decision-notices/:noticeId/acknowledgments') acknowledge(@Req() r:StaffRequest,@Param('noticeId') id:string,@Body() b:unknown){return this.enabled.reviews.acknowledge(actor(r),id,b,key(r));}
}
