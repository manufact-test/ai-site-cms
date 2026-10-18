/* Stage 1 research only: publisher provenance is not capability approval.
 * Signed metadata can still request harmful operations; enforce an independent
 * reviewed target ledger, typed values, local assets and migration gates.
 * Ephemeral keys, memory-only high-water marks: NOT a production plugin system.
 */
'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {ASSETS,definitions}=require('./reviewed-visual-asset-pack.cjs');
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const exact=(x,keys)=>plain(x)&&Object.keys(x).sort().join('|')===keys.slice().sort().join('|');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function canonical(x){
 if(Array.isArray(x))return '['+x.map(canonical).join(',')+']';
 if(plain(x)){
  const keys=Object.keys(x).sort();
  if(keys.some(k=>!/^[-A-Za-z0-9_]+$/.test(k)||['__proto__','prototype','constructor'].includes(k)))throw Error('forbidden-key');
  return '{'+keys.map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
 }
 if(typeof x==='string'||typeof x==='boolean'||x===null||
  (typeof x==='number'&&Number.isFinite(x)))return JSON.stringify(x);
 throw Error('unsupported-signature-data');
}
const trustedPaths=Object.freeze(Object.fromEntries(Object.entries(definitions).map(([id,def])=>
 [id,Object.freeze({kind:def.kind,target:def.target})])));
function valid(name,v){
 if(name==='gradientAngle')return Number.isInteger(v)&&v>=0&&v<=360;
 if(name==='motionDuration')return Number.isInteger(v)&&v>=100&&v<=10000;
 if(name==='gradientFrom'||name==='gradientTo')return typeof v==='string'&&/^#[a-f0-9]{6}$/i.test(v);
 if(name==='motionEnabled')return typeof v==='boolean';
 if(name==='motionEasing')return ['ease','linear','ease-in','ease-out','ease-in-out'].includes(v);
 if(name==='imageAsset')return typeof v==='string'&&Object.hasOwn(ASSETS,v);
 if(name==='imageAlt')return typeof v==='string'&&v.length<=160;
 return false;
}
function compareSemver(a,b){
 const re=/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
 if(!re.test(a)||!re.test(b))throw Error('semver');
 const x=a.split('.').map(Number),y=b.split('.').map(Number);
 for(let i=0;i<3;i++)if(x[i]!==y[i])return Math.sign(x[i]-y[i]);
 return 0;
}
function scannedAsset(key,digest){
 if(!Object.hasOwn(ASSETS,key))throw Error('unknown asset');
 const a=ASSETS[key];
 if(a.mime!=='image/svg+xml'||!a.path.startsWith('/fixtures/')||
    !a.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')||
    /<script\b|<foreignObject\b|on[a-z]+\s*=|<image\b|<use\b|(?:https?:|data:|javascript:|url\s*\()/i.test(a.svg))throw Error('unsafe asset');
 if(digest!==hash(a.svg))throw Error('asset digest mismatch');
}
function signed(payload,privateKey){
 return {payload,signature:crypto.sign(null,Buffer.from(canonical(payload)),privateKey).toString('base64')};
}
function verifyEnvelope(envelope,trust){
 if(!exact(envelope,['payload','signature'])||typeof envelope.signature!=='string'||
    !/^[A-Za-z0-9+/]{86}==$/.test(envelope.signature))throw Error('signature-envelope');
 const p=envelope.payload;
 if(!exact(p,['publisher','packId','version','reviewTicket','fields','assetDigests'])||
    p.publisher!=='example-vendor'||p.packId!=='reviewed-site-visual'||p.reviewTicket!=='SEC-RESEARCH-ONLY'||
    !plain(p.fields)||!plain(p.assetDigests)||!Object.keys(p.fields).length||
    Object.keys(p.fields).length>12)throw Error('unreviewed package');
 const root=trust.get(p.publisher);
 if(!root||root.revoked)throw Error('unknown or revoked publisher');
 const bytes=Buffer.from(canonical(p));
 if(!crypto.verify(null,bytes,root.key,Buffer.from(envelope.signature,'base64')))throw Error('invalid signature');
 // Signatures authenticate a publisher, NOT the publisher's permission to
 // introduce executable code, external assets, handlers, CSS or arbitrary DOM.
 if(!/^[1-9]\d*\.\d+\.\d+$/.test(p.version))throw Error('invalid version');
 if(Object.keys(p.assetDigests).sort().join(',')!=='orb,reef')throw Error('unreviewed asset inventory');
 for(const [id,digest] of Object.entries(p.assetDigests))scannedAsset(id,digest);
 const seenTargets=new Set();
 for(const [id,d] of Object.entries(p.fields)){
  if(!Object.hasOwn(trustedPaths,id)||!exact(d,['kind','target','default'])||
     d.kind!==trustedPaths[id].kind||d.target!==trustedPaths[id].target||
     seenTargets.has(d.target)||!valid(id,d.default))throw Error('capability not reviewed or invalid');
  seenTargets.add(d.target);
 }
 return {packId:p.packId,version:p.version,digest:hash(bytes),fields:p.fields};
}
function registry(trust){
 let installed=null;
 const owner=Object.create(null);
 function setOwner(id,value){
  if(!installed||!Object.hasOwn(installed.fields,id)||!valid(id,value))throw Error('invalid owner value');
  owner[id]=value;
 }
 function install(envelope) {
  const next=verifyEnvelope(envelope,trust);
  if(installed&&installed.packId!==next.packId)throw Error('different pack identity');
  if(installed&&compareSemver(next.version,installed.version)<=0)throw Error('downgrade/replay');
  // All existing owner values must retain identical semantic targets and types.
  // Reject the WHOLE install, never truncate owner state to satisfy a new pack.
  if(installed){
   for(const [field,v] of Object.entries(owner)){
    if(!Object.hasOwn(next.fields,field)||next.fields[field].target!==installed.fields[field].target||
       next.fields[field].kind!==installed.fields[field].kind||!valid(field,v))throw Error('owner migration quarantine');
   }
  }
  installed={...next,fields:structuredClone(next.fields)};
  return {version:installed.version,digest:installed.digest,ownerRetained:Object.keys(owner).length};
 }
 return {install,setOwner,snapshot:()=>({installed:structuredClone(installed),owner:structuredClone({...owner})})};
}
function fixture(){
 const assetDigests=Object.fromEntries(Object.entries(ASSETS).map(([name,a])=>[name,hash(a.svg)]));
 return {publisher:'example-vendor',packId:'reviewed-site-visual',version:'1.0.0',
  reviewTicket:'SEC-RESEARCH-ONLY',fields:structuredClone(definitions),assetDigests};
}
function run(){
 const publisher=crypto.generateKeyPairSync('ed25519');
 const impostor=crypto.generateKeyPairSync('ed25519');
 const trust=new Map([['example-vendor',{key:publisher.publicKey,revoked:false}]]);
 const r=registry(trust),p=fixture();
 let checks=0,refusals=0;
 const passes=(fn)=>{assert.doesNotThrow(fn);checks++;};
 const rejects=(fn,label)=>{assert.throws(fn,label);checks++;refusals++;};
 passes(()=>r.install(signed(p,publisher.privateKey)));
 passes(()=>r.setOwner('gradientFrom','#001122'));
 passes(()=>r.setOwner('imageAlt','Owner <img onerror=evil()>'));
 const previous=r.snapshot();
 const payload2=fixture();payload2.version='1.1.0';payload2.fields.gradientFrom.default='#aabbcc';
 const u=r.install(signed(payload2,publisher.privateKey));
 assert.equal(u.ownerRetained,2);checks++;
 assert.equal(r.snapshot().owner.gradientFrom,'#001122');checks++;
 assert.equal(r.snapshot().owner.imageAlt,'Owner <img onerror=evil()>');checks++;
 // Real tampering, forged signers, untrusted targets, permissions, and assets.
 const tamper=signed(payload2,publisher.privateKey);
 tamper.payload.fields.gradientFrom.default='#112233';
 rejects(()=>r.install(tamper),'post-signature modification');
 const wrongSigner=signed({...payload2,version:'1.2.0'},impostor.privateKey);
 rejects(()=>r.install(wrongSigner),'impersonated publisher');
 const bads=[
  x=>{x.fields.arbitraryCode={kind:'text',target:'document.body.innerHTML',default:'<script>evil()</script>'};},
  x=>{x.fields.gradientFrom.target='visual.backgroundImage.url';},
  x=>{x.fields.gradientFrom.kind='text';},
  x=>{x.fields.gradientFrom.default='url(https://example.invalid/pixel)';},
  x=>{x.fields.imageAsset.default='../../admin.php';},
  x=>{x.fields.motionDuration.default=1e99;},
  x=>{x.fields.motionEnabled.default='true';},
  x=>{x.fields.motionEasing.default='steps(999)';},
  x=>{x.assetDigests.orb='0'.repeat(64);},
  x=>{x.assetDigests.extra='x';},
  x=>{x.permissions=['filesystem','network'];},
  x=>{x.fields.gradientTo.target=x.fields.gradientFrom.target;},
  x=>{x.fields.imageAlt.default=null;},
  x=>{x.fields.imageAlt.target='visual.media.innerHTML';},
  x=>{x.fields.gradientFrom.default='#12345';},
  x=>{x.reviewTicket='OTHER-UNREVIEWED-TICKET';},
  x=>{x.packId='arbitrary-third-party';},
  x=>{x.publisher='another-vendor';},
  x=>{x.fields.gradientFrom.default='expression(alert(1))';},
  x=>{delete x.fields.gradientFrom;},
  x=>{x.assetDigests.reef='sha256-not-hash';},
  x=>{x.version='1.0.0-alpha';}
 ];
 for(const [i,mutate] of bads.entries()){
  const x=fixture();x.version='2.0.0';mutate(x);
  // Some removals are permitted in packages if there is no owner edit; here
  // they are prohibited by the active owner-migration guard, not by signing.
  rejects(()=>r.install(signed(x,publisher.privateKey)),'negative pack '+i);
  assert.deepEqual(r.snapshot().owner,{gradientFrom:'#001122',imageAlt:'Owner <img onerror=evil()>'});
 }
 rejects(()=>r.install(signed(p,publisher.privateKey)),'downgrade refused');
 rejects(()=>r.install(signed(payload2,publisher.privateKey)),'same version replay refused');
 const evilSignature=signed({...payload2,version:'3.0.0'},publisher.privateKey);
 evilSignature.signature='B'.repeat(86)+'==';
 rejects(()=>r.install(evilSignature),'signature corruption');
 const invalidPrototype=JSON.parse('{"__proto__":{"isAdmin":true}}');
 rejects(()=>canonical(invalidPrototype),'canonical prototype pollution');
 const misconfigured=fixture();misconfigured.version='3.1.0';
 misconfigured.fields.imageAlt={...misconfigured.fields.imageAlt,target:'unsafe:new-operation'};
 rejects(()=>r.install(signed(misconfigured,publisher.privateKey)),'signed but unapproved action');
 trust.set('example-vendor',{key:publisher.publicKey,revoked:true});
 rejects(()=>r.install(signed({...payload2,version:'3.2.0'},publisher.privateKey)),'revoked publisher');
 assert.equal(r.snapshot().installed.version,'1.1.0');checks++;
 assert.equal(previous.installed.version,'1.0.0');checks++;
 console.log('STAGE1_CAPABILITY_PROVENANCE='+JSON.stringify({
  pass:true,checks,refusals,signer:'Ed25519 ephemeral research identity',
  reviewedStaticTargets:Object.keys(trustedPaths).length,assetDigests:Object.keys(ASSETS).length,
  signedButUnsafePacksRejected:true,ownerOverridesRetainedOnUpgrade:2,
  integrityAuthenticityVsAuthorizationSeparated:true,atomicFailedUpgrades:true,
  limits:'test-only ephemeral trusted key, in-memory version high-water (disk rollback unresolved); signatures do NOT sandbox code; no network/plugin execution, real auth, supply-chain review or production extension installation'
 }));
}
run();
