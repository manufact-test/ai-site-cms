#!/usr/bin/env node
// Proof validator for measurable, actual completed PHP native/Compat outputs.
// This is a research performance OBSERVATION, never a latency release gate.
import crypto from 'node:crypto';
const specs=Object.freeze({
 'valid-small':{truth:true,samples:9,bytes:64},
 'valid-large-65536':{truth:true,samples:3,bytes:65536},
 'tampered-small':{truth:false,samples:9,bytes:64},
 'tampered-large-65536':{truth:false,samples:3,bytes:65536},
 'tampered-signature':{truth:false,samples:9,bytes:64},
 'identity-forgery':{truth:false,samples:9,bytes:8},
 'noncanonical-scalar':{truth:false,samples:9,bytes:64}
});
const hex64=/^[a-f0-9]{64}$/;
export function verifyTimedComparison(native,compat,payloadHash){
 if(!hex64.test(payloadHash||''))return {status:'invalid',reason:'unsigned input digest missing'};
 const reject=[];
 for(const [which,v,isNative] of [['native',native,true],['compat',compat,false]]){
   if(v?.schema!=='research-original-ed25519-real-cli-timing-v1'||
      v.mode!==which||v.nativeSodiumPresent!==isNative||
      !/^8\.3\.\d+$/.test(v.phpVersion||'')||
      v.phpIntBytes!==8||v.caseCount!==7||
      v.sha256Input!==payloadHash||v.targetHostMeasured!==false||
      v.productionApproved!==false||!Number.isSafeInteger(v.peakProcessBytes)||
      v.peakProcessBytes<=0||!v.cases||
      Object.keys(v.cases).length!==7)reject.push(which+': wrong binary, input or record');
   else for(const [name,x] of Object.entries(specs)){
     const y=v.cases[name];
     if(!y||y.expectedValid!==x.truth||y.answerMatched!==true||
        y.messageBytes!==x.bytes||y.samples!==x.samples||
        ['medianMs','p95Ms','maxMs','meanMs'].some(k=>
          !Number.isFinite(y[k])||y[k]<0||y[k]>120000)||
        y.p95Ms<y.medianMs||y.maxMs<y.p95Ms)
       reject.push(which+': invalid/omitted '+name);
   }
 }
 if(reject.length)return {status:'invalid',reason:reject.join('; ').slice(0,500)};
 const comparison=Object.fromEntries(Object.keys(specs).map(name=>{
   const a=native.cases[name].medianMs,b=compat.cases[name].medianMs;
   return [name,{nativeMedianMs:a,compatMedianMs:b,
      relativeMedianRatio:a>0?Number((b/a).toFixed(2)):null,
      nativeP95Ms:native.cases[name].p95Ms,
      compatP95Ms:compat.cases[name].p95Ms,
      phpSamplesPerBackend:specs[name].samples}];
 }));
 return {
   status:'observed',
   comparedSameEphemeralSignedInputs:true,
   physicalNoNativeCompat:true,
   originalNativeSodium:true,
   signedCaseCount:Object.keys(specs).length,
   timedVerificationsPerBackend:Object.values(specs).reduce((s,x)=>s+x.samples,0),
   inputSha256:payloadHash,
   originalNativePhpVersion:native.phpVersion,
   purePhpCompatVersion:compat.phpVersion,
   nativePeakProcessBytes:native.peakProcessBytes,
   compatPeakProcessBytes:compat.peakProcessBytes,
   scenarios:comparison,
   interpretation:'single ephemeral GitHub Linux CLI runner, no real Hostinger SAPI; timing only; NOT CPU/memory service-level certification',
   targetHostValidated:false,productionApproved:false
 };
}
export function createRealSignedInput(){
 const {privateKey,publicKey}=crypto.generateKeyPairSync('ed25519');
 const der=publicKey.export({format:'der',type:'spki'});
 if(!Buffer.isBuffer(der)||der.subarray(0,12).toString('hex')!=='302a300506032b6570032100')
   throw Error('RESEARCH_LOAD_PROFILE_KEY_FORMAT_REFUSED');
 const pk=der.subarray(12),small=Buffer.alloc(64,0x54),large=Buffer.alloc(65536,0x54);
 const sgSmall=crypto.sign(null,small,privateKey),sgLarge=crypto.sign(null,large,privateKey);
 const entry=(signature,message,key)=>({
   signature:signature.toString('base64'),message:message.toString('base64'),
   publicKey:key.toString('base64')
 });
 const badSig=Buffer.from(sgSmall);badSig[2]^=0x40;
 const badScalar=Buffer.from(sgSmall);badScalar[63]=0xff;
 const modifiedSmall=Buffer.from(small);modifiedSmall[0]^=0x01;
 const modifiedLarge=Buffer.from(large);modifiedLarge[0]^=0x01;
 const identity=Buffer.alloc(32);identity[0]=0x01;
 const forgery=Buffer.concat([Buffer.from('58'+'66'.repeat(31),'hex'),
                             Buffer.from('01'+'00'.repeat(31),'hex')]);
 const suite={
   schema:'research-ephemeral-signed-load-v1',
   cases:{
     'valid-small':entry(sgSmall,small,pk),
     'valid-large-65536':entry(sgLarge,large,pk),
     'tampered-small':entry(sgSmall,modifiedSmall,pk),
     'tampered-large-65536':entry(sgLarge,modifiedLarge,pk),
     'tampered-signature':entry(badSig,small,pk),
     'identity-forgery':entry(forgery,Buffer.alloc(8,0x78),identity),
     'noncanonical-scalar':entry(badScalar,small,pk)
   }
 };
 if(!crypto.verify(null,small,publicKey,sgSmall)||
    !crypto.verify(null,large,publicKey,sgLarge)||
    crypto.verify(null,modifiedSmall,publicKey,sgSmall))
   throw Error('RESEARCH_LOAD_PROFILE_NODE_SIGNING_INVALID');
 const raw=JSON.stringify(suite);
 return {raw,sha256:crypto.createHash('sha256').update(raw).digest('hex')};
}
