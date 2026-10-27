/* Restore one canonical 18-file Design Factory handoff, never arbitrary ZIPs.
 * Inspection is local: ZIP CRC detects corruption, not deliberate forgery.
 */
(function(root,factory){
 'use strict';
 const api=Object.freeze(factory());
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.DesignFactoryDeliveryImport=api;
})(typeof globalThis==='object'?globalThis:this,function(){
 'use strict';
 const FORMAT='manufact-design-factory-delivery-v1';
 function fail(message){throw Error('DELIVERY_IMPORT: '+message);}
 function obj(raw,keys,label){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
     Object.keys(raw).some(k=>!keys.includes(k)))fail('Invalid '+label+' object');
 }
 function same(a,b){
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const aKeys=Object.keys(a).sort(),bKeys=Object.keys(b).sort();
  return aKeys.length===bKeys.length&&aKeys.every((k,i)=>k===bKeys[i]&&same(a[k],b[k]));
 }
 function restore({bytes,engine,zip,feedbackTool}){
  if(!engine?.bridge||!zip?.extractDelivery||!feedbackTool?.context)
   fail('Missing first-party import dependencies');
  const read=zip.extractDelivery(bytes);
  if(!read.inspection.crcVerified||read.inspection.files!==18)
   fail('ZIP integrity was not verified');
  const files=read.files;
  const parse=(path)=>{
   try{
    const source=files[path];
    if(typeof source!=='string'||source.length>2*1024*1024)fail('Missing or oversized '+path);
    // JSON is data, never evaluated as JavaScript.
    return engine.compiler.jsonParse(source);
   }catch(err){fail('Invalid JSON '+path+': '+err.message);}
  };
  const manifest=parse('manifest.json');
  obj(manifest,['format','version','productionReady','kit','theme','language',
   'ownerReviewConfirmed','indexing','feedback','files','crc32Warning',
   'releaseEvidence','phpParity','manualVisualAcceptance'],'manifest');
  if(manifest.format!==FORMAT||manifest.version!==1||
    manifest.productionReady!==false||manifest.releaseEvidence!==false||
    manifest.phpParity!==false||manifest.manualVisualAcceptance!==false)
   fail('Unsupported delivery profile');
  if(!Array.isArray(manifest.files)||manifest.files.length!==17)fail('Unexpected member manifest count');
  const expected=new Set(zip.deliveryFiles.filter(n=>n!=='manifest.json'));
  const recorded=new Set();
  for(const row of manifest.files){
   obj(row,['path','crc32'],'manifest member');
   if(typeof row.path!=='string'||!expected.has(row.path)||recorded.has(row.path)||
      typeof row.crc32!=='string'||!/^[0-9a-f]{8}$/.test(row.crc32)||
      row.crc32!==zip.crcText(files[row.path]).toString(16).padStart(8,'0'))
    fail('Manifest member checksum mismatch');
   recorded.add(row.path);
  }
  if(recorded.size!==expected.size)fail('Incomplete manifest paths');
  const workspace=parse('design/workspace.json');
  // D6 validates workspaces v1-v3, registered CMS fields, local links and
  // canonical reconstruction. Do not trust the copied site as executable input.
  const bundle=engine.bridge.validateBundle(parse('cms/integration-v2.json'));
  const w=engine.bridge.workspace(workspace);
  if(!same(bundle.workspace,w))fail('ZIP workspace and D6 disagree');
  const project=engine.compiler.validateProject(parse('design/project.json'));
  if(!same(project,w.project))fail('ZIP project and workspace disagree');
  const site=engine.sdk.validateSite(parse('cms/site-v1.json'),engine.compiler.loadRegistry());
  if(!same(site,bundle.site))fail('CMS site and validated D6 disagree');
  if(manifest.kit!==project.kit||manifest.theme!==project.theme||
     manifest.language!==project.language||
     manifest.ownerReviewConfirmed!==project.ownerReviewConfirmed||
     manifest.indexing!==bundle.ownerChecklist.indexing)fail('Manifest/project disagreement');
  // Independently check static previews against trusted local generator; the
  // HTML, CSS and review portal in the ZIP are never rendered or evaluated.
  for(const route of [
   ['home','preview/index.html'],['services','preview/services/index.html'],
   ['approach','preview/approach/index.html'],['contact','preview/contact/index.html']
  ]){
   const page=site.pages.find(p=>p.id==='df-page-'+route[0]);
   if(!page||files[route[1]]!==engine.preview.pageHtml(site,page,project.theme,project.language))
    fail('Static preview differs from verified CMS: '+route[1]);
  }
  if(files['preview/assets/preview.css']!==engine.preview.css(project.theme))
   fail('Preview CSS does not match selected theme');
  const info=parse('preview/preview-info.json');
  if(info.format!=='manufact-design-factory-static-preview-v1'||info.version!==1||
     info.pages!==4||info.productionReady!==false||
     info.kit!==project.kit||info.theme!==project.theme||
     info.language!==project.language)fail('Preview info not consistent');
  const compiled={site:bundle.site,checklist:bundle.ownerChecklist,
   inspection:bundle.inspection,designSpec:bundle.designSpec,
   bridge:bundle.compatibility.composition};
  const context=feedbackTool.context(compiled,project,w.composition);
  if(info.reviewContext!==context)fail('Preview review context differs');
  if(files['preview/review.html']!==feedbackTool.reviewHtml(context,project.language))
   fail('Review portal differs from verified project');
  const feedbackData=parse('client/feedback.json');
  let feedback=null;
  if(manifest.feedback==='matching-included'){
   feedback=feedbackTool.validate(feedbackData,context);
  }else if(['stale-excluded','not-loaded'].includes(manifest.feedback)){
   obj(feedbackData,['format','version','status','note'],'feedback marker');
   if(feedbackData.format!=='manufact-design-factory-delivery-feedback-status-v1'||
      feedbackData.version!==1||feedbackData.status!==manifest.feedback)
    fail('Feedback marker mismatch');
  }else fail('Unrecognized feedback disposition');
  // Existing owner confirmation is historical; never let a restored ZIP
  // authorize indexing on a new editing session.
  const restored={...w,project:{...w.project,ownerReviewConfirmed:false}};
  const safe=engine.bridge.workspace(restored);
  const safeBundle=engine.bridge.build(safe);
  if(safeBundle.ownerChecklist.readyForPublish||safeBundle.site.pages.some(p=>p.seo.robots!=='noindex'))
   fail('Restored workspace unexpectedly indexable');
  return Object.freeze({
   workspace:safe,feedback,sourceHadOwnerApproval:project.ownerReviewConfirmed,
   inspection:read.inspection,verifiedCMSPages:site.pages.length,
   originalIndexing:bundle.ownerChecklist.indexing,
   restoredIndexing:safeBundle.ownerChecklist.indexing
  });
 }
 return Object.freeze({restore});
});
