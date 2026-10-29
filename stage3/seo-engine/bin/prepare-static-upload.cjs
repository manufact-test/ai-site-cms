#!/usr/bin/env node
'use strict';
// Zero-network static upload package; integrates approved site, owner API and
// PHP static release. No GitHub PR, deploy, FTP, shell upload or DB mutation.
const fs=require('node:fs'),path=require('node:path');
const BRIDGE=require('../lib/approved-site-bridge.cjs');
const STATIC=require('../lib/php-local-static-export.cjs');
const BUNDLE=require('../lib/static-host-bundle.cjs');
const FIRST=require('./first-site-check.cjs');
const shaFile=p=>require('node:crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function parse(argv){
 if(!Array.isArray(argv)||argv.length%2||argv.length<10||argv.length>12)
  throw Error('Usage: node stage3/seo-engine/bin/prepare-static-upload.cjs --approved-site /ABS/SEALED --published-site /ABS/owner-published.json --static-export /ABS/official-release --provider apache|nginx|netlify|cloudflare-pages --out /ABS/NEW-DIR [--owner-edit-review /ABS/owner-review.json]');
 const fields=['approved-site','published-site','static-export','provider','out','owner-edit-review'],options={};
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i]?.startsWith('--')?argv[i].slice(2):null;
  if(!fields.includes(key)||typeof argv[i+1]!=='string'||!argv[i+1]||options[key])
   throw Error('Invalid, unsupported or duplicate static upload option');
  options[key]=argv[i+1];
 }
 if(fields.slice(0,5).some(x=>!options[x])||!BUNDLE.PROVIDERS.includes(options.provider))
  throw Error('Static upload requires approved source, owner API, verified release, provider and new output');
 if(!path.isAbsolute(options.out)||!path.isAbsolute(options['static-export']))
  throw Error('Static source and output must have explicit absolute paths');
 return options;
}
function create(argv){
 const o=parse(argv),sealed=BRIDGE.load(o['approved-site']);
 const owner=FIRST.readPublishedSite(o['published-site']);
 if(!owner.sourceRevision)throw Error('Owner sourceRevision required to bind official static release');
 const review=o['owner-edit-review']?FIRST.readOwnerEditReview(o['owner-edit-review']):null;
 const reconciled=BRIDGE.reconcile(sealed,owner.site,owner.version,review),site=reconciled.site;
 const publishedSha=shaFile(o['published-site']),
  reviewSha=o['owner-edit-review']?shaFile(o['owner-edit-review']):null;
 const release=STATIC.read(o['static-export'],site);
 if(release.sourceRevision!==owner.sourceRevision||release.publishedVersion!==owner.version)
  throw Error('Official static export differs from owner-published revision/version');
 // Prevent accidental staging inside a sealed source or source export.
 const output=path.resolve(o.out),source=fs.realpathSync(o['static-export']),
  approvedDir=fs.realpathSync(o['approved-site']);
 if([approvedDir,source].some(root=>output===root||output.startsWith(root+path.sep)||
    root.startsWith(output+path.sep)))
  throw Error('Static upload output must be outside the official source and approved site');
 const result=BUNDLE.prepare(site,release,source,output,o.provider);
 if(shaFile(o['published-site'])!==publishedSha||
    o['owner-edit-review']&&shaFile(o['owner-edit-review'])!==reviewSha)
  throw Error('Owner release or approved edit-review changed during upload staging; quarantine and rerun');
 const again=BRIDGE.load(o['approved-site']);
 if(again.source.fileSha256!==sealed.source.fileSha256)
  throw Error('Sealed Approved Site changed during staging; quarantine and rerun');
 return result;
}
if(require.main===module)
 try{process.stdout.write('OFFLINE STATIC UPLOAD READY: '+JSON.stringify(create(process.argv.slice(2)))+'\n');}
 catch(err){process.stderr.write('Static upload refused: '+err.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,create});
