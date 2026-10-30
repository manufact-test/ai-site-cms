'use strict';
/* Offline-only browser worksheet. Strict source-pinned Node review remains authoritative.
 * The desk never authenticates owner approval, Google status or CMS publication.
 */
const crypto=require('node:crypto');
const LIFE=require('./crawl-cms-lifecycle.cjs');
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(report,sha256){
 const template=LIFE.template(report,sha256);
 if(report.actions.length>1200)throw Error('Offline Crawl CMS worksheet too large');
 const payload=JSON.stringify({template,actions:report.actions.map(a=>({
  taskId:a.taskId,priority:a.priority,pageId:a.pageId,path:a.path,
  category:a.category,ownerTeam:a.ownerTeam,detail:a.detail,
  evidenceRequired:a.evidenceRequired,leadAction:a.leadAction
 }))}).replace(/&/g,'\\u0026').replace(/</g,'\\u003c')
 .replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const script='('+start.toString()+')();';
 const digest=crypto.createHash('sha256').update(script).digest('base64');
 const css=[
 '*{box-sizing:border-box}body{margin:0;background:#f2f7f9;color:#1d3b4d;font:14px/1.55 system-ui,Arial,sans-serif}',
 'main{max-width:1200px;margin:auto;padding:21px 18px 90px}',
 'header{background:linear-gradient(118deg,#14344c,#136f71);color:white;padding:30px;border-radius:22px}',
 'header h1{margin:8px 0 11px;font-size:clamp(25px,4vw,36px);line-height:1.17}',
 'header p{color:#d6ebec;margin:9px 0}section{margin-top:20px;padding:22px;border-radius:18px;border:1px solid #dee9ed;background:white}',
 'h2{margin:0 0 10px}.notice{border-left:4px solid #ba673b;background:#fff3e5;padding:13px;border-radius:8px}',
 '.toolbar{display:flex;gap:9px;flex-wrap:wrap;margin:15px 0}',
 '.btn,.upload{border:0;border-radius:10px;background:#126d70;color:white;font:inherit;font-weight:700;padding:11px 14px;cursor:pointer}',
 '.secondary,.upload{background:#3f6371}.upload input{display:none}',
 '.filters{display:grid;grid-template-columns:2fr 1fr 1fr;gap:11px}',
 'label.field{display:flex;flex-direction:column;gap:5px;font-weight:650;font-size:12px}',
 'input,select,textarea{width:100%;background:white;color:#1b3845;font:inherit;padding:10px;border:1px solid #b7cbd3;border-radius:9px}',
 'textarea{min-height:85px;resize:vertical}',
 'input:focus-visible,select:focus-visible,textarea:focus-visible,button:focus-visible{outline:2px solid #178d83;outline-offset:3px}',
 '.counts{display:flex;gap:10px;flex-wrap:wrap;margin-top:15px}',
 '.count{background:#edf5f6;border-radius:10px;padding:10px 16px;font-size:12px}.count strong{display:block;font-size:25px}',
 '.card{border:1px solid #dce7eb;border-left:5px solid #8ba6b1;border-radius:12px;margin-top:12px;overflow:hidden}',
 '.card.p0{border-left-color:#b85a4b}.card.p1{border-left-color:#bb8b3c}.card.p2{border-left-color:#398e85}',
 '.card[hidden]{display:none}.card summary{cursor:pointer;padding:14px 16px;display:flex;align-items:center;gap:10px;overflow-wrap:anywhere}',
 '.card summary strong{flex:1}.pill{font-size:11px;border-radius:10px;padding:3px 7px;background:#e7f1f2;font-weight:700}',
 '.body{padding:0 16px 18px}.body p{margin:8px 0}.fields{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px}',
 '.wide{grid-column:1/-1}.muted{color:#587180}.issues{color:#963e31}.issues button{border:0;background:transparent;text-decoration:underline;color:#963e31;text-align:left;cursor:pointer}',
 '.hash{overflow-wrap:anywhere;font:12px/1.8 monospace}.status{font-weight:700;color:#116b61}',
 '@media(max-width:760px){main{padding:10px}.filters,.fields{grid-template-columns:1fr}.wide{grid-column:auto}header,section{padding:17px}.card summary{align-items:flex-start}}'
 ].join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;; object-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; script-src &#39;sha256-'+digest+'&#39;">'+
  '<title>MANUFACT — Private crawl/CMS human task review</title><style>'+css+'</style></head><body><main>'+
  '<header><div>MANUFACT · PRIVATE OFFLINE HUMAN DECISION DESK</div><h1>Crawl & CMS — Task Decision Desk</h1>'+
  '<p>Site '+esc(report.siteId)+' · '+report.actions.length+' source-bound tasks</p>'+
  '<p>No client signoff, authenticated current Site v1, live Google URL result, CMS Save/Publish or hosting release is established here.</p></header>'+
  '<section><h2>Record task status and private evidence</h2>'+
  '<p class="notice">This worksheet is an <b>operator assertion</b>. Do not enter secrets, customer PII, raw request bodies or passwords. Exported records MUST be rechecked using the original private report and strict Node comparison before any decision is considered.</p>'+
  '<div class="toolbar"><button class="btn secondary" type="button" id="draft">Download unfinished private draft</button>'+
  '<button class="btn" type="button" id="export">Validate and export ledger</button>'+
  '<label class="upload">Import same-source draft<input id="import" type="file" accept=".json,application/json"></label></div>'+
  '<p role="status" aria-live="polite" id="message" class="status"></p>'+
  '<div id="counts" class="counts"></div>'+
  '<div class="filters"><label class="field">Search source task<input id="search" type="search" placeholder="e.g. page-contact or robots"></label>'+
  '<label class="field">Priority<select id="priority"><option value="all">All</option><option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option></select></label>'+
  '<label class="field">Human status<select id="status"><option value="all">All states</option><option value="unreviewed">Unreviewed</option><option value="accepted">Accepted</option><option value="in-progress">In progress</option><option value="completed-reported">Completed reported</option><option value="deferred">Deferred</option><option value="rejected">Rejected</option></select></label></div>'+
  '<p class="muted" id="visible"></p></section>'+
  '<section><h2>Validation before export</h2><ul class="issues" id="issues"></ul></section>'+
  '<section><h2>Source-anchored work items</h2><div id="tasks"></div></section>'+
  '<section><h2>Source binding & usage</h2><p>Original worklist raw SHA256:</p><p class="hash">'+sha256+'</p>'+
  '<p>Only when ready: download the ledger JSON, place it in your private directory and run the offline <code>recheck-crawl-cms-work.cjs</code> or build the next SEO Operator Workspace with <code>crawl.cmsBaseline</code> and <code>crawl.cmsDecisions</code>. Use a newly generated ledger for the next reporting cycle; human decisions cannot be carried over automatically.</p>'+
  '<p class="notice">A selected <b>completed-reported</b> means a person claims work was done. It NEVER means this tool verified actual public deployment, Search Console or the owner.</p></section>'+
  '<script type="application/json" id="data">'+payload+'</script><script>'+script+'</script></main></body></html>';
}
function start(){
 'use strict';
 const $=id=>document.getElementById(id);
 const clone=x=>JSON.parse(JSON.stringify(x));
 const seed=JSON.parse($('data').textContent);
 const OPTIONS=['unreviewed','accepted','in-progress','completed-reported','deferred','rejected'];
 let state=clone(seed.template),cards=[],readers=[];
 const make=(tag,t,cl)=>{
  const el=document.createElement(tag);
  if(t!==undefined)el.textContent=String(t);
  if(cl)el.className=cl;
  return el;
 };
 const field=(area,title,type,value,wide=false)=>{
  const wrap=make('label',undefined,'field'+(wide?' wide':''));
  wrap.append(make('span',title));
  const node=make(type==='textarea'?'textarea':'input');
  if(type!=='textarea')node.type=type;
  node.value=value||'';
  node.addEventListener('input',refresh);
  wrap.append(node);area.append(wrap);return node;
 };
 const select=(area,title,options,value)=>{
  const wrap=make('label',undefined,'field'),node=make('select');
  wrap.append(make('span',title));
  for(const key of options){const o=make('option',key);o.value=key;node.append(o);}
  node.value=value;node.addEventListener('change',refresh);
  wrap.append(node);area.append(wrap);return node;
 };
 function renderForm(ledger){
  $('tasks').replaceChildren();cards=[];readers=[];
  seed.actions.forEach((task,i)=>{
   const value=ledger.decisions[i],details=make('details',undefined,'card '+task.priority.toLowerCase());
   const summary=make('summary');
   const pill=make('span',value.status,'pill');
   summary.append(make('span',task.priority,'pill'),make('strong',task.category+' · '+(task.path||'site')),
    pill);
   details.append(summary);
   const body=make('div',undefined,'body');
   body.append(make('p','Task ID: '+task.taskId),
    make('p','Workstream: '+task.ownerTeam+' · Page: '+(task.pageId||'site')),
    make('p','Observation: '+task.detail),
    make('p','Manual lead step: '+task.leadAction),
    make('p','Evidence expected: '+task.evidenceRequired.join(' / ')));
   const grid=make('div',undefined,'fields');
   const status=select(grid,'Operator assertion',OPTIONS,value.status);
   const assignee=field(grid,'Assignee','text',value.assignee);
   const date=field(grid,'Review date','date',value.decisionDate);
   const rationale=field(grid,'Decision rationale','textarea',value.rationale,true);
   const description=field(grid,'Manual change (needed if completed reported)','textarea',value.manualChangeDescription,true);
   const refs=field(grid,'Private evidence refs (one per line)','textarea',value.evidenceRefs.join('\n'),true);
   body.append(grid);details.append(body);$('tasks').append(details);
   const get=()=>({...value,status:status.value,assignee:assignee.value,
    decisionDate:date.value||null,rationale:rationale.value,
    manualChangeDescription:description.value,
    evidenceRefs:refs.value.split('\n').map(x=>x.trim()).filter(Boolean)});
   cards.push({details,pill,task,read:get});
   readers.push(get);
  });
  refresh();
 }
 const assembled=()=>({...seed.template,decisions:readers.map(x=>x())});
 const validDate=x=>typeof x==='string'&&/^\d{4}-\d\d-\d\d$/.test(x)&&
  !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
 function problems(ledger){
  const issues=[];
  ledger.decisions.forEach((d,i)=>{
   if(!OPTIONS.includes(d.status)||d.assignee.length>150||d.rationale.length>1200||
    d.manualChangeDescription.length>1200||d.evidenceRefs.length>16||
    d.evidenceRefs.some(x=>x.length>400||/[\x00-\x1f]/.test(x))){
    issues.push({i,msg:'Invalid text length, evidence reference or state'});return;
   }
   if(d.status==='unreviewed'){
    if(d.assignee||d.rationale||d.decisionDate||d.manualChangeDescription||d.evidenceRefs.length)
     issues.push({i,msg:'Unreviewed entries must remain empty'});
   }else{
    if(!d.assignee.trim()||!d.rationale.trim()||!validDate(d.decisionDate))
     issues.push({i,msg:'A reviewed task needs assignee, rationale and valid YYYY-MM-DD date'});
    if(d.status==='completed-reported'&&
     (!d.manualChangeDescription.trim()||!d.evidenceRefs.length))
     issues.push({i,msg:'Reported completion needs manual change description and private evidence reference'});
   }
  });
  return issues;
 }
 function filter(){
  const q=$('search').value.trim().toLowerCase(),
   pri=$('priority').value,status=$('status').value;let visible=0;
  cards.forEach(({details,pill,task,read})=>{
   const s=read().status;
   pill.textContent=s;
   const ok=(pri==='all'||pri===task.priority)&&(status==='all'||status===s)&&
    (!q||[task.taskId,task.path||'',task.category,task.ownerTeam,task.detail]
     .join(' ').toLowerCase().includes(q));
   details.hidden=!ok;if(ok)visible++;
  });
  $('visible').textContent=visible+' of '+cards.length+' tasks shown';
 }
 function refresh(){
  const ledger=assembled(),errors=problems(ledger);
  $('issues').replaceChildren();
  if(!errors.length)$('issues').append(make('li','Local fields look complete; original-source Node verification is still required.'));
  else errors.slice(0,25).forEach(e=>{
   const li=make('li'),b=make('button',seed.actions[e.i].taskId+': '+e.msg);
   b.type='button';
   b.addEventListener('click',()=>{
    $('search').value='';$('priority').value='all';$('status').value='all';filter();
    cards[e.i].details.open=true;cards[e.i].details.scrollIntoView({block:'center'});
   });
   li.append(b);$('issues').append(li);
  });
  $('counts').replaceChildren();
  for(const opt of OPTIONS){
   const box=make('div',undefined,'count');
   box.append(make('small',opt.toUpperCase()),make('strong',
    ledger.decisions.filter(x=>x.status===opt).length));
   $('counts').append(box);
  }
  filter();
 }
 const sameSource=x=>{
  if(!x||typeof x!=='object'||Array.isArray(x)||
   Object.keys(x).sort().join('|')!==Object.keys(seed.template).sort().join('|')||
   x.format!==seed.template.format||x.version!==seed.template.version||
   x.siteId!==seed.template.siteId||x.base!==seed.template.base||
   x.sourceWorklistRawSha256!==seed.template.sourceWorklistRawSha256||
   x.approvedBlueprintCanonicalSha256!==seed.template.approvedBlueprintCanonicalSha256||
   x.sourceOriginalSiteRawSha256!==seed.template.sourceOriginalSiteRawSha256||
   !Array.isArray(x.decisions)||x.decisions.length!==seed.actions.length)return false;
  return x.decisions.every((d,i)=>{
   const orig=seed.template.decisions[i];
   return d&&typeof d==='object'&&!Array.isArray(d)&&
    Object.keys(d).sort().join('|')===Object.keys(orig).sort().join('|')&&
    d.taskId===orig.taskId&&d.pageId===orig.pageId&&d.path===orig.path&&
    d.category===orig.category&&d.priority===orig.priority&&d.ownerTeam===orig.ownerTeam&&
    d.claimedPublicVerified===false&&d.claimedOwnerSignedOff===false&&
    OPTIONS.includes(d.status)&&typeof d.assignee==='string'&&
    typeof d.rationale==='string'&&typeof d.manualChangeDescription==='string'&&
    (d.decisionDate===null||typeof d.decisionDate==='string')&&
    Array.isArray(d.evidenceRefs)&&d.evidenceRefs.every(e=>typeof e==='string');
  });
 };
 const download=(draft)=>{
  const data=assembled();
  if(!sameSource(data)){$('message').textContent='Refused: source identity changed';return;}
  const issues=problems(data);
  if(!draft&&issues.length){
   $('message').textContent='Complete '+issues.length+' invalid entries before verified-format export.';
   return;
  }
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],
   {type:'application/json'}));
  const link=make('a');link.href=url;
  link.download='crawl-cms-decisions-'+(draft?'draft-':'')+seed.template.siteId+'.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  $('message').textContent=draft?'Private human draft downloaded; NOT approved.':
   'JSON exported for strict original source-bound Node review. NOT an authorized release.';
 };
 $('draft').addEventListener('click',()=>download(true));
 $('export').addEventListener('click',()=>download(false));
 for(const id of ['search','priority','status'])
  $(id).addEventListener(id==='search'?'input':'change',filter);
 $('import').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
   if(file.size>2000000)throw Error('Draft exceeds local safety limit');
   const data=JSON.parse(await file.text());
   if(!sameSource(data))throw Error('Different site, period, task order or original bytes');
   state=clone(data);renderForm(state);
   $('message').textContent='Same-source draft restored; no owner approval or public fix authenticated.';
  }catch(e){$('message').textContent='Import refused: '+e.message;}
  event.target.value='';
 });
 renderForm(state);
}
module.exports=Object.freeze({render});
