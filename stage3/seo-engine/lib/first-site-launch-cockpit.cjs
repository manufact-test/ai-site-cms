'use strict';
/* Read-only first client launch cockpit over existing verified SEO report shapes.
 * Never emits a GO decision, deployment action or client acceptance.
 */
const FIRST='manufact-seo-first-site-check-v1',BUNDLE='manufact-seo-review-bundle-v1';
const POST='manufact-seo-post-deploy-release-verification-v1';
const FORMAT='manufact-seo-first-site-launch-cockpit-v1',SHA=/^[0-9a-f]{64}$/;
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function validate(summary,bundle=null,post=null){
 if(summary?.format!==FIRST||typeof summary.siteId!=='string'||!SHA.test(summary.sourceSiteSha256||'')||
  summary.automaticRelease!==false||!summary.release||
  !Number.isSafeInteger(summary.release.blockingGates)||summary.release.blockingGates<0||
  !Array.isArray(summary.release.blockerIds)||
  summary.release.blockerIds.length!==summary.release.blockingGates)
  throw Error('Expected original, read-only first-site technical summary with coherent blocker counts');
 if(bundle){
  if(bundle.format!==BUNDLE||bundle.siteId!==summary.siteId||bundle.readOnly!==true||
   !Array.isArray(bundle.release?.blockers)||bundle.release.blockers.length!==summary.release.blockingGates)
   throw Error('First-site bundle and summary differ in source site or blocking gate count');
  const fromBundle=bundle.release.blockers.map(x=>x.gateId).sort();
  if(JSON.stringify(fromBundle)!==JSON.stringify(summary.release.blockerIds.slice().sort()))
   throw Error('First-site summary blocker IDs differ from original review bundle');
  if(bundle.approvedSiteSource?.fileSha256&&bundle.approvedSiteSource.fileSha256!==summary.sourceSiteSha256)
   throw Error('First-site source sealed hash differs from original bundle');
 }
 if(post){
  if(post.format!==POST||post.siteId!==summary.siteId||
   post.publishedVersion!==summary.publishedVersion||
   !SHA.test(post.officialStaticManifestSha256||'')||
   !summary.staticExport?.staticManifestSha256||
   post.officialStaticManifestSha256!==summary.staticExport.staticManifestSha256||
   !['NOT-READY','TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED'].includes(post.disposition)||
   post.finalReleaseAuthorized!==false||post.productionHostWrites!==0||
   !Array.isArray(post.postDeployBlockingReasons))
   throw Error('Post-deploy verification mismatches first-site CMS version or static export');
  if(post.disposition==='TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED'&&
    (post.postDeployBlockingReasons.length||summary.release.blockingGates>0))
   throw Error('Post-deploy pass contradicts known unresolved first-site blocking gates');
  if(post.disposition==='NOT-READY'&&!post.postDeployBlockingReasons.length)
   throw Error('Post-deploy NOT-READY must disclose its blocking reasons');
 }
 return true;
}
const presentation=[
 ['Sealed/owner CMS source','cmsPublishedSiteMatchesApprovedAfterRemap','Matching owner-saved Site v1 after import','source'],
 ['Official static export','matchingContentAndMedia','Exported content/media matching revision','staticExport'],
 ['Public HTML/redirect evidence','comparable','Official static release compared with supplied public evidence','publicStaticParity'],
 ['Original and responsive images','allCapturedByteDigestsMatch','Public media SHA-256 report','publicMediaBytes'],
 ['SEO head and canonical','actualFindings','Local PHP header observations','heads','count'],
 ['Link and page semantics','actualFindings','Actual PHP semantics observations','semantics','count'],
 ['Desktop/mobile navigation markup','actualFindings','Actual PHP navigation observations','navigation','count'],
 ['DesignGraph rendering','actualFindings','PHP DesignGraph observations','designGraph','count'],
 ['Typed components','actualFindings','PHP component observations','typedComponents','count'],
 ['Contact form markup','technicalFindings','PHP forms markup, NOT delivery','forms','count'],
 ['Publicly exposed private artifacts','publiclyExposedOperatorFiles','Observed public internal file probes','publicStaticParity','count']
];
function status(value,isCount){
 if(value===null||value===undefined)return ['NOT OBSERVED','unknown'];
 if(isCount){
  if(!Number.isSafeInteger(value)||value<0)return ['UNKNOWN','unknown'];
  return value===0?['0 findings','seen']: [value+' findings','attention'];
 }
 return value===true?['Reported matched','seen']:value===false?['Reported mismatch','attention']:['UNKNOWN','unknown'];
}
function render(summary,bundle=null,post=null){
 validate(summary,bundle,post);
 let disposition=summary.release.blockingGates>0?'BLOCKED BY FIRST-SITE GATES':
  !post?'LOCAL REVIEW — PUBLICATION NOT VERIFIED':
  post.disposition==='NOT-READY'?'POST-DEPLOY NOT READY':
  'TECHNICALLY MATCHED — MANUAL SIGNOFF REQUIRED';
 const checks=presentation.map(([name,field,caption,key,mode])=>{
  const value=key==='source'?summary[field]:summary[key]?.[field];
  const [label,tone]=status(value,mode==='count');
  return '<article class="check"><div><strong>'+esc(name)+'</strong><p>'+esc(caption)+'</p></div>'+
   '<span class="tag '+tone+'">'+esc(label)+'</span></article>';
 }).join('');
 const blockerRows=summary.release.blockerIds.map(id=>{
  const detail=bundle?.release?.blockers.find(x=>x.gateId===id);
  const description=detail?.reason||detail?.message||detail?.title||
   'Resolve this technical gate with the lead; see original private first-site review.';
  return '<li><b>'+esc(id)+'</b><p>'+esc(description)+'</p></li>';
 }).join('')||'<li>There are no technical blockers listed in this supplied first-site report. This is NOT approval to publish.</li>';
 const postRows=post?
  '<section class="panel"><h2>Post-deploy observation</h2><p class="muted">These are operator-supplied offline HTTPS receipts, not authenticated live network validation.</p>'+
  '<div class="facts">'+[
   ['Observed host',post.publishedHost],
   ['Post-deploy disposition',post.disposition],
   ['Public pages checked',post.checkedPages],
   ['Public redirects checked',post.checkedRedirects],
   ['Media SHA-256 resources matched',post.sha256MatchedAssets],
   ['Expected media resources',post.totalAssets],
   ['HTTP evidence age (minutes)',post.publicEvidenceAgeMinutes],
   ['Public capture fresh',String(post.publicEvidenceCohortFresh)],
   ['No exposed internal artifacts',''+(post.hiddenOperatorArtifactsResponded2xx===0)]
  ].map(([label,value])=>'<div><small>'+esc(label)+'</small><b>'+esc(value??'UNKNOWN')+'</b></div>').join('')+
  '</div><h3>Post-deploy blocking reasons</h3><ul>'+
  (post.postDeployBlockingReasons.map(x=>'<li><b>'+esc(x.code)+'</b> '+esc(x.reason)+'</li>').join('')||
   '<li>No blocking reasons in the supplied post-deploy report; independent signoff remains mandatory.</li>')+
  '</ul></section>':
  '<section class="panel"><h2>Post-deploy evidence absent</h2><p>The public site has not been authenticated or verified by this cockpit. Run existing post-deploy procedure only after the lead manually publishes.</p></section>';
 const manual=[
  'Verify the correct actual owner-published Site v1 revision, manual edits and saved version.',
  'Confirm real browser page content, keyboard/focus interactions and mobile/tablet/desktop rendering.',
  'Test forms through actual POST, persistence and delivery to intended email or Telegram recipients.',
  'Check HTTPS host, redirects, 404, robots, sitemap, canonical, media and private-file exposure on the live website.',
  'Review three client-approved prototypes, open visual findings and owner signoff.',
  'Document backup, rollback and final operator decision outside this read-only tool.'
 ];
 const css=[
 ':root{--ink:#193145;--muted:#587083;--line:#dce6ea;--back:#f3f7f9;--teal:#14796d}',
 '*{box-sizing:border-box}body{margin:0;background:var(--back);font:15px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;color:var(--ink)}',
 '.container{max-width:1200px;margin:0 auto;padding:22px 18px 70px}.hero{border-radius:23px;padding:33px;background:linear-gradient(120deg,#102b45,#176878);color:#fff}',
 '.eyebrow{color:#9fe3d6;font-size:12px;letter-spacing:.12em;font-weight:800;text-transform:uppercase}.hero h1{font-size:clamp(24px,4vw,38px);margin:10px 0;line-height:1.2}.hero p{color:#d5e5ea;margin:6px 0}',
 '.verdict{display:inline-block;padding:9px 14px;border:1px solid #ffffff66;border-radius:40px;margin-top:15px;font-weight:800;font-size:12px;letter-spacing:.04em}',
 '.panel{background:#fff;border:1px solid var(--line);border-radius:17px;padding:26px;margin:17px 0;box-shadow:0 7px 23px #1b456107}',
 'h2{font-size:22px;margin:0 0 12px}h3{font-size:17px;margin:18px 0 7px}.muted,.check p{color:var(--muted)}',
 '.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}.stat{background:#fff;border-radius:14px;border:1px solid var(--line);padding:17px}',
 '.stat span{color:var(--muted);display:block;font-size:12px}.stat strong{display:block;font-size:25px;line-height:1.3;margin-top:6px;overflow-wrap:anywhere}',
 '.checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.check{padding:14px;border:1px solid var(--line);border-radius:12px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start}',
 '.check strong{font-size:14px}.check p{font-size:12px;margin:3px 0}.tag{flex-shrink:0;font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px}',
 '.seen{color:#116c61;background:#e2f6f1}.attention{color:#9a3c29;background:#fff0ec}.unknown{color:#7b6423;background:#fff4cf}',
 '.facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.facts div{padding:11px;border:1px solid var(--line);border-radius:10px}.facts small{display:block;color:var(--muted)}.facts b{overflow-wrap:anywhere}',
 'ul{padding-left:22px}li{margin:9px 0}li p{color:var(--muted);margin:3px 0}.manual li{list-style:square}.notice{background:#f0f7f9;padding:12px;border-left:3px solid var(--teal)}',
 'footer{font-size:12px;color:var(--muted);padding:12px 0}@media(max-width:830px){.stats{grid-template-columns:repeat(2,1fr)}.checks{grid-template-columns:1fr}.facts{grid-template-columns:repeat(2,1fr)}}',
 '@media(max-width:510px){.container{padding:11px}.hero{padding:22px}.panel{padding:17px}.facts{grid-template-columns:1fr}.check{flex-direction:column}}',
 '@media print{body{background:#fff}.hero{background:#fff;color:#111;border:1px solid #aaa}.hero p,.eyebrow{color:#444}.panel,.stat{box-shadow:none}}'
 ].join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
 '<title>MANUFACT Private First Site Launch Cockpit</title><style>'+css+'</style></head><body>'+
 '<main class="container"><header class="hero"><div class="eyebrow">MANUFACT · PRIVATE CLIENT LAUNCH</div>'+
 '<h1>First Site Launch Cockpit</h1><p>Site: '+esc(summary.siteId)+' · CMS published version: '+esc(summary.publishedVersion??'UNKNOWN')+'</p>'+
 '<p>Sealed source SHA-256: '+esc(summary.sourceSiteSha256)+'</p><div class="verdict">'+esc(disposition)+'</div></header>'+
 '<section class="stats">'+[
  ['Technical blocking gates',summary.release.blockingGates],
  ['Manual checks still required',summary.release.mandatoryManualChecks],
  ['PHP HTML pages captured',summary.htmlPages],
  ['Static export files checked',summary.staticExport?.sha256CheckedFiles??'UNKNOWN']
 ].map(([title,value])=>'<article class="stat"><span>'+esc(title)+'</span><strong>'+esc(value)+'</strong></article>').join('')+
 '</section><section class="panel"><h2>Existing first-site technical evidence</h2>'+
 '<p class="muted">Reported match does not authenticate real live host, final CMS revision or client acceptance.</p>'+
 '<div class="checks">'+checks+'</div></section>'+
 '<section class="panel"><h2>Technical blockers from original review</h2><ul>'+blockerRows+'</ul></section>'+
 postRows+'<section class="panel"><h2>Mandatory operator acceptance</h2>'+
 '<p class="notice">The lead must perform all applicable real browser, forms, public host and owner checks. Nothing on this screen is a publish approval.</p>'+
 '<ol class="manual">'+manual.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></section>'+
 '<footer>Offline private read-only launch report · No network calls, CMS edits, PR, merge, deploy or client publication.</footer></main></body></html>';
 return {format:FORMAT,version:1,siteId:summary.siteId,readOnly:true,
  disposition,releaseAuthorized:false,html,summary:{
   blockingGates:summary.release.blockingGates,manualChecks:summary.release.mandatoryManualChecks,
   postDeployEvidenceSupplied:!!post,technicalMatchClaimed:!!post&&post.disposition==='TECHNICALLY-MATCHED-MANUAL-SIGNOFF-REQUIRED',
   actualClientSignoffVerified:false}};
}
module.exports=Object.freeze({FORMAT,validate,render});
