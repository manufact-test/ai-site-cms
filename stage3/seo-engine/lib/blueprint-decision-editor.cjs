'use strict';
/* Local-only human owner review preparation, NOT an authenticated acceptance flow.
 * The authoritative original Blueprint pair + strict Node decision CLI remain mandatory.
 */
const crypto=require('node:crypto');
const LEDGER=require('./blueprint-change-decisions.cjs');
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(report){
 const template=LEDGER.template(report);
 if(report.actions.length>1400)throw Error('Private Blueprint decision editor exceeds safe action count');
 const safe=JSON.stringify({template,actions:report.actions.map(a=>({
  id:a.id,priority:a.priority,pageId:a.pageId,owner:a.owner,reason:a.reason,
  instruction:a.instruction,evidenceNeeded:a.evidenceNeeded
 }))}).replace(/&/g,'\\u0026').replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
 .replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const script='('+start.toString()+')();';
 const sha=crypto.createHash('sha256').update(script,'utf8').digest('base64');
 const css=[
  '*{box-sizing:border-box}:root{--ink:#183649;--muted:#607684;--line:#dbe7eb;--back:#eff4f6}',
  'body{margin:0;background:var(--back);color:var(--ink);font:14px/1.55 system-ui,Arial,sans-serif}',
  'main{max-width:1150px;margin:auto;padding:20px 20px 75px}.hero{padding:28px;border-radius:20px;background:linear-gradient(120deg,#123449,#176568);color:white}',
  '.hero h1{margin:8px 0 9px;font-size:clamp(24px,4vw,36px)}.hero p{color:#d4e7e8}.kicker{font-size:11px;text-transform:uppercase;letter-spacing:.13em;font-weight:800;color:#afeadd}',
  '.toolbar{display:flex;flex-wrap:wrap;gap:9px;align-items:center;padding:14px 0}.btn,.upload{font:inherit;border:0;border-radius:9px;background:#08786b;color:white;padding:10px 13px;font-weight:750;cursor:pointer}',
  '.btn.secondary,.upload{background:#3d5e68}.btn:hover,.upload:hover{filter:brightness(.88)}.upload input{display:none}',
  '.panel{background:white;border-radius:16px;border:1px solid var(--line);padding:22px;margin:14px 0}',
  '.panel h2{margin:0 0 8px}.muted{color:var(--muted)}.alert{border-left:4px solid #c49852;background:#fff7e7;padding:12px 15px;border-radius:8px}',
  '.filters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding-top:12px}',
  'label.field{display:flex;flex-direction:column;font-size:12px;font-weight:700;gap:5px;min-width:0}',
  'input,textarea,select{font:inherit;padding:10px;border:1px solid #b9cbd3;border-radius:8px;background:white;color:var(--ink);width:100%;min-width:0}',
  'input:focus-visible,textarea:focus-visible,select:focus-visible,button:focus-visible{outline:2px solid #149786;outline-offset:2px}',
  '.stats{display:flex;gap:11px;flex-wrap:wrap;margin:13px 0}.stat{padding:12px;background:#f2f8f8;border-radius:12px;min-width:115px}.stat b{display:block;font-size:25px}.stat small{color:var(--muted)}',
  '.card{border:1px solid #dfe8eb;border-left:5px solid #9bb9ba;border-radius:12px;margin-top:12px;overflow:hidden}',
  '.card.p0{border-left-color:#b75d50}.card.p1{border-left-color:#cf9839}.card.p2{border-left-color:#3b9a85}',
  '.card[hidden]{display:none}.card summary{padding:15px;display:flex;gap:12px;align-items:center;cursor:pointer;overflow-wrap:anywhere}',
  '.card summary strong{flex:1}.pill{font-size:11px;font-weight:750;background:#e9f1f3;padding:3px 8px;border-radius:9px}.pill.fail{background:#ffefeb;color:#9e4538}',
  '.card .body{padding:0 16px 17px}.card .body p{margin:7px 0}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:13px}.wide{grid-column:1/-1}',
  '.issues{padding-left:22px}.issues li{margin:7px 0;color:#a34f39}.issue-btn{background:#fff6ef;border:1px solid #ebd2c6;color:#86442e;border-radius:8px;padding:8px 12px;font:inherit;text-align:left;cursor:pointer;width:100%}',
  '.status{font-weight:700;color:#206c65}.foot{font-size:12px;color:var(--muted)}',
  '@media(max-width:700px){main{padding:10px}.hero,.panel{padding:17px}.filters,.fields{grid-template-columns:1fr}.card summary{align-items:flex-start}}'
 ].join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;; object-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; script-src &#39;sha256-'+sha+'&#39;">'+
  '<title>MANUFACT — Private Blueprint Decision Desk</title><style>'+css+'</style></head><body><main>'+
  '<header class="hero"><div class="kicker">MANUFACT · PRIVATE OFFLINE DECISION WORKSHEET</div>'+
  '<h1>Blueprint Decision Desk</h1><p>Site: '+esc(template.siteId)+
  ' · '+report.actions.length+' source-bound owner/CMS review tasks</p>'+
  '<p>Decisions are operator records only. Even a fully accepted worksheet is NOT client authentication or permission to deploy.</p></header>'+
  '<section class="panel"><h2>Record decisions without editing JSON</h2>'+
  '<p class="alert"><b>No real approvals are verified here.</b> Never enter customer passwords, request payloads or private recipient addresses. Independently confirm actual source evidence. A selected Accept is only an operator statement.</p>'+
  '<div class="toolbar"><button id="draft" class="btn secondary" type="button">Save unfinished worksheet</button>'+
  '<button id="export" class="btn" type="button">Export for strict Node review</button>'+
  '<label class="upload">Import existing decision draft <input id="import" type="file" accept=".json,application/json"></label></div>'+
  '<p id="message" role="status" class="status"></p><div class="stats" id="stats"></div>'+
  '<div class="filters"><label class="field">Find action or page<input id="search" type="search" placeholder="e.g. canonical or page-home"></label>'+
  '<label class="field">Urgency<select id="priority"><option value="all">All priorities</option><option value="P0">P0 · critical</option><option value="P1">P1 · SEO</option><option value="P2">P2 · editorial</option></select></label>'+
  '<label class="field">Decision<select id="state"><option value="all">Every state</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="deferred">Deferred</option></select></label></div>'+
  '<p id="visible" class="muted"></p></section>'+
  '<section class="panel"><h2>Evidence entry validation</h2><p class="muted">Only completed records need reviewer, date and either evidence or a reason for rejection/deferral. Pending tasks stay empty.</p>'+
  '<ol id="problems" class="issues"></ol></section>'+
  '<section class="panel"><h2>Original source-bound action inventory</h2><div id="actions"></div></section>'+
  '<section class="panel"><h2>Verify with original source Blueprints</h2>'+
  '<p>After exporting, run the authoritative <code>review-blueprint-decisions.cjs</code> with the original before and after private files plus your filled worksheet. The command rederives all action IDs and checks source hashes. This desk never performs network calls, changes Site v1 or approves a client release.</p>'+
  '<p class="foot">Before Blueprint SHA256: '+esc(template.beforeBlueprintSha256)+'</p>'+
  '<p class="foot">After Blueprint SHA256: '+esc(template.afterBlueprintSha256)+'</p></section>'+
  '<script type="application/json" id="source-json">'+safe+'</script><script>'+script+'</script>'+
  '</main></body></html>';
}
function start(){
 'use strict';
 const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
 const source=JSON.parse($('source-json').textContent);
 let state=clone(source.template),readers=[],cards=[];
 const choices=['pending','accepted','rejected','deferred'];
 function el(tag,text,cls){
  const e=document.createElement(tag);
  if(text!==undefined)e.textContent=String(text);
  if(cls)e.className=cls;
  return e;
 }
 function field(parent,label,type,value){
  const wrap=el('label',undefined,'field'+(type==='textarea'?' wide':''));
  wrap.append(el('span',label));
  const input=el(type==='textarea'?'textarea':'input');
  if(type!=='textarea')input.type=type;
  input.value=value??'';
  input.addEventListener('input',update);
  wrap.append(input);parent.append(wrap);return input;
 }
 function select(parent,label,options,value){
  const wrap=el('label',undefined,'field');
  wrap.append(el('span',label));const input=el('select');
  options.forEach(v=>{const o=el('option',v);o.value=v;input.append(o)});
  input.value=value;input.addEventListener('change',update);
  wrap.append(input);parent.append(wrap);return input;
 }
 function draw(draft){
  $('actions').replaceChildren();readers=[];cards=[];
  source.actions.forEach((action,i)=>{
   const entry=draft.actions[i]||source.template.actions[i];
   const card=el('details',undefined,'card '+action.priority.toLowerCase());
   const summary=el('summary');
   summary.append(el('span',action.priority,'pill'),el('strong',action.reason),
    el('span',entry.decision,'pill'));
   card.append(summary);
   const body=el('div',undefined,'body');
   body.append(el('p','Responsible: '+action.owner),
    el('p','Page: '+(action.pageId||'site-wide')),
    el('p','Do: '+action.instruction),
    el('p','Evidence: '+action.evidenceNeeded));
   const inputs=el('div',undefined,'fields');
   const decision=select(inputs,'Operator decision',choices,entry.decision);
   const reviewer=field(inputs,'Reviewed by','text',entry.reviewer);
   const date=field(inputs,'Observed date','date',entry.reviewedAt);
   const evidence=field(inputs,'Private evidence reference','text',entry.evidenceRef);
   const notes=field(inputs,'Rejection/deferral notes','textarea',entry.notes);
   body.append(inputs);card.append(body);$('actions').append(card);
   const reader=()=>({
    id:action.id,priority:action.priority,decision:decision.value,
    reviewer:decision.value==='pending'?'':reviewer.value.trim(),
    reviewedAt:decision.value==='pending'?null:date.value||null,
    evidenceRef:decision.value==='pending'?'':evidence.value.trim(),
    notes:decision.value==='pending'?'':notes.value.trim()
   });
   readers.push(reader);
   cards.push({card,key:action.id,search:
    (action.id+' '+(action.pageId||'')+' '+action.reason+' '+action.owner).toLowerCase(),
    priority:action.priority,get:()=>decision.value,
    badge:summary.children[2]});
  });
  update();
 }
 const validText=(s,max=600)=>typeof s==='string'&&s.length<=max&&!/[\x00-\x1f<>]/.test(s);
 function validDate(s){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const d=new Date(s+'T00:00:00Z');
  return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===s;
 }
 function assembled(){
  return {...clone(source.template),actions:readers.map(read=>read())};
 }
 function validSource(x){
  if(!x||x.format!==source.template.format||x.version!==source.template.version||
   x.siteId!==source.template.siteId||
   x.beforeBlueprintSha256!==source.template.beforeBlueprintSha256||
   x.afterBlueprintSha256!==source.template.afterBlueprintSha256||
   x.releaseAuthorized!==false||x.clientSignoffAuthenticated!==false||
   Object.keys(x).sort().join('|')!==Object.keys(source.template).sort().join('|')||
   !Array.isArray(x.actions)||x.actions.length!==source.actions.length)return false;
  return x.actions.every((a,i)=>a&&typeof a==='object'&&
   Object.keys(a).sort().join('|')===
    Object.keys(source.template.actions[i]).sort().join('|')&&
   a.id===source.actions[i].id&&a.priority===source.actions[i].priority&&
   choices.includes(a.decision)&&validText(a.reviewer)&&validText(a.evidenceRef)&&validText(a.notes));
 }
 function errors(d){
  const problems=[];
  d.actions.forEach((a,i)=>{
   if(a.decision==='pending')return;
   if(!validText(a.reviewer,120)||a.reviewer.trim().length<3)
    problems.push({i,text:'Reviewer name required (3–120 characters)'});
   if(!validDate(a.reviewedAt))
    problems.push({i,text:'Enter a valid YYYY-MM-DD date'});
   if(a.decision==='accepted'&&(!validText(a.evidenceRef)||a.evidenceRef.trim().length<4||
    a.evidenceRef.trim()===a.id))
    problems.push({i,text:'Accepted decision requires independent private evidence reference'});
   if(['rejected','deferred'].includes(a.decision)&&
    (!validText(a.notes)||a.notes.trim().length<5))
    problems.push({i,text:'Explain rejection or deferral in at least 5 characters'});
  });
  return problems;
 }
 function filter(){
  const q=$('search').value.trim().toLowerCase(),priority=$('priority').value,
   status=$('state').value;
  let visible=0;
  cards.forEach(x=>{
   const ok=(!q||x.search.includes(q))&&(priority==='all'||x.priority===priority)&&
    (status==='all'||x.get()===status);
   x.card.hidden=!ok;x.badge.textContent=x.get();
   if(ok)visible++;
  });
  $('visible').textContent=visible+' of '+cards.length+' source-bound actions shown';
 }
 function update(){
  const d=assembled(),issues=errors(d),counts={pending:0,accepted:0,rejected:0,deferred:0};
  d.actions.forEach(a=>counts[a.decision]++);
  $('stats').replaceChildren();
  for(const [name,value] of Object.entries(counts)){
   const x=el('div',undefined,'stat');
   x.append(el('small',name.toUpperCase()),el('b',value));$('stats').append(x);
  }
  $('problems').replaceChildren();
  if(!issues.length)$('problems').append(el('li',
   'All completed entries have the required local fields. Node source verification is still mandatory.'));
  else issues.slice(0,30).forEach(issue=>{
   const item=el('li'),button=el('button',source.actions[issue.i].id+': '+issue.text,'issue-btn');
   button.type='button';
   button.addEventListener('click',()=>{
    $('search').value='';$('priority').value='all';$('state').value='all';filter();
    cards[issue.i].card.open=true;cards[issue.i].card.scrollIntoView?.({block:'center'});
   });
   item.append(button);$('problems').append(item);
  });
  filter();
 }
 function download(kind,record){
  if(!validSource(record)){
   $('message').textContent='Download refused: source identity mismatch';
   return;
  }
  const bytes=JSON.stringify(record,null,2)+'\n';
  const link=el('a');link.download=kind+'-'+source.template.siteId+'.json';
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'}));
  link.href=url;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2500);
 }
 $('draft').addEventListener('click',()=>{
  download('blueprint-decisions-draft',assembled());
  $('message').textContent='Private draft saved. No reviewer or owner approval is authenticated.';
 });
 $('export').addEventListener('click',()=>{
  const record=assembled(),issues=errors(record);
  if(issues.length){
   $('message').textContent=issues.length+
    ' incomplete or invalid completed entries. Correct them before strict Node review.';
   return;
  }
  download('blueprint-decisions',record);
  $('message').textContent='Private record exported. Run the original source-bound Node decision reviewer.';
 });
 for(const id of ['search','priority','state'])
  $(id).addEventListener(id==='search'?'input':'change',filter);
 $('import').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
   if(file.size>1600000)throw Error('Private JSON too large');
   const data=JSON.parse(await file.text());
   if(!validSource(data))throw Error('Changed release, task order, or unsupported worksheet');
   state=clone(data);draw(state);
   $('message').textContent='Same-release decision draft restored; no evidence was verified.';
  }catch(e){$('message').textContent='Import refused: '+e.message;}
  event.target.value='';
 });
 draw(state);
}
module.exports=Object.freeze({render});
