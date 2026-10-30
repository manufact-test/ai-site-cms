'use strict';
/* True offline Node CLI integration from real PRIVATE files into atomically written reports. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
 path=require('node:path'),cp=require('node:child_process');
const BP=require('../lib/blueprint.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-blueprint-release-'));
const compare=path.join(__dirname,'../bin/compare-seo-blueprints.cjs');
const review=path.join(__dirname,'../bin/review-blueprint-decisions.cjs');
const run=(script,args)=>cp.spawnSync(process.execPath,[script,...args],
 {encoding:'utf8',timeout:15000});
try{
 const draft=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json')));
 const old=BP.compileBrief(draft),newDraft=JSON.parse(JSON.stringify(draft));
 const p=newDraft.pages.find(p=>p.id==='page-contact');
 p.path='/contact-new/';p.seo.description='Updated owner-approved contact description';
 const oldFile=path.join(root,'old.json'),newFile=path.join(root,'new.json');
 fs.writeFileSync(oldFile,JSON.stringify(old));
 fs.writeFileSync(newFile,JSON.stringify(newDraft));
 const dir=path.join(root,'impact');
 const c=run(compare,['--before',oldFile,'--after',newFile,'--out',dir]);
 assert.equal(c.status,0,c.stderr);
 const report=JSON.parse(fs.readFileSync(path.join(dir,'BLUEPRINT-CHANGE-IMPACT.json')));
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'SOURCE-MANIFEST.json')));
 assert.equal(report.summary.movedRoutes,1);
 assert.equal(report.redirectsCreated,0);
 assert.equal(report.publicationAuthorized,false);
 assert.equal(manifest.actualNetworkRequests,0);
 assert.equal(manifest.releaseAuthorized,false);
 assert(fs.readFileSync(path.join(dir,'index.html'),'utf8').includes('P0'));
 const decisionsFile=path.join(root,'decisions.json');
 const worksheet=JSON.parse(fs.readFileSync(path.join(dir,'DECISION-WORKSHEET.json')));
 fs.writeFileSync(decisionsFile,JSON.stringify(worksheet));
 const result=path.join(root,'review');
 const rev=run(review,['--before',oldFile,'--after',newFile,'--decisions',
  decisionsFile,'--out',result]);
 assert.equal(rev.status,0,rev.stderr);
 const reviewed=JSON.parse(fs.readFileSync(path.join(result,'BLUEPRINT-DECISION-REVIEW.json')));
 assert(reviewed.counts.pending>0);
 assert.equal(reviewed.releaseAuthorized,false);
 assert(fs.readFileSync(path.join(result,'index.html'),'utf8').includes('NOT a release decision'));
 assert.notEqual(run(compare,['--before',oldFile,'--after',newFile,'--out',dir]).status,0,
  'Never overwrite the original operator report');
 assert.notEqual(run(review,['--before',oldFile,'--after',newFile,'--decisions',
  decisionsFile,'--out',result]).status,0,'Never overwrite the decision report');
 const changed=JSON.parse(JSON.stringify(worksheet));
 changed.afterBlueprintSha256='0'.repeat(64);
 fs.writeFileSync(decisionsFile,JSON.stringify(changed));
 const bad=path.join(root,'must-refuse');
 assert.notEqual(run(review,['--before',oldFile,'--after',newFile,'--decisions',
  decisionsFile,'--out',bad]).status,0);
 assert(!fs.existsSync(bad),'Failure must not leave a partial private review');
 assert.notEqual(run(compare,['--before',path.join(__dirname,'../fixtures/industrial.brief.json'),
  '--after',newFile,'--out',path.join(root,'checkout-source')]).status,0,
  'Reject private inputs inside checkout');
 assert.notEqual(run(compare,['--before',oldFile,'--after',oldFile,
  '--out',path.join(root,'same-source')]).status,0);
 console.log('Blueprint private compare+review CLI end-to-end smoke PASS.');
}finally{fs.rmSync(root,{recursive:true,force:true});}
