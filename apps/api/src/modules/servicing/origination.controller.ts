import { Body, Controller, Inject, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ActorContext } from '../../../../../packages/contracts/src/ports.js';
import { CommandReceiptSchema, OriginationCreateSchema } from '../../../../../packages/contracts/src/schemas.js';
import { ApiError } from '../../platform/errors.js';
import { ServicingService } from './servicing.service.js';
export const ORIGINATION=Symbol('ORIGINATION');
interface StaffRequest extends Request {staff?:{actor:ActorContext}}
@Controller()
export class OriginationController {
  constructor(@Inject(ORIGINATION) private readonly service:ServicingService|null){}
  @Post('applications/:id/originations') async create(@Req() r:StaffRequest,@Param('id') id:string,@Body() input:unknown){
    if(!this.service)throw new ApiError(501,'module_not_available','Connected fictional origination is not enabled.');
    if(!r.staff)throw new ApiError(401,'authentication_required','Sign in to the staff workspace.');
    const pending=await this.service.originate(r.staff.actor,id,OriginationCreateSchema.parse(input),r.headers['idempotency-key']);
    return CommandReceiptSchema.parse({id:pending.id,version:1});
  }
}
