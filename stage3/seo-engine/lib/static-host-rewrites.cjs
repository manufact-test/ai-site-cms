'use strict';
// Generate deployment-ready root-static rewrite snippets ONLY from verified
// official CMS static releases. No deployment, credentials or server writes.
const crypto=require('node:crypto'),STATIC=require('./php-local-static-export.cjs');
const FORMAT='manufact-seo-static-host-rewrites-v1';
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const sha=s=>crypto.createHash('sha256').update(s,'utf8').digest('hex');
function build(site,release){
 if(!site||!Array.isArray(site.pages)||!Array.isArray(site.redirects||[])||
    !STATIC.isVerified(release)||release.siteId!==site.siteId||
    !Number.isSafeInteger(release.publishedVersion)||release.publishedVersion<1)
  throw Error('Static host rewrite plan requires an actual SHA-verified official CMS static release');
 let origin;
 try{
  origin=new URL(release.origin);
  if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.username||origin.password||
     origin.search||origin.hash||origin.origin!==release.origin)
   throw Error('not-HTTPS-root');
 }catch{throw Error('A valid official HTTPS static-root STAGE3_EXPORT_ORIGIN is required for deployment planning');}
 if(release.findings?.some(f=>f.severity==='error'))
  throw Error('Repair official static export errors before preparing real host rewrites');
 const pages=new Set(site.pages.map(p=>p.path));
 if(!pages.has('/'))throw Error('A root static HTML page must be published before deployment');
 const aliases=new Map();
 for(const r of site.redirects||[]){
  if(!r||!ROUTE.test(r.from)||!ROUTE.test(r.to)||pages.has(r.from)||
     !pages.has(r.to)||r.from===r.to||aliases.has(r.from)||
     release.redirects.get(r.from)!==r.to)
   throw Error('Published 301 alias is missing, unsafe, duplicated, cyclic or points to a non-page');
  aliases.set(r.from,r.to);
 }
 if(aliases.size!==release.redirects.size)
  throw Error('Official static export redirect ledger mismatch');
 const redirects=[...aliases.entries()].sort(([a],[b])=>a.localeCompare(b,'en'));
 const apache=[
  '# AI Site CMS official root-static redirect plan; source-bounded and read-only.',
  '# Save in an Apache vhost where mod_rewrite is enabled. Do not use on the PHP CMS mount.',
  '# Real HTTP 301 required: static meta-refresh is NOT a search-engine 301.',
  'DirectoryIndex index.html',
  'RewriteEngine On',
  ...redirects.map(([from,to])=>'RewriteRule ^'+from.slice(1).replace(/\/$/,'/')+'$ '+to+' [R=301,L,NE]'),
  ''
 ].join('\n');
 const nginx=[
  '# AI Site CMS official root-static redirect plan.',
  '# Paste location blocks INSIDE the existing Nginx HTTPS server {} for the declared origin.',
  '# Existing document root, TLS, index and location rules remain operator-owned.',
  '# Place exact locations before a generic app/router location.',
  ...redirects.map(([from,to])=>'location = '+from+' { return 301 '+to+'; }'),
  ''
 ].join('\n');
 const netlify=[
  '# Netlify: copy as _redirects into the publish directory.',
  '# FORCE 301! required: official static release contains old-path/index.html fallback.',
  ...redirects.map(([from,to])=>from+'  '+to+'  301!'),
  ''
 ].join('\n');
 const cloudflare=[
  '# Cloudflare Pages: copy as _redirects into the deployment asset directory.',
  '# Redirect rules execute before matching existing static assets; exclude matching Pages Functions.',
  ...redirects.map(([from,to])=>from+'  '+to+'  301'),
  ''
 ].join('\n');
 const checks=[
  {kind:'root',url:origin.origin+'/',expectedStatus:200},
  {kind:'robots',url:origin.origin+'/robots.txt',expectedStatus:200},
  {kind:'sitemap',url:origin.origin+'/sitemap.xml',expectedStatus:200},
  ...redirects.map(([from,to])=>({
   kind:'redirect',url:origin.origin+from,expectedStatus:301,
   expectedLocation:origin.origin+to}))
 ];
 const recommended=Object.freeze({
  format:FORMAT,siteId:site.siteId,publishedVersion:release.publishedVersion,
  sourceRevisionClaim:release.sourceRevision,
  officialManifestSha256:release.manifestSha256,
  origin:origin.origin,staticRootOnly:true,
  allSitePages:site.pages.length,redirectCount:redirects.length,
  apache:{file:'apache.htaccess',sha256:sha(apache),content:apache,
   requires:'Apache with mod_rewrite and AllowOverride support'},
  nginx:{file:'nginx-redirects.conf',sha256:sha(nginx),content:nginx,
   requires:'Explicit Nginx HTTPS server context with existing root and index'},
  netlify:{file:'netlify._redirects',sha256:sha(netlify),content:netlify,
   requires:'Copy/rename to _redirects in Netlify publish directory; forced 301! overrides bundled HTML fallback'},
  cloudflarePages:{file:'cloudflare-pages._redirects',sha256:sha(cloudflare),content:cloudflare,
   requires:'Copy/rename to _redirects in Cloudflare Pages assets directory; check Pages Functions exclusions'},
  httpChecks:checks,actualHostWrites:0,redirectsTestedOverNetwork:false,
  formCollectorConfiguredInStaticRelease:Boolean(release.staticForms?.length),
  actualPostDeliveryTested:false,automaticDeploy:false,clientApprovalVerified:false,
  notes:'These are alternative server-specific snippets, NOT cumulative instructions. Static files require a real configured HTTPS document root and other hosting rules. Review conflicts with existing rewrites, ownership, TLS, index and form collector before installing. This generator does not write to live hosts or prove real 301 responses.'});
 return recommended;
}
module.exports=Object.freeze({FORMAT,build});
