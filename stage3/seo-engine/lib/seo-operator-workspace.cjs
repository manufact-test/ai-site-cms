'use strict';
/* One offline private operator workspace for first launch and post-launch SEO.
 * Reuses existing verified-shape cockpit renderers without changing CMS/runtime.
 */
const LAUNCH=require('./first-site-launch-cockpit.cjs');
const SEARCH=require('./search-ops-dashboard.cjs');
const INDEX=require('./search-indexing-view.cjs');
const HUMAN=require('./first-site-live-acceptance-view.cjs');
const ACTIONS=require('./first-site-live-followup-view.cjs');
const FORMAT='manufact-seo-operator-workspace-v1';
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function build(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||
  !input.firstSite&&!input.search&&!input.indexing)throw Error('Operator workspace needs launch, search or indexing report inputs');
 const first=input.firstSite||null,search=input.search||null,indexing=input.indexing||null;
 const human=input.liveAcceptance||null,desk=input.operatorDesk||null;
 if(desk&&desk.href!=='../live-acceptance-template/LIVE-ACCEPTANCE-DESK.html')
  throw Error('Unexpected private operator desk link');
 if(human&&(!first?.summary||!first.postDeploy||!human.report||!human.contract))
  throw Error('Human acceptance needs a first-site source, public post-deploy report and exact original lead contract');
 if(first&&!first.summary||search&&!search.history)throw Error('Operator workspace input missing report source');
 const launch=first?LAUNCH.render(first.summary,first.bundle||null,first.postDeploy||null,
  first.operatorReview||null,first.summarySha):null;
 const visibility=search?SEARCH.render(search.history,search.historySha,search.decisions||null,search.releases||null):null;
 const indexed=indexing?INDEX.render(indexing):null;
 const manual=human?HUMAN.render(human.report,human.contract,human.contractSha,first,
  first.summarySha,first.postDeploySha):null;
 const queue=manual?ACTIONS.render(human.report,{summary:first.summary,
  bundle:first.bundle,postDeploy:first.postDeploy}):null;
 const siteId=launch?.siteId||visibility?.summary.siteId||indexed?.summary.siteId||manual?.siteId;
 if([launch?.siteId,visibility?.summary.siteId,indexed?.summary.siteId,manual?.siteId].filter(Boolean).some(x=>x!==siteId))
  throw Error('Cannot combine launch, search and indexing evidence from different customer sites');
 if(indexed&&visibility&&indexing.blueprintSha256!==search.history.blueprintSha256)
  throw Error('Search History and URL Indexing reports need the same approved Blueprint bytes');
 const sections=[
  ...(desk?[{href:desk.href,name:'Fill browser and form acceptance',
   sub:'Private offline operator editor, then run human-review session with exported JSON',
   state:'MANUAL ACTION REQUIRED',kind:'desk'}]:[]),
  ...(launch?[{href:'launch.html',name:'First Site Launch Cockpit',
   sub:'First-release technical blockers, PHP/static evidence, public HTTPS observations and mandatory human checks',
   state:launch.disposition,kind:'launch',counts:launch.summary}]:[]),
  ...(visibility?[{href:'search.html',name:'Search Operations Dashboard',
   sub:'Search Console periods, private editorial tasks, page trends and optional owner-declared release follow-up',
   state:'OBSERVATIONAL SEO DATA — HUMAN REVIEW',kind:'search',counts:visibility.summary}]:[]),
  ...(indexed?[{href:'indexing.html',name:'URL Indexing Intelligence',
   sub:'Approved Blueprint robots, operator-supplied indexed/excluded URL observations and manual indexability checks',
   state:'INDEX STATUS — OPERATOR REPORTED',kind:'indexing',counts:indexed.summary}]:[]),
  ...(queue?[{href:'next-actions.html',name:'Fixes and missing evidence',
   sub:'P0/P1 route-specific work queue, owners, receipts needed and independent final signoff',
   state:queue.summary.urgent+' urgent · '+queue.summary.pending+' pending',kind:'actions'}]:[]),
  ...(manual?[{href:'human.html',name:'Real-World Human Acceptance',
   sub:'Source-bound browser/page/device and actual form POST operator attestations; never an automatic release approval',
   state:manual.status,kind:'human',counts:manual.summary}]:[])
 ];
 const next=[
  ...(desk?['Open the private editor card, inspect real browser and authorized POST/delivery, export JSON and run human-review.']:[]),
  ...(launch?.summary.blockingGates?['Resolve '+launch.summary.blockingGates+
   ' original first-site technical gate(s) using the real PHP/CMS and first-site-check runbook.']:[]),
  ...(launch&&!first.postDeploy?['Only the lead may publish the site; then collect actual public HTTPS/media evidence and run post-deploy verification.']:[]),
  ...(launch&&first.postDeploy?['Independently verify published host provenance and complete three-device, POST/notification and client signoff checks.']:[]),
  ...(visibility?.summary.tasks?['Have the owner/editor review '+visibility.summary.tasks+
   ' observed SEO task(s); no copy or CMS change is automatically authorized.']:[]),
  ...(indexed?.summary.actions?['Inspect '+indexed.summary.actions+' indexing anomaly or mapping prompt(s) manually in live URL Inspection.']:[]),
  ...(queue?[queue.summary.urgent+' urgent and '+queue.summary.pending+
   ' pending specific actions: open next-actions.html to assign fixes and gather new source-bound evidence.']:[]),
  ...(manual?['Review original private human/browser/form evidence independently; operator checkmarks do not prove a real authenticated customer signoff.']:[]),
  ...(launch&&!visibility?['After launch and real Search Console data accumulation, add the private Search History to this workspace.']:[]),
  ...(!launch&&visibility?['For first-site technical acceptance add the existing first-site-check summary and optional post-deploy evidence.']:[])
 ];
 const cards=sections.map(s=>'<a class="card" href="'+s.href+'"><div class="kicker">'+
  (s.kind==='desk'?'OPERATOR ACTION':s.kind==='launch'?'LAUNCH OPERATIONS':s.kind==='indexing'?'URL INDEXING':s.kind==='human'?'HUMAN ACCEPTANCE':s.kind==='actions'?'P0 / P1 QUEUE':'POST-LAUNCH SEARCH')+'</div><h2>'+esc(s.name)+'</h2>'+
  '<p>'+esc(s.sub)+'</p><span class="state">'+esc(s.state)+'</span><span class="go">Open private report →</span></a>').join('');
 const css=[
 ':root{--back:#f3f7fa;--ink:#172f45;--muted:#5c7182;--line:#dbe5eb}',
 '*{box-sizing:border-box}body{margin:0;font:15px/1.65 system-ui,Segoe UI,Arial,sans-serif;background:var(--back);color:var(--ink)}',
 'main{max-width:1150px;margin:auto;padding:28px 22px 85px}.hero{border-radius:25px;background:linear-gradient(128deg,#102b41,#145f70);color:white;padding:39px}',
 '.eyebrow{font-weight:800;color:#9fdfd7;letter-spacing:.13em;text-transform:uppercase;font-size:12px}.hero h1{font-size:clamp(26px,4vw,42px);letter-spacing:-.035em;line-height:1.2;margin:12px 0}',
 '.hero p{color:#d4e8e9;max-width:850px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:19px}',
 '.card{display:flex;flex-direction:column;background:white;border-radius:19px;border:1px solid var(--line);padding:26px;text-decoration:none;color:inherit;min-height:278px;box-shadow:0 9px 24px #183a560a}',
 '.card:hover,.card:focus-visible{border-color:#158e82;outline:2px solid #158e82;outline-offset:2px}',
 '.kicker{font-size:12px;letter-spacing:.1em;font-weight:800;color:#127c74}.card h2{font-size:22px;line-height:1.25;margin:13px 0 7px}.card p{color:var(--muted);margin:0 0 13px}',
 '.state{font-size:11px;font-weight:700;color:#895c1d;background:#fff4d7;padding:5px 9px;border-radius:11px;align-self:start}',
 '.go{margin-top:auto;padding-top:19px;color:#0d746b;font-weight:750}.panel{background:white;border:1px solid var(--line);border-radius:17px;padding:27px;margin-top:18px}',
 '.panel h2{margin:0 0 12px}.panel li{margin:11px 0}.notice{border-left:3px solid #177b75;background:#edf7f6;padding:13px;margin-top:15px;color:#355f64}',
 'footer{color:var(--muted);font-size:12px;padding:24px 3px}',
 '@media(max-width:700px){main{padding:13px}.hero{padding:23px}.grid{grid-template-columns:1fr}.panel{padding:20px}}',
 '@media print{body{background:white}.hero{background:white;color:black;border:1px solid #ddd}.hero p,.eyebrow{color:#444}.card{box-shadow:none}}'
 ].join('');
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
  '<title>MANUFACT — Private Client SEO Workspace</title><style>'+css+'</style></head><body><main>'+
  '<header class="hero"><div class="eyebrow">MANUFACT · OWNER-ONLY OPERATIONS</div><h1>Client SEO Workspace</h1>'+
  '<p>Site: '+esc(siteId)+'. Local technical acceptance and post-launch search observations in one private workspace.</p>'+
  '<p>All source records are operator supplied. This is not a connected CMS application, client approval or public deployment.</p></header>'+
  '<div class="grid">'+cards+'</div><section class="panel"><h2>Recommended next manual steps</h2><ol>'+
  next.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+
  '<p class="notice">No automated publication, SEO content edits, verification of Google property ownership, real form delivery or client signoff.</p></section>'+
  '<footer>Private local report bundle · No network calls · Input hashes recorded separately · Do not upload or commit.</footer></main></body></html>';
 return {format:FORMAT,readOnly:true,siteId,homeHtml:html,launchHtml:launch?.html||null,
  searchHtml:visibility?.html||null,indexingHtml:indexed?.html||null,
  humanHtml:manual?.html||null,nextActionsHtml:queue?.html||null,
  overview:{nextActionsIncluded:!!queue,
   nextActionsUrgent:queue?.summary.urgent??null,nextActionsPending:queue?.summary.pending??null,
   operatorDeskIncluded:!!desk,launchIncluded:!!launch,searchIncluded:!!visibility,indexingIncluded:!!indexed,
   humanAcceptanceIncluded:!!manual,humanAcceptanceStatus:manual?.status??null,
   indexingActionCount:indexed?.summary.actions??null,
   technicalBlockers:launch?.summary.blockingGates??null,
   postDeploySupplied:launch?.summary.postDeployEvidenceSupplied??false,
   searchActionCount:visibility?.summary.tasks??null,
   releaseAuthorized:false,clientApprovalAuthenticated:false},
  limitations:['All modules read operator-supplied evidence only.',
   'Reports are private local HTML, NEVER customer static-site exports.',
   'Manual work remains with lead; no CMS Save/Publish, PR, merge, deploy or form testing.']};
}
module.exports=Object.freeze({FORMAT,build});
