'use strict';
// Provider-compatible, low-risk static HTTP headers generated for ONLY the
// approved public routes. No unverified CSP enforcement or indexing claims.
const FORMAT='manufact-seo-static-public-headers-v1';
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
function build(site,provider){
 if(!site||!Array.isArray(site.pages)||site.pages.length===0||site.pages.length>60||
    !['netlify','cloudflare-pages'].includes(provider))
  throw Error('Static _headers requires valid Site v1 pages and Netlify/Cloudflare Pages');
 const paths=new Set();
 for(const page of site.pages){
  if(!page||typeof page.path!=='string'||!ROUTE.test(page.path)||paths.has(page.path))
   throw Error('Static header path is invalid, ambiguous or duplicate');
  paths.add(page.path);
 }
 const lines=[
  '# Safe common response headers for published static assets.',
  '# CSP is intentionally NOT enforced here without verified browser/script/form review.',
  '/*',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  ''
 ];
 // Avoid stale index pages while retaining caching for immutable media.
 for(const route of [...paths].sort((a,b)=>a.localeCompare(b,'en'))){
  lines.push(route,
   '  Cache-Control: public, max-age=0, must-revalidate','');
 }
 lines.push('/404.html',
  '  X-Robots-Tag: noindex','');
 const content=lines.join('\n');
 if(content.length>90000||content.split('\n').some(line=>line.length>=1800))
  throw Error('Generated static _headers exceeds Cloudflare/Netlify bounded rule sizes');
 return Object.freeze({format:FORMAT,provider,content,
  ruleCount:paths.size+2,sitePages:paths.size,
  cspEnforced:false,formCollectorUrlExposed:false,
  claimsRealResponseHeaders:false,
  limitations:'Applies only to static assets, not Netlify functions, Cloudflare Pages Functions, proxy or edge code. Verify on actual host. Inline CSP requires manual browser review.'});
}
module.exports=Object.freeze({FORMAT,build});
