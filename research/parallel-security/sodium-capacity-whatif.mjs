#!/usr/bin/env node
// Math-only hypothetical verifier pressure. Not CPU%, HTTP throughput or host approval.
const names=['valid-small','valid-large-65536','tampered-small',
 'tampered-large-65536','tampered-signature','identity-forgery','noncanonical-scalar'];
const rates=[1,5,10,20,40];
const isnum=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=120000;
const invalid=reason=>({status:'invalid',reason,productionApproved:false,targetHostValidated:false});
const round=n=>Number(n.toFixed(5));
export function capacityWhatIf(p){
 if(p?.status!=='observed'||p?.comparedSameEphemeralSignedInputs!==true||
  p.physicalNoNativeCompat!==true||p.originalNativeSodium!==true||
  p.productionApproved!==false||p.targetHostValidated!==false||
  p.signedCaseCount!==7||p.timedVerificationsPerBackend!==51||
  !/^[a-f0-9]{64}$/.test(p.inputSha256||'')||
  !/^8\.3\.\d+$/.test(p.originalNativePhpVersion||'')||
  !/^8\.3\.\d+$/.test(p.purePhpCompatVersion||'')||
  !p.scenarios||Object.keys(p.scenarios).length!==7)
   return invalid('real signed paired PHP proof missing or incompatible');
 for(const name of names){
  const row=p.scenarios[name],s=name.includes('large-')?3:9;
  if(!row||row.phpSamplesPerBackend!==s||
    !isnum(row.nativeMedianMs)||!isnum(row.compatMedianMs)||
    !isnum(row.nativeP95Ms)||!isnum(row.compatP95Ms)||
    !isnum(row.relativeMedianRatio)||row.nativeMedianMs===0||
    row.nativeP95Ms<row.nativeMedianMs||
    row.compatP95Ms<row.compatMedianMs||
    Math.abs(row.compatMedianMs/row.nativeMedianMs-row.relativeMedianRatio)>0.011)
    return invalid('missing or altered timings: '+name);
 }
 const cases=Object.fromEntries(names.map(name=>{
  const r=p.scenarios[name];
  return [name,{nativeMedianMs:r.nativeMedianMs,compatMedianMs:r.compatMedianMs,
    p95FromThreeSamplesNotStatistical:name.includes('large-'),
    illustrativeRates:rates.map(hz=>({
      hypotheticalVerificationsPerSecond:hz,
      nativeSerialVerifierSecondsPerSecond:round(r.nativeMedianMs*hz/1000),
      compatSerialVerifierSecondsPerSecond:round(r.compatMedianMs*hz/1000),
      compatWouldExceedOneSequentialSecond:r.compatMedianMs*hz>1000
    }))}];
 }));
 const m=p.scenarios['valid-small'].compatMedianMs;
 return {schema:'cms-security-ed25519-whatif-v1',status:'illustrative-only',
   exactOriginalSignedInputSha256:p.inputSha256,scenarioCount:7,
   ratesPerSecond:rates,cases,
   validSmallFallbackMedianMs:m,
   at20SequentialFallbackBusySecondsPerSecond:round(m*20/1000),
   reciprocalSerialChecksPerSecondAt100PercentBusy:round(1000/m),
   derivedMetricOnly:'median measured CLI signature verification ms * hypothetical arrivals/s; NOT measured CPU utilization',
   actualHostWorkerCount:null,actualHostCores:null,actualHostRps:null,
   provenPublicCmsRoute:false,hostHttpBenchmarked:false,
   targetHostValidated:false,capacityApproved:false,productionApproved:false};
}
