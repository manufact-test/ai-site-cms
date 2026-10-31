'use strict';
// Pure review of bounded, hash-checked LOOPBACK PHP SEO endpoint responses.
// Does NOT turn local status checks into actual public HTTPS evidence.
const DELIVERY=require('./delivery-evidence.cjs');
const INTEGRITY=require('./publication-integrity.cjs');
const FORMAT='manufact-seo-local-php-publication-v1';
const SHA=/^[a-f0-9]{64}$/;
const mount=siteId=>'/published/'+siteId+'/';
const resourceName=(kind,index)=>kind==='redirect'?
 'redirect-'+String(index+1).padStart(3,'0')+'.txt':kind+'.txt';
const expectedUrl=(base,name)=>new URL(name,base).href;
function publicLoc(raw){
 const u=new URL(raw);
 if((u.protocol!=='https:'&&!(u.protocol==='http:'&&
     ['localhost','127.0.0.1'].includes(u.hostname)))||
    u.username||u.password||u.search||u.hash)
  throw Error('Unsafe PHP public sitemap URL');
 return u;
}
function records(site,base,publication){
 if(!publication||typeof publication!=='object'||Array.isArray(publication)||
    Object.keys(publication).some(k=>!['robots','sitemap','redirects'].includes(k))||
    !publication.robots||!publication.sitemap||!Array.isArray(publication.redirects)||
    publication.redirects.length!==(site.redirects||[]).length||
    publication.redirects.length>60)throw Error('Invalid local PHP publication manifest');
 const result=[];
 const check=(item,kind,index,source=null)=>{
  const file=resourceName(kind,index),url=expectedUrl(base,kind==='redirect'?source:kind==='sitemap'?'sitemap.xml':'robots.txt');
  if(!item||Object.keys(item).some(k=>!['file','url','status','contentType','bytes','sha256','location','from','to'].includes(k))||
   item.file!==file||item.url!==url||!Number.isInteger(item.status)||
   item.status<100||item.status>599||typeof item.contentType!=='string'||
   item.contentType.length>150||!Number.isInteger(item.bytes)||item.bytes<0||
   item.bytes>(kind==='sitemap'?750000:kind==='robots'?250000:4096)||
   !SHA.test(item.sha256))throw Error('Invalid local PHP '+kind+' HTTP response manifest');
  if(kind==='redirect'){
   const alias=site.redirects[index];
   if(item.from!==alias.from||item.to!==alias.to||
     typeof item.location!=='string'||item.location.length>2048||
     /[\x00-\x1f]/.test(item.location))
    throw Error('Local PHP redirect path or Location mismatch');
  }else if(item.location!==undefined||item.from!==undefined||item.to!==undefined)
   throw Error('Unexpected local PHP '+kind+' identity fields');
  result.push(item);
 };
 check(publication.robots,'robots');
 check(publication.sitemap,'sitemap');
 (site.redirects||[]).forEach((alias,i)=>check(publication.redirects[i],'redirect',i,alias.from.slice(1)));
 return result;
}
function review(site,base,manifest,bytesByFile){
 const checked=records(site,base,manifest),findings=[];
 const pageIds=new Map(site.pages.map(p=>[p.path,p.id]));
 const add=(code,severity,path,message,details={})=>findings.push({
  code,severity,pageId:pageIds.get(path)||null,path,message,...details,
  evidence:'hash-checked-local-php-http',automatic:false});
 const robots=manifest.robots,sitemap=manifest.sitemap;
 const rText=bytesByFile.get(robots.file).toString('utf8');
 const sText=bytesByFile.get(sitemap.file).toString('utf8');
 for(const [kind,r,expected] of [['robots',robots,'text/plain'],['sitemap',sitemap,'application/xml']]){
  if(r.status!==200){
   add('php-local:'+kind+'-http-status','error',mount(site.siteId)+kind+'.txt',
    'Local PHP '+kind+' endpoint returned HTTP '+r.status+'; configure STAGE3_PUBLIC_ORIGIN and republish before accepting SEO endpoints.',{status:r.status});
  }else if(!String(r.contentType).toLowerCase().startsWith(expected)){
   add('php-local:'+kind+'-content-type','error',mount(site.siteId)+kind+'.txt',
    'Local PHP '+kind+' endpoint has unexpected Content-Type.',{observed:r.contentType});
  }
 }
 if(robots.status===200){
  if(INTEGRITY.wildcardRootBlock(rText))
   add('php-local:robots-disallow-all','error',null,'Real loopback robots body contains a possible wildcard root block.');
  if(!rText.includes(mount(site.siteId)+'sitemap.xml'))
   add('php-local:robots-sitemap-pointer','error',null,
    'Real loopback robots body does not reference this site-mount sitemap.xml.');
 }
 let parsed=null,paths=null,declaredPublicOrigin=null;
 if(sitemap.status===200){
  parsed=DELIVERY.sitemapPaths(sText);
  if(parsed.kind!=='urlset'||parsed.unverified){
   add('php-local:sitemap-unparseable','error',null,
    'Local PHP sitemap.xml does not contain a safely enumerable URL set.',
    {reason:parsed.reason||parsed.kind});
  }else{
   paths=[];const seen=new Set(),siteMount=mount(site.siteId),hosts=new Set();
   for(const raw of parsed.urls){
    let url;
    try{url=publicLoc(raw);}catch{
     add('php-local:sitemap-invalid-url','error',null,'Local sitemap has a non-URL loc.');continue;
    }
    hosts.add(url.origin);
    if(url.protocol==='http:')add('php-local:development-public-origin','recommendation',null,
     'The PHP sitemap uses an explicit loopback HTTP origin for local testing; do not treat it as an approved public HTTPS host.');
    if(!url.pathname.startsWith(siteMount)){
     add('php-local:sitemap-route-escape','error',null,'Local sitemap loc is outside this published site mount.',{observedUrl:raw.slice(0,240)});
     continue;
    }
    const path='/'+url.pathname.slice(siteMount.length);
    if(!/^\/(?:[a-z0-9-]+\/)*$/.test(path)){
     add('php-local:sitemap-unexpected-path','error',path,'Local sitemap has a route not expressible by Site v1.');
     continue;
    }
    if(seen.has(path))
     add('php-local:sitemap-duplicate','warning',path,'Local sitemap contains the same logical page more than once.');
    else{seen.add(path);paths.push(path);}
   }
   if(hosts.size>1)add('php-local:sitemap-multiple-origins','error',null,'Local sitemap mixes public origins; these URLs cannot be considered one published site.');
   if(hosts.size===1)declaredPublicOrigin=[...hosts][0];
   for(const p of site.pages){
    const indexable=(p.seo?.robots||'index')==='index';
    if(indexable&&!seen.has(p.path))
     add('php-local:sitemap-indexable-missing','error',p.path,'Indexable Site v1 route is absent from actual local PHP sitemap.');
    if(!indexable&&seen.has(p.path))
     add('php-local:sitemap-noindex-listed','error',p.path,'Noindex Site v1 route appears in actual local PHP sitemap.');
   }
   for(const path of seen)if(!site.pages.some(p=>p.path===path))
    add('php-local:sitemap-unknown-page','error',path,'Actual PHP sitemap includes a route missing from sealed Site v1.');
  }
 }
 if(sitemap.status===200&&paths!==null&&findings.some(x=>x.code.startsWith('php-local:sitemap-')&&x.severity==='error')){
  paths=null;declaredPublicOrigin=null;
 }
 if(robots.status===200&&sitemap.status===200&&declaredPublicOrigin!==null){
  const expectedSitemap=declaredPublicOrigin+mount(site.siteId)+'sitemap.xml';
  const declared=(rText.match(/^\s*Sitemap:\s*(\S+)\s*$/gim)||[])
    .map(line=>line.replace(/^\s*Sitemap:\s*/i,'').trim());
  if(!declared.includes(expectedSitemap))
   add('php-local:robots-sitemap-origin-drift','error',null,
    'Local robots.txt Sitemap pointer does not match the public origin actually used by PHP sitemap loc entries.',
    {expectedUrl:expectedSitemap});
 }
 const verifiedRedirectPaths=[];
 for(const [i,item] of manifest.redirects.entries()){
  const expected=site.redirects[i],request=new URL(item.url),wanted=new URL(expected.to.slice(1),base);
  if(item.status!==301)
   add('php-local:redirect-status-drift','error',expected.from,
    'Local PHP redirect did not return the expected 301.',{status:item.status,expectedStatus:301});
  let location;
  try{location=new URL(item.location,request);}
  catch{location=null;}
  const correctlyRouted=Boolean(location&&location.origin===request.origin&&
    location.pathname===wanted.pathname&&!location.search&&!location.hash&&
    !location.username&&!location.password);
  if(!correctlyRouted)
   add('php-local:redirect-location-drift','error',expected.from,
    'Local PHP redirect Location differs from the sealed target inside this site mount.',
    {expectedPath:wanted.pathname,observed:item.location.slice(0,240)});
  if(item.status===301&&correctlyRouted)verifiedRedirectPaths.push(expected.from);
 }
 return Object.freeze({format:FORMAT,siteId:site.siteId,readOnly:true,
  robotsStatus:robots.status,sitemapStatus:sitemap.status,
  redirectResponses:manifest.redirects.length,
  verifiedRedirectPaths:Object.freeze(verifiedRedirectPaths),
  parsedSitemapPaths:paths?Object.freeze(paths):null,parsedSitemapComplete:paths!==null,
  declaredPublicOrigin,
  findings:Object.freeze(findings.map(item=>Object.freeze(item))),
  actualLoopbackRequests:true,publicHttpsProven:false,
  actualPhpBuildRevisionAuthenticated:false,releaseAuthorized:false,
  limitations:'Hash-checked local PHP HTTP responses only. Sitemap loc origins are from PHP configuration, not authenticated public HTTPS; cannot certify production robots/crawl or current deployed build.'});
}
module.exports=Object.freeze({FORMAT,records,review,resourceName});
