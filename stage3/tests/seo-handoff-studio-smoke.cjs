'use strict';
// Studio consumes the SEO operator's PRIVATE, read-only work packets without
// trusting their authorship or applying any site edit. Synthetic fixture only.
const assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const fs=require('node:fs'),path=require('node:path');
const BRIDGE=require('../seo-engine/lib/search-cms-handoff.cjs');
const BLUEPRINT=require('../seo-engine/lib/blueprint.cjs');
const HISTORY=require('../seo-engine/lib/search-history.cjs');
const DECISIONS=require('../seo-engine/lib/search-action-ledger.cjs');
const {fingerprint:nodeHash}=require('../seo-engine/lib/acceptance.cjs');
const STUDIO=require('../studio/seo-handoff.cjs');
const root=path.resolve(__dirname,'..');
const site=JSON.parse(fs.readFileSync(path.join(root,'fixtures/industrial-site.json'),'utf8'));
const manifests=fs.readdirSync(path.join(root,'components')).filter(x=>x.endsWith('.json'))
 .map(x=>JSON.parse(fs.readFileSync(path.join(root,'components',x),'utf8')));
const page=site.pages[0],section=page.sections[0],element=section.elements[0],hash=nodeHash(site);
const meta=['title','description','robots','ogTitle','ogDescription'].map(key=>({
 property:'seo.'+key,expectedCurrent:page.seo?.[key]??(key==='robots'?'index':''),
 approvedBlueprintValue:key==='title'?'New approved title':page.seo?.[key]??(key==='robots'?'index':''),
 mayEditAutomatically:false,
 isDifferent:key==='title'&&(page.seo?.[key]??'')!=='New approved title'
}));
const packet={format:BRIDGE.FORMAT,version:1,readOnly:true,siteId:site.siteId,
 approvedBlueprintFingerprint:'a'.repeat(64),currentSiteFingerprint:hash,
 sourceHistorySha256:'b'.repeat(64),
 summary:{activeWorkPackets:1,reportedCompleteNeedsVerification:0,
  notApprovedOrUnreviewed:0,blockedForCurrentSiteDrift:0},
 active:[{actionId:'human-review:'+page.id,priority:'P1',pageId:page.id,
  approvedPath:page.path,measuredObservation:'Synthetic observation',
  approvedManualNextStep:'Compare actual search intent before editing',
  ownerDecision:{status:'accepted',assignee:'Fixture reviewer'},
  currentSiteRevisionFingerprint:hash,sourceReportSha256:'b'.repeat(64),
  automaticApplication:false,releaseAuthorized:false,
  existingEditorTargets:{metaFields:meta,
   approvedFieldProposals:[{proposalId:'heading',componentId:section.component,
    sectionManifestVersion:section.manifestVersion,
    locator:{pageId:page.id,sectionId:section.id,elementId:element.id,property:'content.text'},
    expectedBefore:element.values['content.text'],approvedAfter:'Proposed title',
    automatic:false,manualOverrideCheckRequired:true}],
   sectionReview:[{sectionId:section.id,component:section.component}],blockedFieldMappings:[]}
 }],reportedComplete:[],notSelected:[],blocked:[]};
const clone=x=>structuredClone(x);
(async()=>{
 assert.equal(await STUDIO.fingerprint(site,webcrypto),hash,'Browser SHA-256 must match SEO Engine canonical SHA-256');
 assert.equal(STUDIO.canonical({a:1,z:[3,{b:2,a:1}]}),'{"a":1,"z":[3,{"a":1,"b":2}]}');
 const first=STUDIO.inspect(packet,site,manifests,hash);
 assert.equal(first.revisionMatches,true);
 assert.equal(first.active[0].meta[0].sourceMatches,true);
 assert.equal(first.active[0].meta[0].differs,true);
 assert.equal(first.active[0].proposals[0].valid,true);
 assert.equal(first.active[0].sections[0].valid,true);
 // Parity against the REAL SEO Engine's output, not just a hand-shaped JSON.
 const plan=BLUEPRINT.checkBlueprint(JSON.parse(fs.readFileSync(path.join(root,'seo-engine/fixtures/industrial.blueprint.json'),'utf8')));
 const actionId='review-actual-route:'+page.id;
 const history={format:HISTORY.FORMAT,siteId:site.siteId,readOnly:true,
  actions:[{id:actionId,pageId:page.id,priority:'P1',type:'observed-click-decline',
   observation:'Synthetic measurement',nextStep:'Investigate observed change before editing'}]};
 const reviewed={format:DECISIONS.REVIEW,siteId:site.siteId,readOnly:true,
  sourceHistorySha256:'b'.repeat(64),actions:[{actionId,status:'accepted',assignee:'Fixture reviewer',
   reason:'Investigate only',decisionAt:'2026-10-31',evidenceRefCount:0}]};
 const generated=BRIDGE.build(site,manifests,plan,history,reviewed,'b'.repeat(64));
 assert.equal(generated.active.length,1,'Known industrial page must produce a real search work packet');
 const integration=STUDIO.inspect(generated,site,manifests,hash);
 assert.equal(integration.active[0].pageMatches,true);
 assert.equal(integration.active[0].meta.length,5);
 assert.deepEqual(site,JSON.parse(fs.readFileSync(path.join(root,'fixtures/industrial-site.json'),'utf8')),
  'Inspection must not edit the supplied Site v1');
 const changed=clone(site);
 changed.pages[0].sections[0].elements[0].values['content.text']='Manual editorial override';
 const revised=STUDIO.inspect(packet,changed,manifests,nodeHash(changed));
 assert.equal(revised.revisionMatches,false);
 assert.equal(revised.active[0].canCopy,false);
 assert.equal(revised.active[0].proposals[0].valid,false);
 const sourceChanged=clone(packet);
 sourceChanged.active[0].existingEditorTargets.metaFields[0].expectedCurrent='Outdated title';
 sourceChanged.active[0].existingEditorTargets.metaFields[0].isDifferent=true;
 assert.equal(STUDIO.inspect(sourceChanged,site,manifests,hash).active[0].meta[0].sourceMatches,false);
 const badPage=clone(packet);badPage.siteId='unrelated-site';
 assert.throws(()=>STUDIO.inspect(badPage,site,manifests,hash),/другого сайта/);
 const badCount=clone(packet);badCount.summary.activeWorkPackets=9;
 assert.throws(()=>STUDIO.inspect(badCount,site,manifests,hash),/Счётчики/);
 const badHash=clone(packet);badHash.active[0].sourceReportSha256='c'.repeat(64);
 assert.throws(()=>STUDIO.inspect(badHash,site,manifests,hash),/SEO action/);
 const badField=clone(packet);badField.active[0].existingEditorTargets.metaFields[0].property='seo.__proto__';
 assert.throws(()=>STUDIO.inspect(badField,site,manifests,hash),/карта полей/);
 const badDuplicate=clone(packet);badDuplicate.reportedComplete=[clone(badDuplicate.active[0])];
 badDuplicate.reportedComplete[0].ownerDecision.status='completed-reported';
 badDuplicate.summary.reportedCompleteNeedsVerification=1;
 assert.throws(()=>STUDIO.inspect(badDuplicate,site,manifests,hash),/повторный SEO action/);
 const badControl=clone(packet);badControl.active[0].measuredObservation='Unsafe\x00text';
 assert.throws(()=>STUDIO.inspect(badControl,site,manifests,hash),/SEO action/);
 const badReadOnly=clone(packet);badReadOnly.readOnly=false;
 assert.throws(()=>STUDIO.inspect(badReadOnly,site,manifests,hash),/формат/);
 const badLocator=clone(packet);badLocator.active[0].existingEditorTargets.approvedFieldProposals[0].locator.pageId='other-page';
 assert.throws(()=>STUDIO.inspect(badLocator,site,manifests,hash),/Чужой адрес/);
 const badGraph=clone(site);badGraph.pages[0].sections[0].designGraph={nodes:[]};
 assert.equal(STUDIO.inspect(packet,badGraph,manifests,nodeHash(badGraph)).active[0].proposals[0].valid,false);
 process.stdout.write('Private SEO-to-Studio handoff smoke PASS: fingerprint parity, manual exact locators, stale/foreign/unsafe rejection.\n');
})().catch(e=>{console.error(e);process.exitCode=1;});
