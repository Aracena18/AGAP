import { readFile } from 'node:fs/promises';
import type { BrowserContext } from '@playwright/test';
export async function signInStaff(context:BrowserContext,key='administrator'){
  const fixture=JSON.parse(await readFile('.platform-test/browser.json','utf8')) as Record<string,string>;
  await context.addCookies([{name:'agap_session',value:fixture[key],url:`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`,httpOnly:true,sameSite:'Lax'}]);
}
