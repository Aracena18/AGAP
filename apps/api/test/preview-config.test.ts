import { describe,expect,it } from 'vitest';
import { loadConfig } from '../src/platform/config.js';
const env={NODE_ENV:'development',DATABASE_URL:'postgresql://agap_runtime:fictional@127.0.0.1:55432/agap',IDENTITY_DATABASE_URL:'postgresql://agap_identity:fictional@127.0.0.1:55432/agap',SESSION_SECRET:'fictional-development-session-secret-long',OIDC_CLIENT_SECRET:'fictional-development-client'};
describe('local preview configuration boundary',()=>{
  it('is opt-in and parses false without enabling preview',()=>{expect(loadConfig(env).LOCAL_PREVIEW_PASSWORD_ONLY).toBe(false);expect(loadConfig({...env,LOCAL_PREVIEW_PASSWORD_ONLY:'false'}).LOCAL_PREVIEW_PASSWORD_ONLY).toBe(false);expect(loadConfig({...env,LOCAL_PREVIEW_PASSWORD_ONLY:'true'}).LOCAL_PREVIEW_PASSWORD_ONLY).toBe(true);});
  it.each([{NODE_ENV:'production'},{NODE_ENV:'test'},{EVIDENCE_RECORD_MODE:'real'},{API_HOST:'0.0.0.0'},{PUBLIC_ORIGIN:'http://192.168.1.2:5174'},{OIDC_ISSUER:'https://identity.example.invalid/realms/agap'},{DATABASE_URL:'postgresql://fictional@example.invalid/agap'},{IDENTITY_DATABASE_URL:'postgresql://fictional@127.0.0.1/real_records'}])('rejects preview outside the explicit fictional loopback environment: %j',override=>{expect(()=>loadConfig({...env,...override,LOCAL_PREVIEW_PASSWORD_ONLY:'true'})).toThrow('loopback development');});
  it('does not allow selecting the preview client outside its guarded setting',()=>{expect(()=>loadConfig({...env,OIDC_CLIENT_ID:'agap-local-preview'})).toThrow('guarded local preview');});
});
