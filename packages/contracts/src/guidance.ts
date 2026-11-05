import { z } from 'zod';
import { Id, Version, Text, CalendarDay, Instant, MoneyAmount, SourceReferenceSchema } from './common.js';
import { WorkflowFactInput, type WorkflowView } from './workflow.js';

export const GuidanceField = z.enum(['relevance','amount','effectiveDate','coverageStart','coverageEnd','cashDates','period','basis','deduction']);
export const GuidanceAnswer = z.discriminatedUnion('status', [
  z.strictObject({status:z.literal('answered'),value:z.union([MoneyAmount,Text,z.array(CalendarDay).min(1).max(366)])}),
  z.strictObject({status:z.literal('unknown'),value:z.null()}),
  z.strictObject({status:z.literal('declined'),value:z.null()}),
]);
export const GuidanceQuestion = z.strictObject({
  id:Text,field:GuidanceField,label:Text,why:Text,required:z.boolean(),kind:z.enum(['amount','date','dates','choice']),
  choices:z.array(z.strictObject({value:Text,label:Text})),answer:GuidanceAnswer.nullable(),
});
export const GuidanceItem = z.strictObject({
  draftId:Id,source:SourceReferenceSchema,textVersionId:Id,sourceLabel:Text,origin:z.enum(['model','simulated']),
  title:Text,summary:Text,current:z.boolean(),reviewState:z.enum(['suggested','accepted','rejected']),
  questions:z.array(GuidanceQuestion),actions:z.array(z.enum(['answer','confirm','not_applicable','inspect_source'])),
});
export const GuidanceEvent = z.strictObject({id:Id,draftId:Id,questionId:Text,sourceVersion:Version,textVersionId:Id,answer:GuidanceAnswer,recordedAt:Instant,actorKind:z.enum(['member','staff'])});
export const GuidanceResponse = z.strictObject({schemaVersion:z.literal(1),applicationId:Id,applicationVersion:Version,version:Version,items:z.array(GuidanceItem),history:z.array(GuidanceEvent)});
export const GuidanceResponseCreate = z.strictObject({draftId:Id,questionId:Text,sourceVersion:Version,textVersionId:Id,applicationVersion:Version,answer:GuidanceAnswer});
export const guidanceSchemas={GuidanceResponse,GuidanceResponseCreate,GuidanceQuestion};
export type GuidanceQuestionType=z.output<typeof GuidanceQuestion>;
export type GuidanceItemType=z.output<typeof GuidanceItem>;
export type GuidanceResponseType=z.output<typeof GuidanceResponse>;
export type GuidanceEventType=z.output<typeof GuidanceEvent>;
type Draft=z.output<typeof WorkflowView>['drafts'][number];
type Field=z.output<typeof GuidanceField>;
const choice=(value:string,label:string)=>({value,label});

/** Authored questions from canonical missingness. No model-generated controls or inferred dates. */
export function questionsFor(draft:Draft):GuidanceQuestionType[]{
  const f=draft.suggestion;
  const questions:GuidanceQuestionType[]=[];
  const add=(field:Field,label:string,why:string,kind:GuidanceQuestionType['kind'],choices:GuidanceQuestionType['choices']=[],required=true)=>questions.push({id:`${draft.id}:${draft.textVersionId}:${field}`,field,label,why,required,kind,choices,answer:null});
  add('relevance','Does this information apply to your household?','A document can mention a cost or amount that does not apply to your circumstances.','choice',[choice('included','Yes, it applies'),choice('not_applicable','No, it does not apply')]);
  add('amount',f.category==='opening'?'How much spendable cash was available?':f.category==='income'?'How much income does this payment provide?':'What is the amount for each payment?','Check the proposed amount against the source. Correct it if needed; an unknown amount stays unavailable.','amount');
  add('effectiveDate','As of what date is this information correct?','This is the date the information applies, which can differ from a payment date.','date',[],!f.effectiveDate);
  add('cashDates',f.category==='income'?'On which dates will you receive this income?':f.category==='opening'?'On which date was this cash available?':'On which dates do you expect to pay this?','Only dates you explicitly confirm enter the cash-flow review. A past payment does not establish a future one.','dates',[],!f.cashDates.length);
  if(f.category!=='opening'){
    add('coverageStart','When does the period you can confirm start?','Staff need to know which period this information covers.','date',[],!f.coverageStart);
    add('coverageEnd','When does that confirmed period end?','Do not extend the period beyond what you can support.','date',[],!f.coverageEnd);
  }
  add('period','What period does this amount describe?','Choosing a period does not create future payment dates. Confirm those separately.','choice',[choice('one_time','One payment only'),choice('weekly','Weekly'),choice('semi_monthly','Twice a month'),choice('monthly','Monthly'),choice('other','Another period')],f.period==='unknown');
  if(f.category==='income')add('basis','Is this take-home income or income before deductions?','Only supported take-home income can be treated as spendable income.','choice',[choice('net','Take-home income'),choice('gross','Before deductions')],f.basis==='unknown');
  if(f.category==='obligation')add('deduction','Is this debt payment already taken out of your take-home income?','This helps staff avoid counting the same debt payment twice.','choice',[choice('yes','Yes, already deducted'),choice('no','No, paid separately')],f.deduction==='unknown');
  return questions;
}

export function validGuidanceAnswer(question:GuidanceQuestionType,answer:z.output<typeof GuidanceAnswer>):boolean{
  if(answer.status!=='answered')return true;
  if(question.kind==='amount')return MoneyAmount.safeParse(answer.value).success;
  if(question.kind==='date')return CalendarDay.safeParse(answer.value).success;
  if(question.kind==='dates')return z.array(CalendarDay).min(1).max(366).safeParse(answer.value).success&&Array.isArray(answer.value)&&new Set(answer.value).size===answer.value.length;
  return question.choices.some(option=>option.value===answer.value);
}

/** Confirmation still passes through WorkflowFactInput and the existing financial command. */
export function clarifiedFact(draft:Draft,questions:GuidanceQuestionType[],reason:string){
  const fact={...draft.suggestion,reason};
  for(const q of questions){
    if(!q.answer){if(q.required)return null;continue;}
    if(q.answer.status!=='answered')return null;
    const v=q.answer.value;
    if(q.field==='amount')fact.value={availability:'recorded',amountCentavos:v as number};
    else if(q.field==='cashDates')fact.cashDates=[...(v as string[])].sort();
    else Object.assign(fact,{[q.field]:v});
  }
  // These concepts do not apply to non-income/non-debt fields; no financial value is inferred.
  if(fact.category!=='income'&&fact.basis==='unknown')fact.basis='not_applicable';
  if(fact.category!=='obligation'&&fact.deduction==='unknown')fact.deduction='no';
  const parsed=WorkflowFactInput.safeParse(fact);
  return parsed.success?parsed.data:null;
}
