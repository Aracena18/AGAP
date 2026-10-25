import { readFile } from 'node:fs/promises';
import { expect,test,type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Fixture={officer:string;auditor:string;administrator:string;target:string;branchId:string};
async function fixture():Promise<Fixture>{return JSON.parse(await readFile('.platform-test/browser.json','utf8'));}
async function signIn(context:BrowserContext,role:keyof Pick<Fixture,'officer'|'auditor'|'administrator'>){
  const data=await fixture();
  await context.addCookies([{name:'agap_session',value:data[role],url:`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`,httpOnly:true,sameSite:'Lax'}]);
}
test.describe('Server-backed staff workspace',()=>{
  // One persisted journey shares fictional records; restarting it requires a DB
  // reset, so do not replay it under CI's independent-demo-test retry policy.
  test.describe.configure({mode:'serial',retries:0});
  test('signed-out staff require a server session',async({page})=>{
    await page.goto('/#/staff');
    await expect(page.getByRole('heading',{name:'Sign in to your workspace'})).toBeVisible();
    await expect(page.getByRole('link',{name:'Sign in',exact:true})).toHaveAttribute('href','/api/v1/auth/login');
    await expect(page.getByRole('button',{name:'Add member'})).toHaveCount(0);
    await page.getByRole('link',{name:'Skip to main content'}).focus();await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();await expect(page).toHaveURL(/#\/staff$/);
  });
  test('officer saves a member and exact-centavo application that survive reload',async({page,context})=>{
    await signIn(context,'officer');await page.goto('/#/staff/members');
    await page.getByRole('button',{name:'Add member',exact:true}).click();
    await page.getByLabel('Full name').fill('Fictional Browser Member');
    await page.getByLabel('Cooperative member reference').fill('BROWSER-001');
    await page.getByLabel('The member has received').check();
    await page.getByRole('button',{name:'Save member',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'was added'})).toBeVisible();
    await page.getByRole('navigation',{name:'Staff workspace'}).getByRole('link',{name:'Applications'}).click();
    await page.getByRole('button',{name:'New application'}).click();
    await page.getByLabel('Member',{exact:true}).selectOption({label:'Fictional Browser Member · BROWSER-001'});
    await page.getByLabel('Loan purpose').fill('Fictional inventory purchase');
    await page.getByLabel('Requested amount (PHP)').fill('1234.567');
    await page.getByRole('button',{name:'Save application'}).click();
    await expect(page.getByRole('alert')).toContainText('two decimal places');
    await page.getByLabel('Requested amount (PHP)').fill('1234.56');
    await page.getByRole('button',{name:'Save application'}).click();
    await expect(page.getByRole('status').filter({hasText:'Application saved'})).toBeVisible();
    await page.reload();
    const row=page.getByRole('row').filter({hasText:'Fictional inventory purchase'});
    await expect(row).toContainText('1,234.56');await expect(row).toContainText('Draft');
    expect(await page.evaluate(()=>Object.keys(localStorage))).toEqual([]);
    if(process.env.AGAP_SCREENSHOTS)await page.screenshot({path:'docs/screenshots/platform/staff-applications.png',fullPage:true});
  });
  test('member correction persists and keeps the original server revision',async({page,context})=>{
    await signIn(context,'officer');await page.goto('/#/staff/members');
    await page.getByRole('row').filter({hasText:'BROWSER-001'}).getByRole('button',{name:'Update member'}).click();
    await page.getByLabel('Phone number (optional)').fill('Fictional contact updated');
    await page.getByRole('button',{name:'Save member',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'was updated'})).toBeVisible();
    await page.reload();await expect(page.getByRole('row').filter({hasText:'BROWSER-001'})).toContainText('Fictional contact updated');
    if(process.env.AGAP_SCREENSHOTS)await page.screenshot({path:'docs/screenshots/platform/staff-members.png',fullPage:true});
  });
  test('lost success response freezes edits and retries the same command once',async({page,context})=>{
    await signIn(context,'officer');await page.goto('/#/staff/members');
    let first=true;const keys:string[]=[];
    await page.route('**/api/v1/members',async route=>{
      if(route.request().method()!=='POST'){await route.continue();return;}
      keys.push(route.request().headers()['idempotency-key']);
      if(first){first=false;await route.fetch();await route.abort('failed');}else await route.continue();
    });
    await page.getByRole('button',{name:'Add member',exact:true}).click();
    await page.getByLabel('Full name').fill('Fictional Retry Member');
    await page.getByLabel('Cooperative member reference').fill('BROWSER-RETRY');
    await page.getByLabel('The member has received').check();
    await page.getByRole('button',{name:'Save member',exact:true}).click();
    await expect(page.getByRole('button',{name:'Retry same submission'})).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeDisabled();
    await page.getByRole('button',{name:'Retry same submission'}).click();
    await expect(page.getByRole('status').filter({hasText:'was added'})).toBeVisible();
    expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
    await expect(page.getByRole('row').filter({hasText:'BROWSER-RETRY'})).toHaveCount(1);
  });
  test('unsaved navigation can be cancelled',async({page,context})=>{
    await signIn(context,'officer');await page.goto('/#/staff/members');
    await page.getByRole('button',{name:'Add member',exact:true}).click();
    await page.getByLabel('Full name').fill('Unsaved fictional person');
    page.once('dialog',dialog=>dialog.dismiss());
    await page.getByRole('link',{name:'Applications',exact:true}).click();
    await expect(page.getByLabel('Full name')).toHaveValue('Unsaved fictional person');
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('link',{name:'Applications',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Applications',exact:true})).toBeVisible();
  });
  test('auditor has read access without write controls and small-screen overflow',async({page,context})=>{
    await signIn(context,'auditor');await page.setViewportSize({width:320,height:800});
    await page.goto('/#/staff/members');
    await expect(page.getByRole('row').filter({hasText:'BROWSER-001'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Add member'})).toHaveCount(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  });
  test('administrator revocation ends another staff session',async({page,context})=>{
    await signIn(context,'administrator');await page.goto('/#/staff/access');
    await page.getByRole('row').filter({hasText:'Fictional Verifier'}).getByRole('button',{name:'Review revocation'}).click();
    await page.getByLabel('Reason for revoking access').fill('Fictional training access ended.');
    await page.getByRole('button',{name:'Revoke access',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Existing sessions have ended'})).toBeVisible();
    await expect(page.getByRole('row').filter({hasText:'Fictional Verifier'})).toContainText('Revoked');
    const data=await fixture();
    const response=await fetch(`http://127.0.0.1:${process.env.AGAP_E2E_API_PORT??4101}/api/v1/session`,{headers:{cookie:`agap_session=${data.target}`}});
    expect(response.status).toBe(401);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    if(process.env.AGAP_SCREENSHOTS)await page.screenshot({path:'docs/screenshots/platform/staff-access.png',fullPage:true});
  });
});
