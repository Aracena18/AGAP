import { expect,test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { PriorityReviewPage } from '../packages/contracts/src/priority-review';
import { ApplicationSchema } from '../packages/contracts/src/schemas';
import { WorkflowView } from '../packages/contracts/src/workflow';
import { signInStaff } from './staff-session';

const id=(i:number)=>`10000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
const at='2026-11-05T02:00:00Z';
const dir='docs/screenshots/staff-queue-ux';
const members=['Fictional Review Member','Fictional Portal Member','Fictional Review Member'];
const queue=PriorityReviewPage.parse({asOf:at,nextCursor:null,items:members.map((memberName,i)=>({
 applicationId:id(i+1),memberName,applicationStatus:'evidence_review',applicationVersion:1,inputVersion:1,version:1,assignedOfficerId:i===2?null:id(7),queueEnteredAt:at,queueEntryBasis:'first_submission',asOf:at,
 attentionGroup:i===0?'substantiated_material':'other',positionReason:i===0?'Current human-confirmed material concern; then original waiting time and application ID.':'No unresolved substantiated material concern; original waiting time and application ID.',
 readiness:{ready:false,route:i===0?'escalated_review':i===1?'needs_clarification':'unavailable',materialHash:'a'.repeat(64),offerId:null,
 nextAction:i===0?'Assigned reviewer to inspect the confirmed concern.':i===1?'Clarify the missing income dates with the member.':'Obtain the missing configuration or responsible authority.',
 blockers:[{code:'assessment_missing',message:'Save a dated assessment from confirmed financial facts.',sourceId:null,concernId:null},{code:'recommendation_missing',message:'The assigned officer must record a current recommendation.',sourceId:null,concernId:null},{code:'conflict_missing',message:'The assigned officer must record current conflict clearance.',sourceId:null,concernId:null}]}
}))});

async function capture(page:import('@playwright/test').Page,prefix:string){
 await mkdir(dir,{recursive:true});
 for(const width of [1920,1366,768,320]){
  await page.setViewportSize({width,height:900});
  await page.getByRole('button',{name:/^Refresh (analysis )?queue$/}).focus();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path:`${dir}/${prefix}-${width}.png`,fullPage:true});
 }
}

test('review priority stays compact, reveals exact checks by keyboard and preserves server filter/paging/denial',async({page,context})=>{
 await signInStaff(context,'officer');
 // Controlled queue projections use genuine test sessions; no live case status is altered.
 await page.route('**/api/v1/session',async route=>{const response=await route.fetch();await route.fulfill({response,json:{...(await response.json()),fictionalPilot:true}});});
 let denied=false;const routes:string[]=[];
 await page.route('**/api/v1/review-queue**',route=>{
  const url=new URL(route.request().url());routes.push(url.searchParams.get('route')??'all');
  if(denied)return route.fulfill({status:403,json:{error:{code:'denied',message:'Review access was removed.',correlationId:id(99)}}});
  if(url.searchParams.get('route')==='unavailable')return route.fulfill({json:{...queue,items:[queue.items[2]]}});
  return route.fulfill({json:queue});
 });
 await page.goto('/#/staff/review-queue');await expect(page.getByRole('heading',{name:'3 applications',exact:true})).toBeVisible();
 await expect(page.getByText(queue.items[0].readiness.nextAction,{exact:true})).toBeVisible();
 await expect(page.getByText(queue.items[0].readiness.blockers[0].message,{exact:true}).first()).not.toBeVisible();
 await expect(page.getByText('Application · 10000000…0001',{exact:true})).toBeVisible();
 await expect(page.getByText('Application · 10000000…0003',{exact:true})).toBeVisible();
 await capture(page,'priority');
 await page.setViewportSize({width:1366,height:900});
 const first=page.getByRole('row').filter({hasText:'#1'});
 const details=first.getByText('3 checks to complete',{exact:true});await details.focus();await page.keyboard.press('Enter');
 await expect(first.getByText(queue.items[0].readiness.blockers[0].message,{exact:true})).toBeVisible();
 await expect(first.getByText(id(7),{exact:true})).toBeVisible();
 await expect(first.getByRole('link',{name:'Open review',exact:true})).toHaveAttribute('href',`#/staff/applications/${id(1)}/review`);
 await page.screenshot({path:`${dir}/priority-details-1366.png`,fullPage:true});
 await page.getByLabel('Next action',{exact:true}).selectOption('unavailable');
 await expect(page.getByRole('heading',{name:'1 application',exact:true})).toBeVisible();expect(routes).toContain('unavailable');
 denied=true;await page.getByRole('button',{name:'Refresh queue',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Review access was removed.');await expect(page.getByText(members[0],{exact:true})).toHaveCount(0);
});

test('analysis queue preserves ranked identities while search, attention counts and existing report links stay usable',async({page,context})=>{
 await signInStaff(context,'officer');
 const applications=members.map((memberName,i)=>ApplicationSchema.parse({id:id(i+1),organizationId:id(90),branchId:id(91),assessmentInputVersion:1,memberId:id(i+11),memberName,purpose:['Home repair','School expenses','Business supplies'][i],requestedPrincipalCentavos:3000000,requestedTermMonths:12,currency:'PHP',status:'submitted',version:1,assignedOfficerId:id(7),createdAt:at,updatedAt:at}));
 await page.route(/\/api\/v1\/applications(?:\?.*)?$/,route=>route.fulfill({json:{items:applications,nextCursor:null}}));
 await page.route('**/api/v1/applications/*/evidence',route=>{
  const appId=route.request().url().split('/applications/')[1].split('/')[0];
  if(appId===id(3))return route.fulfill({status:403,json:{error:{code:'evidence_denied',message:'Evidence access unavailable.',correlationId:id(99)}}});
  return route.fulfill({json:WorkflowView.parse({applicationId:appId,version:1,inputVersion:1,sources:[],facts:[],drafts:[],offers:[],latestAssessment:null,aiAvailable:false})});
 });
 await page.goto('/#/staff/analysis-queue');await expect(page.getByRole('heading',{name:'3 applications',exact:true})).toBeVisible();
 await expect(page.getByRole('option',{name:'Needs clarification (2)',exact:true})).toHaveCount(1);
 await capture(page,'analysis');
 for(const purpose of ['School expenses','Business supplies']){
  const detailRow=page.getByRole('row').filter({hasText:purpose});
  await detailRow.getByText('Review details',{exact:true}).focus();await page.keyboard.press('Enter');
  await expect(detailRow.getByText(id(7),{exact:true})).toBeVisible();
  await expect(detailRow.locator('details time')).toHaveAttribute('datetime',at);
  await expect(detailRow.locator('details time')).toContainText('10:00:00');
 }
 await page.setViewportSize({width:1366,height:900});await page.getByRole('button',{name:'Refresh analysis queue',exact:true}).focus();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${dir}/analysis-details-1366.png`,fullPage:true});
 await page.getByLabel('Find an application',{exact:true}).fill('School');
 await expect(page.getByRole('heading',{name:'1 application matching',exact:true})).toBeVisible();
 const row=page.getByRole('row').filter({hasText:'School expenses'});
 await expect(row).toContainText('#2');await expect(row.getByRole('link',{name:'Open 5C review',exact:true})).toHaveAttribute('href',`#/staff/applications/${id(2)}/analysis`);
 await page.getByLabel('Attention needed',{exact:true}).selectOption('routine');
 await expect(page.getByText('No active applications match. Try another search or attention filter.',{exact:true})).toBeVisible();
 await page.getByLabel('Attention needed',{exact:true}).selectOption('clarification');await expect(row).toBeVisible();
});
