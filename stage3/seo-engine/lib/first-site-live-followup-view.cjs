'use strict';
/* Source-derived, non-authorizing private HTML for the lead's real acceptance work queue.
 * No operator receipt refs, customer input, HTTP results or execution actions appear here.
 */
const FOLLOW=require('./first-site-live-followup.cjs');
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(review,context=null){
 const plan=FOLLOW.build(review);
 let technical=null;
 if(context){
  const {summary,bundle,postDeploy}=context,src=summary?.release?.blockerIds,
   blockers=bundle?.release?.blockers,publicReasons=postDeploy?.postDeployBlockingReasons;
  if(summary?.siteId!==plan.siteId||summary.publishedVersion!==plan.publishedVersion||
   summary.ownerPublishedSourceRevisionClaim!==plan.ownerSourceRevisionClaim||
   summary.staticExport?.staticManifestSha256!==plan.officialStaticManifestSha256||
   !Array.isArray(src)||!Array.isArray(blockers)||!Array.isArray(publicReasons)||
   src.length!==blockers.length||new Set(src).size!==src.length||
   src.slice().sort().join('\n')!==blockers.map(x=>x.gateId).sort().join('\n')||
   postDeploy.siteId!==plan.siteId||postDeploy.publishedVersion!==plan.publishedVersion)
   throw Error('Source technical evidence and human action queue are not the same approved release');
  technical={php:src.map(id=>({code:id,description:
   blockers.find(x=>x.gateId===id)?.reason||
   blockers.find(x=>x.gateId===id)?.message||'Resolve original PHP gate.'})),
   public:publicReasons.map(x=>({code:x.code,description:x.reason||'Resolve public HTTPS mismatch.'}))};
 }
 const limited=x=>esc(String(x??'').slice(0,380));
 const stats=[['Urgent fixes',plan.counts.urgent],['Pending tasks',plan.counts.pending],
  ['Browser views',plan.counts.browser],['Manual gates',plan.counts.manual],
  ['Real forms',plan.counts.form]];
 const technicalHtml=technical?'<section class="panel"><div class="sectionhead"><h2>Original PHP and live HTTPS blockers</h2><span class="count">'+
  (technical.php.length+technical.public.length)+'</span></div>'+
  '<p class="muted">Exact gate identifiers and source-reported reasons, not independently authenticated live faults. Compare with <a href="launch.html">technical launch report</a> before editing.</p>'+
  (technical.php.length?'<h3>Original PHP / static blockers</h3><ul>'+
   technical.php.map(x=>'<li><b>'+limited(x.code)+'</b> · '+limited(x.description)+'</li>').join('')+'</ul>':'')+
  (technical.public.length?'<h3>Published HTTPS / media blockers</h3><ul>'+
   technical.public.map(x=>'<li><b>'+limited(x.code)+'</b> · '+limited(x.description)+'</li>').join('')+'</ul>':'')+
  (!technical.php.length&&!technical.public.length?
   '<p>No exact technical gate codes in this original source; operator authorization may still be missing.</p>':'')+
  '</section>':'';
 const group=(priority,label,lead)=>'<section class="panel"><div class="sectionhead">'+
   '<h2>'+esc(label)+'</h2><span class="count">'+plan.actions.filter(x=>x.priority===priority).length+'</span></div>'+
   '<p class="muted">'+esc(lead)+'</p>'+
   (plan.actions.filter(x=>x.priority===priority).map(a=>'<details class="workitem '+(priority==='P0'?'urgent':'pending')+'">'+
    '<summary><span class="priority">'+esc(a.priority)+'</span><span class="itemname">'+
     esc(a.sourceKind==='form'?'Lead form · '+a.page+' #'+a.sectionId:
      a.sourceKind==='browser'?'Page · '+a.page+' · '+a.viewport:
      a.sourceKind==='manual'?'Manual signoff · '+a.id:
      a.sourceKind==='technical'?'Technical release blockers':'Independent owner authorization')+'</span>'+
     '<span class="state">'+esc(a.observationState)+'</span></summary>'+
    '<div class="inner"><p><b>Required work</b><span>'+esc(a.detail)+'</span></p>'+
    '<p><b>Responsible</b><span>'+esc(a.owner)+'</span></p>'+
    '<p><b>New evidence needed</b><span>'+esc(a.nextEvidence)+'</span></p>'+
    '<small>Source ID: '+esc(a.id)+'</small></div></details>').join('')||
    '<p class="complete">No outstanding '+esc(priority)+' checks in the operator report.</p>')+
   '</section>';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT Private SEO — Acceptance Action Queue</title>'+
  '<style>*{box-sizing:border-box}body{margin:0;font:15px/1.55 system-ui,Arial,sans-serif;background:#f2f6f8;color:#193847}main{max-width:1080px;margin:auto;padding:22px 18px 80px}header{padding:28px;background:linear-gradient(125deg,#173744,#1a5660);color:white;border-radius:20px}h1{font-size:clamp(23px,4vw,34px);margin:4px 0 8px}header p{color:#cde3e4;margin:4px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(138px,1fr));gap:10px;margin:17px 0}.stat{background:white;padding:16px;border:1px solid #dce6ea;border-radius:13px}.stat b{display:block;font-size:28px}.stat small,.muted{color:#5c7180}.panel{background:white;border:1px solid #dce6ea;border-radius:17px;padding:22px;margin-top:17px}.sectionhead{display:flex;gap:12px;align-items:center}.sectionhead h2{margin:0}.count{background:#e9f0f2;padding:3px 12px;border-radius:100px;font-weight:800}.workitem{margin-top:10px;border:1px solid #dce6ea;border-left:5px solid #e2a941;border-radius:11px;background:#fffdf9;overflow:hidden}.workitem.urgent{border-left-color:#bb5046;background:#fff9f8}summary{display:flex;align-items:center;gap:13px;cursor:pointer;padding:15px;overflow-wrap:anywhere}.priority{font-size:12px;font-weight:800;background:#e9eff2;border-radius:6px;padding:4px 7px}.itemname{flex:1;font-weight:700;min-width:0}.state{font-size:12px;color:#667883;overflow-wrap:anywhere}.inner{padding:0 17px 18px}.inner p{display:grid;grid-template-columns:145px 1fr;gap:12px}.inner small{color:#637986}.complete{color:#506c73}.warning{padding:14px 16px;border-left:4px solid #bd7d36;background:#fff8e8;border-radius:8px}.links{display:flex;flex-wrap:wrap;gap:16px;margin:19px 0}a{color:#0b6d67;font-weight:750;text-decoration:none}a:hover{text-decoration:underline}@media(max-width:600px){main{padding:12px}header,.panel{padding:17px}.inner p{grid-template-columns:1fr;gap:4px}summary{gap:8px}.state{display:none}}</style></head><body><main>'+
  '<header><p>MANUFACT · LOCAL OPERATOR ACTIONS · NO NETWORK</p><h1>First-Site Acceptance: What Remains</h1>'+
  '<p>Site: '+esc(plan.siteId)+' · published version: '+esc(plan.publishedVersion)+'</p>'+
  '<p>Operator evidence status: '+esc(plan.reviewStatus)+'</p></header>'+
  '<div class="links"><a href="index.html">← Workspace home</a>'+
   '<a href="human.html">Human evidence summary</a></div>'+
  '<div class="grid">'+stats.map(([name,value])=>
   '<div class="stat"><small>'+esc(name)+'</small><b>'+esc(value)+'</b></div>').join('')+'</div>'+
  '<p class="warning"><b>No release permission.</b> Operator checkmarks are not verified browser recordings, actual form delivery or authenticated client signoff. The lead must independently verify original private evidence.</p>'+
  technicalHtml+group('P0','Fix now — observed failures','Observed technical, browser, manual or form failures need correction and fresh evidence.')+
  group('P1','Complete — missing evidence and approvals','Pending observations and final independent owner authorization remain required even after every operator claim passes.')+
  '<section class="panel"><h2>Release identity</h2><p>Official static manifest SHA256: <code>'+
    esc(plan.officialStaticManifestSha256)+'</code></p><p>Original source contract SHA256: <code>'+
    esc(plan.sourceContractSha256)+'</code></p><p>Owner/source revision claim: '+
    esc(plan.ownerSourceRevisionClaim)+'</p><p>Never copy client evidence or this private report into the public site ZIP, GitHub or shared hosting.</p></section>'+
  '</main></body></html>';
 return Object.freeze({siteId:plan.siteId,html,summary:{...plan.counts,
  sourcePhpGateDetails:technical?.php.length??null,
  sourcePublicReasonDetails:technical?.public.length??null},
  releaseAuthorized:false,clientApprovalAuthenticated:false});
}
module.exports=Object.freeze({render});