import { chromium } from '@playwright/test';
import { createHmac,randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Optional localhost-only check against the imported fictional realm. It enrolls
// the fictional administrator temporarily, then removes that OTP credential so
// the developer can enroll their own authenticator. No OTP secret/token is saved.
const origin='http://127.0.0.1:5174',provider='http://127.0.0.1:58080',subject='10000000-0000-4000-8000-000000000003';
const temporaryLabel=`AGAP UI verification ${randomUUID()}`;
let step='environment';
function totp(base32){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits=base32.toUpperCase().replace(/[\s=]/g,'').split('').map(char=>{assert(alphabet.includes(char),'Invalid OTP encoding.');return alphabet.indexOf(char).toString(2).padStart(5,'0');}).join('');
  const bytes=[];for(let offset=0;offset+8<=bits.length;offset+=8)bytes.push(parseInt(bits.slice(offset,offset+8),2));
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const hash=createHmac('sha1',Buffer.from(bytes)).update(counter).digest(),offset=hash[19]&15;
  return String((hash.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0');
}
async function main(){
  assert(process.env.NODE_ENV==='development'&&process.env.PUBLIC_ORIGIN===origin&&process.env.OIDC_ISSUER===`${provider}/realms/agap`,'Only the fictional localhost environment is allowed.');
  step='local provider readiness';
  for(let attempt=0;attempt<60;attempt++){
    try{if((await fetch(`${provider}/realms/agap/.well-known/openid-configuration`)).ok)break;}catch{/* initial container startup */}
    assert(attempt<59,'Local identity provider did not start.');await new Promise(done=>setTimeout(done,500));
  }
  const auth=await fetch(`${provider}/realms/master/protocol/openid-connect/token`,{method:'POST',body:new URLSearchParams({grant_type:'password',client_id:'admin-cli',username:'local-admin',password:'development-admin'})});
  assert(auth.ok,'Local development operator sign-in failed.');const token=(await auth.json()).access_token;
  const admin=async(path,method='GET',body)=>{
    const result=await fetch(`${provider}/admin/realms/agap${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    assert(result.ok,`Local provider setup request failed (${result.status}).`);return result;
  };
  assert((await (await admin('')).json()).displayName==='AGAP fictional training','Unexpected realm; refusing to modify credentials.');
  const user=await (await admin(`/users/${subject}`)).json();assert(user.username==='administrator'&&(await (await admin(`/users/${subject}/credentials`)).json()).every(item=>item.type!=='otp'),'Expected fictional administrator without an existing authenticator.');
  const browser=await chromium.launch();let enrolled=false,success=false,page;const originalActions=user.requiredActions??[];
  try{
    page=await browser.newPage();page.setDefaultTimeout(15000);step='password sign-in';
    await page.goto(`${origin}/api/v1/auth/login?assurance=mfa&returnTo=%2Fstaff%2Fmembers`);
    assert(new URL(page.url()).origin===provider,'Unexpected identity origin.');
    await page.locator('#username').fill('administrator');await page.locator('#password').fill('Fictional-training-123!');await page.locator('#kc-login').click();
    step='OTP enrollment';
    const manual=page.locator('#mode-manual');if(await manual.isVisible())await manual.click();
    const secret=await page.locator('#kc-totp-secret-key').innerText();
    await page.locator('#totp').fill(totp(secret));
    if(await page.locator('#userLabel').isVisible())await page.locator('#userLabel').fill(temporaryLabel);
    enrolled=true;await page.locator('[type="submit"]').click();
    step='staff session and signed MFA guard';
    await page.waitForURL(`${origin}/#/staff/members`);
    const result=await page.evaluate(async()=>{
      const session=await (await fetch('/api/v1/session')).json();
      const response=await fetch(`/api/v1/staff/${session.user.id}/revocations`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':session.csrfToken,'If-Match':'"1"','Idempotency-Key':crypto.randomUUID()},body:JSON.stringify({reason:'Fictional MFA and self-revocation verification'})});
      return {roles:session.user.roles,status:response.status,code:(await response.json()).error.code};
    });
    assert.deepEqual(result.roles,['administrator']);assert.equal(result.status,403);assert.equal(result.code,'self_revocation_forbidden','The real signed identity did not pass the fresh-MFA guard.');
    await page.getByRole('button',{name:/Account menu for/}).click();await page.getByRole('menuitem',{name:'Sign out',exact:true}).click();await page.getByRole('heading',{name:'Sign in to your workspace'}).waitFor();
    assert.equal(await page.evaluate(async()=>(await fetch('/api/v1/session')).status),401);
    success=true;
  }catch(error){
    if(page){let apiCode;try{apiCode=JSON.parse(await page.locator('body').innerText()).error?.code;}catch{/* identity HTML is never logged */}console.error(JSON.stringify({step,errorType:error.name,path:new URL(page.url()).pathname,apiCode,headings:await page.locator('h1,h2').allTextContents(),fieldIds:await page.locator('input,button').evaluateAll(fields=>fields.map(field=>({id:field.id,name:field.getAttribute('name'),type:field.getAttribute('type')})))}));}
    throw error;
  }finally{
    await browser.close();
    if(enrolled){
      step=success?'restore fictional enrollment':step;
      const credentials=await (await admin(`/users/${subject}/credentials`)).json();
      for(const credential of credentials.filter(item=>item.type==='otp'&&item.userLabel===temporaryLabel))await admin(`/users/${subject}/credentials/${credential.id}`,'DELETE');
      await admin(`/users/${subject}`,'PUT',{requiredActions:originalActions});await admin(`/users/${subject}/logout`,'POST');
    }
  }
  const evidence={executedAt:new Date().toISOString(),result:'passed',fictional:true,keycloakVersion:'26.4.7',passwordAndOtpEnrollment:true,realSignedMfaGuardPassed:true,selfRevocationDenied:true,localSessionEnded:true,fictionalEnrollmentReset:true,secretsWrittenToTestArtifacts:false,runId:randomUUID()};
  await writeFile('docs/AGAP_UI_Staff_MFA_Identity.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));
}
void main().catch(()=>{console.error(JSON.stringify({result:'failed',step,message:'Check the local fictional setup. No tokens or OTP secrets are logged.'}));process.exitCode=1;});
