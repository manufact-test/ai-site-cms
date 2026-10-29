#!/usr/bin/env node
'use strict';
// Compare two locally saved public HTTPS GET transcripts. No network requests,
// CMS reads, POST, production writes, PR or merge.
const fs=require('node:fs'),path=require('node:path'),
 FIRST=require('./first-site-check.cjs'),DRIFT=require('../lib/public-cdn-drift.cjs');
function parse(argv){
 if(!Array.isArray(argv)||argv.length%2||![6,10].includes(argv.length))
  throw Error('Usage: node stage3/seo-engine/bin/compare-public-cdn.cjs --before /ABS/previous-public-http.json --after /ABS/latest-public-http.json --out /ABS/NEW-private-drift-report [--before-media /ABS/previous-public-sha256.json --after-media /ABS/latest-public-sha256.json]');
 const opts={};
 for(let i=0;i<argv.length;i+=2){
  const key=argv[i]?.startsWith('--')?argv[i].slice(2):null;
  if(!['before','after','out','before-media','after-media'].includes(key)||opts[key]||
     typeof argv[i+1]!=='string'||!path.isAbsolute(argv[i+1]))
   throw Error('Invalid or duplicate public CDN drift comparison flag');
  opts[key]=argv[i+1];
 }
 if(Boolean(opts['before-media'])!==Boolean(opts['after-media']))
  throw Error('Public CDN media comparison requires before-media and after-media together');
 if(!opts.before||!opts.after||!opts.out)
  throw Error('Both public HTTP transcripts and private output are required');
 return opts;
}
function main(argv){
 const o=parse(argv),target=path.resolve(o.out);
 if(fs.existsSync(target))throw Error('Output already exists; refuse to overwrite CDN comparison');
 const one=FIRST.readPublicEvidence(o.before,'http'),
  two=FIRST.readPublicEvidence(o.after,'http');
 const oldMedia=o['before-media']?JSON.parse(fs.readFileSync(o['before-media'],'utf8')):null,
  newMedia=o['after-media']?JSON.parse(fs.readFileSync(o['after-media'],'utf8')):null;
 if(oldMedia||newMedia)for(const file of [o['before-media'],o['after-media']]){
  const stat=fs.lstatSync(file);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size<100||stat.size>1800000)
   throw Error('Invalid bounded private public-media SHA256 receipt');
 }
 const report=DRIFT.compare(one,two,oldMedia,newMedia),parent=fs.realpathSync(path.dirname(target));
 for(const file of [o.before,o.after]){
  const origin=fs.realpathSync(file);
  if(target===origin||target.startsWith(origin+path.sep)||
     origin.startsWith(target+path.sep))throw Error('CDN comparison output must be distinct from source evidence');
 }
 const rows=[
  '# AI Site CMS — production HTTPS / CDN drift comparison','',
  '**'+report.verdict+'**',
  'Site: '+report.siteId+'; captured origin: '+report.origin,
  'Official manifest comparable: '+report.sameOfficialReleaseComparable,
  'Published version: '+report.previousPublishedVersion+' → '+report.currentPublishedVersion,
  'Old release SHA256: '+report.previousManifestSha256,
  'New release SHA256: '+report.currentManifestSha256,
  'Public media SHA256 snapshots compared: '+report.publicMediaDigestSnapshotsCompared+'.',
  'Public assets observed: '+report.oldPublicMediaResources+' → '+report.newPublicMediaResources+'.',
  'Critical observations: '+report.criticalDriftCount+
   '; manual reviews: '+report.reviewCount,'',
  '## Public changes requiring investigation','',
  ...(report.newProblems.length?report.newProblems.map(x=>
   '- '+x.code+' '+(x.path||'')+': '+x.message):['- None in supplied captures']),
  '','## Manual review','',
  ...(report.manualReviews.length?report.manualReviews.map(x=>
   '- '+x.code+': '+x.message):['- Review actual public host separately.']),
  '','Do not publish, rollback, submit forms or claim client approval from this report.',
  'No private form HTML, tokens, operator identities or CMS source files were stored.',''
 ];
 const temp=fs.mkdtempSync(path.join(parent,'.seo-cdn-incomplete-'));
 try{
  fs.writeFileSync(path.join(temp,'drift.json'),JSON.stringify(report,null,2)+'\n',
   {flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(temp,'drift.md'),rows.join('\n'),
   {flag:'wx',mode:0o600});
  if(fs.existsSync(target))throw Error('CDN comparison output appeared during processing');
  fs.renameSync(temp,target);
 }catch(e){fs.rmSync(temp,{force:true,recursive:true});throw e;}
 return {output:target,verdict:report.verdict,
  criticalDriftCount:report.criticalDriftCount,automaticRelease:false,networkRequests:0};
}
if(require.main===module)
 try{process.stdout.write('PUBLIC CDN DRIFT: '+JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch(e){process.stderr.write('Public CDN comparison refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,main});
