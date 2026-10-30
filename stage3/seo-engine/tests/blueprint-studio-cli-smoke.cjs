'use strict';
/* Two real local CLI paths: new draft and existing Blueprint. Uses private temp only. */
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),
 path=require('node:path'),child=require('node:child_process');
const BP=require('../lib/blueprint.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-seo-blueprint-studio-'));
const script=path.join(__dirname,'../bin/seo-blueprint-studio.cjs');
const run=args=>child.spawnSync(process.execPath,[script,...args],{encoding:'utf8',timeout:10000});
try{
 const fresh=path.join(root,'new');
 const a=run(['--site-id','site-new-example','--out',fresh]);
 assert.equal(a.status,0,a.stderr);
 const draft=JSON.parse(fs.readFileSync(path.join(fresh,'SOURCE-BRIEF-DRAFT.json')));
 assert.equal(draft.siteId,'site-new-example');
 assert.equal(draft.pages[0].path,'/');
 const result=JSON.parse(fs.readFileSync(path.join(fresh,'STUDIO-MANIFEST.json')));
 assert.equal(result.published,false);
 assert.equal(result.ownerApproved,false);
 assert.equal(result.sourceKind,'site-id');
 assert(fs.readFileSync(path.join(fresh,'BLUEPRINT-STUDIO.html'),'utf8').includes('Add page'));
 assert.notEqual(run(['--site-id','site-new-example','--out',fresh]).status,0,'Cannot overwrite');
 const example=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json')));
 const compiled=BP.compileBrief(example);
 const privateBrief=path.join(root,'input-brief.json');
 const privateBlueprint=path.join(root,'input-blueprint.json');
 fs.writeFileSync(privateBrief,JSON.stringify(example));
 fs.writeFileSync(privateBlueprint,JSON.stringify(compiled));
 const fromBrief=path.join(root,'brief'),fromBlueprint=path.join(root,'blueprint');
 assert.equal(run(['--brief',privateBrief,'--out',fromBrief]).status,0);
 assert.equal(run(['--blueprint',privateBlueprint,'--out',fromBlueprint]).status,0);
 const recreated=JSON.parse(fs.readFileSync(path.join(fromBlueprint,'SOURCE-BRIEF-DRAFT.json')));
 assert.deepEqual(BP.compileBrief(recreated),compiled);
 assert.equal(run(['--brief',path.join(__dirname,'../fixtures/industrial.brief.json'),
  '--out',path.join(root,'must-not-exist')]).status!==0,true,'Private import must reject checkout input');
 const broken=path.join(root,'broken.json');
 fs.writeFileSync(broken,'{"format":"bad"}');
 assert.notEqual(run(['--brief',broken,'--out',path.join(root,'broken-out')]).status,0);
 assert(!fs.existsSync(path.join(root,'broken-out')));
 console.log('Blueprint Studio private atomic CLI creation/import smoke PASS.');
}finally{fs.rmSync(root,{recursive:true,force:true});}
