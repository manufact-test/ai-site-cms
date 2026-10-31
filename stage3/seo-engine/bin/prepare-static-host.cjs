#!/usr/bin/env node
'use strict';
// Offline operator-owned hosting configuration artifact. Never deploys.
const fs=require('node:fs'),path=require('node:path');
const BRIDGE=require('../lib/approved-site-bridge.cjs');
const STATIC=require('../lib/php-local-static-export.cjs');
const REWRITES=require('../lib/static-host-rewrites.cjs');
const FIRST=require('./first-site-check.cjs');
function parse(args){
 if(!Array.isArray(args)||args.length<8||args.length>10||args.length%2)
  throw Error('Usage: node stage3/seo-engine/bin/prepare-static-host.cjs --approved-site /ABS/SEALED --published-site /ABS/owner-api.json --static-export /ABS/release --out /ABS/new-plan-directory [--owner-edit-review /ABS/manual-review.json]');
 const known=['approved-site','published-site','static-export','out','owner-edit-review'],result={};
 for(let i=0;i<args.length;i+=2){
  const name=args[i]?.startsWith('--')?args[i].slice(2):null;
  if(!known.includes(name)||!args[i+1]||result[name])
   throw Error('Invalid or duplicate static hosting plan input');
  result[name]=args[i+1];
 }
 if(known.slice(0,4).some(name=>!result[name]))
  throw Error('Static hosting requires owner Site v1, sealed source, official static release and new output folder');
 return result;
}
function create(args){
 const o=parse(args),approved=BRIDGE.load(o['approved-site']),
  owner=FIRST.readPublishedSite(o['published-site']);
 if(!owner.sourceRevision)throw Error('Owner API published sourceRevision is mandatory');
 const manual=o['owner-edit-review']?FIRST.readOwnerEditReview(o['owner-edit-review']):null;
 const {site}=BRIDGE.reconcile(approved,owner.site,owner.version,manual);
 const release=STATIC.read(o['static-export'],site);
 if(release.publishedVersion!==owner.version||release.sourceRevision!==owner.sourceRevision)
  throw Error('Official static release version/sourceRevision does not match the owner published API');
 const output=path.resolve(o.out),parent=fs.realpathSync(path.dirname(output));
 const sealed=fs.realpathSync(o['approved-site']),staticDir=fs.realpathSync(o['static-export']);
 if(!path.isAbsolute(o.out)||fs.existsSync(output)||fs.existsSync(path.join(output,'HOSTING-HANDOFF.md'))||
    [sealed,staticDir].some(root=>output===root||output.startsWith(root+path.sep)||
      parent===root||parent.startsWith(root+path.sep)))
  throw Error('Hosting plan output must be a new absolute folder outside immutable source and static release');
 const plan=REWRITES.build(site,release);
 const commands=plan.httpChecks.map(c=>'- '+c.kind+': curl -I --max-time 15 '+c.url+
  ' — expect HTTP '+c.expectedStatus+
  (c.expectedLocation?' with Location: '+c.expectedLocation:'')).join('\n');
 const markdown=[
  '# AI Site CMS — static HTTPS hosting handoff',
  '',
  'Site: '+plan.siteId+'; pinned publishedVersion '+plan.publishedVersion+
   '; owner sourceRevision '+plan.sourceRevisionClaim+'.',
  'Official static release manifest SHA256: '+plan.officialManifestSha256+'.',
  'Intended HTTPS static document root: '+plan.origin+'/',
  'Page routes: '+plan.allSitePages+'; true HTTP 301 aliases: '+plan.redirectCount+'.',
  '',
  'Choose ONE hosting server format. Do not install multiple redirect snippets.',
  '- Apache: review apache.htaccess, mod_rewrite and AllowOverride in the root-static vhost.',
  '- Nginx: review nginx-redirects.conf inside the HTTPS server block. These are exact-match locations only.',
  '- Netlify: copy netlify._redirects as _redirects into the publish directory; 301! is forced because static export includes legacy HTML fallbacks.',
  '- Cloudflare Pages: copy cloudflare-pages._redirects as _redirects into the static asset directory; check Pages Functions routes.',
  '- Copy the static export contents to the approved HTTPS document root using the lead-owned deployment process.',
  '- Configure TLS, document root, index, security and legal/privacy policies separately.',
  '- Check a separate HTTPS collector and real submission delivery for any forms; NEVER infer POST acceptance from markup.',
  '- Confirm the deployed host is the correct website, not /published/SITE-ID/ PHP mount.',
  '- Never expose the private owner API, published-site JSON or form HMAC.',
  '',
  '## Operator HTTP checks (suggested, not executed by this generator)',
  '',
  commands,
  '',
  'Every legacy route needs a REAL HTTP 301 from the web server; static HTML meta-refresh alone is insufficient.',
  'Run the existing public HTTPS capture and first-site SEO review after deploying with explicit owner permission.',
  'No deploy, live rewrite, public request, client approval or forms POST has been performed.',
  ''
 ].join('\n');
 fs.mkdirSync(output,{mode:0o700});
 const write=(name,content)=>fs.writeFileSync(path.join(output,name),content,{flag:'wx',mode:0o600});
 write('apache.htaccess',plan.apache.content);
 write('nginx-redirects.conf',plan.nginx.content);
 write('netlify._redirects',plan.netlify.content);
 write('cloudflare-pages._redirects',plan.cloudflarePages.content);
 write('plan.json',JSON.stringify({...plan,apache:{...plan.apache,content:undefined},
  nginx:{...plan.nginx,content:undefined},
  netlify:{...plan.netlify,content:undefined},
  cloudflarePages:{...plan.cloudflarePages,content:undefined}},null,2)+'\n');
 write('HOSTING-HANDOFF.md',markdown);
 return {folder:output,siteId:site.siteId,manifestSha256:plan.officialManifestSha256,
  redirectedRoutes:plan.redirectCount,createdFiles:6,actualHostWrites:0,
  publicHttpRequests:0,manualApprovalRequired:true};
}
if(require.main===module)
 try{process.stdout.write('STATIC HOST PLAN: '+JSON.stringify(create(process.argv.slice(2)))+'\n');}
 catch(e){process.stderr.write('Static host plan refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,create});
