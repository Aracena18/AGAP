import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('development-only decision preview loads browser-safe schemas with the intended fonts and responsive layout',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/src/features/decision/staff-preview.html');
  await expect(page.getByRole('heading',{name:'Current review basis'})).toBeVisible();
  await expect(page.getByText('Fictional UI simulation. This development preview is not a connected staff decision service or a sign-in flow.')).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>[...document.fonts].some(f=>f.family.includes('Google Sans')&&f.status==='loaded'))).toBe(true);
  for(const width of [1366,820,683,320]){
    await page.setViewportSize({width,height:768});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(width===1366||width===320)await page.screenshot({path:`docs/tasks/production/connected-lending-cl1/screenshots/simulated-decision-${width}.png`,fullPage:true});
  }
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  expect(errors).toEqual([]);
});
