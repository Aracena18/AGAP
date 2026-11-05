import {beforeAll,afterAll,it,expect} from 'vitest';
import {inspectLocalDatabase} from '../scripts/local-inspect.js';
import {owner,ownerUrl,prepareDatabase,closePools} from './database.js';
beforeAll(prepareDatabase);afterAll(closePools);
it('inspects actual local runtime/identity connections and checksums without changing database history',async()=>{
  const runtime=new URL(ownerUrl),identity=new URL(ownerUrl);runtime.username='agap_runtime';runtime.password='development-runtime';identity.username='agap_identity';identity.password='development-identity';
  const env={NODE_ENV:'development',EVIDENCE_RECORD_MODE:'fictional',DATABASE_URL:runtime.href,IDENTITY_DATABASE_URL:identity.href,MIGRATION_DATABASE_URL:ownerUrl,PUBLIC_ORIGIN:'http://127.0.0.1:5174',API_PORT:'4100',OIDC_ISSUER:'http://127.0.0.1:18080/realms/agap',SESSION_SECRET:'fictional-local-inspection-secret-long-enough',OIDC_CLIENT_SECRET:'fictional-local-client',PRIVACY_NOTICE_VERSION:'fictional-local-test'};
  const before=(await owner.query('SELECT name,checksum,applied_at FROM public.agap_migrations ORDER BY name')).rows;
  expect(await inspectLocalDatabase(env,process.cwd())).toEqual({pending:[],changed:[],unknown:[]});
  expect((await owner.query('SELECT name,checksum,applied_at FROM public.agap_migrations ORDER BY name')).rows).toEqual(before);
});
