#!/usr/bin/env node
'use strict';
// Offline review of two already staged, SHA-verified static upload packages.
const fs=require('node:fs'),path=require('node:path');
const IMPACT=require('../lib/static-upload-impact.cjs');
function parse(argv){
 if(!Array.isArray(argv)||argv.length!==6)throw Error(
  'Usage: node stage3/seo-engine/bin/compare-static-uploads.cjs --before /ABS/previous-upload --after /ABS/new-upload --out /ABS/NEW-private-comparison-dir');
 const o={};for(let i=0;i<argv.length;i+=2){
  const key=argv[i]?.startsWith('--')?argv[i].slice(2):null;
  if(!['before','after','out'].includes(key)||!argv[i+1]||o[key])
   throw Error('Unexpected or duplicate offline static comparison flag');
  o[key]=argv[i+1];
 }
 if(!path.isAbsolute(o.before)||!path.isAbsolute(o.after)||!path.isAbsolute(o.out))
  throw Error('Static impact directories must be explicit absolute paths');
 return o;
}
function main(argv){
 const o=parse(argv),before=path.resolve(o.before),after=path.resolve(o.after),
  target=path.resolve(o.out),parent=fs.realpathSync(path.dirname(target));
 if(before===after||fs.existsSync(target)||
    [before,after].some(d=>target===d||target.startsWith(d+path.sep)||
     d.startsWith(target+path.sep)||parent===d||parent.startsWith(d+path.sep)))
  throw Error('New comparison folder must be distinct from both immutable static uploads');
 const report=IMPACT.loadAndCompare(before,after);
 const lines=[
  '# CMS static publication change review — NOT automatic approval','',
  'Site: '+report.siteId+'; version '+report.oldVersion+' → '+report.newVersion+'.',
  'Same HTTPS origin: '+(report.samePublishedOrigin?'yes':'NO')+
   '; same provider: '+(report.sameProvider?'yes':'NO')+'.',
  'Official source manifests: '+report.oldManifestSha256+' → '+report.newManifestSha256+'.',
  'Pages: '+report.pages.before+' → '+report.pages.after+
   '; added '+report.pages.added.length+
   '; removed '+report.pages.removed.length+
   '; changed '+report.pages.changed.length+'.',
  'Media changed at same URL: '+report.changedMediaSameUrl.length+
   '; historic redirects changed: '+report.changedRedirects.length+'.',
  '**Technical risks requiring review: '+report.risks.length+
   '; blocking risks: '+report.blockerCount+'.**',
  '','## Blocking and review items','',
  ...report.risks.map(x=>'- ['+(x.severity==='error'?'BLOCKED':'REVIEW')+
   '] '+x.type+' '+(x.path||'')+': '+x.message),
  ...(report.risks.length?[]:['- No automatic change risks observed; manual review still required.']),
  '','## Removed pages','',
  ...(report.pages.removed.length?report.pages.removed.map(x=>'- '+x):['- None']),
  '','## Added pages','',
  ...(report.pages.added.length?report.pages.added.map(x=>'- '+x):['- None']),
  '','## Modified pages','',
  ...(report.pages.changed.length?report.pages.changed.map(x=>'- '+x):['- None']),
  '','## Required before an operator replaces the live root','',
  '- [ ] Confirm current production origin and deployed version, not only supplied upload labels.',
  '- [ ] Approve intentional indexability/canonical and page removals, retaining real 301 for historic URLs.',
  '- [ ] Compare actual public media/CDN cache invalidation and verify robots.txt + sitemap.xml.',
  '- [ ] Verify forms POST/recipients, pages, keyboard and responsive behavior on the new candidate.',
  '- [ ] Obtain client sign-off and deploy through the lead-owned release process.',
  '',
  'This tool did not contact the production website, run a server or deploy files.',''
 ];
 fs.mkdirSync(target,{mode:0o700});
 fs.writeFileSync(path.join(target,'impact.json'),JSON.stringify(report,null,2)+'\n',
  {flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(target,'impact.md'),lines.join('\n'),
  {flag:'wx',mode:0o600});
 return {folder:target,siteId:report.siteId,changedPages:report.pages.changed.length,
  removedPages:report.pages.removed.length,
  blockingRisks:report.blockerCount,actualHostWrites:0,ownerApprovalRequired:true};
}
if(require.main===module)
 try{process.stdout.write('STATIC UPLOAD CHANGE REVIEW: '+JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch(e){process.stderr.write('Static upload impact review refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,main});
