/* Design Factory D6 owner/developer offline transfer package.
 * Deterministic user-triggered export: no network, storage, backend or publication.
 * The archive is a work handoff, NEVER the D7 source/release ZIP.
 */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.DesignFactoryDeliveryPackage=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const FORMAT='manufact-design-factory-delivery-v1';
 const paths=Object.freeze([
  {id:'home',path:'/',file:'preview/index.html'},
  {id:'services',path:'/services/',file:'preview/services/index.html'},
  {id:'approach',path:'/approach/',file:'preview/approach/index.html'},
  {id:'contact',path:'/contact/',file:'preview/contact/index.html'}
 ]);
 function stableJSON(value){return JSON.stringify(value,null,2)+'\n';}
 function build({engine,zip,feedbackTool,auditTool,project,workspace,compiled,feedback}){
  if(!engine||!zip||!feedbackTool||!auditTool||!compiled||!compiled.site||!workspace)
   throw Error('Delivery requires the current compiled Studio project');
  const validated=engine.compiler.validateProject(project);
  if(JSON.stringify(validated)!==JSON.stringify(workspace.project)||
    workspace.format!=='manufact-design-factory-workspace-v1'||![1,2].includes(workspace.version))
   throw Error('Workspace and current project disagree');
  const site=engine.sdk.validateSite(compiled.site,engine.compiler.loadRegistry());
  const bundle=engine.bridge.build(workspace);
  engine.bridge.validateBundle(bundle);
  // Recompilation must agree with the CMS export on all section IDs, CTA,
  // facts, navigation and SEO. Never ship two contradictory CMS documents.
  if(JSON.stringify(site)!==JSON.stringify(bundle.site))
   throw Error('Studio CMS export and D6 integration bundle disagree');
  const context=feedbackTool.context(compiled,project,workspace.composition);
  const matching=Boolean(feedback&&feedback.context===context);
  let clientReport;
  if(matching){
   feedbackTool.validate(feedback,context);
   clientReport=feedbackTool.create(context,feedback.reviewer,feedback.notes.map(n=>({...n})));
  }else{
   clientReport={format:'manufact-design-factory-delivery-feedback-status-v1',version:1,
    status:feedback?'stale-excluded':'not-loaded',
    note:'No matching client feedback bundled. This is NOT a feedback report.'};
  }
  const audit=auditTool.build(compiled,project,workspace.composition,feedback,context);
  const bridge={format:'manufact-design-factory-bridge-v2',version:2,siteFormat:engine.sdk.FORMAT,
   pageCount:site.pages.length,kit:project.kit,theme:project.theme,
   supported:['site-v1','registered manifests','seo','internal links','cms theme','section appearance'],
   integration_required:['standalone preview CSS','enhanced layout and responsive visual parity'],
   composition:compiled.bridge,ownerChecklist:compiled.checklist,
   publishGate:compiled.checklist.readyForPublish?'owner_review_confirmed_by_exporter_no_publish':'blocked_without_owner_review',
   indexing:compiled.checklist.indexing};
  const all=[
   {name:'audit/content-audit.json',content:stableJSON(audit)},
   {name:'audit/owner-review.html',content:auditTool.html(audit)},
   {name:'client/feedback.json',content:stableJSON(clientReport)},
   {name:'cms/bridge-v2.json',content:stableJSON(bridge)},
   {name:'cms/integration-v2.json',content:stableJSON(bundle)},
   {name:'cms/site-v1.json',content:engine.compiler.serialize(site)},
   {name:'design/project.json',content:engine.compiler.serialize(validated)},
   {name:'design/services.txt',content:(project.facts.services||[]).map(s=>s.title+'\t'+s.description).join('\n')+'\n'},
   {name:'design/workspace.json',content:engine.compiler.serialize(workspace)}
  ];
  for(const route of paths){
   const page=site.pages.find(x=>x.id==='df-page-'+route.id&&x.path===route.path);
   if(!page)throw Error('Missing canonical page '+route.path);
   const content=engine.preview.pageHtml(site,page,project.theme,project.language);
   if(!content.includes('<meta name="robots" content="noindex">'))
    throw Error('Preview must retain robots=noindex: '+route.file);
   all.push({name:route.file,content});
  }
  all.push({name:'preview/assets/preview.css',content:engine.preview.css(project.theme)});
  const previewInfo={format:'manufact-design-factory-static-preview-v1',version:1,
   type:'static-html-preview-not-cms-export',kit:project.kit,theme:project.theme,
   language:project.language,pages:4,offline:true,productionReady:false,
   formsConfigured:false,ownerVerificationRequired:true,
   paths:paths.map(x=>x.file),reviewPortal:'preview/review.html',reviewContext:context};
  all.push({name:'preview/preview-info.json',content:stableJSON(previewInfo)});
  all.push({name:'preview/review.html',content:feedbackTool.reviewHtml(context,project.language)});
  const notes=[
   'DESIGN FACTORY — OWNER + DEVELOPER HANDOFF / ПАКЕТ СОГЛАСОВАНИЯ',
   '',
   '1. preview/index.html — open the four-page offline demonstration.',
   '2. preview/review.html — enter comments and download the client JSON.',
   '3. audit/owner-review.html — printable owner review; no signature or publication consent.',
   '4. audit/content-audit.json — page inventory, owner fields, SEO and review blockers.',
   '5. cms/site-v1.json — actual CMS-compatible supported-subset export.',
   '6. cms/integration-v2.json — D6 deterministic integration bundle.',
   '7. cms/bridge-v2.json — extra compatibility guidance, not CMS input.',
   '8. design/workspace.json — reimport into Design Factory Studio to continue editing.',
   '9. design/project.json and design/services.txt — owner brief and services.',
   '10. client/feedback.json — a genuine matching report OR an explicit not-included marker.',
   '11. manifest.json — per-member CRC32 for transfer diagnostics (NOT cryptographic signatures).',
   '',
   'This is a CLIENT/DEVELOPER HANDOFF, NOT the D7 source release artifact.',
   'No production deployment, forms, CMS PHP parity, manual visual approval,',
   'media rights, or customer signature is represented by this archive.',
   'Static preview always has robots=noindex, regardless of CMS owner review.',
   'The bundle may contain private owner-provided facts; share intentionally.',
   '',
   'Клиентский просмотр: preview/index.html. Отзыв: preview/review.html.',
   'Для CMS использовать cms/site-v1.json или cms/integration-v2.json после проверки.',
   'Это НЕ релиз CMS, не акт приёмки и не разрешение на публикацию.',
   ''
  ].join('\n');
  all.push({name:'README.txt',content:notes});
  const entries=all.map(file=>({path:file.name,crc32:zip.crcText(file.content).toString(16).padStart(8,'0')}));
  const manifest={format:FORMAT,version:1,productionReady:false,
   kit:project.kit,theme:project.theme,language:project.language,
   ownerReviewConfirmed:project.ownerReviewConfirmed===true,
   indexing:compiled.checklist.indexing,feedback:matching?'matching-included':feedback?'stale-excluded':'not-loaded',
   files:entries,crc32Warning:'CRC32 detects accidental damage, not malicious tampering; no digital signature.',
   releaseEvidence:false,phpParity:false,manualVisualAcceptance:false};
  all.push({name:'manifest.json',content:stableJSON(manifest)});
  if(all.length!==zip.deliveryFiles.length||
   all.some(f=>!zip.deliveryFiles.includes(f.name)))
   throw Error('Unexpected delivery ZIP inventory');
  const bytes=zip.buildDelivery(all),inspect=zip.inspectDelivery(bytes);
  if(!inspect.crcVerified||inspect.files!==zip.deliveryFiles.length)
   throw Error('Delivery ZIP failed content verification');
  return {bytes,manifest,audit,site,feedbackIncluded:matching,inspection:inspect};
 }
 return Object.freeze({FORMAT,paths,build});
});
