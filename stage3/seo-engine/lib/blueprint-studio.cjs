'use strict';
/* Source-only Blueprint authoring. Browser drafts are NEVER validated publication decisions.
 * The existing checkBrief/compileBrief remains the authoritative SEO contract.
 */
const crypto=require('node:crypto');
const BP=require('./blueprint.cjs');
const ID=/^[a-z][a-z0-9-]{2,79}$/;
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function starter(siteId){
 if(!ID.test(siteId))throw Error('Blueprint Studio needs an exact lowercase stable site ID');
 return {format:BP.FORMAT,siteId,title:'',language:'en',region:'',audience:'',goal:'',
  facts:[],research:[],pages:[{
   id:'page-home',path:'/',name:'',intent:{type:'informational',need:'',topics:[]},
   seo:{title:'',description:'',robots:'index'},sections:[{
    id:'section-home-intro',heading:'',level:1,why:'',points:[]}],
   links:[],schemaCandidates:[],responsive:{desktop:'',tablet:'',mobile:''}
  }]};
}
function briefFromBlueprint(compiled){
 const b=BP.checkBlueprint(compiled);
 const value={format:BP.FORMAT,siteId:b.siteId,title:b.title,language:b.language,
  region:b.region,audience:b.audience,goal:b.goal,
  facts:b.facts.map(f=>({...f})),research:b.research.map(f=>({...f})),
  pages:b.pages.map(p=>({
   id:p.id,path:p.path,name:p.name,intent:{...p.intent,topics:p.intent.topics.slice()},
   seo:{...p.seo},sections:p.sections.map(s=>({...s,
    points:s.points.slice(),...(s.media?{media:{...s.media}}:{}),
    ...(s.cta?{cta:{...s.cta}}:{})})),
   links:p.links.map(l=>({toPageId:l.toPageId,anchor:l.anchor,why:l.why})),
   schemaCandidates:p.schemaCandidates.map(c=>({type:c.type,
    factIds:c.factIds.slice(),why:c.why})),
   responsive:{...p.responsive}
  }))};
 BP.checkBrief(value);
 return value;
}
function render(brief,{allowIncomplete=false}={}){
 if(!allowIncomplete)BP.checkBrief(brief);
 else if(brief?.format!==BP.FORMAT||!ID.test(brief.siteId)||
  !Array.isArray(brief.pages)||brief.pages.length!==1||brief.pages[0]?.path!=='/')
  throw Error('Incomplete Blueprint Studio starter must be the new-site home template');
 const json=JSON.stringify(brief).replace(/&/g,'\\u0026').replace(/</g,'\\u003c')
  .replace(/>/g,'\\u003e').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 const script='('+editor.toString()+')();';
 const sha=crypto.createHash('sha256').update(script,'utf8').digest('base64');
 const css=[
  '*{box-sizing:border-box}:root{--ink:#1a3648;--muted:#5e7482;--line:#d8e4e9;--teal:#0c756b;--surface:#fff;--bg:#eef4f6}',
  'body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,Segoe UI,sans-serif}',
  'main{max-width:1280px;margin:auto;padding:20px 22px 75px}header{background:linear-gradient(130deg,#102c41,#126c6f);color:#fff;border-radius:23px;padding:27px 33px}',
  'h1{font-size:clamp(25px,4vw,38px);letter-spacing:-.035em;line-height:1.2;margin:7px 0}header p{max-width:900px;color:#d8ecee}',
  '.kicker{font-size:11px;letter-spacing:.12em;font-weight:800;color:#abebdf;text-transform:uppercase}',
  '.toolbar{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:13px;background:#edf4f5eb;border-bottom:1px solid var(--line);backdrop-filter:blur(10px)}',
  'button,.file{border:0;border-radius:9px;padding:9px 13px;background:var(--teal);color:#fff;cursor:pointer;font:inherit;font-weight:700}',
  'button:hover,.file:hover{filter:brightness(.88)}button.secondary,.file{background:#375969}button.ghost{background:#e7f1f0;color:#105d57;border:1px solid #b4d5d0}',
  'button.danger{background:#fff0ec;color:#8f3a2c;border:1px solid #ecd3cd}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--teal);outline-offset:2px}',
  '.file input{display:none}.panel{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:22px;margin:15px 0;box-shadow:0 5px 19px #14445b08}',
  '.panel h2{font-size:21px;margin:0 0 9px}.panel h3{font-size:16px;margin:10px 0}.muted{color:var(--muted)}.small{font-size:12px}',
  '.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.full{grid-column:1/-1}',
  'label.field{display:flex;flex-direction:column;gap:5px;font-weight:650;font-size:12px;min-width:0}',
  'input,textarea,select{font:inherit;border:1px solid #b8cad3;border-radius:8px;padding:9px 10px;background:#fff;color:var(--ink);width:100%;min-width:0}textarea{min-height:75px;resize:vertical}',
  'details.card{margin:10px 0;padding:14px;background:#f9fcfd;border:1px solid var(--line);border-radius:12px}',
  'summary{cursor:pointer;font-weight:800;overflow-wrap:anywhere}summary small{color:var(--muted);font-weight:400}',
  '.nested{margin:13px 0 7px;padding:13px;border-left:3px solid #b6d8d3;background:#fff;border-radius:8px}',
  '.head{display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap}.head h3{margin:0}.head button{font-size:12px}',
  '.row-actions{display:flex;justify-content:flex-end;margin-top:9px}.stats{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0}',
  '.stat{background:#fff;border:1px solid var(--line);padding:12px 16px;border-radius:10px;min-width:115px}.stat b{display:block;font-size:22px}.stat small{color:var(--muted)}',
  '#problems{margin:5px 0;padding-left:22px}#problems li{margin:5px 0}#problems li.error{color:#8c342d}',
  '.notice{background:#fff8e8;border-left:4px solid #bf8b37;padding:12px 15px;border-radius:8px}',
  '@media(max-width:700px){main{padding:10px}.panel{padding:15px}header{padding:22px}.fields{grid-template-columns:1fr}.toolbar{position:static}.toolbar button,.toolbar .file{flex:1;text-align:center}}'
 ].join('');
 return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
  '<meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<meta name="robots" content="noindex,nofollow,noarchive">'+
  '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; connect-src &#39;none&#39;; img-src &#39;none&#39;; object-src &#39;none&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;; style-src &#39;unsafe-inline&#39;; script-src &#39;sha256-'+sha+'&#39;">'+
  '<title>MANUFACT SEO · Blueprint Studio (private)</title><style>'+css+'</style></head><body>'+
  '<main><header><div class="kicker">MANUFACT · PRIVATE OFFLINE SEO AUTHORING</div>'+
  '<h1>Blueprint Studio</h1><p>Build page architecture, approved facts, metadata, sections, CTAs, internal links and responsive briefs. Nothing is sent to CMS, Google or hosting.</p>'+
  '<p class="small">Project ID: '+esc(brief.siteId)+'</p></header>'+
  '<div class="toolbar"><button id="draft" class="secondary">Save editable draft</button>'+
  '<button id="export">Export for SEO compiler</button><label class="file">Import private draft <input id="import" type="file" accept=".json,application/json"></label>'+
  '<span id="message" role="status" class="small"></span></div>'+
  '<div id="stats" class="stats"></div>'+
  '<section class="panel"><h2>Source validity</h2><p class="muted small">Local checks guide editing. The original Node SEO compiler is the final validator; no SEO ranking claims or automatic publication.</p>'+
  '<ol id="problems"></ol></section>'+
  '<section class="panel"><h2>Site and audience</h2><div id="site" class="fields"></div></section>'+
  '<section class="panel"><div class="head"><h2>Owner facts &amp; evidence</h2><button id="add-fact" class="ghost">Add fact</button></div>'+
  '<p class="muted small">Only owner/document-confirmed claims may support eligible structured data. Research observations do not authenticate claims.</p><div id="facts"></div></section>'+
  '<section class="panel"><div class="head"><h2>Research sources</h2><button id="add-research" class="ghost">Add source</button></div><div id="research"></div></section>'+
  '<section class="panel"><div class="head"><h2>Pages and architecture</h2><button id="add-page">Add page</button></div>'+
  '<p class="muted small">The root / page is mandatory; page IDs, section IDs, routes and references must remain unique and consistent.</p>'+
  '<div id="pages"></div></section>'+
  '<section class="panel"><h2>Next step: compile and review</h2>'+
  '<p>After exporting <code>seo-brief-*.json</code>, run <code>node stage3/seo-engine/bin/seo-blueprint.cjs compile --brief /ABS/private/seo-brief.json</code> and save the JSON output privately. Then run <code>review-blueprint</code> and <code>review-architecture</code> on that compiled Blueprint. Owner approval and CMS integration remain separate.</p>'+
  '<p class="notice">Keep files PRIVATE. Do not enter passwords, customer personal data, recipient addresses or unapproved promises. Export does not prove search volumes, factual accuracy, rendered pages or acceptance.</p></section>'+
  '<script type="application/json" id="source-json">'+json+'</script><script>'+script+'</script></main></body></html>';
}
function editor(){
 'use strict';
 const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
 const initial=JSON.parse($('source-json').textContent);
 let data=clone(initial);
 const idPattern=/^[a-z][a-z0-9-]{2,79}$/,pathPattern=/^\/(?:[a-z0-9-]+\/)*$/;
 const all=x=>Array.isArray(x)?x:[];
 const choices={
  language:['ru','en','de','pl','be','uk'],robots:['index','noindex'],
  intent:['informational','commercial','transactional','navigational','support'],
  status:['confirmed','unverified'],origin:['owner','document','research'],
  schema:['Organization','LocalBusiness','BreadcrumbList','Article','Product','Service','FAQPage'],
  research:['primary-guidance','site-reference','audience-evidence','other'],
  media:['informative','decorative']
 };
 function node(tag,label,cls){
  const e=document.createElement(tag);
  if(label!==undefined)e.textContent=label;
  if(cls)e.className=cls;
  return e;
 }
 const append=(parent,...children)=>{parent.append(...children);return parent};
 function field(parent,label,obj,key,opt={}){
  const wrap=node('label',undefined,'field'+(opt.full?' full':''));
  append(wrap,node('span',label));
  let e;
  if(opt.options){
   e=node('select');
   opt.options.forEach(v=>{const option=node('option',v);option.value=v;e.append(option)});
  }else if(opt.lines){e=node('textarea');e.rows=3;}
  else{e=node('input');e.type=opt.type||'text';}
  const val=obj[key];
  e.value=Array.isArray(val)?val.join('\n'):String(val??'');
  const change=()=>{
   if(opt.lines)obj[key]=e.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   else if(opt.number)obj[key]=Number(e.value);
   else obj[key]=e.value;
   check();
  };
  e.addEventListener(opt.options?'change':'input',change);
  append(wrap,e);parent.append(wrap);return e;
 }
 function button(text,cb,cls='ghost'){
  const b=node('button',text,cls);b.type='button';b.addEventListener('click',cb);return b;
 }
 function nest(parent,title){
  const d=node('div',undefined,'nested'),h=node('div',undefined,'head');
  append(h,node('h3',title));d.append(h);parent.append(d);
  return {box:d,head:h,fields:append(d,node('div',undefined,'fields')).children[1]};
 }
 function card(parent,title,sub){
  const d=node('details',undefined,'card'),summary=node('summary',title+' · '+sub);
  d.append(summary);parent.append(d);return d;
 }
 function rerender(){draw();check();}
 function drop(collection,index){collection.splice(index,1);rerender();}
 function draw(){
  $('site').replaceChildren();$('facts').replaceChildren();$('research').replaceChildren();$('pages').replaceChildren();
  [['Site ID','siteId'],['Site name','title'],['Region served','region'],
   ['Audience','audience'],['Business goal','goal']].forEach(([name,key])=>
    field($('site'),name,data,key,{full:key==='audience'||key==='goal'}));
  field($('site'),'Primary language',data,'language',{options:choices.language});
  data.facts.forEach((f,i)=>{
   const n=nest($('facts'),'Fact '+(i+1));n.head.append(button('Remove',()=>drop(data.facts,i),'danger'));
   field(n.fields,'Fact ID',f,'id');field(n.fields,'Claim / exact owner evidence',f,'claim',{full:true});
   field(n.fields,'Verification status',f,'status',{options:choices.status});
   field(n.fields,'Origin',f,'origin',{options:choices.origin});
   field(n.fields,'HTTPS source (optional)',f,'source',{full:true});
  });
  data.research.forEach((r,i)=>{
   const n=nest($('research'),'Research '+(i+1));n.head.append(button('Remove',()=>drop(data.research,i),'danger'));
   field(n.fields,'HTTPS URL',r,'url',{full:true});
   field(n.fields,'Observation',r,'observation',{full:true});
   field(n.fields,'Source type',r,'kind',{options:choices.research});
  });
  data.pages.forEach((p,i)=>{
   const item=card($('pages'),p.name||p.id,p.path);
   const head=append(item,node('div',undefined,'row-actions'));
   if(p.path!=='/')head.append(button('Delete page',()=>drop(data.pages,i),'danger'));
   const grid=append(item,node('div',undefined,'fields'));
   field(grid,'Stable page ID',p,'id');field(grid,'URL path',p,'path');
   field(grid,'Page name',p,'name');field(grid,'Search intent',p.intent,'type',{options:choices.intent});
   field(grid,'Visitor need',p.intent,'need',{full:true});
   field(grid,'Planned topics (one per line)',p.intent,'topics',{lines:true,full:true});
   field(grid,'SEO title',p.seo,'title',{full:true});
   field(grid,'Meta description',p.seo,'description',{full:true});
   field(grid,'Robots directive',p.seo,'robots',{options:choices.robots});
   field(grid,'Canonical page path (optional)',p.seo,'canonicalPath');
   field(grid,'OG title (optional)',p.seo,'ogTitle');
   field(grid,'OG description (optional)',p.seo,'ogDescription',{full:true});
   const sections=nest(item,'Sections / headings');
   sections.head.append(button('Add section',()=>{
    p.sections.push({id:'',heading:'',level:2,why:'',points:[]});rerender();
   }));
   p.sections.forEach((s,j)=>{
    const n=nest(sections.box,'Section '+(j+1));
    if(p.sections.length>1)n.head.append(button('Remove',()=>drop(p.sections,j),'danger'));
    field(n.fields,'Unique section ID',s,'id');field(n.fields,'Heading',s,'heading');
    const levels=['1','2','3','4','5','6'];
    const levelWrap=node('label',undefined,'field');
    levelWrap.append(node('span','Heading level (H1–H6)'));
    const level=node('select');
    for(const x of levels){const opt=node('option','H'+x);opt.value=x;level.append(opt);}
    level.value=String(s.level);
    level.addEventListener('change',()=>{s.level=Number(level.value);check()});
    levelWrap.append(level);n.fields.append(levelWrap);
    field(n.fields,'Why section exists',s,'why',{full:true});
    field(n.fields,'Required talking points (one per line)',s,'points',{lines:true,full:true});
    if(s.media){
     field(n.fields,'Media purpose',s.media,'purpose',{options:choices.media});
     field(n.fields,'Image alt intent (empty for decorative)',s.media,'alt',{full:true});
     field(n.fields,'Why media is needed',s.media,'why',{full:true});
     n.head.append(button('Remove media',()=>{delete s.media;rerender()},'danger'));
    }else n.head.append(button('Add media',()=>{s.media={purpose:'informative',alt:'',why:''};rerender()}));
    if(s.cta){
     field(n.fields,'CTA label',s.cta,'label');
     field(n.fields,'CTA target page ID',s.cta,'toPageId');
     field(n.fields,'CTA purpose',s.cta,'purpose',{full:true});
     n.head.append(button('Remove CTA',()=>{delete s.cta;rerender()},'danger'));
    }else n.head.append(button('Add CTA',()=>{s.cta={label:'',toPageId:'',purpose:''};rerender()}));
    field(n.fields,'Interaction notes (optional)',s,'interaction',{full:true});
   });
   const links=nest(item,'Contextual internal links');
   links.head.append(button('Add internal link',()=>{
    p.links.push({toPageId:'',anchor:'',why:''});rerender();
   }));
   p.links.forEach((l,j)=>{
    const n=nest(links.box,'Link '+(j+1));n.head.append(button('Remove',()=>drop(p.links,j),'danger'));
    field(n.fields,'Target page ID',l,'toPageId');
    field(n.fields,'Descriptive link anchor',l,'anchor');
    field(n.fields,'Reason to link',l,'why',{full:true});
   });
   const schema=nest(item,'Structured data candidates — never automatic markup');
   schema.head.append(button('Add candidate',()=>{
    p.schemaCandidates.push({type:'Organization',factIds:[],why:''});rerender();
   }));
   p.schemaCandidates.forEach((s,j)=>{
    const n=nest(schema.box,'Candidate '+(j+1));
    n.head.append(button('Remove',()=>drop(p.schemaCandidates,j),'danger'));
    field(n.fields,'Schema.org type',s,'type',{options:choices.schema});
    field(n.fields,'Supporting fact IDs (one per line)',s,'factIds',{lines:true,full:true});
    field(n.fields,'Why relevant',s,'why',{full:true});
   });
   const responsive=nest(item,'Responsive editorial behavior');
   ['desktop','tablet','mobile'].forEach(v=>field(responsive.fields,v,p.responsive,v,{full:true}));
  });
 }
 function problems(){
  const issues=[],add=(id,msg)=>issues.push(id+': '+msg),ids=new Set(),paths=new Set(),factIds=new Set();
  const text=(v,n=1,max=700)=>typeof v==='string'&&v.trim().length>=n&&v.length<=max&&
   !/[\x00-\x1f]/.test(v)&&!/<\s*\/?\s*[a-z][^>]*>/i.test(v);
  if(!idPattern.test(data.siteId||''))add('siteId','Use lowercase stable ID (3–80 characters)');
  for(const k of ['title','region','audience','goal'])if(!text(data[k]))add(k,'Required text');
  if(!choices.language.includes(data.language))add('language','Unsupported language');
  if(!Array.isArray(data.pages)||!data.pages.length||data.pages.length>80)add('pages','1–80 pages required');
  if(!Array.isArray(data.facts)||data.facts.length>100)add('facts','Maximum 100 facts');
  for(const f of all(data.facts)){
   if(!idPattern.test(f.id||'')||factIds.has(f.id))add('fact','Missing, invalid or duplicate fact ID');
   factIds.add(f.id);
   if(!text(f.claim))add('fact '+f.id,'Claim required');
   if(!choices.status.includes(f.status))add('fact '+f.id,'Choose verification status');
   if(f.source&&!/^https:\/\/[^@\s/?#]+[^\s]*$/i.test(f.source))add('fact '+f.id,'HTTPS source required');
  }
  for(const r of all(data.research)){
   if(!/^https:\/\/[^@\s/?#]+[^\s]*$/i.test(r.url||''))add('research','HTTPS URL required');
   if(!text(r.observation))add('research','Observation required');
  }
  for(const pg of all(data.pages)){
   if(!idPattern.test(pg.id||'')||ids.has(pg.id))add('page','Invalid or duplicate page ID');
   ids.add(pg.id);
   if(!pathPattern.test(pg.path||'')||paths.has(pg.path))add('page '+pg.id,'Invalid/duplicate trailing-slash route');
   paths.add(pg.path);
   if(!text(pg.name)||!text(pg.intent?.need)||!all(pg.intent?.topics).length||
    all(pg.intent?.topics).some(v=>!text(v)))add('page '+pg.id,'Name, visitor need and topic required');
   if(!text(pg.seo?.title)||!text(pg.seo?.description))add('page '+pg.id,'Title and description required');
   let h1=0;
   if(!all(pg.sections).length)add('page '+pg.id,'At least one section required');
   for(const s of all(pg.sections)){
    if(!idPattern.test(s.id||'')||ids.has(s.id))add('section','Invalid or reused section ID');
    ids.add(s.id);if(s.level===1)h1++;
    if(!text(s.heading)||!text(s.why)||!all(s.points).length)add('section '+s.id,'Heading, purpose and points required');
    if(s.media&&(!text(s.media.why)||s.media.purpose==='informative'&&!text(s.media.alt)||
      s.media.purpose==='decorative'&&s.media.alt!==''))
     add('section '+s.id,'Media purpose, alt and reason must agree');
   }
   if(h1!==1)add('page '+pg.id,'Exactly one H1 section required');
   for(const r of ['desktop','tablet','mobile'])if(!text(pg.responsive?.[r]))
    add('page '+pg.id,'Missing '+r+' behavior');
  }
  if(!paths.has('/'))add('pages','Home / route required');
  for(const p of all(data.pages)){
   if(p.seo.canonicalPath&&!paths.has(p.seo.canonicalPath))add('page '+p.id,'Canonical path missing from page map');
   for(const link of all(p.links))if(!ids.has(link.toPageId)||!text(link.anchor)||!text(link.why))
    add('page '+p.id,'Internal link target ID / anchor / purpose missing');
   for(const s of all(p.sections))if(s.cta&&(!ids.has(s.cta.toPageId)||!text(s.cta.label)||!text(s.cta.purpose)))
    add('section '+s.id,'CTA target or text missing');
   for(const c of all(p.schemaCandidates))if(!all(c.factIds).length||
    all(c.factIds).some(id=>!factIds.has(id))||!text(c.why))
    add('page '+p.id,'Schema fact ID reference or why missing');
  }
  return issues.slice(0,120);
 }
 function check(){
  const issue=problems(),list=$('problems');
  list.replaceChildren();
  if(!issue.length)list.append(node('li','Local draft is structurally ready for authoritative Node compilation.'));
  else issue.forEach(s=>list.append(node('li',s,'error')));
  $('stats').replaceChildren();
  [['Pages',data.pages.length],['Sections',data.pages.reduce((n,p)=>n+p.sections.length,0)],
   ['Facts',data.facts.length],['Links',data.pages.reduce((n,p)=>n+p.links.length,0)],
   ['Issues',issue.length]].forEach(([key,val])=>{
   const item=node('div',undefined,'stat');append(item,node('small',key),node('b',String(val)));$('stats').append(item);
  });
  return issue;
 }
 function usable(candidate){
  return candidate&&typeof candidate==='object'&&!Array.isArray(candidate)&&
   candidate.format===initial.format&&candidate.siteId===initial.siteId&&
   Array.isArray(candidate.pages)&&candidate.pages.length>0&&candidate.pages.length<=80&&
   Array.isArray(candidate.facts)&&candidate.facts.length<=100&&
   Array.isArray(candidate.research)&&candidate.research.length<=60&&
   candidate.pages.every(p=>p&&typeof p==='object'&&
    p.intent&&p.seo&&p.responsive&&Array.isArray(p.sections)&&p.sections.length>0&&
    Array.isArray(p.links)&&Array.isArray(p.schemaCandidates));
 }
 function download(prefix){
  const name=prefix+'-'+data.siteId+'.json',content=JSON.stringify(data,null,2)+'\n';
  const file=new Blob([content],{type:'application/json'}),url=URL.createObjectURL(file);
  const a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2500);
 }
 $('draft').addEventListener('click',()=>{download('seo-brief-draft');$('message').textContent='Private draft saved; incomplete fields are allowed.'});
 $('export').addEventListener('click',()=>{
  const issue=check();
  if(issue.length){$('message').textContent='Fix '+issue.length+' field(s) before compiler export. Save draft remains available.';return;}
  download('seo-brief');$('message').textContent='Brief downloaded. Run the original Node compiler; this UI never approves a release.';
 });
 $('import').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
   if(file.size>2000000)throw Error('File exceeds 2 MB');
   const draft=JSON.parse(await file.text());
   if(!usable(draft))throw Error('Wrong site ID, unsupported or unsafe draft shape');
   data=clone(draft);draw();check();
   $('message').textContent='Private draft restored for this site.';
  }catch(error){$('message').textContent='Import rejected: '+error.message;}
  e.target.value='';
 });
 $('add-fact').addEventListener('click',()=>{
  data.facts.push({id:'',claim:'',status:'unverified',origin:'owner'});rerender();
 });
 $('add-research').addEventListener('click',()=>{
  data.research.push({url:'',observation:'',kind:'other'});rerender();
 });
 $('add-page').addEventListener('click',()=>{
  data.pages.push({id:'',path:'',name:'',intent:{type:'informational',need:'',topics:[]},
   seo:{title:'',description:'',robots:'index'},sections:[{id:'',heading:'',level:1,why:'',points:[]}],
   links:[],schemaCandidates:[],responsive:{desktop:'',tablet:'',mobile:''}});
  rerender();
 });
 draw();check();
}
module.exports=Object.freeze({starter,briefFromBlueprint,render});
