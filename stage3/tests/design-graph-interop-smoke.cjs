'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const sdk=require('../sdk/contract.cjs');
const interop=require('../sdk/design-graph-interop.cjs');
const root=path.resolve(__dirname,'..');
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const manifests=['company-hero','feature-highlights','contact-panel','image-showcase','lead-form',
  'lead-form-flex','service-grid','faq-accordion','testimonials','photo-gallery','media-story',
  'partner-logos','cta-banner','pricing-plans','process-timeline','comparison-matrix',
  'content-switcher','adaptive-gallery'].map(name=>readJson('components/'+name+'.json'));
const clone=value=>JSON.parse(JSON.stringify(value));
const site=readJson('fixtures/industrial-site.json');
site.siteId='site-df-interop';
site.designTokens={colors:{foreground:'#182b3d',background:'#ffffff',accent:'#0a5bff',muted:'#667788',
  surface:'#f4f7fa','cta-text':'#ffffff'},spacing:{small:12,medium:24,large:48},
  radii:{soft:12,round:24},typography:{body:16,heading:42}};
site.assets=[
  {id:'df-owner-image',src:'/assets/df-owner-image.png',mime:'image/png',alt:'Owner photo'},
  {id:'df-owner-video',src:'/assets/df-owner-video.mp4',mime:'video/mp4',alt:'Owner video'},
  {id:'df-owner-poster',src:'/assets/df-owner-poster.webp',mime:'image/webp',alt:'Video poster'}
];
const section=site.pages[0].sections[0];section.id='df-selected-composition';
const headingValue=section.elements.find(el=>el.slot==='heading').values['content.text'];
const action=section.elements.find(el=>el.slot==='action'),prefix='df-selected-composition-dg';
section.designGraph={version:1,id:prefix,nodes:[{id:prefix+'-root',type:'container',
  styles:{display:'grid',columns:2,gap:'@medium',padding:'@large',background:'@background',
    maxWidth:1200,align:'start',justify:'start'},
  responsive:{tablet:{columns:2,gap:'@medium'},mobile:{columns:1,gap:'@small',padding:'@small'}},
  children:[
    {id:prefix+'-heading',type:'heading',level:2,text:headingValue,
      styles:{fontSize:'@heading',fontWeight:700,color:'@foreground',lineHeight:110,fontFamily:'system',
        letterSpacing:-2,textAlign:'left',textWrap:'balance',textShadow:'soft'},
      responsive:{tablet:{fontSize:32},mobile:{fontSize:24}},motion:{effect:'fade-up',duration:450,delay:0}},
    {id:prefix+'-text',type:'text',text:section.elements.find(el=>el.slot==='summary').values['content.text'],
      styles:{fontSize:'@body',color:'@foreground',lineHeight:150}},
    {id:prefix+'-button',type:'button',text:action.values['content.text'],href:action.values['behavior.href'],
      styles:{display:'block',background:'@accent',color:'@cta-text',padding:'@small',
        radius:'@soft',fontWeight:700,maxWidth:240,minHeight:48},
      states:{hover:{opacity:85},focus:{borderWidth:2,borderColor:'@foreground'}}},
    {id:prefix+'-icon',type:'icon',icon:'sparkles',alt:'Decorative sparkles',styles:{fontSize:32,color:'@accent'}},
    {id:prefix+'-image',type:'image',assetId:'df-owner-image',alt:'Owner photo',
      styles:{objectFit:'cover',objectPositionX:50,objectPositionY:30,widthPx:640,heightPx:320}},
    {id:prefix+'-video',type:'video',assetId:'df-owner-video',alt:'Owner video',posterAssetId:'df-owner-poster',
      loop:false,styles:{widthPx:640,heightPx:360}},
    {id:prefix+'-divider',type:'divider',styles:{background:'@accent',heightPx:2}},
    {id:prefix+'-nested',type:'container',styles:{display:'grid',gridColumnsPreset:'sidebar-left',gap:'@small'},
      children:[{id:prefix+'-nested-copy',type:'text',text:'Nested owner copy',
        styles:{fontSize:'@body',color:'@muted',wordSpacing:2}}]}
  ]}]};
const candidate={format:'manufact-design-factory-lead-graph-candidate-v1',version:1,site,
  ownerChecklist:{missingFacts:[]},
  mapping:{composition:'industrial-editorial',theme:'technical',language:'en',
    contentBindings:[
      {nodeId:prefix+'-heading',source:{slot:'heading',field:'content.text'}},
      {nodeId:prefix+'-button',source:{slot:'action',field:'content.text'}},
      {nodeId:prefix+'-button',property:'href',source:{slot:'action',field:'behavior.href'}}
    ],semanticContentMode:'snapshot-requires-host-reconciliation',
    editable:['graph nodes','headings','text','button','design tokens','responsive overrides'],
    fidelity:'partial',approvedForPublish:false,
    integration_required:['complex D3 art','automatic graph/repeater synchronization','owner visual review']},
  expectedSdk:'Lead Design Graph v1; candidate metadata is informational'};
const registry=sdk.registry(manifests);
assert.deepEqual(sdk.validateSite(site,manifests),site,'Representative D7 graph must validate as site-v1');
const candidateBytes=JSON.stringify(candidate),session=interop.createSession(candidate,sdk,registry);
assert.equal(session.format,interop.SESSION_FORMAT);
assert.deepEqual(session.sourceCandidate,candidate);assert.deepEqual(session.workingSite,candidate.site);
assert.equal(JSON.stringify(candidate),candidateBytes,'Import never mutates the source candidate');
let audit=interop.inspectSession(session,session.workingSite,sdk,registry);
assert.equal(audit.compatibility.canImport,true);assert.equal(audit.compatibility.canExportHandoff,true);
assert.equal(audit.compatibility.sourceCandidatePreserved,true);
assert.equal(audit.compatibility.originalFactoryProjectPreserved,false);
assert.equal(audit.compatibility.publishAuthorized,false);assert.equal(audit.compatibility.visualFidelity,'partial');
assert.equal(audit.baselineGraph.nodeCount,10);assert.equal(audit.baselineGraph.types.video,1);
assert.equal(audit.baselineGraph.types.image,1);assert.ok(audit.baselineGraph.responsiveNodes>=2);
assert.equal(audit.baselineGraph.stateNodes,1);assert.equal(audit.baselineGraph.motionNodes,1);
assert.ok(audit.baselineGraph.styleKeys.includes('gridColumnsPreset'));assert.ok(audit.integrationRequired.length>=1);
const edited=clone(session.workingSite),editedSection=edited.pages[0].sections[0];
editedSection.elements.find(el=>el.slot==='heading').values['content.text']='Owner-edited CMS headline';
editedSection.designGraph.nodes[0].children[0].text='Independent visual headline';
editedSection.designGraph.nodes[0].children[0].styles.color='#123456';
editedSection.designGraph.nodes[0].children[0].responsive.mobile.fontSize=22;
edited.designTokens.colors.accent='#bb5522';edited.assets[0].alt='Owner corrected photo description';
assert.deepEqual(sdk.validateSite(edited,manifests),edited);
const updatedSession=interop.refreshSession(session,edited,sdk,registry);
audit=interop.inspectSession(updatedSession,updatedSession.workingSite,sdk,registry);
assert.equal(audit.tokensChanged,true);assert.equal(audit.assetsChanged,true);
assert.ok(audit.graphDiff.changedProperties.some(item=>item.nodeId===prefix+'-heading'&&item.path==='text'));
assert.ok(audit.graphDiff.changedProperties.some(item=>item.nodeId===prefix+'-heading'&&item.path==='responsive.mobile.fontSize'));
assert.ok(audit.bindingChanges.some(item=>item.nodeId===prefix+'-heading'&&item.source.field==='content.text'));
const handoff=interop.exportHandoff(updatedSession,updatedSession.workingSite,sdk,registry);
assert.equal(handoff.format,interop.HANDOFF_FORMAT);
assert.deepEqual(handoff.sourceCandidate,candidate,'Export retains the exact original candidate baseline');
assert.deepEqual(handoff.editedSite,edited,'Export carries current edits separately');
assert.equal(handoff.audit.compatibility.publishAuthorized,false);
const resumed=interop.resumeSession(handoff,sdk,registry);
assert.deepEqual(resumed.sourceCandidate,candidate);assert.deepEqual(resumed.workingSite,edited);
assert.deepEqual(interop.exportHandoff(resumed,resumed.workingSite,sdk,registry),handoff,
  'Handoff import/export is stable for the same baseline and current site');
const unknownStyle=clone(candidate);unknownStyle.site.pages[0].sections[0].designGraph.nodes[0].styles.rawCss='display:none';
assert.throws(()=>interop.createSession(unknownStyle,sdk,registry),/unknown keys|Unknown/i);
const badBinding=clone(candidate);badBinding.mapping.contentBindings[0].source.field='content.not-declared';
assert.throws(()=>interop.createSession(badBinding,sdk,registry),/does not resolve/i);
const publishClaim=clone(candidate);publishClaim.mapping.approvedForPublish=true;
assert.throws(()=>interop.createSession(publishClaim,sdk,registry),/publish claim/i);
const wrongVersion=clone(candidate);wrongVersion.version=2;
assert.throws(()=>interop.createSession(wrongVersion,sdk,registry),/format\/version/i);
const wrongSite=clone(edited);wrongSite.siteId='site-other';
assert.throws(()=>interop.exportHandoff(updatedSession,wrongSite,sdk,registry),/source site/i);
const changedGraphId=clone(edited);changedGraphId.pages[0].sections[0].designGraph.id='other-design-graph';
assert.throws(()=>interop.exportHandoff(updatedSession,changedGraphId,sdk,registry),/stable ID changed/i);
const removedGraph=clone(edited);delete removedGraph.pages[0].sections[0].designGraph;
assert.equal(interop.inspectSession(updatedSession,removedGraph,sdk,registry).compatibility.canExportHandoff,false);
assert.throws(()=>interop.exportHandoff(updatedSession,removedGraph,sdk,registry),/stable ID changed/i);
const jsGraph=fs.readFileSync(path.join(root,'sdk/design-graph.cjs'),'utf8');
const phpGraph=fs.readFileSync(path.join(root,'server/DesignGraph.php'),'utf8');
const list=(source,regex,where)=>{const match=source.match(regex);assert.ok(match,'Missing '+where+' source list');
  return Array.from(match[1].matchAll(/'([^']+)'/g),item=>item[1]).sort();};
assert.deepEqual(list(jsGraph,/const STYLE_KEYS=\[([\s\S]*?)\];/,'JS style keys'),
  list(phpGraph,/private const STYLES=\[([\s\S]*?)\];/,'PHP style keys'),'JS/PHP style keys must stay identical');
assert.deepEqual(list(jsGraph,/const TYPES=\[([\s\S]*?)\];/,'JS node types'),
  list(phpGraph,/in_array\(\$type,\[([\s\S]*?)\],true\)/,'PHP node types'),'JS/PHP node types must stay identical');
assert.deepEqual(list(jsGraph,/const MOTIONS=\[([\s\S]*?)\];/,'JS motion types'),
  list(phpGraph,/private const MOTIONS=\[([\s\S]*?)\];/,'PHP motion types'),'JS/PHP motion values must stay identical');
const jsIcons=jsGraph.match(/const ICON_PATHS=Object\.freeze\(\{([\s\S]*?)\}\);/);
const phpIcons=phpGraph.match(/private const ICON_PATHS=\[([\s\S]*?)\];/);
assert.ok(jsIcons&&phpIcons,'Both validators expose a closed icon library');
const iconKeys=(body,regex)=>Array.from(body.matchAll(regex),item=>item[1]||item[2]).sort();
assert.deepEqual(iconKeys(jsIcons[1],/(?:^|[\n,])\s*(?:"([a-z][a-z0-9-]*)"|([a-z][a-z0-9-]*)):/g),
  iconKeys(phpIcons[1],/'([a-z][a-z0-9-]*)'\s*=>/g),'JS/PHP icon libraries must stay identical');
console.log('DESIGN GRAPH INTEROP PASS: typed candidate, responsive/media/state/motion audit, baseline-preserving handoff, fail-closed imports, JS/PHP vocabulary parity.');
