/* Stage 1 ONLY: frozen source/manifest evaluator pilot for future independently
 * generated site artifacts. Current fixtures and ledgers are researcher authored.
 * Neither model identity nor independence is established by a self-asserted
 * model name: external blind artifact provenance + human review are required.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const parse5=import('parse5');
let checks=0,refusals=0;
function equal(a,b,msg){assert.deepEqual(a,b,msg);checks++;}
function yes(a,msg){assert.ok(a,msg);checks++;}
function denied(a,msg){yes(a,msg);refusals++;}
const obligations={
 cedar:[
 ['hero-title','content.text','text'],['hero-deck','content.text','text'],
 ['hero-cta','behavior.href','fragment'],['hero-image','media.alt','text'],
 ['hero-mobile','media.srcset','media'],['gallery-video','media.poster','media'],
 ['gallery-source','media.src','media'],['faq-first','behavior.details','native-details'],
 ['newsletter-form','behavior.action','form'],['newsletter-email','content.placeholder','text'],
 ['document','seo.description','seo'],['document','seo.canonical','seo'],
 ['hero','style.gradient','css'],['field-notes','style.responsiveGrid','css'],
 ['document','behavior.inlineEvents','untrusted-js']
 ],
 tide:[
 ['hero-title','content.text','text'],['hero-deck','content.text','text'],
 ['hero-link','behavior.href','fragment'],['hero-visual','style.gradient','css'],
 ['hero-visual','style.animation','css'],['skyline','media.svg','svg'],
 ['faq-first','behavior.details','native-details'],['signup-form','behavior.action','form'],
 ['signup-email','content.placeholder','text'],['modal','behavior.dialog','dialog'],
 ['modal-open','behavior.button','button'],['document','seo.description','seo'],
 ['document','behavior.inlineEvents','untrusted-js']
 ]};
const frozenProtocol={
 version:'stage1-external-second-model-blind-protocol-v1',
 protocols:['source-html','model-produced-editable-manifest','separately frozen independent reviewer oracle','signed provenance and audit chain'],
 requirement:'Site HTML+CSS+JS and editable manifest must be genuinely created by another model independently; a typed self-declared provider field is never sufficient proof',
 briefs:[
 {id:'cedar',source:'cedar-lab-standalone.html',instructions:'Independent nature research page: responsive articles, FAQ, form, motion, SEO, media and rich styling'},
 {id:'tide',source:'tide-atlas-standalone.html',instructions:'Independent ocean instruments studio, creative responsive appearance and dialog signup'}
 ],
 oracle:obligations,
 supportedTypes:['text','fragment','native-details','seo']
};
const protocolHash=crypto.createHash('sha256').update(JSON.stringify(frozenProtocol)).digest('hex');
const artifactDir=path.join(__dirname,'fixtures');
const getSource=id=>fs.readFileSync(path.join(artifactDir,frozenProtocol.briefs.find(x=>x.id===id).source),'utf8');
const key=o=>o[0]+'::'+o[1];
const approved=new Set(frozenProtocol.supportedTypes);
function inventory(document){
 const elements=new Map(),ids=new Map(),scripts=[],styles=[];
 function walk(n){
  if(n.tagName){
   const attrs=Object.fromEntries((n.attrs||[]).map(x=>[x.name,x.value]));
   if(attrs.id){ids.set(attrs.id,(ids.get(attrs.id)||0)+1);elements.set(attrs.id,{tag:n.tagName,attrs,node:n});}
   if(n.tagName==='script')scripts.push((n.childNodes||[]).filter(x=>x.nodeName==='#text').map(x=>x.value).join(''));
   if(n.tagName==='style')styles.push((n.childNodes||[]).filter(x=>x.nodeName==='#text').map(x=>x.value).join(''));
  }
  for(const c of n.childNodes||[])walk(c);
 }
 walk(document);
 const descendantsText=n=>(n.childNodes||[]).map(x=>x.nodeName==='#text'?x.value:descendantsText(x)).join('').trim();
 return {elements,ids,scripts:scripts.join('\n'),css:styles.join('\n'),html:document,descendantsText};
}
function sourceHas(inv,o){
 const [id,prop,type]=o;
 const el=inv.elements.get(id);
 if(id==='document'){
  if(prop==='behavior.inlineEvents')return /addEventListener\s*\(/.test(inv.scripts);
  let found=false;
  function walk(n){
   if(n.tagName==='meta'&&prop==='seo.description'&&(n.attrs||[]).some(x=>x.name==='name'&&x.value==='description'))found=true;
   if(n.tagName==='link'&&prop==='seo.canonical'&&(n.attrs||[]).some(x=>x.name==='rel'&&x.value==='canonical'))found=true;
   for(const c of n.childNodes||[])walk(c);
  }
  walk(inv.html);
  return found;
 }
 if(!el||inv.ids.get(id)!==1)return false;
 const a=el.attrs,n=el.node;
 switch(prop){
  case 'content.text':return inv.descendantsText(n).length>0;
  case 'behavior.href':return n.tagName==='a'&&a.href?.startsWith('#');
  case 'media.alt':return n.tagName==='img'&&typeof a.alt==='string'&&a.alt.length>0;
  case 'media.srcset':return n.tagName==='source'&&!!a.srcset;
  case 'media.poster':return n.tagName==='video'&&!!a.poster;
  case 'media.src':return n.tagName==='source'&&!!a.src;
  case 'media.svg':return n.tagName==='svg';
  case 'behavior.details':return n.tagName==='details';
  case 'behavior.action':return n.tagName==='form'&&!!a.action;
  case 'content.placeholder':return n.tagName==='input'&&typeof a.placeholder==='string';
  case 'behavior.dialog':return n.tagName==='dialog';
  case 'behavior.button':return n.tagName==='button';
  case 'style.gradient':
   return id==='hero'?/linear-gradient\(/.test(inv.css):/conic-gradient\(/.test(inv.css);
  case 'style.responsiveGrid':return /@media[\s\S]*grid-template-columns\s*:\s*1fr/.test(inv.css);
  case 'style.animation':return /@keyframes/.test(inv.css)&&/animation\s*:/.test(inv.css);
  default:return false;
 }
}
function judge(site,manifest,scenario,parser){
 if(!Object.hasOwn(obligations,scenario))throw Error('unknown scenario');
 const expected=obligations[scenario];
 if(!manifest||!Array.isArray(manifest.fields))throw Error('manifest missing fields');
 const invalid=[],declared=new Map();
 for(const o of manifest.fields){
  if(!Array.isArray(o)||o.length!==3||o.some(x=>typeof x!=='string')){invalid.push('bad-shape');continue;}
  const k=key(o);
  if(declared.has(k))invalid.push('duplicate:'+k);
  declared.set(k,o[2]);
 }
 const errors=[],document=parser(site,{onParseError:e=>errors.push(e.code)});
 const found=inventory(document);
 const missingSource=expected.filter(o=>!sourceHas(found,o)).map(key);
 const missingManifest=expected.filter(o=>declared.get(key(o))!==o[2]).map(key);
 const extraManifest=[...declared.keys()].filter(k=>!expected.some(o=>key(o)===k));
 const duplicates=[...found.ids].filter(([,n])=>n>1).map(([k])=>k);
 const unsupported=expected.filter(o=>!approved.has(o[2])).map(key);
 const coverage=expected.length-missingManifest.length;
 // A "passing" document with unsupported executable behavior is NOT
 // auto-publishable, even if its expected names match.
 const schemaComplete=!invalid.length&&!duplicates.length&&!missingSource.length&&!missingManifest.length&&!extraManifest.length&&!errors.length;
 return {scenario,expected:expected.length,coverage,
  manifestRecall:coverage/expected.length,missingSource,missingManifest,
  extraManifest,invalid,duplicates,parseErrors:errors,unsupported,
  schemaComplete,canAutopublish:schemaComplete&&unsupported.length===0,
  independentModelVerified:false,
  modelSelfAttestationIgnored:!!manifest.claimedModel};
}
(async()=>{
 const {parse}=await parse5;
 let baseline=[],mutants=0,correlated=0;
 for(const id of ['cedar','tide']){
  const source=getSource(id),oracle=structuredClone(obligations[id]),candidate={fields:oracle,claimedModel:'another-independent-LLM'};
  const result=judge(source,candidate,id,parse);
  yes(result.schemaComplete,id+' oracle fixture complete');
  equal(result.missingManifest.length,0,'manifest complete');
  equal(result.missingSource.length,0,'source obligations present');
  denied(result.canAutopublish===false,'unreviewed types force quarantine');
  equal(result.independentModelVerified,false,'claimed model identity never substitutes evidence');
  yes(result.modelSelfAttestationIgnored,'self-attestation ignored');
  baseline.push({scenario:id,expected:result.expected,unreviewed:result.unsupported.length});
  const removedManifest={fields:oracle.slice(1)};
  let x=judge(source,removedManifest,id,parse);
  denied(x.missingManifest.includes(key(oracle[0])),'dropped field detected');mutants++;
  x=judge(source,{fields:[...oracle,oracle[0]]},id,parse);
  denied(x.invalid.includes('duplicate:'+key(oracle[0])),'duplicate binding detected');mutants++;
  x=judge(source,{fields:oracle.map((o,i)=>i===0?[...o.slice(0,2),'boolean']:o)},id,parse);
  denied(x.missingManifest.includes(key(oracle[0])),'field type mismatch detected');mutants++;
  x=judge(source,{fields:[...oracle,['ghost-element','content.text','text']]},id,parse);
  denied(x.extraManifest.includes('ghost-element::content.text'),'phantom field detected');mutants++;
  const first=oracle[0],target=first[0];
  const absentSource=source.replace(new RegExp('<(h1|h2)[^>]*id="'+target+'"[^>]*>[\\s\\S]*?<\\/\\1>','m'),'');
  yes(absentSource!==source,'source mutation actually applied');
  x=judge(absentSource,{fields:oracle.filter(o=>key(o)!==key(first))},id,parse);
  denied(x.missingSource.includes(key(first))&&x.missingManifest.includes(key(first)),
    'correlated SOURCE+MANIFEST removal detected via frozen oracle');
  mutants++;correlated++;
  const newId=target+'-renamed';
  x=judge(source.replace('id="'+target+'"','id="'+newId+'"'),{fields:oracle.map(o=>o[0]===target?[newId,o[1],o[2]]:o)},id,parse);
  denied(x.missingSource.includes(key(first))&&x.missingManifest.includes(key(first)),
   'mutual stable-ID rename cannot silently pass without oracle/alias approval');mutants++;
  if(id==='cedar'){
   x=judge(source.replace('href="#field-notes"','href="javascript:alert(1)"'),candidate,id,parse);
   denied(x.missingSource.includes('hero-cta::behavior.href'),'unsafe protocol no longer satisfies source');
   mutants++;
  } else {
   x=judge(source.replace('<dialog id="modal">','<div id="modal">').replace('</dialog>','</div>'),candidate,id,parse);
   denied(x.missingSource.includes('modal::behavior.dialog'),'lost native dialog detected');mutants++;
  }
 }
 const fake={fields:obligations.cedar,claimedModel:'third-party-GPT-999',claimedIndependentlyGenerated:true};
 const f=judge(getSource('cedar'),fake,'cedar',parse);
 equal(f.independentModelVerified,false,'fabricated metadata cannot claim blinded model evidence');
 const degenerate={fields:[]};
 const empty=judge('',degenerate,'cedar',parse);
 equal(empty.manifestRecall,0,'empty paired artifacts have zero recall');
 denied(empty.missingManifest.length===obligations.cedar.length&&empty.missingSource.length===obligations.cedar.length,
   'jointly missing site+manifest fields found from independently frozen reference');
 console.log('STAGE1_EXTERNAL_GENERATOR_GATE='+JSON.stringify({pass:true,checks,negativeRefusals:refusals,mutantsDetected:mutants,
   correlatedSiteAndManifestOmissionsDetected:correlated,fixtureScenarios:baseline,protocolSha256:protocolHash,
   totalExpectedObligations:baseline.reduce((n,x)=>n+x.expected,0),externalModelTested:false,
   independentLLMGenerationVerified:false,originalModelProducerAttestationsIgnored:true,
   structuralCoverageProvedOnManualFixtures:true,
   limitations:'Oracle and all fixtures authored by same research assistant; public deterministic evaluator, NOT blind independent LLM, not exhaustive CSS/JS semantics, unsigned evaluation artifact, no real API model execution, no production acceptance.'}));
})().catch(e=>{console.error('STAGE1_EXTERNAL_GENERATOR_GATE_FAIL='+String(e.stack||e));process.exitCode=1});
