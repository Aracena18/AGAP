import { z } from 'zod';
import { Id, Text, CalendarDay, Instant, MoneyAmount, OfferSchema } from './common.js';
import { GuidanceResponse } from './guidance.js';
import { WorkflowScenario,WorkflowView } from './workflow.js';
export const PreparedReviewPacket=z.strictObject({
 id:Id,applicationId:Id,createdAt:Instant,origin:z.literal('fictional_preparation'),
 start:CalendarDay,end:CalendarDay,reserveCentavos:MoneyAmount,
 expense:z.strictObject({label:Text,date:CalendarDay,amountCentavos:MoneyAmount}).nullable(),
 requestedOfferId:Id,suggestedOfferId:Id,
 findings:z.array(z.strictObject({name:z.enum(['Character','Capacity','Capital','Collateral','Conditions']),status:z.enum(['recorded','needs_review','unavailable','not_required']),text:Text,sourceIds:z.array(Id)})).length(5).refine(items=>new Set(items.map(item=>item.name)).size===5,'Each of the five Cs must appear exactly once.'),
 recommendationDraft:Text,
});
export const PreparedComparison=z.strictObject({offer:OfferSchema,baseline:WorkflowScenario,whatIf:WorkflowScenario,passes:z.boolean()});
export const PreparedReview=z.discriminatedUnion('state',[
 z.strictObject({state:z.literal('absent')}),z.strictObject({state:z.literal('stale'),message:Text}),
 z.strictObject({state:z.literal('ready'),packet:PreparedReviewPacket,workflow:WorkflowView,guidance:GuidanceResponse,comparisons:z.array(PreparedComparison).min(1),
 attention:z.enum(['urgent','routine']),reason:Text,
 recommendation:z.strictObject({id:Id,offer:OfferSchema,recordedAt:Instant}).nullable()}),
]);
