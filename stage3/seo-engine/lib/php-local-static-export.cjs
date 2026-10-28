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
 const result={sections:[],links:[],images:[],responsive:[],video:[],forms:[],fields:[],styles:[],scripts:[]};
 const attrs=raw=>{
  const a={};
  for(const m of raw.matchAll(/([a-z][a-z0-9:_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
   a[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
  return a;
 };
 // Static export paths are site-root URLs; live PHP uses /published/SITE-ID.
 // Compare style definitions after removing this one known mount, not by
 // reformatting arbitrary CSS/JS or masking real style value changes.
 const cleanCss=x=>String(x??'').replace(new RegExp('/published/'+siteId+'(?=/)','g'),'')
  .replace(/\s+/g,' ').trim();
 result.styles=[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)]
  .map(m=>cleanCss(m[1]));
 result.scripts=[...html.matchAll(/<script\b([^>]*?)>([\s\S]*?)<\/script\s*>/gi)]
  .filter(m=>!/\btype\s*=\s*["']?application\/ld\+json/i.test(m[1]))
  .map(m=>m[2].trim());
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

/* Audit static-root routes in the OFFICIAL exported HTML, not the PHP
   /published mount. Remote sites and dynamic JavaScript URLs are not fetched. */
function staticLinks(site,pages,assetLedger,aliasLedger){
 const findings=[],summary=[],routeMap=new Map(site.pages.map(p=>[p.path,p]));
 const assetPaths=new Set([...assetLedger.values()].map(a=>a.src));
 for(const p of site.pages){
  const record=pages.get(p.path),doc=inspect(record.html),ids=new Set(doc.ids);
  let visited=0,errors=0;
  const add=(code,message,extra={})=>{
   if(errors>=60)return;
   errors++;
   findings.push(Object.freeze({code:'php-export:'+code,severity:'error',pageId:p.id,
    path:p.path,message,evidence:'sha256-verified-official-static-html',automatic:false,...extra}));
  };
  const base=new URL(p.path,'https://static-export.invalid');
  const targets=[...doc.anchors.map(a=>({href:a.attrs.href||'',kind:'link'})),
   ...doc.images.map(a=>({href:a.src||'',kind:'image'})),
   ...doc.sources.flatMap(a=>[
    ...(a.src?[{href:a.src,kind:'source'}]:[]),
    ...String(a.srcset||'').split(',').map(x=>({href:x.trim().split(/\s+/)[0],kind:'srcset'}))]),
   ...doc.videos.flatMap(a=>[
    ...(a.poster?[{href:a.poster,kind:'poster'}]:[]),
    ...(a.src?[{href:a.src,kind:'video'}]:[])])];
  for(const item of targets){
   const href=item.href;
   if(!href||href==='#'||/^(?:mailto:|tel:|sms:)/i.test(href))continue;
   visited++;
   if(/^(?:javascript|data|file|vbscript):/i.test(href)){
    add('static-unsafe-url','Exported static document contains a non-navigation unsafe URL scheme.',
      {href:String(href).slice(0,160)});continue;
   }
   let url;
   try{url=new URL(href,base);}catch{
    add('static-malformed-url','Static document references an invalid URL.',{href:String(href).slice(0,160)});continue;
   }
   if(url.origin!==base.origin)continue;
   if(url.pathname.startsWith('/published/'+site.siteId+'/')){
    add('static-php-mount-leak','Static export contains a PHP-specific /published/SITE-ID link.',
      {href:String(href).slice(0,160)});continue;
   }
   const route=routeMap.get(url.pathname);
   const redirect=aliasLedger.get(url.pathname);
   const isAsset=assetPaths.has(url.pathname);
   if(!route&&!redirect&&!isAsset){
    add('static-broken-local-route','Exported link/media points to a missing published page, redirect or asset.',
     {href:String(href).slice(0,160)});continue;
   }
   if(item.kind!=='link'||!url.hash)continue;
   const target=route||(redirect&&routeMap.get(redirect));
   if(!target)continue;
   let fragment=url.hash.slice(1);
   try{fragment=decodeURIComponent(fragment);}catch{
    add('static-invalid-fragment','Static link includes an invalid URL fragment.',{href:String(href).slice(0,160)});continue;
   }
   if(fragment!=='top'&&!new Set(target.path===p.path?ids:inspect(pages.get(target.path).html).ids).has(fragment))
    add('static-broken-fragment','Static link points at a missing target ID.',{href:String(href).slice(0,160),
      fragment:String(fragment).slice(0,120),targetPageId:target.id});
  }
  summary.push(Object.freeze({pageId:p.id,path:p.path,staticReferencesChecked:visited,findings:errors}));
 }
 return {pages:Object.freeze(summary),findings:Object.freeze(findings)};
}


/* Static-host forms require an explicit external collector and source version.
   Do NOT include HMAC token values or user-provided form data in findings. */
function staticForms(site,pages,collector,version){
 const findings=[],checked=[];
 const add=(page,section,code,message)=>findings.push(Object.freeze({
  code:'php-export:'+code,severity:'error',pageId:page?.id??null,
  path:page?.path??null,sectionId:section?.id??null,message,
  evidence:'sha256-verified-official-static-html',automatic:false
 }));
 const declared=site.pages.flatMap(page=>
  (page.sections||[]).filter(section=>
   ['lead-form','lead-form-flex'].includes(section.component)&&!section.designGraph)
   .map(section=>({page,section})));
 const validCollector=typeof collector==='string'&&
  /^https:\/\/[a-z0-9.-]+(?::443)?$|^http:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]{2,5})?$/i.test(collector);
 if(declared.length&&!validCollector)
  add(null,null,'static-form-collector-missing',
   'Official static release contains lead forms without a valid declared collector origin.');
 if(!declared.length&&collector)
  add(null,null,'static-form-collector-unexpected',
   'Static release declares a form collector although no published form sections exist.');
 if(declared.length&&typeof collector==='string'&&/^http:/i.test(collector))
  findings.push(Object.freeze({code:'php-export:static-form-local-collector',severity:'warning',
   pageId:null,path:null,sectionId:null,
   message:'Loopback collector is valid only in development; a public static deployment requires an accessible HTTPS collector.',
   evidence:'sha256-verified-official-static-html',automatic:false}));
 const attributes=raw=>{
  const a={};
  for(const m of raw.matchAll(/([a-z][a-z0-9:_-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
   a[m[1].toLowerCase()]=decode(m[2]??m[3]??m[4]??'');
  return a;
 };
 for(const page of site.pages){
  const html=pages.get(page.path)?.html||'';
  const actualForms=[...html.matchAll(/<form\b([^>]*?)>/gi)];
  const expectedSections=declared.filter(x=>x.page.id===page.id);
  if(actualForms.length!==expectedSections.length)
   add(page,null,'static-form-count-drift',
    'Published static page contains a different number of forms than its source sections.');
  for(const {section} of expectedSections){
   // A form must be within its own approved section, not merely somewhere on the page.
   const sectionHtml=require('./php-local-components.cjs').sectionById(html,section.id);
   const forms=[...(sectionHtml||'').matchAll(/<form\b([^>]*?)>/gi)];
   if(forms.length!==1){
    add(page,section,'static-form-section-missing',
     'Approved form section is missing, duplicated or no longer contains one POST form.');
    continue;
   }
   const form=attributes(forms[0][1]);
   const action=validCollector?collector+'/forms/'+site.siteId+'/'+section.id:null;
   if(form.method?.toLowerCase()!=='post'||form['accept-charset']?.toLowerCase()!=='utf-8'||
      action!==null&&form.action!==action)
    add(page,section,'static-form-action-drift',
     'The static form POST method, UTF-8 encoding or collector action differs from approved release.');
   const hidden=[...sectionHtml.matchAll(/<input\b([^>]*?)>/gi)]
    .map(m=>attributes(m[1]));
   const releases=hidden.filter(a=>a.name==='_release');
   if(releases.length!==1||releases[0].type!=='hidden'||
      releases[0].value!==String(version))
    add(page,section,'static-form-version-drift',
     'Static form release marker differs from the official immutable published CMS version.');
   const tokens=hidden.filter(a=>a.name==='_token');
   if(tokens.length!==1||tokens[0].type!=='hidden'||!/^[a-f0-9]{64}$/i.test(tokens[0].value||''))
    add(page,section,'static-form-token-marker',
     'Static form HMAC marker is missing or malformed; token secret is never logged.');
   if(Array.isArray(section.formSteps)&&section.formSteps.length>0&&form['data-multi-step']!=='yes')
    add(page,section,'static-form-wizard-marker',
     'Static multi-step form lacks its declared wizard marker.');
   checked.push(Object.freeze({pageId:page.id,sectionId:section.id,method:'post',
    collectorActionMatched:action!==null&&form.action===action,releaseVersionMatched:releases.length===1&&
     releases[0].value===String(version),tokenStructureMatched:tokens.length===1&&
     /^[a-f0-9]{64}$/i.test(tokens[0].value||'')}));
  }
 }
 return {checkedForms:checked.length,forms:Object.freeze(checked),findings:Object.freeze(findings)};
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
 const links=staticLinks(site,pages,assets,redirects);
 integrityFindings.push(...links.findings);
 const forms=staticForms(site,pages,data.formCollector??null,data.publishedVersion);
 integrityFindings.push(...forms.findings);
 return Object.freeze({format:FORMAT,siteId:site.siteId,publishedVersion:data.publishedVersion,
  sourceRevision:data.sourceRevision??null,assets,pages,redirects,origin:data.publicOrigin??null,
  recordsVerified:readFiles.size-1,sha256VerifiedAtRead:true,
  findings:Object.freeze(integrityFindings),searchFilesVerified:search.size,
  staticReferencesChecked:links.pages.reduce((n,p)=>n+p.staticReferencesChecked,0),
  staticLinkPages:links.pages,checkedFormSections:forms.checkedForms,
  staticForms:forms.forms});
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
  staticReferencesChecked:release.staticReferencesChecked??0,
  staticLinkPages:release.staticLinkPages||[],
  checkedFormSections:release.checkedFormSections??0,
  staticForms:release.staticForms||[],
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
module.exports=Object.freeze({FORMAT,read,compare,review,mainText,structure,staticLinks,staticForms});
