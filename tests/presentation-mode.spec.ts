import { test,expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.skip(process.env.AGAP_E2E_PRESENTATION!=='1','Requires the explicitly enabled fictional presentation test server.');
test('member, staff and review open automatically and retain real private-session boundaries',async({page,context})=>{
  const loginRequests:string[]=[];
  page.on('request',request=>{if(/\/auth\/login/.test(request.url()))loginRequests.push(request.url());});
  await page.goto('/#/member');
  await expect(page.getByRole('navigation',{name:'Member account'})).toBeVisible();
  await expect(page.getByText('Presentation mode',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Sign in',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Account menu/})).toHaveCount(0);
  await page.reload();await expect(page.getByRole('navigation',{name:'Member account'})).toBeVisible();
  await expect(page.getByRole('button',{name:/Switch workspace/})).toHaveCount(0);
  await page.goto('/#/staff/applications');
  await expect(page.getByRole('navigation',{name:'Staff workspace'})).toBeVisible();
  await page.getByRole('button',{name:/Switch workspace/}).click();
  await page.getByRole('menuitem',{name:'Review demo',exact:true}).click();
  await expect(page.getByRole('table',{name:'Fictional loan applications and review progress'})).toBeVisible();
  await page.getByRole('link',{name:'Review Ana Dela Cruz',exact:true}).click();
  await page.getByRole('navigation',{name:'Application review'}).getByRole('link',{name:'Compare options'}).click();
  await expect(page).toHaveURL(/\/comparison$/);
  const cookies=await context.cookies();
  for(const name of ['agap_session','agap_member_session']){const cookie=cookies.find(item=>item.name===name)!;expect(cookie.value.startsWith('presentation.')).toBe(true);expect(cookie.httpOnly).toBe(true);}
  expect(loginRequests).toEqual([]);
});
test('presentation headers and member tasks reflow without authentication controls',async({page})=>{
  for(const width of [320,683,1263]){
    await page.setViewportSize({width,height:900});
    for(const path of ['/member','/staff/applications','/applications']){
      await page.goto(`/#${path}`);
      await expect(page.getByText('Presentation mode',{exact:true})).toBeVisible();
      await expect(page.getByRole('link',{name:'Sign in',exact:true})).toHaveCount(0);
      await expect(page.getByRole('button',{name:/Account menu/})).toHaveCount(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
      if(process.env.AGAP_PRESENTATION_SCREENSHOTS)await page.screenshot({path:`docs/screenshots/presentation-mode/${path.slice(1).replace('/','-')}-${width}.png`,fullPage:true});
    }
  }
});
for(const [path,endpoint,landmark] of [['/member','member/session','Member account'],['/staff/applications','session','Staff workspace']]){
  test(`presentation entry refreshes automatically at session expiry: ${path}`,async({page})=>{
    await page.clock.install();
    let shortExpiry=true,reads=0;
    await page.route(`**/api/v1/${endpoint}`,async route=>{
      reads++;
      const response=await route.fetch();
      const body=await response.json();
      await route.fulfill({response,json:{...body,...(shortExpiry?{expiresAt:new Date(Date.now()+1000).toISOString()}:{})}});
    });
    await page.goto(`/#${path}`);
    await expect(page.getByRole('navigation',{name:landmark,exact:true})).toBeVisible();
    const before=reads;shortExpiry=false;
    await page.clock.fastForward(2000);
    await expect.poll(()=>reads).toBeGreaterThan(before);
    await expect(page.getByRole('navigation',{name:landmark,exact:true})).toBeVisible();
    await expect(page.getByRole('link',{name:'Sign in',exact:true})).toHaveCount(0);
  });
}
