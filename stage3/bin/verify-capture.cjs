'use strict';
// Offline portable PHP capture verification. Checks exact copied source bytes
// against a separately provided SEALED approved-v2 folder. No deployment,
// no visual-match certificate, no automatic client approval and no network.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {preflight,pagePrototypeEntries}=require('./verify-approved-site.cjs');
const {render}=require('./offline-review-report.cjs');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const checkedName=value=>{
  if(typeof value!=='string'||! /^(?:approved-\d{2}-(?:desktop|tablet|mobile)|prototype-(?:desktop|tablet|mobile)|page-\d{2}-(?:desktop|tablet|mobile)|client-explanation|implementation-spec)\.(?:png|jpe?g|webp|md|txt|json)$/.test(value)||
    value.includes('..'))throw Error('Unsupported portable screenshot/source filename');
  return value;
};
function verify(folder,sourceFolder){
  const checked=preflight(sourceFolder);
  if(checked.integrity!=='sha256-verified')
    throw Error('Only a sealed v2 source folder can anchor copied originals');
  const root=fs.realpathSync(folder),src=fs.realpathSync(sourceFolder);
  if(root===src||root.startsWith(src+path.sep)||src.startsWith(root+path.sep))
    throw Error('Capture and immutable source folders must be disjoint');
  const dataPath=path.join(root,'evidence.json');
  if(fs.statSync(dataPath).size>1000000)throw Error('Oversized capture metadata');
  const evidence=JSON.parse(fs.readFileSync(dataPath,'utf8'));
  const original=JSON.parse(fs.readFileSync(path.join(src,'handoff.json'),'utf8'));
  const site=JSON.parse(fs.readFileSync(path.join(src,original.files.site),'utf8'));
  if(evidence.format!=='manufact-public-site-acceptance-evidence-v1'||
    evidence.status!=='screenshots-only-manual-approval-required'||
    evidence.siteId!==checked.siteId||evidence.version!==checked.version||
    evidence.handoffSha256!==sha(fs.readFileSync(path.join(src,'handoff.json')))||
    !Array.isArray(evidence.pages)||evidence.pages.length!==site.pages.length)
    throw Error('Capture does not match the exact sealed source site');
  const expected=new Set(['evidence.json','report.html']);
  function saved(file,hash){
    checkedName(file);
    if(expected.has(file))throw Error('Duplicate portable filename: '+file);
    const absolute=path.join(root,file),stat=fs.lstatSync(absolute);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size<20||stat.size>8000000)
      throw Error('Missing, symbolic or oversize capture artifact: '+file);
    const bytes=fs.readFileSync(absolute);
    if(sha(bytes)!==hash)throw Error('SHA256 mismatch for portable file: '+file);
    expected.add(file);return bytes;
  }
  function sourceCopy(file,hash,source){
    const bytes=saved(file,hash);
    const origin=path.resolve(src,source),real=fs.realpathSync(origin);
    if(!real.startsWith(src+path.sep)||!fs.statSync(real).isFile()||
      !bytes.equals(fs.readFileSync(real)))
      throw Error('Portable source bytes differ from approved original: '+file);
  }
  const sizes=['desktop','tablet','mobile'];
  for(const device of sizes){
    const x=evidence.prototypes?.[device],source=original.files[device];
    if(!x||x.width!==({desktop:1280,tablet:768,mobile:390})[device]||
      x.file!=='prototype-'+device+path.extname(source).toLowerCase())
      throw Error('Missing legacy homepage reference '+device);
    sourceCopy(x.file,x.sha256,source);
  }
  for(const [kind,prefix] of [['clientExplanation','client-explanation'],['implementationSpec','implementation-spec']]){
    const doc=evidence[kind],source=original.files[kind];
    if(!doc||doc.file!==prefix+path.extname(source).toLowerCase())
      throw Error('Missing client description in capture');
    sourceCopy(doc.file,doc.sha256,source);
  }
  const pageSource=new Map(pagePrototypeEntries(site,original.files).map(p=>[p.pageId,p.images]));
  let shots=0,references=0;
  for(const [index,page] of site.pages.entries()){
    const row=evidence.pages[index];
    if(!row||row.id!==page.id||row.path!==page.path||row.title!==page.title)
      throw Error('Captured page order or identity drifted');
    const refs=page.path==='/'?original.files:pageSource.get(page.id);
    if(Object.keys(row.references||{}).length!==(refs?3:0))
      throw Error('Missing or unexpected interior page approved reference');
    for(const device of sizes){
      const shot=row.screenshots?.[device];
      if(!shot||shot.width!==({desktop:1280,tablet:768,mobile:390})[device]||
        !Number.isInteger(shot.height)||shot.height<1||shot.height>200000||
        shot.file!=='page-'+String(index+1).padStart(2,'0')+'-'+device+'.png')
        throw Error('Invalid captured screenshot identity/dimensions');
      const png=saved(shot.file,shot.sha256);
      if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
        throw Error('Captured PNG signature mismatch');
      shots++;
      if(!refs)continue;
      const ref=row.references[device],source=refs[device],extension=path.extname(source).toLowerCase();
      if(!ref||ref.source!==source||
        ref.width!==({desktop:1280,tablet:768,mobile:390})[device]||
        ref.file!=='approved-'+String(index+1).padStart(2,'0')+'-'+device+extension)
        throw Error('Wrong approved page/device reference');
      sourceCopy(ref.file,ref.sha256,source);references++;
    }
  }
  const actual=fs.readdirSync(root);
  if(actual.length!==expected.size||actual.some(file=>!expected.has(file)))
    throw Error('Unexpected files in portable capture folder');
  if(fs.readFileSync(path.join(root,'report.html'),'utf8')!==render(evidence))
    throw Error('Offline review HTML was modified after screenshot capture');
  return Object.freeze({valid:true,siteId:evidence.siteId,version:evidence.version,
    pages:site.pages.length,screenCaptures:shots,copiedApprovedReferences:references,
    sourceDescriptions:2,originalSealedHandoffMatched:true,
    screenshotLedgerMatched:true,reportUnmodified:true,
    visualApprovalEstablished:false,authenticityOfCapturedWebpageEstablished:false});
}
if(require.main===module){
  try{
    if(process.argv.length!==4)throw Error('Usage: node stage3/bin/verify-capture.cjs /ABS/portable-capture /ABS/sealed-approved-v2');
    console.log(JSON.stringify(verify(process.argv[2],process.argv[3]),null,2));
  }catch(error){console.error('OFFLINE CAPTURE VERIFICATION FAILED: '+error.message);process.exitCode=1;}
}
module.exports=Object.freeze({verify});
