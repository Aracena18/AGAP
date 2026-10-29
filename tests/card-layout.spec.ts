import { mkdir } from 'node:fs/promises';
import { expect,test,type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createDemoCases } from '../src/demo/cases';
import { signInStaff } from './staff-session';

async function capture(page:Page,name:string){if(process.env.AGAP_CARD_SCREENSHOTS){await mkdir('docs/screenshots/ui-card-refinement',{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`docs/screenshots/ui-card-refinement/${name}.png`,fullPage:true});}}
async function reviewSizes(page:Page,name:string){
  for(const width of [1101,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);await capture(page,`${name}-${width}`);}
}
test('source card keeps the complete statement and dated metadata while switching the linked field',async({page,context})=>{
  await signInStaff(context);await page.goto('/#/applications/AG-002/evidence#source-statement');
  const source=createDemoCases()[1].sources.find(item=>item.id==='statement')!,card=page.getByRole('complementary',{name:'Source details'});
  await expect(card.locator('blockquote')).toHaveText(source.excerpt);await expect(card.getByText('Member statement',{exact:true})).toBeVisible();await expect(card.getByText('Oct 20, 2026',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/View source for Rent:/}).click();await expect(card.locator('dd').filter({hasText:/^Rent$/})).toBeVisible();await expect(card.locator('blockquote')).toHaveText(source.excerpt);await reviewSizes(page,'source-card');
});
test('assignment keeps explicit MFA navigation and cancelling does not submit the request',async({page,context})=>{
  await signInStaff(context);const writes:string[]=[];page.on('request',request=>{if(request.method()==='POST')writes.push(request.url());});
  await page.goto('/#/staff/applications');await expect(page.getByRole('heading',{name:'Applications',exact:true})).toBeVisible();await expect(page.getByText('Loan intake',{exact:true})).toHaveCount(0);
  await page.getByRole('row').filter({hasText:'Other member private request'}).getByRole('button',{name:'Assign officer'}).click();
  const card=page.getByRole('region',{name:'Officer assignment',exact:true});await card.getByLabel('Reason for assignment').fill('Fictional layout review. No assignment is submitted.');
  await expect(card.getByRole('link',{name:'Verify assignment with authenticator'})).toHaveAttribute('href','/api/v1/auth/login?returnTo=%2Fstaff%2Fapplications&assurance=mfa');await expect(card.locator('footer').getByRole('link')).toHaveCount(0);
  await reviewSizes(page,'assignment');await card.getByRole('button',{name:'Cancel',exact:true}).click();await expect(card).toHaveCount(0);expect(writes).toEqual([]);
});
test('revocation retains its consequence and verification while Cancel leaves access active',async({page,context})=>{
  await signInStaff(context);const writes:string[]=[];page.on('request',request=>{if(request.method()==='POST')writes.push(request.url());});
  await page.goto('/#/staff/access');await expect(page.getByRole('heading',{name:'Staff access',exact:true})).toBeVisible();await expect(page.getByText('Administration',{exact:true})).toHaveCount(0);
  const row=page.getByRole('row').filter({hasText:'Fictional Auditor'});await row.getByRole('button',{name:'Review revocation'}).click();
  const card=page.getByRole('region',{name:'Revoke staff access',exact:true});await card.getByLabel('Reason for revoking access').fill('Fictional layout review. Access is not revoked.');await expect(card.getByText('Ends sessions and blocks sign-in.')).toBeVisible();
  await expect(card.getByRole('link',{name:'Verify revocation with authenticator'})).toHaveAttribute('href','/api/v1/auth/login?returnTo=%2Fstaff%2Faccess&assurance=mfa');await expect(card.locator('footer').getByRole('link')).toHaveCount(0);
  await reviewSizes(page,'revocation');await card.getByRole('button',{name:'Cancel',exact:true}).click();await expect(card).toHaveCount(0);await expect(row).toContainText('Active');expect(writes).toEqual([]);
});
