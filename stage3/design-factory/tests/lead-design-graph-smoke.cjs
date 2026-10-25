#!/usr/bin/env node
'use strict';
// OPTIONAL cross-branch acceptance, run only when the LEAD SDK checkout is available.
// Do not add this test to the stable D7 release-audit until the lead SDK is integrated.
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const cp=require('node:child_process');
const oldSdk=require('../../sdk/contract.cjs');
const {FORMAT,KITS,THEMES,loadRegistry}=require('../lib/compiler.cjs');
const catalog=require('../catalog/compositions.cjs');
const bridge=require('../lib/bridge.cjs');
const adapter=require('../lib/lead-design-graph-adapter.cjs');
const sdkRoot=process.env.DF_LEAD_SDK_DIR;
if(!sdkRoot){
 console.log('DESIGN_FACTORY_LEAD_GRAPH SKIP: set DF_LEAD_SDK_DIR to a read-only checkout of lead stage3/sdk/');
 process.exit(3);
}
const hostSdk=require(path.resolve(sdkRoot,'contract.cjs'));
const hostGraph=require(path.resolve(sdkRoot,'design-graph.cjs'));
const clone=x=>JSON.parse(JSON.stringify(x));
const registry=loadRegistry();
let checks=0,renderChecks=0,rebuildChecks=0,rebuildPreviewChecks=0;
const graphVariants=new Set();
for(const c of catalog.compositions)for(const theme of Object.keys(THEMES)){
 const lang=checks%2?'ru':'en',project={format:FORMAT,version:1,
  kit:'agency',theme,language:lang,facts:{}};
 const bundle=bridge.build({format:bridge.WORKSPACE,version:1,project,composition:c.id});
 const before=JSON.stringify(bundle);
 const candidate=adapter.buildHostCandidate(bundle,hostSdk,registry);
 assert.equal(JSON.stringify(bundle),before,'Lead conversion must never mutate D6');
 assert.equal(candidate.format,adapter.FORMAT);
 assert.equal(candidate.mapping.composition,c.id);
 assert.equal(candidate.mapping.fidelity,'partial');
 assert.equal(candidate.mapping.approvedForPublish,false);
 assert.equal(candidate.ownerChecklist.readyForPublish,false);
 assert.ok(candidate.site.designTokens);
 const inserted=candidate.site.pages[0].sections.find(s=>s.id==='df-selected-composition');
 assert.ok(inserted?.designGraph?.nodes.length>=1);
 graphVariants.add(JSON.stringify(inserted.designGraph));
 assert.ok(inserted.designGraph.nodes.some(n=>n.type==='container'));
 assert.ok(JSON.stringify(inserted.designGraph).includes('fontFamily'));
 assert.ok(JSON.stringify(inserted.designGraph).includes('fade-up'));
 assert.ok(JSON.stringify(inserted.designGraph).includes('"type":"icon"'));
 assert.equal(hostSdk.inspectSite(candidate.site,registry).errors.length,0);
 assert.deepEqual(hostSdk.validateSite(clone(candidate.site),registry),candidate.site);
 // The legacy SDK must fail closed instead of accidentally accepting extra site keys.
 assert.throws(()=>oldSdk.validateSite(candidate.site,registry));
 const html=hostGraph.render(candidate.site,inserted.designGraph,'',null,inserted.id);
 assert.ok(html.includes('cmsdg-')&&html.includes('@media(max-width:600px)'));
 assert.ok(!html.includes('<script')&&!html.includes('http://'));
 // Exercise the complete no-op rebuild path for every composition × theme.
 // A structural rebuild is still a new preview, never a save/publish action.
 const candidateSnapshot=JSON.stringify(candidate);
 const noOpSite=clone(candidate.site);
 const noOpSnapshot=JSON.stringify(noOpSite);
 const rebuildPreview=adapter.inspectRebuild(candidate,noOpSite,hostSdk,registry);
 assert.equal(rebuildPreview.canApply,true);
 assert.equal(rebuildPreview.requiresOwnerConfirmation,false);
 assert.equal(rebuildPreview.noMutation,true);
 assert.equal(JSON.stringify(candidate),candidateSnapshot);
 assert.equal(JSON.stringify(noOpSite),noOpSnapshot);
 rebuildPreviewChecks++;
 const rebuilt=adapter.rebuildHostCandidate(candidate,noOpSite,hostSdk,registry);
 assert.equal(rebuilt.rebuild.noAiInvoked,true);
 assert.equal(rebuilt.rebuild.notPublished,true);
 assert.equal(rebuilt.mapping.approvedForPublish,false);
 assert.equal(rebuilt.rebuild.resetVisualNodes,0);
 assert.equal(rebuilt.rebuild.createdVisualNodeIds.length,0);
 assert.equal(rebuilt.rebuild.resetVisualNodeIds.length,0);
 assert.equal(rebuilt.rebuild.removedVisualNodeIds.length,0);
 assert.equal(rebuilt.rebuild.preservedVisualNodeIds.length,
  rebuilt.rebuild.preservedVisualNodes);
 assert.deepEqual(rebuilt.site,candidate.site,
  'No-op rebuild must preserve the entire validated site snapshot');
 const rebuiltSection=rebuilt.site.pages[0].sections.find(s=>
  s.id==='df-selected-composition');
 const rebuiltHtml=hostGraph.render(rebuilt.site,rebuiltSection.designGraph,'',null,rebuiltSection.id);
 assert.equal(rebuiltHtml,html,'No-op rebuild must not alter rendered graph markup');
 rebuildChecks++;
 renderChecks++;
 checks++;
}
assert.equal(checks,42*12);
assert.equal(graphVariants.size,checks,'Each composition/theme must keep a distinct editable graph');
assert.equal(rebuildChecks,42*12,'Every composition/theme must survive a no-op rebuild');
assert.equal(rebuildPreviewChecks,42*12,'Every composition/theme must have a read-only rebuild preflight');
// Test full owner-provided repeater content and its CMS provenance metadata.
// The original verified D6 package keeps generic placeholders, while this
// optional newer-host candidate is allowed to preserve explicit owner facts.
const ownerProject={format:FORMAT,version:1,kit:'agency',theme:'editorial',language:'en',
 facts:{title:'Verified owner company',headline:'Owner-approved headline',
  description:'Owner-authored description',ctaLabel:'Request a quote',
  contactText:'Owner contact form',
  services:Array.from({length:12},(_,i)=>({
   title:'Service supplied '+(i+1),description:'Owner description '+(i+1)}))}};
const serviceBundle=bridge.build({format:bridge.WORKSPACE,version:1,
 project:ownerProject,composition:'services-cards'});
const originalSnapshot=JSON.stringify(serviceBundle);
const services=adapter.buildHostCandidate(serviceBundle,hostSdk,registry);
assert.equal(JSON.stringify(serviceBundle),originalSnapshot,'D6 must stay immutable');
const serviceSection=services.site.pages[0].sections.find(s=>s.id==='df-selected-composition');
assert.equal(serviceSection.items.length,12,'Preserve all 12 owner services');
const serviceHtml=hostGraph.render(services.site,serviceSection.designGraph,'',null,serviceSection.id);
assert.ok(serviceHtml.includes('Service supplied 12'));
assert.ok(serviceHtml.includes('Owner description 12'));
assert.equal(services.mapping.semanticContentMode,'snapshot-requires-host-reconciliation');
assert.ok(services.mapping.contentBindings.some(b=>
 b.source.itemId===serviceSection.items[11].id&&b.source.field==='content.title'));
const heroBundle=bridge.build({format:bridge.WORKSPACE,version:1,
 project:ownerProject,composition:'hero-split'});
const hero=adapter.buildHostCandidate(heroBundle,hostSdk,registry);
const heroSection=hero.site.pages[0].sections.find(s=>s.id==='df-selected-composition');
const heroHtml=hostGraph.render(hero.site,heroSection.designGraph,'',null,heroSection.id);
for(const copy of ['Owner-approved headline','Owner-authored description','Request a quote'])
 assert.ok(heroHtml.includes(copy),'Missing owner text: '+copy);
const faqBundle=bridge.build({format:bridge.WORKSPACE,version:1,
 project:ownerProject,composition:'faq-compact'});
const faq=adapter.buildHostCandidate(faqBundle,hostSdk,registry);
const faqBindings=faq.mapping.contentBindings;
assert.ok(faqBindings.filter(b=>b.source.field==='content.question').length>=2);
assert.ok(faqBindings.filter(b=>b.source.field==='content.answer').length>=2);
// The actual registered FAQ repeater supports up to 24 items. Graph max 90
// nodes means 24 Q&A cards (80 nodes total) fit without silently dropping 13–24.
const fullFaq=clone(faq.site);
const fullFaqSection=fullFaq.pages[0].sections.find(s=>s.id==='df-selected-composition');
const faqSeed=clone(fullFaqSection.items[0]);
fullFaqSection.items=Array.from({length:24},(_,i)=>({
 id:fullFaqSection.id+'-item-'+(i+1),
 values:{...faqSeed.values,'content.question':'Question '+(i+1),
  'content.answer':'Answer '+(i+1)}
}));
fullFaqSection.designGraph=adapter.graphFor(fullFaqSection,catalog.get('faq-compact'),THEMES.editorial,'en');
const fullFaqValidated=hostSdk.validateSite(fullFaq,registry);
const fullFaqNodes=fullFaqSection.designGraph.nodes;
const nodeCount=list=>list.reduce((n,x)=>n+1+nodeCount(x.children||[]),0);
assert.equal(nodeCount(fullFaqNodes),80,'24 FAQs must remain within the 90-node host limit');
const fullFaqHtml=hostGraph.render(fullFaqValidated,fullFaqNodes.length?
 fullFaqSection.designGraph:null,'',null,fullFaqSection.id);
assert.ok(fullFaqHtml.includes('Question 24')&&fullFaqHtml.includes('Answer 24'));
assert.equal((fullFaqHtml.match(/Question [0-9]+/g)||[]).length,24);
const overFaq=clone(fullFaqSection);
overFaq.items.push({id:overFaq.id+'-item-25',values:clone(faqSeed.values)});
assert.throws(()=>adapter.graphFor(overFaq,catalog.get('faq-compact'),THEMES.editorial,'en'),
 /Too many FAQ entries/);
const gallery=adapter.buildHostCandidate(bridge.build({format:bridge.WORKSPACE,version:1,
 project:ownerProject,composition:'gallery-mosaic'}),hostSdk,registry);
const gallerySection=gallery.site.pages[0].sections.find(s=>s.id==='df-selected-composition');
const galleryHtml=hostGraph.render(gallery.site,gallerySection.designGraph,'',null,gallerySection.id);
assert.ok(galleryHtml.includes('Images not uploaded'));
assert.ok(!galleryHtml.includes('<img '),'No licensed source media means no fake photos');
assert.equal(gallery.mapping.approvedForPublish,false);
// Explicit host-side reconciliation after editing a normal CMS repeater field.
// CSS graph properties must not be overwritten and no AI must be invoked.
const edited=clone(services.site);
const editedSection=edited.pages[0].sections.find(s=>s.id==='df-selected-composition');
editedSection.items[11].values['content.title']='Revised owner service 12';
const findNode=(list,suffix)=>{
 for(const n of list){
  if(n.id.endsWith(suffix))return n;
  const nested=findNode(n.children||[],suffix);
  if(nested)return nested;
 }
 return null;
};
const findExactNode=(list,id)=>{
 for(const n of list){
  if(n.id===id)return n;
  const nested=findExactNode(n.children||[],id);
  if(nested)return nested;
 }
 return null;
};
const removeNode=(list,id)=>{
 for(let i=0;i<list.length;i++){
  if(list[i].id===id){list.splice(i,1);return true;}
  if(removeNode(list[i].children||[],id))return true;
 }
 return false;
};
// Source-refresh rebuild contract across every registered CMS component
// family represented by the composition catalog: CMS copy updates, owner
// graph styling, no-AI transformation and immutable original candidate.
let componentRebuildChecks=0;
for(const composition of [
 'hero-split','benefits-bento','services-cards','team-editorial',
 'faq-compact','cta-band','contact-split','gallery-mosaic'
]){
 const bundle=bridge.build({format:bridge.WORKSPACE,version:1,
  project:ownerProject,composition});
 const baseline=adapter.buildHostCandidate(bundle,hostSdk,registry);
 const before=JSON.stringify(baseline);
 const textBinding=baseline.mapping.contentBindings.find(b=>
  (b.property||'text')==='text');
 assert.ok(textBinding,'Every registered component family exposes at least one visible text binding: '+composition);
 const editedSite=clone(baseline.site);
 const editedSection=editedSite.pages[0].sections.find(s=>
  s.id==='df-selected-composition');
 const source=textBinding.source;
 const sourceValues=source.slot?
  editedSection.elements.find(e=>e.slot===source.slot)?.values:
  editedSection.items.find(item=>item.id===source.itemId)?.values;
 assert.ok(sourceValues&&typeof sourceValues[source.field]==='string',
  'The binding must resolve to a real owner-editable CMS field: '+composition);
 const nextCopy='Owner source refresh: '+composition;
 sourceValues[source.field]=nextCopy;
 const editedNode=findExactNode(editedSection.designGraph.nodes,textBinding.nodeId);
 assert.ok(editedNode,'The source binding must target an existing graph node');
 editedNode.styles.fontWeight=900;
 const rebuilt=adapter.rebuildHostCandidate(baseline,editedSite,hostSdk,registry);
 const rebuiltSection=rebuilt.site.pages[0].sections.find(s=>
  s.id==='df-selected-composition');
 const rebuiltNode=findExactNode(rebuiltSection.designGraph.nodes,textBinding.nodeId);
 assert.equal(rebuiltNode.text,nextCopy,
  'Rebuild must use the new CMS value, not stale graph snapshot: '+composition);
 assert.equal(rebuiltNode.styles.fontWeight,900,
  'Rebuild must retain the owner visual style: '+composition);
 assert.equal(rebuilt.rebuild.noAiInvoked,true);
 assert.equal(rebuilt.mapping.approvedForPublish,false);
 assert.equal(JSON.stringify(baseline),before,
  'Source refresh must not mutate original candidate: '+composition);
 componentRebuildChecks++;
}
assert.equal(componentRebuildChecks,8,'All registered CMS component families need source-refresh coverage');

// When the host has explicitly rebuilt its baseline after a structural FAQ
// edit, all 24 distinct answer bindings remain individually synchronizable.
const fullFaqCandidate=clone(faq);
fullFaqCandidate.site=clone(fullFaqValidated);
fullFaqCandidate.mapping.contentBindings=[
 ...faqBindings.filter(b=>!b.source.itemId),
 ...fullFaqSection.items.flatMap((item,i)=>[
  {nodeId:fullFaqSection.id+'-dg-card-'+(i+1)+'-title',
   source:{itemId:item.id,field:'content.question'}},
  {nodeId:fullFaqSection.id+'-dg-card-'+(i+1)+'-text',
   source:{itemId:item.id,field:'content.answer'}}
 ])
];
const answer24Edit=clone(fullFaqCandidate.site);
const answer24Section=answer24Edit.pages[0].sections.find(s=>s.id==='df-selected-composition');
answer24Section.items[23].values['content.answer']='Verified revised 24th answer';
const answer24Node=answer24Section.designGraph.nodes[0].children
 .find(n=>n.id.endsWith('-detail')).children.find(n=>n.id.endsWith('-cards'))
 .children[23].children.find(n=>n.id.endsWith('-text'));
answer24Node.styles.fontWeight=700;
const answer24Preview=adapter.inspectSemanticSync(fullFaqCandidate,answer24Edit,hostSdk,registry);
assert.equal(answer24Preview.changes.length,1,'One owner answer edits one bound graph node');
const answer24Synced=adapter.reconcileSemantic(fullFaqCandidate,answer24Edit,hostSdk,registry);
const answer24Graph=answer24Synced.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes;
const updatedAnswer24=findNode(answer24Graph,'-card-24-text');
assert.equal(updatedAnswer24.text,'Verified revised 24th answer');
assert.equal(updatedAnswer24.styles.fontWeight,700,'Owner graph typography must survive');
const graphTitle=findNode(editedSection.designGraph.nodes,'-card-12-title');
graphTitle.styles.fontWeight=800;
const synced=adapter.reconcileSemantic(services,edited,hostSdk,registry);
const syncedSection=synced.site.pages[0].sections.find(s=>s.id==='df-selected-composition');
const syncedTitle=findNode(syncedSection.designGraph.nodes,'-card-12-title');
assert.equal(syncedTitle.text,'Revised owner service 12');
assert.equal(syncedTitle.styles.fontWeight,800,'Preserve manual graph styling on content sync');
// Independent Graph text must not be overwritten when its CMS source was
// unchanged; both-side changes must stop and require a user decision.
const graphOnly=clone(services.site);
const graphOnlySection=graphOnly.pages[0].sections.find(s=>s.id==='df-selected-composition');
findNode(graphOnlySection.designGraph.nodes,'-card-12-title').text=
 'Design-graph-only wording';
const graphOnlyPreview=adapter.inspectSemanticSync(services,graphOnly,hostSdk,registry);
assert.equal(graphOnlyPreview.canApply,true);
assert.equal(graphOnlyPreview.changes.length,0);
assert.ok(graphOnlyPreview.preservedGraphEdits.length>=1);
const graphOnlyResult=adapter.reconcileSemantic(services,graphOnly,hostSdk,registry);
const graphOnlySaved=graphOnlyResult.site.pages[0].sections.find(s=>s.id==='df-selected-composition');
assert.equal(findNode(graphOnlySaved.designGraph.nodes,'-card-12-title').text,
 'Design-graph-only wording');
const conflict=clone(edited);
findNode(conflict.pages[0].sections.find(s=>s.id==='df-selected-composition')
 .designGraph.nodes,'-card-12-title').text='Independent conflicting design edit';
const conflictBefore=JSON.stringify(conflict);
const syncPreview=adapter.inspectSemanticSync(services,conflict,hostSdk,registry);
assert.equal(syncPreview.canApply,false);
assert.ok(syncPreview.conflicts.some(x=>x.nodeId.endsWith('-card-12-title')));
assert.equal(JSON.stringify(conflict),conflictBefore,'Inspection must be non-mutating');
assert.throws(()=>adapter.reconcileSemantic(services,conflict,hostSdk,registry),
 /Conflicting semantic and graph content edits/);
const wrongSite=clone(edited);wrongSite.siteId='other-valid-site';
assert.throws(()=>adapter.reconcileSemantic(services,wrongSite,hostSdk,registry),
 /different CMS site or page/);
assert.equal(JSON.stringify(services.site),JSON.stringify(
 adapter.buildHostCandidate(serviceBundle,hostSdk,registry).site),'Candidate must not mutate');
// Provenance is a CLOSED exact mapping, not a list of plausible IDs.
const reorderedBindings=clone(services);
reorderedBindings.mapping.contentBindings.reverse();
assert.equal(adapter.inspectSemanticSync(reorderedBindings,edited,hostSdk,registry)
 .changes.length,1,'Metadata array order is not semantic identity');
const forged=clone(services);
forged.mapping.contentBindings[0].nodeId='hostile-other-node';
assert.throws(()=>adapter.reconcileSemantic(forged,edited,hostSdk,registry),
 /Invalid source binding|Provenance binding mismatch/);
const redirected=clone(services);
redirected.mapping.contentBindings[0].source.itemId=serviceSection.items[1].id;
assert.throws(()=>adapter.inspectSemanticSync(redirected,edited,hostSdk,registry),
 /Provenance binding mismatch/,'Existing but wrong CMS item must be rejected');
const swapped=clone(services);
const firstSource=swapped.mapping.contentBindings[0].source;
swapped.mapping.contentBindings[0].source=swapped.mapping.contentBindings[2].source;
swapped.mapping.contentBindings[2].source=firstSource;
assert.throws(()=>adapter.reconcileSemantic(swapped,edited,hostSdk,registry),
 /Provenance binding mismatch/,'Swapping two valid sources must be rejected');
const omitted=clone(services);
omitted.mapping.contentBindings.pop();
assert.throws(()=>adapter.inspectSemanticSync(omitted,edited,hostSdk,registry),
 /Provenance binding mismatch/,'Dropped source cannot silently cease syncing');
const excessive=clone(services);
excessive.mapping.contentBindings.push(clone(excessive.mapping.contentBindings[0]));
assert.throws(()=>adapter.reconcileSemantic(excessive,edited,hostSdk,registry),
 /Provenance binding mismatch|Invalid provenance bindings/);
const deleted=clone(edited);
deleted.pages[0].sections.find(s=>s.id==='df-selected-composition').items.pop();
assert.throws(()=>adapter.reconcileSemantic(services,deleted,hostSdk,registry),
 /Repeater structure changed|Source was removed|Invalid repeat items|Invalid/);
// Snapshot bindings cannot safely add, reorder or remove graph cards.
// Edits require an explicit host rebuild, not silent content truncation.
const added=clone(services.site);
const addedSection=added.pages[0].sections.find(s=>s.id==='df-selected-composition');
addedSection.items.push({id:addedSection.id+'-item-13',
 values:clone(addedSection.items[0].values)});
assert.throws(()=>adapter.inspectSemanticSync(services,added,hostSdk,registry),
 /Repeater structure changed/);
const reorderedItems=clone(services.site);
reorderedItems.pages[0].sections.find(s=>s.id==='df-selected-composition').items.reverse();
assert.throws(()=>adapter.reconcileSemantic(services,reorderedItems,hostSdk,registry),
 /Repeater structure changed/);
const changedMedia=clone(gallery.site);
const galleryItem=changedMedia.pages[0].sections.find(s=>s.id==='df-selected-composition').items[0];
galleryItem.values['content.caption']='Owner supplied caption';
assert.throws(()=>adapter.inspectSemanticSync(gallery,changedMedia,hostSdk,registry),
 /Gallery caption has no displayed graph node/);
// Data is escaped in the first-party lead renderer; no user text becomes HTML.
const unsafeProject=clone(ownerProject);
unsafeProject.facts.services[0].title='<script>alert(1)</script>';
const unsafeBundle=bridge.build({format:bridge.WORKSPACE,version:1,
 project:unsafeProject,composition:'services-cards'});
const safeCandidate=adapter.buildHostCandidate(unsafeBundle,hostSdk,registry);
const safeSection=safeCandidate.site.pages[0].sections.find(s=>s.id==='df-selected-composition');
const safeHtml=hostGraph.render(safeCandidate.site,safeSection.designGraph,'',null,safeSection.id);
assert.ok(safeHtml.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert.ok(!safeHtml.includes('<script>'));

// Every rendered semantic headline/description/button must follow the
// exact chosen CMS source. Feature sections reuse "second" both as the
// visible lead summary and as the second card; both edits must propagate.
const benefits=adapter.buildHostCandidate(bridge.build({format:bridge.WORKSPACE,version:1,
 project:ownerProject,composition:'benefits-bento'}),hostSdk,registry);
const benefitBindings=benefits.mapping.contentBindings;
assert.ok(benefitBindings.some(x=>x.nodeId.endsWith('-dg-text')&&x.source.slot==='second'));
const benefitEdit=clone(benefits.site);
const bSec=benefitEdit.pages[0].sections.find(s=>s.id==='df-selected-composition');
bSec.elements.find(e=>e.slot==='second').values['content.text']='Owner updated second benefit';
const bPreview=adapter.inspectSemanticSync(benefits,benefitEdit,hostSdk,registry);
assert.equal(bPreview.changes.filter(x=>x.source.slot==='second').length,2,
 'Both summary and benefit card must update from the same edited CMS field');
const bSynced=adapter.reconcileSemantic(benefits,benefitEdit,hostSdk,registry);
const bNodes=bSynced.site.pages[0].sections.find(s=>s.id==='df-selected-composition').designGraph.nodes;
assert.equal(findNode(bNodes,'-dg-text').text,'Owner updated second benefit');
assert.equal(findNode(bNodes,'-card-2-text').text,'Owner updated second benefit');
// CTA source selection chooses the actual "primary" element, not a
// guess based on an unrelated "action" slot or synthetic contact URL.
const cta=adapter.buildHostCandidate(bridge.build({format:bridge.WORKSPACE,version:1,
 project:ownerProject,composition:'cta-card'}),hostSdk,registry);
assert.ok(cta.mapping.contentBindings.some(x=>x.nodeId.endsWith('-dg-action')&&
 x.source.slot==='primary'&&x.property==='href'));
const ctaEdit=clone(cta.site);
const cSec=ctaEdit.pages[0].sections.find(s=>s.id==='df-selected-composition');
const primary=cSec.elements.find(e=>e.slot==='primary');
primary.values['content.text']='Get in touch';
primary.values['behavior.href']='/services/';
const ctaSynced=adapter.reconcileSemantic(cta,ctaEdit,hostSdk,registry);
const ctaNodes=ctaSynced.site.pages[0].sections.find(s=>s.id==='df-selected-composition').designGraph.nodes;
assert.equal(findNode(ctaNodes,'-dg-action').text,'Get in touch');
assert.equal(findNode(ctaNodes,'-dg-action').href,'/services/');
// Initially empty declared CMS text remains bound: filling an editorial
// placeholder later must update the graph without rerunning the AI.
const blankCta=clone(cta);
const blankSection=blankCta.site.pages[0].sections.find(s=>s.id==='df-selected-composition');
blankSection.elements.find(e=>e.slot==='summary').values['content.text']='';
blankSection.designGraph=adapter.graphFor(blankSection,catalog.get('cta-card'),THEMES.editorial,'en');
hostSdk.validateSite(clone(blankCta.site),registry);
const filled=clone(blankCta.site);
filled.pages[0].sections.find(s=>s.id==='df-selected-composition')
 .elements.find(e=>e.slot==='summary').values['content.text']='Fresh owner-supplied value';
const filledPreview=adapter.inspectSemanticSync(blankCta,filled,hostSdk,registry);
assert.ok(filledPreview.changes.some(x=>x.nodeId.endsWith('-dg-text')));
const filledResult=adapter.reconcileSemantic(blankCta,filled,hostSdk,registry);
assert.equal(findNode(filledResult.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,'-dg-text').text,
 'Fresh owner-supplied value');
// A safe external HTTPS URL remains the SAME declared CTA field, not a new
// source selection. Reconciliation should update the real owner destination.
const hrefSwitch=clone(cta.site);
const switchSection=hrefSwitch.pages[0].sections.find(s=>s.id==='df-selected-composition');
switchSection.elements.find(e=>e.slot==='primary').values['behavior.href']='https://example.com';
const switchValidated=hostSdk.validateSite(clone(hrefSwitch),registry);
const hrefPreview=adapter.inspectSemanticSync(cta,switchValidated,hostSdk,registry);
assert.equal(hrefPreview.canApply,true);
assert.ok(hrefPreview.changes.some(x=>x.property==='href'));
const hrefSaved=adapter.reconcileSemantic(cta,switchValidated,hostSdk,registry);
assert.equal(findNode(hrefSaved.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,'-dg-action').href,
 'https://example.com');
assert.equal(cta.mapping.approvedForPublish,false);

// Owner-controlled REBUILD: no AI, no publication, source site and
// immutable D6 remain untouched. Genuine typed media must render after the
// CMS asset has been uploaded, not remain stuck as a placeholder.
const galleryUpload=clone(gallery.site);
const galleryUploadSection=galleryUpload.pages[0].sections.find(s=>
 s.id==='df-selected-composition');
galleryUpload.assets.push({id:'owner-gallery-one',mime:'image/jpeg',
 src:'/assets/owner-gallery-one.jpg',alt:'Owner-approved workshop photograph'});
galleryUploadSection.items[0].values['content.media']='owner-gallery-one';
galleryUploadSection.items[0].values['content.caption']='Approved photo';
findNode(galleryUploadSection.designGraph.nodes,'-dg-heading').styles.fontWeight=800;
const galleryRebuilt=adapter.rebuildHostCandidate(gallery,galleryUpload,hostSdk,registry);
assert.equal(galleryRebuilt.mapping.approvedForPublish,false);
assert.equal(galleryRebuilt.rebuild.noAiInvoked,true);
assert.equal(galleryRebuilt.rebuild.requiresOwnerVisualReview,true);
const galleryRebuiltSection=galleryRebuilt.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition');
assert.equal(findNode(galleryRebuiltSection.designGraph.nodes,'-card-1-image').assetId,
 'owner-gallery-one');
assert.equal(findNode(galleryRebuiltSection.designGraph.nodes,'-dg-heading').styles.fontWeight,
 800,'Preserve owner typography on an explicit structural rebuild');
const ownerMediaHtml=hostGraph.render(galleryRebuilt.site,
 galleryRebuiltSection.designGraph,'',null,galleryRebuiltSection.id);
assert.ok(ownerMediaHtml.includes('/assets/owner-gallery-one.jpg'));
assert.ok(ownerMediaHtml.includes('Owner-approved workshop photograph'));
const ownerCaptionEdit=clone(galleryRebuilt.site);
ownerCaptionEdit.pages[0].sections.find(s=>s.id==='df-selected-composition')
 .items[0].values['content.caption']='Revised owner caption';
const ownerCaptionPlan=adapter.inspectSemanticSync(galleryRebuilt,ownerCaptionEdit,hostSdk,registry);
assert.equal(ownerCaptionPlan.changes.length,1);
const ownerCaptionSaved=adapter.reconcileSemantic(galleryRebuilt,ownerCaptionEdit,hostSdk,registry);
assert.equal(findNode(ownerCaptionSaved.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,'-card-1-caption').text,
 'Revised owner caption');
// Image alt is owner-editable too: do not silently keep stale alt in
// a graph node when CMS asset metadata changes with the same asset ID.
const galleryRealt=clone(galleryRebuilt.site);
galleryRealt.assets.find(a=>a.id==='owner-gallery-one').alt='Revised owner image alt';
assert.throws(()=>adapter.inspectSemanticSync(galleryRebuilt,galleryRealt,hostSdk,registry),
 /Media asset metadata changed/);
const renewedAlt=adapter.rebuildHostCandidate(galleryRebuilt,galleryRealt,hostSdk,registry);
assert.equal(findNode(renewedAlt.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,'-card-1-image').alt,
 'Revised owner image alt');
const galleryMissingAlt=clone(galleryUpload);
galleryMissingAlt.assets[0].alt='';
assert.throws(()=>adapter.rebuildHostCandidate(gallery,galleryMissingAlt,hostSdk,registry),
 /nonempty alt/);
// The official gallery manifest permits up to 20 photographs, safely under
// the lead's 90-node limit. Verify last owner item/asset survives.
const bigGallery=clone(gallery.site);
const bigSection=bigGallery.pages[0].sections.find(s=>s.id==='df-selected-composition');
const galleryProto=clone(bigSection.items[0].values);
bigSection.items=Array.from({length:20},(_,i)=>{
 const id='gallery-photo-'+(i+1);
 bigGallery.assets.push({id,src:'/assets/'+id+'.webp',mime:'image/webp',
  alt:'Owner photograph '+(i+1)});
 return {id:bigSection.id+'-item-'+(i+1),
  values:{...galleryProto,'content.media':id,'content.caption':'Caption '+(i+1)}};
});
const fullGallery=adapter.rebuildHostCandidate(gallery,bigGallery,hostSdk,registry);
const gallery20Graph=fullGallery.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes;
assert.equal(nodeCount(gallery20Graph),68,'20 images plus captions fit under 90 nodes');
assert.equal(findNode(gallery20Graph,'-card-20-image').assetId,'gallery-photo-20');
// Media-story asset upload uses the same licensed CMS asset registry.
const storyOriginal=adapter.buildHostCandidate(bridge.build({
 format:bridge.WORKSPACE,version:1,project:ownerProject,composition:'team-editorial'
}),hostSdk,registry);
const storyUpload=clone(storyOriginal.site);
storyUpload.assets.push({id:'owner-story-photo',src:'/assets/owner-story-photo.webp',
 mime:'image/webp',alt:'Owner team at work'});
storyUpload.pages[0].sections.find(s=>s.id==='df-selected-composition')
 .elements.find(e=>e.slot==='photo').values['content.media']='owner-story-photo';
const storyRebuilt=adapter.rebuildHostCandidate(storyOriginal,storyUpload,hostSdk,registry);
assert.equal(findNode(storyRebuilt.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,'-card-1-image').assetId,
 'owner-story-photo');
// Host API approves legitimate external HTTPS URLs. Never route them back to
// the default /contact/ or secretly select an unrelated secondary button.
const remoteCta=clone(cta.site);
remoteCta.pages[0].sections.find(s=>s.id==='df-selected-composition')
 .elements.find(e=>e.slot==='primary').values['behavior.href']='https://example.com/quote';
const remoteSaved=adapter.reconcileSemantic(cta,remoteCta,hostSdk,registry);
assert.equal(findNode(remoteSaved.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,'-dg-action').href,
 'https://example.com/quote');
const unsupportedCta=clone(cta.site);
unsupportedCta.pages[0].sections.find(s=>s.id==='df-selected-composition')
 .elements.find(e=>e.slot==='primary').values['behavior.href']='https://example.com:443/quote';
assert.throws(()=>adapter.rebuildHostCandidate(cta,unsupportedCta,hostSdk,registry),
 /cannot be represented/);
// Structural Q&A change must use explicit rebuild. Keep existing graph CSS,
// attach a new third Q&A as typed nodes and never mutate the original input.
const extraFaq=clone(faq.site);
const faqExtraSec=extraFaq.pages[0].sections.find(s=>s.id==='df-selected-composition');
faqExtraSec.items.push({...clone(faqExtraSec.items[0]),id:faqExtraSec.id+'-item-3'});
const thirdFaq=adapter.rebuildHostCandidate(faq,extraFaq,hostSdk,registry);
assert.ok(findNode(thirdFaq.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,'-card-3-text'));

// A structural rebuild must never transfer visual styles from one FAQ item
// to another when the item order changed. It previously did so because the
// regex matched a literal backslash+d instead of an ordinal card number.
const faqReordered=clone(thirdFaq.site);
const frSec=faqReordered.pages[0].sections.find(s=>s.id==='df-selected-composition');
findNode(frSec.designGraph.nodes,'-card-1-title').styles.fontWeight=900;
frSec.items.reverse();
const reorderedRebuilt=adapter.rebuildHostCandidate(thirdFaq,faqReordered,hostSdk,registry);
const rrSec=reorderedRebuilt.site.pages[0].sections.find(s=>s.id==='df-selected-composition');
assert.notEqual(findNode(rrSec.designGraph.nodes,'-card-1-title').styles.fontWeight,900,
 'No owner typography may bleed into a different FAQ item');
assert.ok(reorderedRebuilt.rebuild.resetVisualNodes>=6);
assert.ok(reorderedRebuilt.rebuild.resetVisualNodeIds.includes(
 frSec.id+'-dg-card-1-title'));
assert.ok(reorderedRebuilt.rebuild.preservedVisualNodeIds.length>0);
// An independent graph text edit on a still-identical CMS field survives an
// explicit rebuild, including the exactly-owned card typography.
const manualGraph=clone(thirdFaq.site);
const manualSec=manualGraph.pages[0].sections.find(s=>s.id==='df-selected-composition');
findNode(manualSec.designGraph.nodes,'-card-1-text').text='Owner-edited graph copy';
const manualRebuilt=adapter.rebuildHostCandidate(thirdFaq,manualGraph,hostSdk,registry);
assert.equal(findNode(manualRebuilt.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,'-card-1-text').text,
 'Owner-edited graph copy');
assert.equal(manualRebuilt.rebuild.retainedGraphCopyNodes,1);
const graphAndCms=clone(manualGraph);
graphAndCms.pages[0].sections.find(s=>s.id==='df-selected-composition')
 .items[0].values['content.answer']='A conflicting CMS answer';
assert.throws(()=>adapter.rebuildHostCandidate(thirdFaq,graphAndCms,hostSdk,registry),
 /Conflicting CMS and manually edited Design Graph content/);
// Deleting an item must not silently destroy independently written Graph
// copy. An explicitly authorized host may acknowledge exactly which edited
// node content its owner agrees to discard.
const removing=clone(thirdFaq.site);
const removingSec=removing.pages[0].sections.find(s=>s.id==='df-selected-composition');
findNode(removingSec.designGraph.nodes,'-card-3-text').text='Owner-only third answer';
removingSec.items.pop();
assert.throws(()=>adapter.rebuildHostCandidate(thirdFaq,removing,hostSdk,registry),
 /Rebuild would discard owner Graph edits/);
const discardId=removingSec.id+'-dg-card-3-text:text';
const candidateBeforePreview=JSON.stringify(thirdFaq);
const editedBeforePreview=JSON.stringify(removing);
const destructivePreview=adapter.inspectRebuild(thirdFaq,removing,hostSdk,registry);
assert.equal(destructivePreview.canApply,false);
assert.equal(destructivePreview.requiresOwnerConfirmation,true);
assert.equal(destructivePreview.noMutation,true);
assert.ok(destructivePreview.rebuild.removedVisualNodeIds.includes(
 removingSec.id+'-dg-card-3-text'));
assert.ok(destructivePreview.rebuild.explicitlyDiscardedGraphEdits.includes(discardId));
assert.deepEqual(destructivePreview.discardedGraphEdits,[{
 nodeId:removingSec.id+'-dg-card-3-text',property:'text',kind:'property',
 previousValue:findNode(thirdFaq.site.pages[0].sections.find(s=>
  s.id==='df-selected-composition').designGraph.nodes,'-card-3-text').text,
 currentValue:'Owner-only third answer',rebuiltValue:undefined,
 nodeStillPresent:true,nodeInEditedGraph:true,nodeInRebuiltGraph:false,
 requiresExplicitOwnerConfirmation:true
}]);
assert.equal(JSON.stringify(thirdFaq),candidateBeforePreview);
assert.equal(JSON.stringify(removing),editedBeforePreview);

// A graph node manually deleted by the owner must not be silently recreated.
const ownerDeleted=clone(thirdFaq.site);
const ownerDeletedSection=ownerDeleted.pages[0].sections.find(s=>
 s.id==='df-selected-composition');
const deletedNodeId=ownerDeletedSection.id+'-dg-card-2-text';
assert.equal(removeNode(ownerDeletedSection.designGraph.nodes,deletedNodeId),true);
const ownerDeletedPreview=adapter.inspectRebuild(thirdFaq,ownerDeleted,hostSdk,registry);
assert.equal(ownerDeletedPreview.canApply,false);
assert.equal(ownerDeletedPreview.requiresOwnerConfirmation,true);
const deletedNodeReview=ownerDeletedPreview.discardedGraphEdits.find(edit=>
 edit.nodeId===deletedNodeId&&edit.property==='__node__');
assert.ok(deletedNodeReview,'Deleted canonical node must be explicitly reviewed');
assert.equal(deletedNodeReview.kind,'node-structure');
assert.equal(deletedNodeReview.nodeInEditedGraph,false);
assert.equal(deletedNodeReview.nodeInRebuiltGraph,true);
assert.ok(ownerDeletedPreview.rebuild.createdVisualNodeIds.includes(deletedNodeId));
assert.throws(()=>adapter.rebuildHostCandidate(thirdFaq,ownerDeleted,hostSdk,registry),
 /explicit review required/);
const ownerDeletedApproved=adapter.rebuildHostCandidate(thirdFaq,ownerDeleted,
 hostSdk,registry,{acceptedDiscardedNodes:[deletedNodeId+':__node__']});
assert.ok(findExactNode(ownerDeletedApproved.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,deletedNodeId));
assert.deepEqual(ownerDeletedApproved.rebuild.explicitlyDiscardedGraphEdits,
 [deletedNodeId+':__node__']);

// A custom owner-created node must also be reviewed before the rebuild drops it.
const ownerAdded=clone(thirdFaq.site);
const ownerAddedSection=ownerAdded.pages[0].sections.find(s=>
 s.id==='df-selected-composition');
const customNode=clone(findNode(ownerAddedSection.designGraph.nodes,'-card-2-text'));
customNode.id='owner-custom-note';customNode.text='Custom owner-only note';
ownerAddedSection.designGraph.nodes.push(customNode);
const ownerAddedPreview=adapter.inspectRebuild(thirdFaq,ownerAdded,hostSdk,registry);
assert.equal(ownerAddedPreview.canApply,false);
const customNodeReview=ownerAddedPreview.discardedGraphEdits.find(edit=>
 edit.nodeId==='owner-custom-note'&&edit.property==='__node__');
assert.ok(customNodeReview,'Custom node deletion must require review');
assert.equal(customNodeReview.previousValue,null);
assert.equal(customNodeReview.currentValue.text,'Custom owner-only note');
assert.equal(customNodeReview.nodeInEditedGraph,true);
assert.equal(customNodeReview.nodeInRebuiltGraph,false);
assert.ok(ownerAddedPreview.rebuild.removedVisualNodeIds.includes('owner-custom-note'));
const ownerAddedApproved=adapter.rebuildHostCandidate(thirdFaq,ownerAdded,
 hostSdk,registry,{acceptedDiscardedNodes:['owner-custom-note:__node__']});
assert.ok(!findExactNode(ownerAddedApproved.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,'owner-custom-note'));

// Styling on a CMS-removed card is also owner work, even if its copy is unchanged.
const styledRemoved=clone(thirdFaq.site);
const styledSection=styledRemoved.pages[0].sections.find(s=>
 s.id==='df-selected-composition');
findNode(styledSection.designGraph.nodes,'-card-3-text').styles.fontWeight=900;
styledSection.items.pop();
const styledPreview=adapter.inspectRebuild(thirdFaq,styledRemoved,hostSdk,registry);
const styleReview=styledPreview.discardedGraphEdits.find(edit=>
 edit.nodeId.endsWith('-card-3-text')&&edit.property==='styles');
assert.ok(styleReview,'Removed-node style changes must be reviewed');
assert.equal(styleReview.currentValue.fontWeight,900);
assert.equal(styleReview.nodeInRebuiltGraph,false);

// Media alt is graph-editable when its CMS-derived source stays unchanged;
// divergent edits on both sides must fail closed.
const graphAltEdit=clone(galleryRebuilt.site);
const graphAltSection=graphAltEdit.pages[0].sections.find(s=>
 s.id==='df-selected-composition');
findNode(graphAltSection.designGraph.nodes,'-card-1-image').alt='Graph-authored accessible alt';
const graphAltRebuild=adapter.rebuildHostCandidate(galleryRebuilt,graphAltEdit,hostSdk,registry);
assert.equal(findNode(graphAltRebuild.site.pages[0].sections.find(s=>
 s.id==='df-selected-composition').designGraph.nodes,'-card-1-image').alt,
 'Graph-authored accessible alt');
const divergentAlt=clone(graphAltEdit);
divergentAlt.assets.find(a=>a.id==='owner-gallery-one').alt='CMS-authored accessible alt';
assert.throws(()=>adapter.rebuildHostCandidate(galleryRebuilt,divergentAlt,hostSdk,registry),
 /Conflicting CMS and manually edited Design Graph content/);

const conflictPreview=adapter.inspectRebuild(thirdFaq,graphAndCms,hostSdk,registry);
assert.equal(conflictPreview.canApply,false);
assert.equal(conflictPreview.requiresOwnerConfirmation,false);
assert.ok(conflictPreview.error.includes('Conflicting CMS and manually edited'));
const oversizedBindings=clone(thirdFaq);
oversizedBindings.mapping.contentBindings=Array.from({length:81},()=>({}));
assert.throws(()=>adapter.rebuildHostCandidate(oversizedBindings,removing,hostSdk,registry),
 /Invalid provenance bindings/);
assert.throws(()=>adapter.rebuildHostCandidate(thirdFaq,removing,hostSdk,registry,
 {acceptedDiscardedNodes:Array.from({length:181},(_,i)=>'node-'+i)}),
 /Invalid explicit rebuild review options/);
assert.throws(()=>adapter.rebuildHostCandidate(thirdFaq,removing,hostSdk,registry,
 {acceptedDiscardedNodes:['wrong-node']}),/explicit review required/);
const approvedRemoval=adapter.rebuildHostCandidate(thirdFaq,removing,hostSdk,registry,
 {acceptedDiscardedNodes:[discardId]});
assert.deepEqual(approvedRemoval.rebuild.explicitlyDiscardedGraphEdits,[discardId]);
assert.equal(approvedRemoval.rebuild.requiresOwnerVisualReview,true);

const fakeMapping=clone(gallery);
fakeMapping.mapping.contentBindings[0].nodeId='forged-untrusted-node';
assert.throws(()=>adapter.rebuildHostCandidate(fakeMapping,galleryUpload,hostSdk,registry),
 /Provenance binding mismatch/);
assert.equal(JSON.stringify(gallery.site),JSON.stringify(
 adapter.buildHostCandidate(bridge.build({format:bridge.WORKSPACE,version:1,
 project:ownerProject,composition:'gallery-mosaic'}),hostSdk,registry).site),
 'Original candidate remains immutable across explicit host rebuilds');

// Optional PHP parity gate on a separate read-only lead checkout. It checks
// PHP's independent validator and the actual escaped markup (CSS can be ordered differently).
let phpChecked=0;
if(process.env.DF_LEAD_PHP_FILE){
 const phpFile=path.resolve(process.env.DF_LEAD_PHP_FILE);
 assert.ok(fs.statSync(phpFile).isFile(),'Lead PHP DesignGraph.php must exist');
 const phpScript=[
  'require $argv[1];',
  '$site=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);',
  '$sec=null;foreach($site["pages"][0]["sections"] as $s){',
  'if($s["id"]==="df-selected-composition"){$sec=$s;break;}}',
  'if(!$sec)throw new Exception("Missing candidate section");',
  '$assets=[];foreach($site["assets"] as $a)$assets[$a["id"]]=$a["mime"];',
  '$ids=[];$cls="Manufact".chr(92)."Stage3".chr(92)."DesignGraph";',
  '$cls::validate($sec["designGraph"],$assets,$ids,$site["designTokens"]);',
  'echo $cls::render($site,$sec["designGraph"],"",$sec["id"]);'
 ].join('');
 for(const [name,theme] of [
  ['hero-split','editorial'],['gallery-mosaic','noir'],
  ['faq-compact','technical'],['contact-center','minimal'],
  ['services-cards','atelier'],['benefits-rail','verdant']
 ]){
  const project={format:FORMAT,version:1,kit:'agency',theme,language:'en',facts:{}};
  const bundle=bridge.build({format:bridge.WORKSPACE,version:1,project,composition:name});
  const document=adapter.buildHostCandidate(bundle,hostSdk,registry).site;
  const sec=document.pages[0].sections.find(s=>s.id==='df-selected-composition');
  const jsHtml=hostGraph.render(document,sec.designGraph,'',null,sec.id);
  const run=cp.spawnSync(process.env.DF_LEAD_PHP_BIN||'php',['-r',phpScript,phpFile],{
   input:JSON.stringify(document),encoding:'utf8',timeout:15000,maxBuffer:1000000});
  assert.equal(run.status,0,run.stderr||String(run.error));
  const withoutStyle=html=>{const a=html.indexOf('<style>'),b=html.indexOf('</style>');
   assert.ok(a>=0&&b>a,'Missing style tag');return html.slice(0,a)+'<style></style>'+html.slice(b+8);};
  assert.equal(withoutStyle(run.stdout),withoutStyle(jsHtml),'Host PHP vs JS markup parity: '+name);
  assert.ok(run.stdout.includes('prefers-reduced-motion'),'PHP reduced-motion CSS: '+name);
  phpChecked++;
 }
} else {
 console.log('LEAD_GRAPH_PHP SKIP: set DF_LEAD_PHP_FILE to lead stage3/server/DesignGraph.php');
}
const project={format:FORMAT,version:1,kit:'agency',theme:'noir',language:'en',facts:{}};
const noSelection=bridge.build(project);
assert.throws(()=>adapter.buildHostCandidate(noSelection,hostSdk,registry),
 /Select a D3 composition first/);
// Prove real CMS-style JSON editing: no AI/regeneration required for a headline,
// color, mobile grid and hover transition. Host validates the edited document.
const marked=bridge.build({format:bridge.WORKSPACE,version:1,project,composition:'hero-center'});
const editable=adapter.buildHostCandidate(marked,hostSdk,registry).site;
const mutable=clone(editable),target=mutable.pages[0].sections.find(s=>s.id==='df-selected-composition');
const copy=target.designGraph.nodes[0].children.find(n=>n.id.endsWith('-copy'));
const heading=copy.children.find(n=>n.type==='heading');
heading.text='Owner-approved headline revision';
mutable.designTokens.colors.accent='#125A8C';
target.designGraph.nodes[0].responsive.mobile.columns=1;
const action=copy.children.find(n=>n.type==='button');
action.states.hover.opacity=75;
const restored=hostSdk.validateSite(clone(mutable),registry);
const modifiedHtml=hostGraph.render(restored,target.designGraph,'',null,target.id);
assert.ok(modifiedHtml.includes('Owner-approved headline revision'));
assert.ok(modifiedHtml.includes('#125A8C'));
assert.ok(modifiedHtml.includes('opacity:0.75'));
assert.ok(modifiedHtml.includes('@media(max-width:600px)'));

const corrupted=clone(marked);corrupted.site.title='unauthorized change';
assert.throws(()=>adapter.buildHostCandidate(corrupted,hostSdk,registry),/D6: changed/);
console.log('DESIGN_FACTORY_LEAD_GRAPH PASS: '+checks+
 ' lead-SDK validated and distinct editor graphs; '+renderChecks+
 ' scoped host JS renders; '+rebuildChecks+' AI-free rebuilds; '+
 'loss-aware node deletion/custom-node/style/media regressions; '+
 componentRebuildChecks+' CMS component source-refresh rebuilds; '+
 rebuildPreviewChecks+' read-only rebuild preflights; '+phpChecked+
 ' real PHP parity probes; old SDK rejects graph; D6 immutable and tamper-protected. No browser acceptance.');
