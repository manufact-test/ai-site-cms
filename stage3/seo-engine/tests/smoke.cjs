'use strict';
// One complete vertical smoke. Offline, no CMS writes.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),cli=path.join(root,'bin/seo-blueprint.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'seo-blueprint-smoke-'));
function command(op,opts){
 const args=[cli,op,...Object.entries(opts).flatMap(([k,v])=>['--'+k,v])];
 return spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:4000000});
}
function good(op,opts){const p=command(op,opts);assert.equal(p.status,0,op+': '+p.stderr);return p.stdout;}
function fixture(f){return path.join(root,'fixtures',f);}
try{
 for(const name of ['industrial','community']){
  const actual=JSON.parse(good('compile',{brief:fixture(name+'.brief.json')}));
  const expected=JSON.parse(fs.readFileSync(fixture(name+'.blueprint.json'),'utf8'));
  assert.deepEqual(actual,expected,name+' canonical blueprint');
  const explanation=good('explain',{blueprint:fixture(name+'.blueprint.json')});
  assert.match(explanation,/SEO/);
  assert.match(explanation,/mobile/);
 }
 const site=path.resolve(root,'../fixtures/industrial-site.json'),bp=fixture('industrial.blueprint.json');
 const audit=JSON.parse(good('analyze-site',{site,blueprint:bp}));
 assert.equal(audit.format,'manufact-seo-analysis-v1');
 assert.equal(audit.mode,'site-v1');assert.equal(audit.siteId,'site-industrial-demo');
 assert.equal(audit.capabilities.coreInspector,'reused');
 const handoff=JSON.parse(good('handoff',{site,blueprint:bp}));
 assert.equal(handoff.readOnly,true);assert.ok(handoff.supportedChanges.some(x=>x.field==='seo.title'));
 assert.ok(handoff.requiresLeadImplementation.some(x=>x.kind==='structured-data-adapter'));
 const normal=JSON.parse(good('analyze-html',{snapshot:fixture('normal.snapshot.json')}));
 assert.deepEqual(normal.issues,[],'normal HTML snapshot should have no static issues');
 const bad=JSON.parse(good('analyze-html',{snapshot:fixture('invalid.snapshot.json')}));
 const expected=JSON.parse(fs.readFileSync(fixture('invalid.expected-report.json'),'utf8'));
 for(const code of expected.requiredCodes)assert.ok(bad.issues.some(x=>x.code===code),code);
 const tampered=JSON.parse(fs.readFileSync(fixture('community.brief.json'),'utf8'));
 tampered.pages[0].sections[0].media={purpose:'informative',alt:'',why:'Missing'};
 const file=path.join(tmp,'tampered.json');fs.writeFileSync(file,JSON.stringify(tampered));
 const rejected=command('compile',{brief:file});
 assert.notEqual(rejected.status,0,'invalid accessibility alt must fail');
 assert.match(rejected.stderr,/informative image requires alt intent/);
 process.stdout.write('PASS: 2 briefs and byte-stable plans; explanation; Site v1/core inspector + safe handoff; clean and defective HTML snapshots; negative validation.\n');
 process.stdout.write('Audit issues: '+audit.issues.length+'; supported SEO proposals: '+handoff.supportedChanges.length+'; invalid HTML findings: '+bad.issues.length+'.\n');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
