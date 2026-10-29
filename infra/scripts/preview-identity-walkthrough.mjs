import { chromium } from '@playwright/test';
import { createHmac,randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const origin='http://127.0.0.1:5174',provider='http://127.0.0.1:58080',subject='10000000-0000-4000-8000-000000000003',runId=randomUUID(),label=`AGAP preview verification ${runId}`;
let step='environment';
function totp(base32){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',bits=base32.toUpperCase().replace(/[\s=]/g,'').split('').map(char=>{assert(alphabet.includes(char));return alphabet.indexOf(char).toString(2).padStart(5,'0');}).join(''),bytes=[];
  for(let offset=0;offset+8<=bits.length;offset+=8)bytes.push(parseInt(bits.slice(offset,offset+8),2));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const hash=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=hash[19]&15;
  return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
async function main(){
  assert(process.env.NODE_ENV==='development'&&process.env.LOCAL_PREVIEW_PASSWORD_ONLY==='true'&&process.env.PUBLIC_ORIGIN===origin&&process.env.OIDC_ISSUER===`${provider}/realms/agap`,'Requires the explicit fictional localhost preview.');
  const auth=await fetch(`${provider}/realms/master/protocol/openid-connect/token`,{method:'POST',body:new URLSearchParams({grant_type:'password',client_id:'admin-cli',username:'local-admin',password:'development-admin'})});assert(auth.ok);
  const {access_token:token}=await auth.json();
  async function admin(path,method='GET',body){const response=await fetch(`${provider}/admin/realms/agap${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});assert(response.ok);return response;}
  assert.equal((await (await admin('')).json()).displayName,'AGAP fictional training');
  const user=await (await admin(`/users/${subject}`)).json(),credentials=await (await admin(`/users/${subject}/credentials`)).json();
  assert(user.username==='administrator'&&credentials.every(item=>item.type!=='otp'),'Existing authenticators are preserved; this optional drill requires an unenrolled fictional administrator.');
  const browser=await chromium.launch(),context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(15000);let enrolled=false;
  try{
    step='password-only preview';await page.goto(`${origin}/#/applications`);await page.getByRole('link',{name:'Sign in',exact:true}).click();
    assert.equal(new URL(page.url()).origin,provider);await page.locator('#username').fill('administrator');await page.locator('#password').fill('Fictional-training-123!');await page.locator('#kc-login').click();await page.waitForURL(`${origin}/#/applications`);await page.getByRole('heading',{name:'Loan applications',exact:true}).waitFor();
    async function selfRevocationCode(){return page.evaluate(async()=>{const session=await (await fetch('/api/v1/session')).json(),response=await fetch(`/api/v1/staff/${session.user.id}/revocations`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken,'If-Match':'"1"','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({reason:'Fictional preview assurance verification'})});return {status:response.status,code:(await response.json()).error.code};});}
    assert.deepEqual(await selfRevocationCode(),{status:403,code:'fresh_mfa_required'});
    step='explicit MFA step-up';await page.goto(`${origin}/api/v1/auth/login?assurance=mfa&returnTo=%2Fstaff%2Faccess`);
    await page.locator('#username').fill('administrator');await page.locator('#password').fill('Fictional-training-123!');await page.locator('#kc-login').click();await page.locator('#totp').waitFor();
    const manual=page.locator('#mode-manual');if(await manual.isVisible())await manual.click();
    const secret=await page.locator('#kc-totp-secret-key').innerText();await page.locator('#totp').fill(totp(secret));await page.locator('#userLabel').fill(label);enrolled=true;await page.locator('[type="submit"]').click();await page.waitForURL(`${origin}/#/staff/access`);
    assert.deepEqual(await selfRevocationCode(),{status:403,code:'self_revocation_forbidden'});
    step='account menu and sign-out';await page.getByRole('button',{name:/Account menu for/}).click();await page.getByRole('menuitem',{name:'Sign out',exact:true}).click();await page.getByRole('heading',{name:'Sign in to your workspace',exact:true}).waitFor();assert.equal((await context.request.get(`${origin}/api/v1/session`)).status(),401);
    await page.goto(`${origin}/#/applications`);await page.getByRole('heading',{name:'Sign in to review',exact:true}).waitFor();
  }finally{
    // End any AGAP session on failure without saving its cookie or CSRF token.
    try{const session=await context.request.get(`${origin}/api/v1/session`);if(session.ok()){const data=await session.json();await context.request.post(`${origin}/api/v1/auth/logout`,{headers:{Origin:origin,'X-CSRF-Token':data.csrfToken}});}}catch{/* best effort; provider cleanup still runs */}
    await browser.close();
    if(enrolled){for(const credential of await (await admin(`/users/${subject}/credentials`)).json())if(credential.type==='otp'&&credential.userLabel===label)await admin(`/users/${subject}/credentials/${credential.id}`,'DELETE');await admin(`/users/${subject}`,'PUT',{requiredActions:user.requiredActions??[]});await admin(`/users/${subject}/logout`,'POST');assert((await (await admin(`/users/${subject}/credentials`)).json()).every(credential=>credential.userLabel!==label),'Temporary authenticator cleanup did not complete.');}
  }
  const evidence={executedAt:new Date().toISOString(),result:'passed',fictional:true,runId,keycloakVersion:'26.4.7',passwordOnlyStaffLogin:true,privilegedActionDeniedWithoutMfa:true,explicitSignedMfaStepUp:true,serverSelfRevocationGuardPreserved:true,realAccountMenuSignOut:true,localSessionEnded:true,reviewRoutesRequireSession:true,temporaryAuthenticatorRemoved:true,secretsWrittenToArtifacts:false};
  await writeFile('docs/AGAP_UI_Preview_Identity.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
}
void main().catch(error=>{console.error(JSON.stringify({result:'failed',step,errorType:error.name,message:'Check the fictional local preview. No tokens, credentials or OTP secrets were logged.'}));process.exitCode=1;});
