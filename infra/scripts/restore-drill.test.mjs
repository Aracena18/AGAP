import test from 'node:test';
import assert from 'node:assert/strict';
import {resourceNames,cleanupOwned} from './restore-drill-core.mjs';
const id='9739470e-47c5-458f-9eef-d40473a68fed';
const labels={'agap.task':'recovery-verification','agap.recovery.run':id};
test('recovery names reject arbitrary resource/path targets and distinguish concurrent runs',()=>{
  for(const value of ['','main','../../data','9739470e-47c5-458f-9eef-d40473a68fed;docker rm database'])assert.throws(()=>resourceNames(value));
  assert.notEqual(resourceNames(id).source,resourceNames('a739470e-47c5-458f-9eef-d40473a68fed').source);
});
test('cleanup removes only resources whose task and run labels both match',()=>{
  const removed=[];
  const failures=cleanupOwned([['container',['mine','user-database','other-run']],['volume',['my-volume']]],id,(type,name)=>{
    const actual=name==='user-database'?{}:name==='other-run'?{...labels,'agap.recovery.run':'other'}:labels;
    return type==='volume'?{Labels:actual}:{Config:{Labels:actual}};
  },(type,name)=>removed.push([type,name]));
  assert.deepEqual(removed,[['container','mine'],['volume','my-volume']]);assert.deepEqual(failures,['user-database','other-run']);
});
test('partial startup cleans remaining owned resources and tolerates known absence',()=>{
  const removed=[];
  assert.deepEqual(cleanupOwned([['container',['absent','created']]],id,(_,name)=>name==='absent'?null:{Config:{Labels:labels}},(_,name)=>removed.push(name)),[]);
  assert.deepEqual(removed,['created']);
});
test('daemon/inspection failure is reported, never treated as absent or successfully cleaned',()=>{
  const removed=[];
  assert.deepEqual(cleanupOwned([['container',['unreachable','remaining']]],id,(_,name)=>{if(name==='unreachable')throw Error('daemon unavailable');return {Config:{Labels:labels}};},(_,name)=>removed.push(name)),['unreachable']);
  assert.deepEqual(removed,['remaining']);
});
test('removal failures retain names for manual follow-up and do not skip later cleanup',()=>{
  const removed=[];
  assert.deepEqual(cleanupOwned([['volume',['busy','remaining']]],id,()=>({Labels:labels}),(_,name)=>{if(name==='busy')throw Error('busy');removed.push(name);}),['busy']);
  assert.deepEqual(removed,['remaining']);
});
