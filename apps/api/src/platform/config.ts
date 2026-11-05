import { z } from 'zod';
import { RecordMode } from '../../../../packages/contracts/src/common.js';

const Env = z.object({
  FICTIONAL_PILOT_ENABLED:z.enum(['true','false']).default('false').transform(v=>v==='true'),
  EVIDENCE_RECORD_MODE:RecordMode.default('fictional'),
  EVIDENCE_WORKFLOW_ENABLED:z.enum(['true','false']).default('false').transform(v=>v==='true'),
  API_HOST:z.string().default('127.0.0.1'),
  LOCAL_PREVIEW_PASSWORD_ONLY: z.enum(['true','false']).default('false').transform(value=>value==='true'),
  LOCAL_PRESENTATION_MODE: z.enum(['true','false']).default('false').transform(value=>value==='true'),
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  DATABASE_URL: z.string().min(1), IDENTITY_DATABASE_URL: z.string().min(1),
  PUBLIC_ORIGIN: z.url().default('http://127.0.0.1:5174'), API_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  SESSION_SECRET: z.string().min(32), SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(1800),
  PRIVACY_NOTICE_VERSION: z.string().min(1).max(80).default('fictional-development-v1'),
  OIDC_ISSUER: z.url().default('http://127.0.0.1:58080/realms/agap'), OIDC_CLIENT_ID: z.string().default('agap-staff'), OIDC_CLIENT_SECRET: z.string().min(1),
});
export type Config = z.infer<typeof Env>;
export function assertLocalPresentation(config:Config){
  if(!config.LOCAL_PRESENTATION_MODE)return;
  const loopback=(host:string)=>['127.0.0.1','localhost','[::1]','::1'].includes(host);
  const localIssuer=['http://127.0.0.1:58080/realms/agap','http://127.0.0.1:18080/realms/agap'].includes(config.OIDC_ISSUER);
  if(config.NODE_ENV!=='development'||!loopback(config.API_HOST)||!loopback(new URL(config.PUBLIC_ORIGIN).hostname)||!localIssuer||config.EVIDENCE_RECORD_MODE!=='fictional'||!config.PRIVACY_NOTICE_VERSION.startsWith('fictional')||![config.DATABASE_URL,config.IDENTITY_DATABASE_URL].every(value=>{const url=new URL(value);return loopback(url.hostname)&&['/agap','/agap_test'].includes(url.pathname);}))throw new Error('Presentation mode requires fictional loopback development, the seeded local realm and a loopback API bind.');
}
export function assertFictionalPilot(config:Config){
  if(config.FICTIONAL_PILOT_ENABLED&&(config.NODE_ENV==='production'||config.EVIDENCE_RECORD_MODE!=='fictional'||!config.EVIDENCE_WORKFLOW_ENABLED||config.LOCAL_PRESENTATION_MODE||config.LOCAL_PREVIEW_PASSWORD_ONLY))throw new Error('The pilot requires fictional development/test, enabled evidence, normal sign-in and no presentation/password-only shortcuts.');
}
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const config = Env.parse(env);
  const origin = new URL(config.PUBLIC_ORIGIN);
  const issuer = new URL(config.OIDC_ISSUER);
  if (origin.origin !== config.PUBLIC_ORIGIN || origin.username || origin.password) throw new Error('PUBLIC_ORIGIN must be an exact origin without a path or credentials.');
  assertLocalPresentation(config);
  assertFictionalPilot(config);
  const loopback=(url:URL)=>['127.0.0.1','localhost','[::1]'].includes(url.hostname);
  if(config.LOCAL_PREVIEW_PASSWORD_ONLY&&(config.NODE_ENV!=='development'||!loopback(origin)||!loopback(issuer)||![config.DATABASE_URL,config.IDENTITY_DATABASE_URL].every(value=>loopback(new URL(value))&&['/agap','/agap_test'].includes(new URL(value).pathname))))throw new Error('Password-only preview requires the fictional loopback development environment.');
  if(config.OIDC_CLIENT_ID==='agap-local-preview')throw new Error('The preview client is selected only by the guarded local preview setting.');
  if (config.NODE_ENV === 'production') {
    if (origin.protocol !== 'https:' || issuer.protocol !== 'https:') throw new Error('Production identity and public origin require HTTPS.');
    if (config.PRIVACY_NOTICE_VERSION.startsWith('fictional') || config.SESSION_SECRET.includes('development') || config.OIDC_CLIENT_SECRET.includes('development')) throw new Error('Development notices/secrets cannot enable a production server.');
    for (const database of [config.DATABASE_URL,config.IDENTITY_DATABASE_URL]) if (new URL(database).searchParams.get('sslmode') !== 'verify-full') throw new Error('Production database connections require sslmode=verify-full.');
  } else if (issuer.protocol !== 'https:' && !['127.0.0.1','localhost','[::1]'].includes(issuer.hostname)) throw new Error('Insecure OIDC is allowed only on loopback in development/test.');
  return config;
}
