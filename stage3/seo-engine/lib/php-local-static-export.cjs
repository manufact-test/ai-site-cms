'use strict';
// Compare official PHP static export with SHA-checked local PHP capture for the
// SAME owner-provided published CMS version. No rewrite, import or deploy.
// Two outputs may share a database: this is consistency, not server identity proof.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {inspect}=require('./html-evidence.cjs');
const {text,decode}=require('./php-local-components.cjs');
const FORMAT='manufact-seo-static-export-parity-v1';
const SHA=/^[a-f0-9]{64}$/;
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const ASSET=/^assets\/[a-z][a-z0-9-]{2,79}\.(?:png|jpg|webp|mp4)$/;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const mainText=html=>{
 const main=/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i.exec(html)?.[1]||'';
 return text(main.replace(/<!--[\s\S]*?-->/g,'')
  .replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,''));
};
const headValue=(html,tag)=>decode(new RegExp('<'+tag+'\\b[^>]*>([\\s\\S]*?)<\\/'+tag+'\\s*>','i').exec(html)?.[1]||'').trim();
function title(html){return headValue(html,'title');}
function desc(html){
 const head=/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(html)?.[1]||'';
 for(const m of head.matchAll(/<meta\b([^>]*?)>/gi)){
  const a={};for(const x of m[1].matchAll(/([a-z][a-z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi))
   a[x[1].toLowerCase()]=decode(x[2]??x[3]);
  if(a.name?.toLowerCase()==='description')return (a.content||'').trim();
 }
 return '';
}
const norm=s=>String(s??'').replace(/\s+/g,' ').trim().normalize('NFKC');
const expectedFile=route=>route==='/'?'index.html':route.slice(1)+'index.html';

/* Compare declarative page structure, never dynamic form secrets or collector URLs.
   Static export deliberately omits the live /published/SITE-ID mount prefix. */
function structure(html,siteId){
 const body=/<main\b[^>]*>([\s\S]*?)<\/main\s*>/i.exec(html)?.[1]||'';
 const clean=body.replace(/<!--[\s\S]*?-->/g,'')
  .replace(/<(script|style|template|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 const result={sections:[],links:[],images:[],responsive:[],video:[],forms:[],fields:[]};
 const attrs=raw=>{
  const a={};
  for(const m of raw.matchAll(/([a-z][a-z0-9:_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
   a[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
  return a;
 };
 const normalizeUrl=x=>{
  const s=String(x||''),prefix='/published/'+siteId;
  return s.startsWith(prefix+'/')?s.slice(prefix.length):s;
 };
 const srcset=x=>String(x||'').split(',').map(s=>{
  const pair=s.trim().split(/\s+/);
  return normalizeUrl(pair[0]||'')+(pair.length>1?' '+pair.slice(1).join(' '):'');
 }).join(',');
 for(const match of clean.matchAll(/<(section|a|img|source|video|form|input|select|textarea)\b([^<>]*?)>/gi)){
  const tag=match[1].toLowerCase(),a=attrs(match[2]);
  if(tag==='section')result.sections.push(a.id||'');
  if(tag==='a')result.links.push(normalizeUrl(a.href||''));
  if(tag==='img')result.images.push([normalizeUrl(a.src),a.alt??null,
   srcset(a.srcset),a.width??null,a.height??null]);
  if(tag==='source')result.responsive.push([normalizeUrl(a.src),srcset(a.srcset),a.media||'',a.type||'']);
  if(tag==='video')result.video.push([normalizeUrl(a.src),normalizeUrl(a.poster)]);
  if(tag==='form')result.forms.push([a.method?.toLowerCase()||'get',
    a.enctype?.toLowerCase()||'',a.id||'']);
  if(['input','select','textarea'].includes(tag))result.fields.push([tag,a.name||'',a.type||'',
   Object.hasOwn(a,'required')]);
 }
 return result;
}

function checkFile(root,relative,digest,limit){
 if(typeof relative!=='string'||relative.startsWith('/')||relative.includes('\\')||
    relative.includes('..')||!SHA.test(digest)||relative.length>200)
  throw Error('Static-export file or SHA invalid');
 const full=path.join(root,relative);
 if(!full.startsWith(root+path.sep))throw Error('Static-export file escapes root');
 const pieces=relative.split('/'),rootStat=fs.lstatSync(root);
 if(!rootStat.isDirectory()||rootStat.isSymbolicLink())throw Error('Static export root must be a directory');
 let next=root;
 for(const piece of pieces){
  next=path.join(next,piece);
  const stat=fs.lstatSync(next);
  if(stat.isSymbolicLink())throw Error('Symlinks forbidden in official static release');
 }
 const stat=fs.statSync(full);
 if(!stat.isFile()||stat.size>limit||stat.size<1)
  throw Error('Static export file size invalid: '+relative);
 const bytes=fs.readFileSync(full);
 if(sha(bytes)!==digest)throw Error('Static export file SHA256 mismatch: '+relative);
 return bytes;
}
function read(root,site){
 const directory=fs.realpathSync(root),metaFile=path.join(directory,'release-manifest.json');
 if(fs.lstatSync(root).isSymbolicLink())throw Error('Symlinked static export folder');
 const stat=fs.lstatSync(metaFile);
 if(stat.isSymbolicLink()||!stat.isFile()||stat.size>500000||stat.size<80)
  throw Error('Missing or unsafe official static release manifest');
 const data=JSON.parse(fs.readFileSync(metaFile,'utf8'));
 if(!data||data.format!=='manufact-ai-static-site-v1'||data.siteId!==site.siteId||
    !Number.isSafeInteger(data.publishedVersion)||data.publishedVersion<1||
    !Array.isArray(data.pages)||!Array.isArray(data.assets)||!Array.isArray(data.redirects)||
    data.pages.length!==site.pages.length||data.assets.length>1200||
    data.redirects.length!==(site.redirects||[]).length)
  throw Error('Static release manifest does not match the current published site');
 const pages=new Map(),assets=new Map(),redirects=new Map(),search=new Map(),
  integrityFindings=[],readFiles=new Set(['release-manifest.json']);
 const note=(code,message,extra={})=>integrityFindings.push(Object.freeze({
  code:'php-export:'+code,severity:'error',pageId:null,path:null,
  message,evidence:'sha256-verified-official-static-export',automatic:false,...extra}));
 const load=(filename,digest,limit)=>{
  if(readFiles.has(filename))throw Error('Duplicate static release output filename');
  const bytes=checkFile(directory,filename,digest,limit);readFiles.add(filename);return bytes;
 };
 const expectedMedia=new Map((site.assets||[]).flatMap(a=>
  [{id:a.id,path:a.src,mime:a.mime},...(a.variants||[]).map(v=>({id:v.id,path:v.src,mime:a.mime}))].map(x=>[x.id,x])));
 if(data.assets.length!==expectedMedia.size)throw Error('Static release asset inventory incomplete');
 for(const a of data.assets){
  const expected=expectedMedia.get(a.id);
  if(!expected||assets.has(a.id)||typeof a.file!=='string'||!ASSET.test(a.file)||
     a.file!==expected.path.slice(1)||a.mime!==expected.mime)
   throw Error('Static release asset does not match published Site v1');
  load(a.file,a.sha256,12000000);
  assets.set(a.id,{id:a.id,src:expected.path,sha256:a.sha256});
 }
 for(const p of data.pages){
  const expected=site.pages.find(x=>x.path===p.path);
  if(!expected||pages.has(p.path)||!ROUTE.test(p.path)||p.file!==expectedFile(p.path))
   throw Error('Static release route does not match published Site v1');
  const bytes=load(p.file,p.sha256,450000);
  const html=bytes.toString('utf8');
  if(html.includes('\uFFFD')||!/<html\b/i.test(html)||!/<\/main\s*>/i.test(html))
   throw Error('Static exported page is not complete UTF-8 HTML');
  pages.set(p.path,{id:expected.id,path:p.path,html,sha256:p.sha256});
 }
 for(const r of data.redirects){
  const alias=(site.redirects||[]).find(x=>x.from===r.from);
  if(!alias||r.to!==alias.to||redirects.has(r.from)||r.file!==expectedFile(r.from))
   throw Error('Static release redirects differ from published Site v1');
  const redirectHtml=load(r.file,r.sha256,4096).toString('utf8');
  redirects.set(r.from,r.to);
  if(!/<meta\s+name="robots"\s+content="noindex,follow"\s*\/?>/i.test(redirectHtml)||
     !redirectHtml.includes('http-equiv="refresh" content="0;url='+r.to.replace(/&/g,'&amp;')+'"'))
   note('static-fallback-drift',
    'The exported static redirect fallback differs from the expected noindex/meta-refresh behavior; it is never a true HTTP 301.',
    {href:r.from});
 }
 if(data.searchFiles!==undefined){
  if(!data.searchFiles||Object.keys(data.searchFiles).some(x=>!['robots.txt','sitemap.xml'].includes(x))||
    Object.keys(data.searchFiles).length!==2)throw Error('Invalid static SEO auxiliary manifest');
  for(const name of ['robots.txt','sitemap.xml'])
   search.set(name,load(name,data.searchFiles[name],name==='robots.txt'?250000:750000).toString('utf8'));
 }
 if(data.publicOrigin){
  let origin;
  try{
   origin=new URL(data.publicOrigin);
   if(!['https:','http:'].includes(origin.protocol)||origin.username||origin.password||
      origin.search||origin.hash||origin.pathname!=='/'||
      origin.protocol==='http:'&&!['localhost','127.0.0.1'].includes(origin.hostname))
    throw Error('bad origin');
  }catch{throw Error('Invalid official static export origin');}
  const canonicalOrigin=origin.origin;
  const expectedUrls=site.pages.filter(p=>(p.seo?.robots||'index')!=='noindex')
   .map(p=>canonicalOrigin+p.path).sort();
  const xml=search.get('sitemap.xml')||'';
  const urls=[...xml.matchAll(/<loc>([^<]*)<\/loc>/gi)]
   .map(x=>decode(x[1])).sort();
  if(!xml.includes('<urlset')||JSON.stringify(urls)!==JSON.stringify(expectedUrls))
   note('static-sitemap-drift','Official static sitemap contains unexpected or missing indexable page URLs.',
    {expected:expectedUrls.length,observed:urls.length});
  const robots=search.get('robots.txt')||'';
  if(!/^User-agent:\s*\*\s*$/im.test(robots)||
     !/^Allow:\s*\/\s*$/im.test(robots)||
     !robots.includes('Sitemap: '+canonicalOrigin+'/sitemap.xml'))
   note('static-robots-drift','Official static robots.txt does not expose the declared sitemap/crawl policy.');
 }else if(data.searchFiles!==undefined)
  note('static-search-origin-missing','Search metadata was exported without a configured public origin.');
 // A manifest is a ledger. Reject silently omitted or injected export files.
 const walk=(dir,prefix='')=>{
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const rel=prefix+entry.name;
   if(entry.isSymbolicLink()||!(entry.isFile()||entry.isDirectory()))
    throw Error('Unsupported special file in static export');
   if(entry.isDirectory())walk(path.join(dir,entry.name),rel+'/');
   else if(!readFiles.has(rel))throw Error('Unexpected file in static export: '+rel);
  }
 };walk(directory);
 return Object.freeze({format:FORMAT,siteId:site.siteId,publishedVersion:data.publishedVersion,
  sourceRevision:data.sourceRevision??null,assets,pages,redirects,origin:data.publicOrigin??null,
  recordsVerified:readFiles.size-1,sha256VerifiedAtRead:true,
  findings:Object.freeze(integrityFindings),searchFilesVerified:search.size});
}
function compare(site,snapshot,media,release,version){
 if(!release||release.format!==FORMAT||!release.sha256VerifiedAtRead||
    release.siteId!==site.siteId||release.publishedVersion!==version||
    !snapshot||snapshot.siteId!==site.siteId||!media||media.siteId!==site.siteId)
  throw Error('Static release, CMS published version and loopback capture must describe one Site v1');
 const findings=[...(release.findings||[])],pages=[],assets=[];
 const add=(code,page,message,extra={})=>findings.push(Object.freeze({
  code:'php-export:'+code,severity:'error',pageId:page?.id??null,path:page?.path??null,
  message,evidence:'sha256-verified-static-export-vs-local-php',automatic:false,...extra}));
 const mediaMap=new Map(media.resources.map(r=>[r.assetId,r]));
 for(const asset of release.assets.values()){
  const live=mediaMap.get(asset.id);
  if(!live||live.status!==200||live.bodySha256!==asset.sha256)
   add('media-byte-drift',null,'Static published media bytes differ from the actual local PHP endpoint.',
    {assetId:asset.id,expected:asset.sha256,observed:live?.bodySha256??null});
  assets.push(Object.freeze({assetId:asset.id,staticSha256:asset.sha256,localPhpSha256:live?.bodySha256??null,
   matched:Boolean(live&&live.status===200&&live.bodySha256===asset.sha256)}));
 }
 for(const p of snapshot.pages){
  const exported=release.pages.get(p.path);
  if(!exported||exported.id!==p.id)throw Error('Static and PHP page route mismatch');
  const differences=[];
  if(norm(mainText(exported.html))!==norm(mainText(p.html)))differences.push('mainText');
  if(norm(title(exported.html))!==norm(title(p.html)))differences.push('title');
  if(norm(desc(exported.html))!==norm(desc(p.html)))differences.push('description');
  // Compare heading content + order even when no text delta is otherwise detected.
  const a=inspect(exported.html).headings.map(h=>h.level+':'+norm(h.text));
  const b=inspect(p.html).headings.map(h=>h.level+':'+norm(h.text));
  if(JSON.stringify(a)!==JSON.stringify(b))differences.push('headingHierarchy');
  const aStructure=structure(exported.html,site.siteId),
        bStructure=structure(p.html,site.siteId);
  for(const key of Object.keys(aStructure))
   if(JSON.stringify(aStructure[key])!==JSON.stringify(bStructure[key]))
    differences.push('structure.'+key);
  for(const field of differences)
   add(field.startsWith('structure.')?'page-structure-drift':'page-content-drift',p,
    'Official static release and currently served PHP HTML differ in '+field+'.',{field});
  pages.push(Object.freeze({pageId:p.id,path:p.path,checkedFields:4+Object.keys(aStructure).length,differences}));
 }
 return Object.freeze({format:FORMAT,siteId:site.siteId,publishedVersion:version,
  sourceRevisionClaim:release.sourceRevision,verifiedExportFiles:release.recordsVerified,
  exportedSearchFilesVerified:release.searchFilesVerified??0,
  checkedPages:pages.length,checkedAssets:assets.length,pages:Object.freeze(pages),
  assets:Object.freeze(assets),findings:Object.freeze(findings),
  contentAndMediaMatched:findings.length===0,servedPhpRevisionAuthenticated:false,
  publicHttpsVerified:false,clientApprovalVerified:false,
  limitations:'Cross-output agreement between official static export and local PHP HTTP cannot prove runtime revision, operator identity, deployment, public HTTPS or client approval.'});
}
function review(root,site,snapshot,media,version){
 if(!Number.isSafeInteger(version)||version<1)
  throw Error('Explicit owner-exported CMS published version required for static parity');
 return compare(site,snapshot,media,read(root,site),version);
}
module.exports=Object.freeze({FORMAT,read,compare,review,mainText,structure});
