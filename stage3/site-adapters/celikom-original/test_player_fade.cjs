#!/usr/bin/env node
'use strict';
// Simulate hostile rAF timing from real browsers; no user audio and no network.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const file=process.argv[2];
if(!file)throw Error('Pass one packaged owner-sound-player.js for the regression');
const source=fs.readFileSync(file,'utf8');
const start=source.indexOf('const fade=(audio,from,to,ms,stamp,done)=>{');
const end=source.indexOf('\nconst sourceReady=',start);
assert.ok(start>=0&&end>start,'Expected exact CELIKOM fade implementation');
const fadeSource=source.slice(start,end);
assert.ok(fadeSource.includes('Math.max(0,Math.min(1,(now-start)/ms))'));
assert.ok(fadeSource.includes('Math.max(0,Math.min(1,from+(to-from)*t))'));
for(let pass=0;pass<24;pass++){
  const callbacks=[],volumes=[];
  const mock={
    get volume(){return volumes.at(-1)??1;},
    set volume(v){assert.ok(v>=0&&v<=1,'Out-of-range media volume '+v);volumes.push(v)}
  };
  const context={
    token:pass+1,
    performance:{now:()=>8000+pass},
    requestAnimationFrame:cb=>{callbacks.push(cb);return callbacks.length}
  };
  const fade=vm.runInNewContext(fadeSource+'\nfade',context,{timeout:1000});
  fade(mock,0,1,115,pass+1,null);
  assert.equal(callbacks.length,1,'First fade callback queued');
  // The first rAF timestamp may be earlier than performance.now() called during its frame.
  callbacks.shift()(7999.75+pass);
  assert.equal(volumes[0],0,'Negative rAF delta must clamp to silent rather than throw');
  callbacks.shift()(8020+pass);
  assert.ok(volumes[1]>0&&volumes[1]<1,'Second frame must ramp up');
  callbacks.shift()(8200+pass);
  assert.equal(volumes[2],1,'Last frame must reach unity');
  assert.equal(callbacks.length,0,'Completed fade must not queue more work');
}
console.log('PASS CELIKOM fade: 24 repeated transitions, negative first-frame delta, intermediate gain, unity completion, no out-of-range volume');
