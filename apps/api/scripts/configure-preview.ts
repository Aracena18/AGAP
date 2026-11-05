import { readFile } from 'node:fs/promises';
import { loadConfig } from '../src/platform/config.js';

// Bounded, repeatable update of the existing fictional localhost realm only.
async function main(){
  const config=loadConfig();
  if(!config.LOCAL_PREVIEW_PASSWORD_ONLY||new URL(config.DATABASE_URL).pathname!=='/agap'||config.OIDC_ISSUER!=='http://127.0.0.1:58080/realms/agap')throw new Error('Enable the fictional localhost preview first.');
  const provider=new URL(config.OIDC_ISSUER).origin;
  const auth=await fetch(`${provider}/realms/master/protocol/openid-connect/token`,{method:'POST',body:new URLSearchParams({grant_type:'password',client_id:'admin-cli',username:'local-admin',password:'development-admin'})});
  if(!auth.ok)throw new Error('Local realm operator unavailable.');
  const {access_token:token}=await auth.json() as {access_token:string};
  async function admin(path:string,method='GET',body?:unknown){
    const response=await fetch(`${provider}/admin/realms/agap${path}`,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    if(!response.ok)throw new Error('Preview setup request failed.');return response;
  }
  const realm=await (await admin('')).json() as {displayName:string};
  if(realm.displayName!=='AGAP fictional training')throw new Error('Unexpected identity realm.');
  const imported=JSON.parse(await readFile('infra/keycloak/agap-realm.json','utf8')) as {clients:{clientId:string;attributes:Record<string,string>}[]};
  const template=imported.clients.find(item=>item.clientId==='agap-local-preview');
  if(!template)throw new Error('Preview fixture missing.');
  const existing=await (await admin('/clients?clientId=agap-local-preview')).json() as {id:string;attributes?:Record<string,string>}[];
  if(existing.length>1||existing[0]&&existing[0].attributes?.['agap.local-preview']!=='true')throw new Error('Refusing to replace an unrelated client.');
  const client={...template,redirectUris:[...new Set([...(template as unknown as {redirectUris:string[]}).redirectUris,`${config.PUBLIC_ORIGIN}/api/v1/auth/callback`,`${config.PUBLIC_ORIGIN}/api/v1/member/auth/callback`])]};
  await admin(existing[0]?`/clients/${existing[0].id}`:'/clients',existing[0]?'PUT':'POST',client);
  const users=await (await admin('/users?username=administrator&exact=true')).json() as {id:string;username:string;requiredActions?:string[]}[];
  const user=users[0];
  if(users.length!==1||user.id!=='10000000-0000-4000-8000-000000000003'||user.username!=='administrator')throw new Error('Expected seeded fictional administrator.');
  if(user.requiredActions?.includes('CONFIGURE_TOTP'))await admin(`/users/${user.id}`,'PUT',{requiredActions:user.requiredActions.filter(action=>action!=='CONFIGURE_TOTP')});
  console.log('Local preview is configured. Existing credentials, accounts and databases were preserved.');
}
void main().catch(()=>{console.error('Preview setup failed. Check the guarded localhost configuration and fictional identity service. No tokens were logged.');process.exitCode=1;});
