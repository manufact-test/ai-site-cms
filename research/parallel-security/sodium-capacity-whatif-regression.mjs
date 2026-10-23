#!/usr/bin/env node
// Synthetic anti-forgery fixture; real inputs only in the native-free CI lab.
import assert from 'node:assert/strict';
import {capacityWhatIf} from './sodium-capacity-whatif.mjs';
const labels=['valid-small','valid-large-65536','tampered-small','tampered-large-65536',
 'tampered-signature','identity-forgery','noncanonical-scalar'];
const make=()=>({
 status:'observed',comparedSameEphemeralSignedInputs:true,physicalNoNativeCompat:true,
 originalNativeSodium:true,targetHostValidated:false,productionApproved:false,
 signedCaseCount:7,timedVerificationsPerBackend:51,inputSha256:'a'.repeat(64),
 originalNativePhpVersion:'8.3.36',purePhpCompatVersion:'8.3.6',
 scenarios:Object.fromEntries(labels.map(n=>[n,{
  nativeMedianMs:0.06,compatMedianMs:45,nativeP95Ms:0.09,compatP95Ms:46,
  relativeMedianRatio:750,phpSamplesPerBackend:n.includes('large-')?3:9}]))
});
let k=0;const ok=(check,label)=>{assert.ok(check,label);k++};
const original=capacityWhatIf(make());
ok(original.status==='illustrative-only','complete original-shape record allows illustration');
ok(original.at20SequentialFallbackBusySecondsPerSecond===0.9,'20 x 45ms is 0.9 serial equivalent');
ok(original.reciprocalSerialChecksPerSecondAt100PercentBusy===22.22222,'reciprocal finite');
ok(original.cases['valid-small'].illustrativeRates[4].compatWouldExceedOneSequentialSecond,'40/s overloads serial equivalent');
ok(original.cases['valid-small'].illustrativeRates[3].compatWouldExceedOneSequentialSecond===false,'20/s below serial equivalent');
ok(original.cases['valid-large-65536'].p95FromThreeSamplesNotStatistical,'three-sample caveat');
ok(original.productionApproved===false&&!original.targetHostValidated&&
 original.actualHostWorkerCount===null&&!original.provenPublicCmsRoute,'no invented production boundary');
function bad(name,fn){
 const x=make();fn(x);const result=capacityWhatIf(x);
 ok(result.status==='invalid'&&result.productionApproved===false&&!result.targetHostValidated,name);
}
bad('forged approval',x=>x.productionApproved=true);
bad('forged host',x=>x.targetHostValidated=true);
bad('fake synthetic instead of actual',x=>x.status='synthetic');
bad('missing physical fallback',x=>x.physicalNoNativeCompat=false);
bad('native substitute',x=>x.originalNativeSodium=false);
bad('different input',x=>x.comparedSameEphemeralSignedInputs=false);
bad('wrong signed count',x=>x.timedVerificationsPerBackend=4);
bad('wrong case count',x=>x.signedCaseCount=6);
bad('bad SHA',x=>x.inputSha256='Z'.repeat(64));
bad('wrong PHP version',x=>x.purePhpCompatVersion='8.4.0');
bad('unsupported native',x=>x.originalNativePhpVersion='7.4.0');
bad('missing scenarios',x=>delete x.scenarios);
bad('extra scenario',x=>x.scenarios.forged={});
bad('missing valid',x=>delete x.scenarios['valid-small']);
bad('missing invalid',x=>delete x.scenarios['tampered-signature']);
bad('missing identity',x=>delete x.scenarios['identity-forgery']);
bad('missing scalar',x=>delete x.scenarios['noncanonical-scalar']);
bad('missing large',x=>delete x.scenarios['valid-large-65536']);
bad('empty row',x=>x.scenarios['valid-small']=null);
bad('NaN',x=>x.scenarios['valid-small'].compatMedianMs=NaN);
bad('Infinity',x=>x.scenarios['valid-small'].compatMedianMs=Infinity);
bad('negative',x=>x.scenarios['valid-small'].nativeMedianMs=-1);
bad('zero denominator',x=>x.scenarios['valid-small'].nativeMedianMs=0);
bad('huge fake time',x=>x.scenarios['valid-small'].compatMedianMs=120001);
bad('fake ratio',x=>x.scenarios['valid-small'].relativeMedianRatio=0.1);
bad('fake p95',x=>x.scenarios['valid-small'].compatP95Ms=12);
bad('negative p95',x=>x.scenarios['valid-small'].nativeP95Ms=-1);
bad('invalid case count',x=>x.scenarios['valid-small'].phpSamplesPerBackend=3);
bad('invalid large sample count',x=>x.scenarios['valid-large-65536'].phpSamplesPerBackend=9);
bad('missing p95',x=>delete x.scenarios['tampered-small'].nativeP95Ms);
bad('missing median',x=>delete x.scenarios['tampered-large-65536'].compatMedianMs);
ok(JSON.stringify(capacityWhatIf(make()))===JSON.stringify(original),'deterministic math');
console.log('Real signed Ed25519 mathematical capacity anti-GO regression PASS '+k+
 ' assertions; synthetic mutation only; NOT Hostinger or production approval');
