import {describe,expect,it} from 'vitest';
import {assertIndependentTestDatabases} from './pilot-database-url.js';
const url=(host='127.0.0.1',port='55433')=>`postgresql://agap_owner:development-owner@${host}:${port}/agap_test`;
describe('independent destructive browser fixtures',()=>{
 it('rejects the same endpoint across localhost aliases, credentials and default port syntax',()=>{for(const other of [url(),url('localhost'),url().replace('agap_owner','different_user')])expect(()=>assertIndependentTestDatabases(url(),other)).toThrow(/separate/);expect(()=>assertIndependentTestDatabases('postgres://agap_owner:development-owner@localhost/agap_test',url('127.0.0.1','5432'))).toThrow(/separate/);});
 it('allows distinct local test instances and rejects non-test or remote targets',()=>{expect(()=>assertIndependentTestDatabases(url(),url('localhost','55436'))).not.toThrow();for(const other of [url('remote.example','55436'),url('localhost','55436').replace('/agap_test','/agap')])expect(()=>assertIndependentTestDatabases(url(),other)).toThrow(/localhost fictional/);});
});
