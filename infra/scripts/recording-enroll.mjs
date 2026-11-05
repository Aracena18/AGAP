/** Local preparation only: finish normal authenticator enrollment before recording. */
import {chromium} from '@playwright/test';
import {readFile,writeFile,lstat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {createHmac} from 'node:crypto';
import assert from 'node:assert/strict';
const file=process.env.AGAP_RECORDING_MANIFEST??`${homedir()}/.cache/agap-recording/credentials.json`;
assert(((await lstat(file)).mode&0o077)===0);const manifest=JSON.parse(await readFile(file,'utf8'));assert(manifest.origin==='http://127.0.0.1:5186'&&manifest.format==='agap-recording-private-v1');
export function totp(secret){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',bits=secret.toUpperCase().replace(/[\s=]/g,'').split('').map(c=>alphabet.indexOf(c).toString(2).padStart(5,'0')).join(''),bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const hash=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=hash[19]&15;return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');}
const browser=await chromium.launch();let step='start';
try{for(const account of manifest.accounts.filter(a=>!a.roles||a.roles.includes('officer'))){const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(15000);step='password';await page.goto(manifest.origin+(!account.roles?'/api/v1/member/auth/login':'/api/v1/auth/login?assurance=mfa&returnTo=%2Fstaff%2Fmembers'));assert(new URL(page.url()).origin==='http://127.0.0.1:58080');await page.locator('#username').fill(account.email);await page.locator('#password').fill(account.password);await page.locator('#kc-login').click();
 step='normal authenticator enrollment or verification';await Promise.race([page.locator('#totp').waitFor(),page.locator('#otp').waitFor(),page.waitForURL(manifest.origin+'/**')]);
 if(await page.locator('#totp').isVisible()){await page.locator('#mode-manual').click();const secret=await page.locator('#kc-totp-secret-key').innerText();account.otpSecret=secret;await writeFile(file,JSON.stringify(manifest,null,2)+'\n',{mode:0o600});await page.locator('#totp').fill(totp(secret));await page.locator('#userLabel').fill('AGAP recording authenticator');await page.locator('#saveTOTPBtn').click();}else if(await page.locator('#otp').isVisible()){assert(account.otpSecret,'Existing authenticator preserved. Add its secret to the private manifest or sign in manually.');await page.locator('#otp').fill(totp(account.otpSecret));await page.locator('#kc-login').click();}
 await page.waitForURL(url=>new URL(url).origin===manifest.origin);await page.getByRole('heading').first().waitFor();await context.close();}
 console.log('Recording member and officer authenticators enrolled and verified through normal sign-in. Secrets remain only in the private local manifest.');
}catch(error){console.error(JSON.stringify({result:'failed',step,errorType:error.name,message:'Finish recording account enrollment through the normal local identity form.'}));process.exitCode=1;}finally{await browser.close();}
