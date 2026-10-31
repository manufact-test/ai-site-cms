'use strict';
/* Local offline private SEO packet byte consistency audit.
 * SHA256 detects changes relative to the saved manifest, NOT authenticity;
 * manifest and files can both be altered. Lead must trust private source custody.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const FORMAT='manufact-seo-private-lead-packet-integrity-v1';
const SHA=/^[0-9a-f]{64}$/;
const ROOT=path.resolve(__dirname,'../../..');
const FILES=new Set([
 'index.html','launch.html','search.html','indexing.html','crawl.html',
 'human.html','next-actions.html','lead-readiness.html','lead-readiness.md','lead-readiness.json',
 'structured-data.html','structured-data.md','structured-data.json',
 'rendered-content.html','rendered-content.md','rendered-content.json',
 'field-performance.html','field-performance.md','field-performance.json',
 'crawl-lead-worklist.md','crawl-cms.html','crawl-cms-worklist.md','crawl-cms-worklist.json',
 'crawl-cms-decisions-TEMPLATE.json','crawl-cms-decisions.html',
 'crawl-cms-recheck.html','crawl-cms-recheck.md','crawl-cms-recheck.json',
 'crawl-public-followup.html','crawl-public-followup.md','crawl-public-followup.json',
 'DRAFT-ONLY-robots.txt','DRAFT-ONLY-sitemap.xml','workspace-manifest.json',
 'PRIVATE-README.txt'
]);
const REQUIRED=['index.html','lead-readiness.html','lead-readiness.json',
 'lead-readiness.md','workspace-manifest.json','PRIVATE-README.txt'];
const ERROR=s=>{throw Error('SEO lead private packet integrity: '+s);};
function sha(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function entries(generated){
 if(!generated||typeof generated!=='object'||Array.isArray(generated))ERROR('generated file inventory missing');
 const found=Object.entries(generated).map(([name,body])=>{
  if(!FILES.has(name)||typeof body!=='string'||Buffer.byteLength(body,'utf8')>45000000)
   ERROR('unknown, oversized or invalid output '+name);
  const size=Buffer.byteLength(body,'utf8');
  return {name,bytes:size,sha256:sha(Buffer.from(body,'utf8'))};
 });
 if(found.length>FILES.size||REQUIRED.some(x=>!found.some(f=>f.name===x)))
  ERROR('required initial operator/lead artifact is absent');
 return found.sort((a,b)=>a.name.localeCompare(b.name));
}
function build({generated,siteId,configSha256,inputSHA256}={}){
 if(typeof siteId!=='string'||!siteId||
  !SHA.test(configSha256||'')||!inputSHA256||
  typeof inputSHA256!=='object'||Array.isArray(inputSHA256))ERROR('site/config source fingerprint required');
 for(const [,records] of Object.entries(inputSHA256))
  if(!records||typeof records!=='object'||Array.isArray(records)||
   Object.values(records).some(v=>!SHA.test(v||'')))
   ERROR('invalid source-bound private SHA256 manifest');
 const files=entries(generated);
 const workspace=JSON.parse(generated['workspace-manifest.json']);
 if(workspace.format!=='manufact-seo-operator-workspace-v1'||workspace.siteId!==siteId||
  workspace.readOnly!==true||workspace.releaseAuthorized!==false||
  workspace.configSHA256!==configSha256||
  JSON.stringify(workspace.inputSHA256)!==JSON.stringify(inputSHA256))
  ERROR('inconsistent existing workspace manifest source pinning');
 const lead=JSON.parse(generated['lead-readiness.json']);
 if(lead.format!=='manufact-seo-first-site-lead-readiness-v1'||
  lead.siteId!==siteId||lead.readOnly!==true||lead.releaseAuthorized!==false||
  lead.summary?.neverAutomaticGO!==true)ERROR('lead readiness must be nonauthorizing');
 return {format:FORMAT,version:1,siteId,
  configOriginalSha256:configSha256,originalInputSHA256:inputSHA256,
  files,filesCount:files.length,totalBytes:files.reduce((a,b)=>a+b.bytes,0),
  outputManifestExcludedFromSelfHash:true,privateSourceAuthenticityUnverified:true,
  externalSignature:false,automaticRelease:false,releaseAuthorized:false,
  publicHostAuthenticated:false,ownerApprovalAuthenticated:false,
  warning:'Local SHA256 consistency only: if both manifest and artifacts are modified, this audit cannot authenticate them. Original protected source custody and lead approval are required.'};
}
function checkDir(dir){
 if(typeof dir!=='string'||!path.isAbsolute(dir))ERROR('bundle must be private absolute directory');
 const abs=path.resolve(dir),st=fs.lstatSync(abs);
 if(st.isSymbolicLink()||!st.isDirectory())ERROR('private bundle must be an existing real directory');
 const real=fs.realpathSync(abs),root=fs.realpathSync(ROOT),rel=path.relative(root,real);
 if(rel===''||rel==='.'||!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel))
  ERROR('private SEO handoff data must remain outside Git checkout');
 return real;
}
function verify(dir){
 const real=checkDir(dir);
 const names=fs.readdirSync(real);
 if(names.length>FILES.size+1||names.some(x=>x!=='LEAD-PACKET-INTEGRITY.json'&&!FILES.has(x)))
  ERROR('unexpected private bundle file or nested directory');
 if(!names.includes('LEAD-PACKET-INTEGRITY.json'))ERROR('missing original packet source manifest');
 const meta=fs.lstatSync(path.join(real,'LEAD-PACKET-INTEGRITY.json'));
 if(!meta.isFile()||meta.isSymbolicLink()||meta.size<60||meta.size>250000)
  ERROR('unsafe or oversized original integrity manifest');
 const info=JSON.parse(fs.readFileSync(path.join(real,'LEAD-PACKET-INTEGRITY.json'),'utf8'));
 if(info?.format!==FORMAT||info.version!==1||!info.siteId||
  info.releaseAuthorized!==false||info.externalSignature!==false||
  info.privateSourceAuthenticityUnverified!==true||
  info.outputManifestExcludedFromSelfHash!==true||
  !SHA.test(info.configOriginalSha256||'')||!Array.isArray(info.files)||
  info.files.length<REQUIRED.length||info.files.length>FILES.size)
  ERROR('packet source manifest is invalid or claims false authority');
 if(JSON.stringify(names.slice().sort())!==
  JSON.stringify([...info.files.map(x=>x.name),'LEAD-PACKET-INTEGRITY.json'].sort()))
  ERROR('private files do not match exact original recorded inventory');
 const found=new Set();let total=0;
 for(const item of info.files){
  if(!item||!FILES.has(item.name)||found.has(item.name)||!SHA.test(item.sha256||'')||
   !Number.isSafeInteger(item.bytes)||item.bytes<0||item.bytes>45000000)
   ERROR('malformed or duplicate integrity entry');
  found.add(item.name);
  const file=path.join(real,item.name),stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==item.bytes)
   ERROR('missing, replaced or symlinked private report '+item.name);
  const contents=fs.readFileSync(file);
  if(sha(contents)!==item.sha256)ERROR('private report original bytes changed '+item.name);
  total+=stat.size;
 }
 if(REQUIRED.some(x=>!found.has(x))||total!==info.totalBytes||info.filesCount!==found.size)
  ERROR('required output artifact missing or totals changed');
 // Ensure the two highest-level safety statements were not removed and original
 // input fingerprints are equal. This is consistency, not a trusted signature.
 const workspace=JSON.parse(fs.readFileSync(path.join(real,'workspace-manifest.json'),'utf8'));
 const lead=JSON.parse(fs.readFileSync(path.join(real,'lead-readiness.json'),'utf8'));
 if(workspace.siteId!==info.siteId||lead.siteId!==info.siteId||
  workspace.releaseAuthorized!==false||lead.releaseAuthorized!==false||
  workspace.configSHA256!==info.configOriginalSha256||
  JSON.stringify(workspace.inputSHA256)!==JSON.stringify(info.originalInputSHA256))
  ERROR('manifest and lead source/site identity changed');
 return {format:FORMAT,siteId:info.siteId,filesChecked:found.size,
  totalBytes:total,rawSourceDigestsPresent:true,
  validAsSaved:true,authenticatedHost:false,authenticatedOwner:false,
  cryptographicallySigned:false,releaseAuthorized:false,
  meaning:'File bytes match this local unsigned private manifest; not proof of who made it or which site was deployed.'};
}
module.exports=Object.freeze({FORMAT,FILES,REQUIRED,entries,build,verify});
