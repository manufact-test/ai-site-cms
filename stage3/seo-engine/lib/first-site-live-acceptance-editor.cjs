'use strict';
/* Private offline evidence-entry desk. Does not post, crawl or authorize release.
 * It never embeds form submissions, HMAC secrets or live recipient details.
 */
const crypto=require('node:crypto');
const FLOW=require('./first-site-live-acceptance.cjs');
const ESC=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function render(template){
 FLOW.formWorksheet(template); // fail closed when the PHP section inventory is incomplete.
 if(template.version!==2||!Array.isArray(template.tasks)||template.tasks.length>200||
  template.tasks.some(t=>!['browser','manual'].includes(t.kind)||t.state!=='unreviewed')||
  template.formTests.length!==0)throw Error('Private editor needs the original unfilled live acceptance v2 template');
 const payload=JSON.stringify(template).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')
  .replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const script=String.raw`'use strict';
(function(){
 const source=JSON.parse(document.getElementById('source-json').textContent);
 const taskPanel=document.getElementById('task-panel');
 const formPanel=document.getElementById('form-panel');
 const progress=document.getElementById('progress');
 const message=document.getElementById('message');
 let taskReaders=[],formReaders=[],cards=[],cardById=new Map();
 const search=document.getElementById('entry-search');
 const filter=document.getElementById('state-filter');
 const clean=x=>JSON.parse(JSON.stringify(x));
 function elem(tag,txt,cls){
  const node=document.createElement(tag);
  if(txt!==undefined&&txt!==null)node.textContent=String(txt);
  if(cls)node.className=cls;
  return node;
 }
 function field(parent,label,type,value){
  const wrap=elem('label',null,'field');
  const span=elem('span',label);
  let input;
  if(type==='multiline'){input=elem('textarea');input.rows=2;}
  else {input=elem('input');input.type=type;}
  input.value=value==null?'':String(value);
  input.addEventListener('input',update);
  wrap.append(span,input);parent.append(wrap);
  return input;
 }
 function choice(parent,label,choices,value){
  const wrap=elem('label',null,'field');
  const span=elem('span',label);
  const select=elem('select');
  choices.forEach(([id,name])=>{const o=elem('option',name);o.value=id;select.append(o);});
  select.value=value;
  select.addEventListener('change',update);
  wrap.append(span,select);parent.append(wrap);
  return select;
 }
 const states=[['unreviewed','Not reviewed'],['passed','Passed'],['failed','Failed']];
 function card(parent,heading,sub){
  const item=elem('details',null,'item');
  const title=elem('summary',heading);
  const info=elem('p',sub,'minor');
  item.append(title,info);parent.append(item);
  return item;
 }
 function draw(draft){
  taskPanel.replaceChildren();formPanel.replaceChildren();
  taskReaders=[];formReaders=[];cards=[];cardById=new Map();
  draft.tasks.forEach(t=>{
   const original=source.tasks.find(x=>x.id===t.id);
   const item=card(taskPanel,original.label,original.page?original.page+' · '+original.viewport:'Site-wide manual check');
   const grid=elem('div',null,'fields');
   const state=choice(grid,'Result',states,t.state);
   const by=field(grid,'Operator','text',t.checkedBy);
   const date=field(grid,'Observed date','date',t.observedAt);
   const ref=field(grid,'Private evidence reference','text',t.evidenceRef);
   const notes=field(grid,'Notes (required on failure)','multiline',t.notes);
   item.append(grid);
   const key='task:'+original.id;
   cards.push({item,key,search:(original.label+' '+(original.page||'')+' '+(original.viewport||'')).toLowerCase(),state:()=>state.value});
   cardById.set(key,item);
   taskReaders.push(()=>({...original,state:state.value,
    checkedBy:state.value==='unreviewed'?'':by.value.trim(),
    observedAt:state.value==='unreviewed'?null:(date.value||null),
    evidenceRef:state.value==='unreviewed'?'':ref.value.trim(),
    notes:state.value==='unreviewed'?'':notes.value.trim()}));
  });
  Object.entries(source.required.formRefsByPage).forEach(([page,refs])=>refs.forEach(sectionId=>{
   const existing=draft.formTests.find(x=>x.page===page&&x.formRef===sectionId)||{};
   const item=card(formPanel,page+' · '+sectionId,'An actual authorized POST and separate destination-side receipt are needed for PASS');
   const grid=elem('div',null,'fields');
   const state=choice(grid,'Form outcome',
    [['unreviewed','Not tested'],['passed','Passed'],['failed','Failed']],existing.state||'unreviewed');
   const by=field(grid,'Operator','text',existing.checkedBy);
   const date=field(grid,'POST observed date','date',existing.observedAt);
   const ref=field(grid,'Operator check reference','text',existing.evidenceRef);
   const submitted=field(grid,'Submission receipt reference (optional if POST failed before send)','text',existing.submissionEvidenceRef);
   const delivered=field(grid,'Separate delivery receipt reference','text',existing.deliveryEvidenceRef);
   const channel=choice(grid,'Destination-side confirmation channel',
    [['none','Not confirmed'],['email','Email'],['telegram','Telegram'],
     ['persistence','Persistence'],['webhook','Webhook'],['other','Other']],
    existing.deliveryChannel||'none');
   const deliveryDate=field(grid,'Delivery observed date','date',existing.deliveryObservedAt);
   const notes=field(grid,'Failure notes (required for failed)','multiline',existing.notes);
   item.append(grid);
   const key='form:'+page+'#'+sectionId;
   cards.push({item,key,search:(page+' '+sectionId+' form').toLowerCase(),state:()=>state.value});
   cardById.set(key,item);
   formReaders.push(()=>state.value==='unreviewed'?null:{
    page,formRef:sectionId,state:state.value,observedAt:date.value||null,
    checkedBy:by.value.trim(),evidenceRef:ref.value.trim(),
    submissionEvidenceRef:submitted.value.trim(),
    deliveryEvidenceRef:state.value==='passed'?delivered.value.trim():'',
    deliveryChannel:state.value==='passed'?channel.value:'none',
    deliveryObservedAt:state.value==='passed'?(deliveryDate.value||null):null,
    notes:notes.value.trim()
   });
  }));
  if(!formReaders.length)formPanel.append(elem('p',
   'No PHP lead forms in the original audit. Complete all browser and manual checks.'));
  update();
 }
 function assembled(){
  const o=clean(source);
  o.tasks=taskReaders.map(read=>read());
  o.formTests=formReaders.map(read=>read()).filter(Boolean);
  return o;
 }
 function validDate(s){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const parsed=new Date(s+'T00:00:00Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===s;
 }
 const safe=(s,max=240,min=1)=>typeof s==='string'&&s.trim().length>=min&&
  s.length<=max&&!/[\x00-\x1f<>]/.test(s);
 function problems(d){
  const errors=[];
  function add(key,msg){errors.push({key,msg});}
  for(const t of d.tasks){
   if(t.state==='unreviewed')continue; // unfinished check is a legal, explicitly pending review
   const key='task:'+t.id;
   if(!validDate(t.observedAt))add(key,'Valid observed date required');
   if(!safe(t.checkedBy,120))add(key,'Operator name required (max 120 characters)');
   if(!safe(t.evidenceRef,240))add(key,'Private evidence reference required');
   if(t.notes.length>500||/[\x00-\x1f<>]/.test(t.notes))
    add(key,'Notes contain disallowed characters or exceed 500 characters');
   if(t.state==='failed'&&!t.notes.trim())add(key,'Failed check requires notes');
  }
  for(const t of d.formTests){
   const key='form:'+t.page+'#'+t.formRef;
   if(!validDate(t.observedAt))add(key,'Valid form observation date required');
   if(!safe(t.checkedBy,120))add(key,'Form operator required');
   if(!safe(t.evidenceRef,240))add(key,'Private form observation reference required');
   if(t.notes.length>500||/[\x00-\x1f<>]/.test(t.notes))
    add(key,'Form notes are invalid or too long');
   if(t.state==='failed'&&!t.notes.trim())add(key,'Explain why form failed');
   if(t.submissionEvidenceRef&&!safe(t.submissionEvidenceRef))
    add(key,'Invalid private POST submission reference');
   if(t.state==='passed'){
    if(!safe(t.submissionEvidenceRef,240,3))add(key,'Real POST submission reference required');
    if(!safe(t.deliveryEvidenceRef,240,3)||t.deliveryEvidenceRef===t.submissionEvidenceRef)
     add(key,'Independent, different delivery reference required');
    if(t.deliveryChannel==='none')add(key,'Choose actual delivery channel');
    if(!validDate(t.deliveryObservedAt)||validDate(t.observedAt)&&
     t.deliveryObservedAt<t.observedAt)
     add(key,'Valid delivery date must not precede POST date');
   }
  }
  return errors;
 }
 function filterCards(){
  const q=search.value.trim().toLowerCase(),status=filter.value;
  let visible=0;
  cards.forEach(x=>{
   const matches=(!q||x.search.includes(q))&&
    (status==='all'||status==='needs-work'&&x.state()!=='passed'||
     status===x.state());
   x.item.hidden=!matches;
   if(matches)visible++;
  });
  document.getElementById('visible-count').textContent=visible+' of '+cards.length+' entries visible';
 }
 function update(){
  const d=assembled(),p=d.tasks.filter(x=>x.state==='passed').length,
   fail=d.tasks.filter(x=>x.state==='failed').length,
   fm=d.formTests.filter(x=>x.state==='passed').length;
  progress.textContent=p+'/'+d.tasks.length+' checks passed · '+fail+
   ' failed · '+fm+'/'+formReaders.length+' forms marked passed (operator claims only)';
  const issues=problems(d),list=document.getElementById('issues');
  document.getElementById('issues-count').textContent=issues.length?
   issues.length+' evidence field(s) need correction before CLI export':
   'Entered evidence fields are consistent for local draft export';
  list.replaceChildren();
  issues.slice(0,15).forEach(e=>{
   const li=elem('li'),button=elem('button',e.msg+' — '+e.key.replace(/^task:|^form:/,''),'issue-link');
   button.type='button';
   button.addEventListener('click',()=>{
    const item=cardById.get(e.key);if(!item)return;
    search.value='';filter.value='all';filterCards();
    item.open=true;item.scrollIntoView({behavior:'smooth',block:'center'});
    item.focus();
   });
   li.append(button);list.append(li);
  });
  if(issues.length>15)list.append(elem('li','More fields require correction; review all entries.'));
  filterCards();
 }
 function validDraft(d){
  if(d.format!==source.format||d.version!==source.version||d.siteId!==source.siteId||
   JSON.stringify(d.pinned)!==JSON.stringify(source.pinned)||
   JSON.stringify(d.required)!==JSON.stringify(source.required)||
   !Array.isArray(d.tasks)||d.tasks.length!==source.tasks.length||
   d.tasks.some((t,i)=>t.id!==source.tasks[i].id||t.kind!==source.tasks[i].kind||
    t.page!==source.tasks[i].page||t.viewport!==source.tasks[i].viewport||
    t.label!==source.tasks[i].label)||!Array.isArray(d.formTests))return false;
  const ids=new Set();
  for(const x of d.formTests){
   const key=x.page+'#'+x.formRef;
   if(ids.has(key)||!source.required.formRefsByPage[x.page]?.includes(x.formRef))return false;
   ids.add(key);
  }
  return true;
 }
 function download(draft,kind,notice){
  if(!validDraft(draft)){message.textContent='Refused: source fingerprint mismatch.';return;}
  const bytes=JSON.stringify(draft,null,2)+'\n';
  const link=elem('a');
  link.download=kind+'-'+source.siteId.replace(/[^a-zA-Z0-9_-]/g,'-')+'.json';
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/json'}));
  link.href=url;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  message.textContent=notice;
 }
 document.getElementById('save').addEventListener('click',()=>{
  download(assembled(),'draft-live-acceptance',
   'Private draft saved locally. Re-import later to continue. This is NOT operator-approved proof.');
 });
 document.getElementById('export').addEventListener('click',()=>{
  const draft=assembled(),issues=problems(draft);
  if(issues.length){
   message.textContent='Cannot export for Node review: '+issues.length+
    ' invalid evidence field(s). Click the corrections below. Save Draft is still available.';
   return;
  }
  download(draft,'filled-live-acceptance',
   'Private JSON downloaded. NEXT: run the authoritative human-review session CLI. This editor never certifies evidence.');
 });
 search.addEventListener('input',filterCards);
 filter.addEventListener('change',filterCards);
 document.getElementById('import').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
   if(file.size>1800000)throw Error('File too large');
   const parsed=JSON.parse(await file.text());
   if(!validDraft(parsed))throw Error('Wrong site/release, changed checks, or unknown form references');
   draw(parsed);message.textContent='Private draft loaded for this exact release; re-export after editing.';
  }catch(err){message.textContent='Import refused: '+err.message;}
  e.target.value='';
 });
 draw(source);
}());`;
 const sha=crypto.createHash('sha256').update(script,'utf8').digest('base64');
 const css=String.raw`*{box-sizing:border-box}body{margin:0;background:#edf3f6;color:#173a47;font:15px/1.5 system-ui,Arial,sans-serif}main{max-width:1100px;margin:auto;padding:24px}header{background:#173d4c;color:white;padding:28px;border-radius:18px}h1{font-size:26px;margin:0 0 8px}header p{color:#d8e9ee;margin:6px 0}section{background:white;padding:24px;margin:18px 0;border:1px solid #d2e0e5;border-radius:14px}h2{margin:0 0 12px;font-size:21px}.minor{font-size:13px;color:#607883}header .minor{color:#d1e4ea}.toolbar{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.button{font:inherit;background:#106b66;border:0;border-radius:10px;color:white;padding:11px 16px;cursor:pointer;font-weight:650} .button:hover{background:#07534e}.button.secondary{background:#365c69}.button.secondary:hover{background:#254c59}.filterbar{display:flex;flex-wrap:wrap;gap:15px;margin:17px 0}.filterbar label{font-size:13px;font-weight:700;flex:1;min-width:175px}.filterbar input,.filterbar select{display:block;width:100%;border:1px solid #afc2ca;border-radius:8px;background:white;color:#173a47;padding:9px;margin-top:5px;font:inherit}.validation{border-top:1px solid #dae3e6;margin-top:16px}.validation h3{margin:12px 0 2px}.validation ul{list-style:none;padding:0;margin:8px 0}.validation li{margin:5px 0}.issue-link{width:100%;text-align:left;border:1px solid #e3c7b4;color:#733b23;background:#fff8f0;padding:9px 12px;border-radius:7px;cursor:pointer;font:inherit}.issue-link:hover{background:#ffead9}details[hidden]{display:none}.file-label{background:#e2f0ee;color:#164c48;padding:11px 16px;border-radius:10px;cursor:pointer;font-weight:600}.file-label input{display:none}details.item{margin-top:12px;border:1px solid #dce5e9;border-radius:11px;background:#fbfdfe;padding:14px}summary{cursor:pointer;font-weight:700;overflow-wrap:anywhere}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:12px}.field{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600}.field input,.field select,.field textarea{width:100%;font:inherit;padding:10px;border:1px solid #bacbd4;border-radius:8px;background:white;color:#16343e;min-width:0}.field:focus-within{color:#087a72}.field input:focus,.field select:focus,.field textarea:focus{outline:2px solid #17867d;outline-offset:1px}.notice{background:#fff8e8;border-left:4px solid #cc9f46;padding:14px;border-radius:8px;color:#59491a}#progress{font-weight:700;overflow-wrap:anywhere}#message{font-size:14px;font-weight:700;color:#12675f}@media(max-width:720px){main{padding:12px}section,header{padding:17px}.fields{grid-template-columns:1fr}h1{font-size:22px}}`;
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
 '<meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<meta name="robots" content="noindex,nofollow,noarchive">'+
 '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;; object-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; script-src &#39;sha256-'+sha+'&#39;">'+
 '<title>MANUFACT Private First-Site Acceptance Desk</title><style>'+css+'</style></head><body>'+
 '<main><header><p class="minor">MANUFACT · LOCAL OPERATOR WORKSPACE · NO NETWORK</p>'+
 '<h1>First-Site Acceptance Desk</h1><p>Site '+ESC(template.siteId)+
 ' · Version '+ESC(template.pinned.publishedVersion)+
 ' · Source revision '+ESC(template.pinned.sourceRevisionClaim)+'</p>'+
 '<p>Release ZIP SHA256: '+ESC(template.pinned.publicZipSha256)+'</p></header>'+
 '<section><h2>Operator workflow</h2><p class="notice">LOCAL DRAFT ONLY — No site requests, real POST, recipient delivery verification, CMS writes or client approval. Do not enter form bodies, tokens, customer PII or private recipient addresses. A marked check is only a human assertion.</p>'+
 '<div class="toolbar"><button id="save" class="button secondary" type="button">Save unfinished draft</button>'+ 
 '<button id="export" class="button" type="button">Download private filled JSON</button>'+
 '<label class="file-label">Import prior private draft <input id="import" type="file" accept=".json,application/json"></label></div>'+
 '<p id="progress"></p><p id="message" aria-live="polite"></p>'+ 
 '<div class="filterbar"><label>Find page, device or section<input id="entry-search" type="search" placeholder="e.g. /contact/ mobile"></label>'+ 
 '<label>Show<select id="state-filter"><option value="all">All checks</option><option value="needs-work">Outstanding / failed</option><option value="unreviewed">Not reviewed</option><option value="failed">Failed</option><option value="passed">Passed</option></select></label></div>'+ 
 '<p id="visible-count" class="minor"></p><div class="validation"><h3>Evidence entry checks</h3><p id="issues-count" aria-live="polite"></p><ul id="issues"></ul></div></section>'+
 '<section><h2>Browser/device and manual checks</h2><p class="minor">Expand each check and record real observation date, operator, evidence reference and outcome. Failed checks require notes.</p>'+
 '<div id="task-panel"></div></section>'+
 '<section><h2>Real form submissions and destination receipts</h2><p class="minor">Every section below comes directly from the pinned PHP form inventory. For PASS record separate POST and destination-side evidence references.</p>'+
 '<div id="form-panel"></div></section>'+
 '<section><h2>Final verification</h2><p>After downloading the JSON, invoke the original private Node review CLI with <code>--filled</code>. This desktop/mobile form does not certify submitted evidence or grant GO. Keep all generated files outside GitHub.</p></section>'+
 '<script type="application/json" id="source-json">'+payload+'</script>'+
 '<script>'+script+'</script></main></body></html>';
}
module.exports=Object.freeze({render});