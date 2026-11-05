import { describe,expect,it } from 'vitest';
import { loadConfig } from '../src/platform/config.js';
const fictional={NODE_ENV:'test',DATABASE_URL:'postgresql://agap_runtime:development-runtime@127.0.0.1:55433/agap_test',IDENTITY_DATABASE_URL:'postgresql://agap_identity:development-identity@127.0.0.1:55433/agap_test',SESSION_SECRET:'fictional-config-test-secret-longer-than-thirty-two',OIDC_CLIENT_SECRET:'fictional-client-secret',EVIDENCE_RECORD_MODE:'fictional',EVIDENCE_WORKFLOW_ENABLED:'true'};
describe('fictional pilot activation boundary',()=>{
 it('defaults off and accepts an explicit fictional normal-auth test environment',()=>{expect(loadConfig(fictional).FICTIONAL_PILOT_ENABLED).toBe(false);expect(loadConfig({...fictional,FICTIONAL_PILOT_ENABLED:'true'}).FICTIONAL_PILOT_ENABLED).toBe(true);});
 it.each([{NODE_ENV:'production'},{EVIDENCE_RECORD_MODE:'real'},{EVIDENCE_WORKFLOW_ENABLED:'false'},{LOCAL_PRESENTATION_MODE:'true',NODE_ENV:'development'}])('denies an incompatible enabled pilot: %j',override=>{expect(()=>loadConfig({...fictional,FICTIONAL_PILOT_ENABLED:'true',...override})).toThrow(/pilot requires/);});
 it('permits explicitly requested password-only recording only in fictional loopback development',()=>{expect(loadConfig({...fictional,NODE_ENV:'development',FICTIONAL_PILOT_ENABLED:'true',LOCAL_PREVIEW_PASSWORD_ONLY:'true'}).LOCAL_PREVIEW_PASSWORD_ONLY).toBe(true);expect(()=>loadConfig({...fictional,FICTIONAL_PILOT_ENABLED:'true',LOCAL_PREVIEW_PASSWORD_ONLY:'true'})).toThrow('loopback development');});
});
