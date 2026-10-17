/* Stage 1 research: independently declared editable intent vs discovered annotated HTML.
 * The intent ledger is supplied explicitly by a trusted spec, NOT inferred by AI or universal CSS analyzer.
 * Prevent accidental omission in a restricted leaf-text grammar; expose non-guarantees. */
'use strict';
const assert=require('node:assert/strict');
const api=require('./annotated-html-contract.cjs');
const parse5=import('parse5');
const fixtures=[
 {name:'timeline',html:'<section data-stable-id="timeline-root"><header data-stable-id="timeline-header"><h2 data-stable-id="timeline-title" data-editable="text fontSize">How it began</h2><p data-stable-id="timeline-subhead" data-editable="text">The early years</p></header><ul data-stable-id="timeline-items" data-editable="gap"><li data-stable-id="timeline-a"><strong data-stable-id="timeline-a-label" data-editable="text">Milestone A</strong></li><li data-stable-id="timeline-b"><strong data-stable-id="timeline-b-label" data-editable="text">Milestone B</strong></li></ul></section>',
 intent:{'timeline-title':['text','fontSize'],'timeline-subhead':['text'],'timeline-items':['gap'],'timeline-a-label':['text'],'timeline-b-label':['text']}},
 {name:'dashboard',html:'<section data-stable-id="dash-root"><aside data-stable-id="dash-side"><h2 data-stable-id="dash-title" data-editable="text fontSize">Performance overview</h2></aside><article data-stable-id="dash-panel" data-editable="gap backgroundColor"><div data-stable-id="dash-widget-one"><h3 data-stable-id="dash-kpi" data-editable="text">Growing</h3><small data-stable-id="dash-kpi-hint" data-editable="text">Quarter on quarter</small></div><div data-stable-id="dash-widget-two"><p data-stable-id="dash-report" data-editable="text">Measured outcomes</p></div></article></section>',
 intent:{'dash-title':['text','fontSize'],'dash-panel':['gap','backgroundColor'],'dash-kpi':['text'],'dash-kpi-hint':['text'],'dash-report':['text']}}
];
function assertAudit(html,ledger,parser,{ignoredTextIds=[]}={}){
 const manifest=api.discover(html,parser);
 const found=new Map(manifest.fields.map(f=>[f.id+'__'+f.prop,f]));
 const expected=new Set(Object.entries(ledger).flatMap(([id,arr])=>arr.map(prop=>id+'__'+prop)));
 const missing=[...expected].filter(k=>!found.has(k));
 const unexpected=[...found.keys()].filter(k=>!expected.has(k));
 const textOmissions=[];
 const fragment=parser(html),ignored=new Set(ignoredTextIds);
 function walk(node){
  if(!node.tagName)return;
  const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
  const text=node.childNodes?.filter(c=>c.nodeName==='#text').map(c=>c.value).join('').trim()||'';
  if(text&&!node.childNodes?.some(c=>c.tagName)){
   if(!found.has(attrs['data-stable-id']+'__text')&&!ignored.has(attrs['data-stable-id']))textOmissions.push(attrs['data-stable-id']||'<no-id>');
  }
  for(const child of node.childNodes||[])walk(child);
 }
 fragment.childNodes.forEach(walk);
 return {manifest,missing,unexpected,textOmissions,complete:missing.length===0&&unexpected.length===0&&textOmissions.length===0};
}
function mutate(id,html,term,replacement){
 const altered=html.replace(term,replacement);assert.notEqual(altered,html,id);return altered;
}
(async()=>{
 const {parseFragment}=await parse5;
 let success=0,negatives=0,omissionDetected=0;
 for(const fixture of fixtures){
  const audit=assertAudit(fixture.html,fixture.intent,parseFragment);
  assert.equal(audit.complete,true,'full ledger coverage '+fixture.name);
  assert.equal(audit.missing.length,0);assert.equal(audit.unexpected.length,0);assert.equal(audit.textOmissions.length,0);
  assert.equal(Object.keys(audit.manifest.defaults).length,audit.manifest.fields.length);
  success++;
  const first=Object.keys(fixture.intent)[0],firstProperty=fixture.intent[first][0];
  let intent=structuredClone(fixture.intent);intent[first]=intent[first].filter(x=>x!==firstProperty);
  let x=assertAudit(fixture.html,intent,parseFragment);
  assert.ok(x.unexpected.includes(first+'__'+firstProperty));negatives++;
  intent=structuredClone(fixture.intent);intent[first].push('backgroundColor');
  x=assertAudit(fixture.html,intent,parseFragment);
  assert.ok(x.missing.includes(first+'__backgroundColor'));negatives++;
  const textId=Object.keys(fixture.intent).find(id=>fixture.intent[id].includes('text'));
  const corrupted=mutate('unmarked',fixture.html,'data-stable-id="'+textId+'" data-editable="text fontSize"','data-stable-id="'+textId+'"');
  x=assertAudit(corrupted,fixture.intent,parseFragment);
  assert.ok(x.missing.includes(textId+'__text'));assert.ok(x.textOmissions.includes(textId));omissionDetected++;negatives++;
  const raw=mutate('nonexistent ID',fixture.html,'data-stable-id="'+textId+'"','data-stable-id="'+textId+'-changed"');
  x=assertAudit(raw,fixture.intent,parseFragment);assert.ok(x.missing.includes(textId+'__text'));negatives++;
  const noStable=mutate('stable ID absent',fixture.html,'data-stable-id="'+textId+'"','data-other="'+textId+'"');
  assert.throws(()=>api.discover(noStable,parseFragment));negatives++;
  const duplicate=mutate('repeated ID',fixture.html,'data-stable-id="'+textId+'"','data-stable-id="'+Object.keys(fixture.intent).at(-1)+'"');
  assert.throws(()=>api.discover(duplicate,parseFragment));negatives++;
 }
 // Test clearly scoped audited exemption: truly immutable copy can stay uneditable by explicit ledger.
 const minimal='<section data-stable-id="static-root"><h2 data-stable-id="editable-title" data-editable="text">Editable</h2><small data-stable-id="legal-static">Copyright</small></section>';
 const noExemption=assertAudit(minimal,{'editable-title':['text']},parseFragment);
 assert.deepEqual(noExemption.textOmissions,['legal-static']);negatives++;
 const exempt=assertAudit(minimal,{'editable-title':['text']},parseFragment,{ignoredTextIds:['legal-static']});
 assert.equal(exempt.complete,true);success++;
 // Limit is intentional: CSS properties absent from the separate ledger cannot be inferred.
 console.log('STAGE1_COVERAGE_AUDIT='+JSON.stringify({pass:true,independentFixtureShapes:fixtures.map(f=>f.name),auditedFixtures:success,negativeCases:negatives,unmarkedLeafTextCaught:omissionDetected,explicitReadonlyException:true,allDeclaredBindingsSchemaCovered:true,limits:'Intent ledger is external and manually created. No proof of independent LLM output, arbitrary CSS/JS detection or completeness beyond declared intent and leaf text.'}));
})().catch(e=>{console.error('STAGE1_COVERAGE_AUDIT_FAIL='+String(e.stack||e));process.exitCode=1});
