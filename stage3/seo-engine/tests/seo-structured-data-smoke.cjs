'use strict';
/* Real Node offline schema QA smoke, no website fetch or CMS mutations. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs'),POLICY=require('../lib/crawl-policy.cjs');
const QA=require('../lib/seo-structured-data-audit.cjs');
const VIEW=require('../lib/seo-structured-data-view.cjs');
const WORK=require('../lib/seo-operator-workspace.cjs');
const CLI=require('../bin/review-structured-data.cjs');
const WCLI=require('../bin/build-seo-operator-workspace.cjs');
const json=v=>JSON.stringify(v,null,2)+'\n';
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const bp=BP.checkBlueprint(JSON.parse(fs.readFileSync(
 path.join(__dirname,'../fixtures/industrial.blueprint.json'),'utf8')));
const site={format:'manufact-ai-site-v1',schemaVersion:1,siteId:bp.siteId,
 pages:bp.pages.map(x=>({id:x.id,path:x.path,seo:{...x.seo},sections:[]})),
 redirects:[]};
const base='https://example.org/';
const org={'@context':'https://schema.org','@type':'Organization',
 '@id':base+'#organization',url:base,name:'Synthetic organization'};
const script=v=>'<script type="application/ld+json">'+JSON.stringify(v)+'</script>';
const robotsText='User-agent: Googlebot\nAllow: /\nUser-agent: *\nAllow: /\n';
const sitemapXml='<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+
 bp.pages.map(p=>'<url><loc>'+base+p.path.slice(1)+'</loc></url>').join('')+'</urlset>';
const policy=POLICY.analyze({blueprint:bp,base,robotsText,sitemapXml,
 agents:['Googlebot','Bingbot','*'],scope:'complete'});
function capture(root=org,other=''){
 return {format:'manufact-seo-delivery-evidence-v1',siteId:bp.siteId,origin:base,
  capturedAt:'2026-10-30T18:00:00Z',
  pages:bp.pages.map(p=>({id:p.id,path:p.path,
   requestUrl:base+p.path.slice(1),responseUrl:base+p.path.slice(1),status:200,
   headers:{'content-type':'text/html'},
   html:'<html><head><title>QA</title>'+(p.path==='/'?script(root):other)+'</head></html>'})),
  robots:{url:base+'robots.txt',status:200,contentType:'text/plain',body:robotsText},
  sitemap:{url:base+'sitemap.xml',status:200,contentType:'application/xml',body:sitemapXml},
  redirects:[]};
}
const input=c=>({blueprint:bp,blueprintRawSha256:hash(json(bp)),
 site,siteRawSha256:hash(json(site)),capture:c,captureRawSha256:hash(json(c)),expectedBase:base});
const good=QA.review(input(capture()));
assert.equal(good.summary.P0,0);
assert.equal(good.summary.P1,0);
assert.equal(good.summary.uninspectedPages,0);
assert.equal(good.releaseAuthorized,false);
assert(!json(good).includes('Synthetic organization'));
const breadcrumbs={'@context':'https://schema.org','@type':'BreadcrumbList',
 itemListElement:[
  {'@type':'ListItem',position:2,name:'Home',item:'https://outside.example/'},
  {'@type':'ListItem',position:3,name:'Contact',item:base}
 ]};
const risky={...org,offers:{'@type':'Offer',price:'9',priceCurrency:'USD'},
 aggregateRating:{'@type':'AggregateRating',ratingValue:'5.0'}};
const hostile=capture(risky,script(breadcrumbs));
const review=QA.review(input(hostile));
for(const kind of ['breadcrumb-positions','breadcrumb-foreign-url',
 'unspecified-schema-type','claim-needs-owner-evidence'])
 assert(review.findings.some(f=>f.code==='schema:'+kind),kind);
assert(review.summary.P1>=4);
assert(!json(review).includes('"price":"9"'));
assert(review.findings.every(f=>f.automaticFix===false));
const invalid=capture(org,'<script type="application/ld+json">{bad</script>');
assert(QA.review(input(invalid)).findings.some(f=>f.code==='schema:invalid-json-ld'));
const missing=capture();missing.pages.pop();
assert.equal(QA.review(input(missing)).summary.uninspectedPages,1);
const malformed=capture();malformed.origin='https://else.example/';
assert.throws(()=>QA.review(input(malformed)),/mount/);
assert.throws(()=>QA.review({...input(capture()),site:{...site,siteId:'other'}}),/Site v1/);
const view=VIEW.render(review);
assert(view.html.includes('default-src &#39;none&#39;'));
assert(!view.html.includes('<script'));
const data={policy,cmsBlueprint:bp,cmsSite:site,publicCapture:hostile,
 digests:{policy:hash(json(policy)),cmsBlueprint:hash(json(bp)),
  cmsSite:hash(json(site)),publicCapture:hash(json(hostile))}};
const workspace=WORK.build({crawl:data});
assert(workspace.homeHtml.includes('structured-data.html'));
assert(workspace.crawlHtml.includes('structured-data.html'));
assert(workspace.structuredDataJson.includes('"claimFieldNames"'));
assert.equal(workspace.overview.schemaSemanticQAIncluded,true);
assert(JSON.parse(workspace.leadReadinessJson).gates.some(g=>g.key==='structured-data-owner-claims'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-structured-qa-'));
try{
 const put=(n,v)=>{const p=path.join(dir,n);fs.writeFileSync(p,json(v));return p;};
 const b=put('blueprint.json',bp),s=put('site.json',site),
  h=put('http.json',hostile),p=put('policy.json',policy);
 const standalone=path.join(dir,'schema-report');
 CLI.main(['--blueprint',b,'--site',s,'--public-http',h,'--out',standalone]);
 const saved=JSON.parse(fs.readFileSync(path.join(standalone,'structured-data.json')));
 assert.equal(saved.summary.P1,review.summary.P1);
 assert.throws(()=>CLI.main(['--blueprint',b,'--site',s,
  '--public-http',h,'--out',standalone]),/already exists|overwrite/);
 const config=put('config.json',{format:WCLI.CONFIG,
  crawl:{policy:p,cmsBlueprint:b,cmsSite:s,publicCapture:h}});
 const combined=path.join(dir,'combined');
 WCLI.main(['--config',config,'--out',combined]);
 for(const name of ['structured-data.html','structured-data.md','structured-data.json'])
  assert(fs.existsSync(path.join(combined,name)),name);
 const receipt=JSON.parse(fs.readFileSync(path.join(combined,'LEAD-PACKET-INTEGRITY.json')));
 assert(receipt.files.some(f=>f.name==='structured-data.html'));
 assert(receipt.files.some(f=>f.name==='structured-data.json'));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
process.stdout.write('Real Node per-client Structured Data QA smoke PASS.\n');
