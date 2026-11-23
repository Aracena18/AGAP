import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/platform/config.js';
import { loginSource, normalizeLoginAddress, parseTrustedLoginProxies } from '../src/modules/identity/login-source.js';

const request = (peer: string, forwarded?: string | string[]) => ({socket:{remoteAddress:peer},headers:{'x-forwarded-for':forwarded}});
const env={DATABASE_URL:'postgresql://fictional@127.0.0.1/agap_test',IDENTITY_DATABASE_URL:'postgresql://fictional@127.0.0.1/agap_test',SESSION_SECRET:'fictional-audit-secret-longer-than-32-characters',OIDC_CLIENT_SECRET:'fictional-development-client'};

describe('login network identity',()=>{
  it('ignores caller-supplied forwarding when the socket peer is untrusted',()=>{
    expect(loginSource(request('203.0.113.8','198.51.100.1'),[])).toBe('203.0.113.8');
    expect(loginSource(request('203.0.113.8',['forged','headers']),['10.20.0.0/24'])).toBe('203.0.113.8');
  });
  it('resolves configured proxy chains and stops before forged earlier hops',()=>{
    const trusted=['10.20.0.0/24','2001:db8:1::/64'];
    expect(loginSource(request('10.20.0.2','198.51.100.6, 2001:db8:1::2'),trusted)).toBe('198.51.100.6');
    expect(loginSource(request('10.20.0.2','192.0.2.99, 198.51.100.6'),trusted)).toBe('198.51.100.6');
    expect(loginSource(request('2001:db8:1::2','2001:db8:2::9'),trusted)).toBe('2001:db8:2::9');
  });
  it('normalizes equivalent IPv4-mapped and IPv6 identities into one bucket',()=>{
    expect(normalizeLoginAddress('::ffff:192.0.2.9')).toBe('192.0.2.9');
    expect(normalizeLoginAddress('::ffff:c000:209')).toBe('192.0.2.9');
    expect(normalizeLoginAddress('2001:0DB8:0000:0:0:0:0:0001')).toBe('2001:db8::1');
    expect(loginSource(request('::ffff:10.20.0.2','::ffff:192.0.2.9'),['10.20.0.0/24'])).toBe('192.0.2.9');
  });
  it.each([undefined,'','unknown','192.0.2.1:443','192.0.2.1,', ['192.0.2.1'],'10.20.0.3',Array(17).fill('192.0.2.1').join(','),' '.repeat(1025),'fe80::1%eth0'])('fails closed for an unprovable trusted-proxy chain: %j',header=>{
    expect(()=>loginSource(request('10.20.0.2',header),['10.20.0.0/24'])).toThrow(expect.objectContaining({status:503,code:'client_address_unavailable'}));
  });
  it('rejects missing or malformed socket identities',()=>{
    expect(()=>loginSource(request(''),[])).toThrow(expect.objectContaining({status:503}));
    expect(()=>loginSource(request('not-an-address'),[])).toThrow(expect.objectContaining({status:503}));
  });
});

describe('explicit login configuration',()=>{
  it('defaults to direct mode and preserves the existing limits',()=>{
    expect(loadConfig(env)).toMatchObject({LOGIN_TRUSTED_PROXY_CIDRS:[],LOGIN_RATE_LIMIT_MAX:120,LOGIN_RATE_LIMIT_WINDOW_SECONDS:300});
    expect(loadConfig({...env,LOGIN_TRUSTED_PROXY_CIDRS:'10.20.0.2, 2001:db8:1::/64',LOGIN_RATE_LIMIT_MAX:'50',LOGIN_RATE_LIMIT_WINDOW_SECONDS:'60'})).toMatchObject({LOGIN_TRUSTED_PROXY_CIDRS:['10.20.0.2','2001:db8:1::/64'],LOGIN_RATE_LIMIT_MAX:50,LOGIN_RATE_LIMIT_WINDOW_SECONDS:60});
  });
  it.each(['true','loopback','1','0.0.0.0/0','::/0','10.20.0.1/33','2001:db8::/129','10.20.0.1,','::ffff:192.0.2.1/120','10.20.0.1/24/8',Array(33).fill('10.20.0.1').join(',')])('rejects inferred, all-address or malformed trust: %s',value=>{
    expect(()=>parseTrustedLoginProxies(value)).toThrow();
  });
  it.each([{LOGIN_RATE_LIMIT_MAX:'0'},{LOGIN_RATE_LIMIT_MAX:'10001'},{LOGIN_RATE_LIMIT_MAX:'1.5'},{LOGIN_RATE_LIMIT_WINDOW_SECONDS:'0'},{LOGIN_RATE_LIMIT_WINDOW_SECONDS:'3601'}])('rejects invalid rate parameters: %j',override=>{
    expect(()=>loadConfig({...env,...override})).toThrow();
  });
});
