'use strict';
// Consume the LEAD's existing capture-approved-site.cjs output without re-capturing pages.
// Every screenshot and copied prototype is SHA256 checked; only a verified sealed source
// can authorize attaching this report to the SEO bundle. Never execute captured HTML.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BRIDGE=require('./approved-site-bridge.cjs');
const {fingerprint}=require('./acceptance.cjs');
const FORMAT='manufact-seo-lead-php-capture-review-v1';
const F='manufact-public-site-acceptance-evidence-v1';
const widths=Object.freeze({desktop:1280,tablet:768,mobile:390});
const devices=Object.keys(widths);
const SHA=/^[a-f0-9]{64}$/;
const checked=new WeakSet();
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const err=x=>{throw Error('Lead PHP capture: '+x)};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function fileBytes(root,filename,seen){
 if(typeof filename!=='string'||!/^[a-zA-Z0-9_-]{1,110}\.(?:png|jpg|jpeg|webp)$/.test(filename))
  err('unsafe screenshot or prototype filename');
 if(seen.has(filename))err('duplicate evidence filename '+filename);
 seen.add(filename);
 const target=path.resolve(root,filename);
 if(!target.startsWith(root+path.sep))err('file escapes evidence folder');
 const resolved=fs.realpathSync(target);
 if(!resolved.startsWith(root+path.sep))err('symlink escapes evidence folder');
 const stat=fs.statSync(resolved);
 if(!stat.isFile()||stat.size<64||stat.size>16*1024*1024)
  err('unexpected screenshot/prototype file size '+filename);
 const bytes=fs.readFileSync(resolved);
 const ext=path.extname(filename).toLowerCase();
 if(ext==='.png'&&!(bytes[0]===137&&bytes.toString('ascii',1,4)==='PNG'&&
  bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10))
  err('invalid PNG bytes '+filename);
 if((ext==='.jpg'||ext==='.jpeg')&&!(bytes[0]===255&&bytes[1]===216&&bytes[2]===255))
  err('invalid JPEG bytes '+filename);
 if(ext==='.webp'&&!(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'))
  err('invalid WebP bytes '+filename);
 return sha(bytes);
}
const keysExact=(obj,expected)=>plain(obj)&&Object.keys(obj).length===expected.length&&expected.every(k=>Object.hasOwn(obj,k));
function inspect(evidence,site,source,folder){
 if(!plain(evidence)||evidence.format!==F||evidence.status!=='screenshots-only-manual-approval-required'||
  evidence.siteId!==site.siteId||evidence.version!==source.packageVersion||
  evidence.integrity!=='sha256-verified'||!Array.isArray(evidence.pages)||
  evidence.pages.length!==site.pages.length||evidence.pages.length>60||
  !keysExact(evidence.devices,devices)||devices.some(x=>evidence.devices[x]!==widths[x])||
  !keysExact(evidence.prototypes,devices)||!Array.isArray(evidence.warnings)||
  typeof evidence.capturedAt!=='string'||Number.isNaN(Date.parse(evidence.capturedAt))||
  !/^\d{4}-\d\d-\d\dT/.test(evidence.capturedAt))
  err('version, device matrix, site identity or screenshot inventory mismatch');
 let u;
 try{u=new URL(evidence.baseUrl);}catch(_){err('invalid local capture URL');}
 if(u.protocol!=='http:'||u.hostname!=='127.0.0.1'||!u.port||u.username||u.password||
  u.search||u.hash||u.pathname!=='/published/'+site.siteId+'/')
  err('source is not the lead-approved loopback site mount');
 const files=new Set(),findings=[],pages=[],aggregate=[];
 for(const device of devices){
  const record=evidence.prototypes[device];
  if(!plain(record)||!SHA.test(record.sha256)||record.width!==widths[device]||
   record.sha256!==source.homepagePrototypeSha256?.[device])
   err('source prototype hash mismatch for '+device);
  if(fileBytes(folder,record.file,files)!==record.sha256)
   err('changed copied approved prototype '+device);
 }
 for(let i=0;i<site.pages.length;i++){
  const expected=site.pages[i],p=evidence.pages[i];
  if(!plain(p)||p.path!==expected.path||!keysExact(p.screenshots,devices)||
   !Array.isArray(p.warnings)||p.warnings.length>50)
   err('missing, reordered or unexpected page '+expected.id);
  const screenshots={};
  for(const device of devices){
   const shot=p.screenshots[device];
   if(!plain(shot)||!SHA.test(shot.sha256)||shot.width!==widths[device]||
    !Number.isSafeInteger(shot.height)||shot.height<1||shot.height>100000||
    typeof shot.file!=='string'||!shot.file.endsWith('.png'))
    err('invalid '+device+' screenshot record '+expected.id);
   if(fileBytes(folder,shot.file,files)!==shot.sha256)
    err('modified or swapped screenshot '+expected.id+' '+device);
   screenshots[device]=Object.freeze({width:shot.width,height:shot.height,
    sha256:shot.sha256,file:shot.file});
  }
  const warnings=[];
  for(const w of p.warnings){
   if(typeof w!=='string'||w.length>500||/[\x00-\x1f]/.test(w))
    err('unsafe or truncated warning for '+expected.id);
   const device=devices.find(d=>w.startsWith(d+':'))||null;
   warnings.push(Object.freeze({device,message:w}));
   aggregate.push(p.path+': '+w);
   findings.push(Object.freeze({code:'php-capture:broken-rendered-image',
    severity:'error',pageId:expected.id,path:expected.path,device,
    message:'Lead PHP screenshot reported an image that failed to load: '+w}));
  }
  pages.push(Object.freeze({pageId:expected.id,path:p.path,
   screenshots:Object.freeze(screenshots),warnings:Object.freeze(warnings)}));
 }
 if(aggregate.length!==evidence.warnings.length||
   aggregate.some((w,i)=>w!==evidence.warnings[i]))
  err('capture global warning list does not match page-level evidence');
 const result=Object.freeze({
  format:FORMAT,siteId:site.siteId,sourceRawSiteSha256:source.fileSha256,
  siteRevisionFingerprint:fingerprint(site),
  packageVersion:source.packageVersion,
  capturedAt:evidence.capturedAt,baseUrl:u.href,
  screenshotCount:site.pages.length*3,prototypeCount:3,
  checkedFileDigests:files.size,
  pages:Object.freeze(pages),findings:Object.freeze(findings),
  warningPageIds:Object.freeze(pages.filter(p=>p.warnings.length).map(p=>p.pageId)),
  source:'lead-capture-approved-site-cli-artifact',readOnly:true,
  actualScreenshotsRead:true,visualEqualityReviewed:false,clientSignoffAuthenticated:false,
  publicHttpsProbed:false,seoHeadInspected:false,formsTested:false,
  limitations:'Verifies local files and their declared checksums against the sealed Site v2 source. The origin is lead CLI loopback PHP. It cannot authenticate capture authorship, compare visual designs, measure CWV, validate public HTTPS, forms, canonical, robots or published SEO metadata.'
 });
 return result;
}
function read(evidenceFile,site,source){
 if(!BRIDGE.isVerifiedSource(source)||source.siteId!==site.siteId||
  source.siteRevisionFingerprint!==fingerprint(site))
  err('requires the original verified lead Approved Site v2 source');
 const full=path.resolve(evidenceFile),st=fs.statSync(full);
 if(!st.isFile()||st.size>200000||st.size<30||path.basename(full)!=='evidence.json')
  err('expected bounded original lead evidence.json');
 const obj=JSON.parse(fs.readFileSync(full,'utf8'));
 const result=inspect(obj,site,source,path.dirname(fs.realpathSync(full)));
 checked.add(result);
 return result;
}
function isVerifiedCapture(x){return checked.has(x);}
module.exports=Object.freeze({FORMAT,read,inspect,isVerifiedCapture});
