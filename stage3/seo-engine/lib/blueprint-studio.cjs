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
  '.arch-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:11px;margin-top:13px}',
  '.arch-page{border:1px solid var(--line);border-radius:12px;padding:14px;background:#fbfdfe;overflow-wrap:anywhere}',
  '.arch-page strong{display:block}.arch-page .route{font-size:12px;color:var(--muted)}',
  '.baseline-list{padding-left:22px}.baseline-list li{padding:7px 0;border-bottom:1px solid var(--line);overflow-wrap:anywhere}',
  '.chip{display:inline-block;font-size:11px;font-weight:700;padding:3px 8px;margin:8px 5px 0 0;background:#e8f4f1;color:#166d62;border-radius:40px}',
  '.chip.warn{background:#fff0df;color:#925329}.arch-signals{padding-left:20px}.arch-signals li{margin:6px 0}',
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
  '<section class="panel"><h2>Draft vs previous SEO Blueprint</h2>'+ 
  '<p class="muted small">Optional local comparison while editing. Import a previous v1 brief or compiled Blueprint for the SAME site. This preview is tentative: no SHA256, actual CMS status, redirect or client authorization is verified until the strict Node comparison command runs.</p>'+ 
  '<div class="toolbar"><label class="file">Load previous private Blueprint/brief <input id="baseline-import" type="file" accept=".json,application/json"></label>'+ 
  '<button id="baseline-clear" class="secondary" type="button">Clear comparison</button></div>'+ 
  '<p id="baseline-status" class="muted"></p><div id="baseline-stats" class="stats"></div>'+ 
  '<ol id="baseline-list" class="baseline-list"></ol></section>'+ 
  '<section class="panel"><h2>Architecture intelligence — live draft</h2>'+ 
  '<p class="muted small">Only the explicitly planned contextual links and CTAs are counted. Navigation, live crawling, search rankings and actual indexation are unknown. This preview is not the authoritative architecture audit.</p>'+ 
  '<div id="arch-overview" class="stats"></div><div id="arch-pages" class="arch-grid"></div>'+ 
  '<h3>Editorial signals</h3><ol id="arch-signals" class="arch-signals"></ol></section>'+
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
  '<p>After exporting <code>seo-brief-*.json</code>, run <code>node stage3/seo-engine/bin/seo-blueprint.cjs compile --brief /ABS/private/seo-brief.json</code> and save the JSON output privately. Then run <code>review-blueprint</code> and <code>review-architecture</code> on that compiled Blueprint. To compare against an approved previous release, run <code>compare-seo-blueprints.cjs --before /ABS/OLD.json --after /ABS/NEW.json --out /ABS/PRIVATE</code>. Owner approval and CMS integration remain separate.</p>'+
  '<p class="notice">Keep files PRIVATE. Do not enter passwords, customer personal data, recipient addresses or unapproved promises. Export does not prove search volumes, factual accuracy, rendered pages or acceptance.</p></section>'+
  '<script type="application/json" id="source-json">'+json+'</script><script>'+script+'</script></main></body></html>';
}
function editor(){
 'use strict';
 const $=id=>document.getElementById(id),clone=x=>JSON.parse(JSON.stringify(x));
 const initial=JSON.parse($('source-json').textContent);
 let data=clone(initial),expanded=new Set(),baseline=null;
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
  if(opt.readOnly)e.readOnly=true;
  const change=()=>{
   if(opt.lines)obj[key]=e.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   else if(opt.number)obj[key]=Number(e.value);
   else if(opt.optional&&!e.value.trim())delete obj[key];
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
 function card(parent,title,sub,key){
  const d=node('details',undefined,'card'),summary=node('summary',title+' · '+sub);
  d.open=expanded.has(key);
  d.addEventListener('toggle',()=>{if(d.open)expanded.add(key);else expanded.delete(key)});
  d.append(summary);parent.append(d);return d;
 }
 function rerender(){draw();check();}
 function drop(collection,index){collection.splice(index,1);rerender();}
 function draw(){
  $('site').replaceChildren();$('facts').replaceChildren();$('research').replaceChildren();$('pages').replaceChildren();
  [['Site ID','siteId'],['Site name','title'],['Region served','region'],
   ['Audience','audience'],['Business goal','goal']].forEach(([name,key])=>
    field($('site'),name,data,key,{full:key==='audience'||key==='goal',readOnly:key==='siteId'}));
  field($('site'),'Primary language',data,'language',{options:choices.language});
  data.facts.forEach((f,i)=>{
   const n=nest($('facts'),'Fact '+(i+1));n.head.append(button('Remove',()=>drop(data.facts,i),'danger'));
   field(n.fields,'Fact ID',f,'id');field(n.fields,'Claim / exact owner evidence',f,'claim',{full:true});
   field(n.fields,'Verification status',f,'status',{options:choices.status});
   field(n.fields,'Origin',f,'origin',{options:choices.origin});
   field(n.fields,'HTTPS source (optional)',f,'source',{full:true,optional:true});
  });
  data.research.forEach((r,i)=>{
   const n=nest($('research'),'Research '+(i+1));n.head.append(button('Remove',()=>drop(data.research,i),'danger'));
   field(n.fields,'HTTPS URL',r,'url',{full:true});
   field(n.fields,'Observation',r,'observation',{full:true});
   field(n.fields,'Source type',r,'kind',{options:choices.research});
  });
  data.pages.forEach((p,i)=>{
   const item=card($('pages'),p.name||p.id,p.path,'page:'+i);
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
   field(grid,'Canonical page path (optional)',p.seo,'canonicalPath',{optional:true});
   field(grid,'OG title (optional)',p.seo,'ogTitle',{optional:true});
   field(grid,'OG description (optional)',p.seo,'ogDescription',{full:true,optional:true});
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
    field(n.fields,'Interaction notes (optional)',s,'interaction',{full:true,optional:true});
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
  const issues=[],add=(id,msg)=>issues.push(id+': '+msg),ids=new Set(),pageIds=new Set(),paths=new Set(),factIds=new Set();
  const text=(v,n=1,max=700)=>typeof v==='string'&&v.trim().length>=n&&v.length<=max&&
   !/[\x00-\x1f]/.test(v)&&!/<\s*\/?\s*[a-z][^>]*>/i.test(v);
  if(!idPattern.test(data.siteId||''))add('siteId','Use lowercase stable ID (3–80 characters)');
  for(const [k,max] of [['title',130],['region',120],['audience',600],['goal',600]])
   if(!text(data[k],1,max))add(k,'Required text (max '+max+' characters)');
  if(!choices.language.includes(data.language))add('language','Unsupported language');
  if(!Array.isArray(data.pages)||!data.pages.length||data.pages.length>80)add('pages','1–80 pages required');
  if(!Array.isArray(data.facts)||data.facts.length>100)add('facts','Maximum 100 facts');
  if(!Array.isArray(data.research)||data.research.length>60)add('research','Maximum 60 sources');
  for(const f of all(data.facts)){
   if(!idPattern.test(f.id||'')||factIds.has(f.id))add('fact','Missing, invalid or duplicate fact ID');
   factIds.add(f.id);
   if(!text(f.claim,1,600))add('fact '+f.id,'Claim required (max 600 characters)');
   if(!choices.status.includes(f.status)||!choices.origin.includes(f.origin))
    add('fact '+f.id,'Verification status and source origin required');
   if(f.source&&!/^https:\/\/[^@\s/?#]+[^\s]*$/i.test(f.source))add('fact '+f.id,'HTTPS source required');
  }
  for(const r of all(data.research)){
   if(!/^https:\/\/[^@\s/?#]+[^\s]*$/i.test(r.url||''))add('research','HTTPS URL required');
   if(!text(r.observation,1,800)||!choices.research.includes(r.kind))
    add('research','Observation (max 800 characters) and source type required');
  }
  for(const pg of all(data.pages)){
   if(!idPattern.test(pg.id||'')||ids.has(pg.id))add('page','Invalid or duplicate page ID');
   ids.add(pg.id);pageIds.add(pg.id);
   if(!pathPattern.test(pg.path||'')||paths.has(pg.path))add('page '+pg.id,'Invalid/duplicate trailing-slash route');
   paths.add(pg.path);
   if(!text(pg.name,1,160)||!text(pg.intent?.need,1,500)||
    !choices.intent.includes(pg.intent.type)||!all(pg.intent?.topics).length||
    pg.intent.topics.length>15||all(pg.intent?.topics).some(v=>!text(v,1,100)))
    add('page '+pg.id,'Name, intent, visitor need and 1–15 topics required');
   if(!text(pg.seo?.title,1,160)||!text(pg.seo?.description,1,300)||
    !choices.robots.includes(pg.seo.robots)||pg.seo.ogTitle&&!text(pg.seo.ogTitle,1,160)||
    pg.seo.ogDescription&&!text(pg.seo.ogDescription,1,300))
    add('page '+pg.id,'Valid SEO title (160 max), meta description (300 max), robots and optional OG required');
   let h1=0;
   if(!all(pg.sections).length)add('page '+pg.id,'At least one section required');
   if(pg.sections.length>40)add('page '+pg.id,'Maximum 40 sections');
   if(pg.links.length>80)add('page '+pg.id,'Maximum 80 internal links');
   if(pg.schemaCandidates.length>12)add('page '+pg.id,'Maximum 12 schema candidates');
   for(const s of all(pg.sections)){
    if(!idPattern.test(s.id||'')||ids.has(s.id))add('section','Invalid or reused section ID');
    ids.add(s.id);if(s.level===1)h1++;
    if(!text(s.heading,1,180)||!text(s.why,1,500)||!Number.isSafeInteger(s.level)||
     s.level<1||s.level>6||!all(s.points).length||s.points.length>15||
     s.points.some(x=>!text(x,1,300)))
     add('section '+s.id,'Heading, H-level, purpose and 1–15 points required');
    if(s.cta&&(!text(s.cta.label)||!text(s.cta.purpose)))add('section '+s.id,'CTA label and purpose required');
    if(s.media&&(!choices.media.includes(s.media.purpose)||!text(s.media.why,1,300)||
      s.media.purpose==='informative'&&!text(s.media.alt,1,200)||
      s.media.purpose==='decorative'&&s.media.alt!==''))
     add('section '+s.id,'Media purpose, alt and reason must agree');
   }
   if(h1!==1)add('page '+pg.id,'Exactly one H1 section required');
   for(const r of ['desktop','tablet','mobile'])if(!text(pg.responsive?.[r],1,700))
    add('page '+pg.id,'Missing '+r+' behavior');
  }
  if(!paths.has('/'))add('pages','Home / route required');
  for(const p of all(data.pages)){
   if(p.seo.canonicalPath&&!paths.has(p.seo.canonicalPath))add('page '+p.id,'Canonical path missing from page map');
   for(const link of all(p.links))if(!pageIds.has(link.toPageId)||!text(link.anchor)||!text(link.why))
    add('page '+p.id,'Internal link target ID / anchor / purpose missing');
   for(const s of all(p.sections))if(s.cta&&(!pageIds.has(s.cta.toPageId)||!text(s.cta.label)||!text(s.cta.purpose)))
    add('section '+s.id,'CTA target or text missing');
   for(const c of all(p.schemaCandidates))if(!choices.schema.includes(c.type)||!all(c.factIds).length||
    c.factIds.length>20||all(c.factIds).some(id=>!factIds.has(id))||!text(c.why))
    add('page '+p.id,'Schema fact ID reference or why missing');
  }
  return issues.slice(0,120);
 }
 function architecture(){
  const home=data.pages.find(p=>p.path==='/'),byId=new Map(data.pages.map(p=>[p.id,p])),
   routes=new Map(data.pages.map(p=>[p.path,p])),
   inbound=new Map(data.pages.map(p=>[p.id,0])),
   indexedInbound=new Map(data.pages.map(p=>[p.id,0])),
   edgeMap=new Map(),warnings=[];
  const warning=(id,msg)=>warnings.push(id+': '+msg);
  for(const pg of data.pages){
   const outgoing=[...all(pg.links).map(l=>l.toPageId),
    ...all(pg.sections).filter(s=>s.cta).map(s=>s.cta.toPageId)];
   edgeMap.set(pg.id,outgoing);
   outgoing.forEach(id=>{
    if(!byId.has(id))return;
    inbound.set(id,(inbound.get(id)||0)+1);
    if(pg.seo.robots==='index')indexedInbound.set(id,(indexedInbound.get(id)||0)+1);
   });
  }
  const reached=new Set(),queue=home?[home.id]:[];
  for(let i=0;i<queue.length;i++){
   const id=queue[i];if(reached.has(id))continue;
   reached.add(id);
   for(const target of edgeMap.get(id)||[])if(byId.has(target)&&!reached.has(target))queue.push(target);
  }
  const topics=new Map(),titles=new Map(),facts=new Map(data.facts.map(f=>[f.id,f]));
  for(const pg of data.pages){
   if(pg.seo.robots!=='index')continue;
   const topic=(pg.intent.type+'|'+(pg.intent.topics[0]||'')).normalize('NFKC').toLowerCase().trim(),
    title=(pg.seo.title||'').normalize('NFKC').toLowerCase().trim();
   if(topic.endsWith('|'))continue;
   if(topics.has(topic))warning(pg.path,
    'Declared primary intent/topic overlaps with '+topics.get(topic)+
    '; confirm distinct visitor needs (not proof of search cannibalization).');
   else topics.set(topic,pg.path);
   if(title&&titles.has(title))warning(pg.path,
    'Planned SEO title duplicates '+titles.get(title)+'.');
   else if(title)titles.set(title,pg.path);
  }
  $('arch-overview').replaceChildren();$('arch-pages').replaceChildren();$('arch-signals').replaceChildren();
  const indexed=data.pages.filter(p=>p.seo.robots==='index');
  for(const [name,value] of [
   ['Indexed plan',indexed.length],['Orphan plan',indexed.filter(p=>p.path!=='/'&&!indexedInbound.get(p.id)).length],
   ['Unreachable plan',indexed.filter(p=>p.path!=='/'&&!reached.has(p.id)).length],
   ['Explicit edges',[...edgeMap.values()].reduce((n,list)=>n+list.length,0)]]){
    const el=node('div',undefined,'stat');
    append(el,node('small',name),node('b',String(value)));
    $('arch-overview').append(el);
  }
  for(const pg of data.pages){
   const el=node('article',undefined,'arch-page');
   append(el,node('strong',pg.name||pg.id||'(unnamed page)'),
    node('div',pg.path||'(route incomplete)','route'));
   const status=pg.seo.robots==='index'?'planned index':'planned noindex';
   append(el,node('span',status,'chip'));
   if(pg.path!=='/'&&!indexedInbound.get(pg.id)){
    append(el,node('span','No indexed inbound link','chip warn'));
    if(pg.seo.robots==='index')warning(pg.path,
     'No direct contextual link / CTA from an indexed page; actual navigation not included.');
   }
   if(pg.path!=='/'&&!reached.has(pg.id)){
    append(el,node('span','Unreachable by planned edges','chip warn'));
    if(pg.seo.robots==='index')warning(pg.path,
     'Not reached from / through planned links/CTAs; verify navigation in the final site.');
   }
   append(el,node('div',
    (inbound.get(pg.id)||0)+' planned incoming · '+(edgeMap.get(pg.id)||[]).length+
    ' outgoing · canonical '+(pg.seo.canonicalPath||pg.path),'small muted'));
   $('arch-pages').append(el);
   const canonical=pg.seo.canonicalPath;
   if(canonical&&routes.has(canonical)&&routes.get(canonical).seo.robots==='noindex')
    warning(pg.path,'Canonical points to a planned noindex page '+canonical+'.');
   if(canonical&&routes.has(canonical)&&routes.get(canonical).seo.canonicalPath&&
    routes.get(canonical).seo.canonicalPath!==canonical)
    warning(pg.path,'Canonical target itself points elsewhere; confirm direct canonical.');
   for(const sc of pg.schemaCandidates){
    const unverified=sc.factIds.filter(id=>facts.get(id)?.status!=='confirmed');
    if(unverified.length)warning(pg.path,'Schema.org '+sc.type+
     ' uses unconfirmed/missing fact IDs: '+unverified.join(', ')+
     '; do not publish structured data from these claims.');
   }
  }
  if(!warnings.length)$('arch-signals').append(node('li',
   'No additional warnings in the declared link plan. This does not prove real crawlability.'));
  else warnings.slice(0,60).forEach(w=>$('arch-signals').append(node('li',w)));
  if(warnings.length>60)$('arch-signals').append(node('li',
   'Additional signals omitted from this local preview.'));
 }
 function compareBaseline(){
  $('baseline-stats').replaceChildren();$('baseline-list').replaceChildren();
  if(!baseline){
   $('baseline-status').textContent='No previous plan loaded. This does not block a new-site brief.';
   return;
  }
  const previous=new Map(baseline.pages.map(p=>[p.id,p]));
  const current=new Map(data.pages.map(p=>[p.id,p]));
  let moved=0,added=0,removed=0,seo=0,sections=0,links=0;
  const entries=[];
  const say=(id,message)=>entries.push((id||'site')+': '+message);
  const byId=[...new Set([...previous.keys(),...current.keys()])].sort();
  if(baseline.language!==data.language||baseline.region!==data.region||
   baseline.goal!==data.goal||baseline.audience!==data.audience)
   say('site','Language, region, audience or business goal draft changed.');
  for(const id of byId){
   const a=previous.get(id),b=current.get(id);
   if(!a){added++;say(id,'New page '+b.path+' — live route is not verified.');continue;}
   if(!b){removed++;say(id,'Page '+a.path+' removed — owner must decide whether to retire or redirect.');continue;}
   if(a.path!==b.path){moved++;say(id,
    'Planned route '+a.path+' → '+b.path+
    '; this editor does not create or verify a 301 redirect.');}
   const prevCanon=a.seo.canonicalPath||a.path,newCanon=b.seo.canonicalPath||b.path;
   const fields=['title','description','robots','ogTitle','ogDescription'].filter(
    k=>(a.seo[k]||'')!==(b.seo[k]||''));
   if(prevCanon!==newCanon)fields.push('canonical');
   if(fields.length){seo++;say(id,'SEO head plan changed: '+fields.join(', ')+'.');}
   if(JSON.stringify(a.intent)!==JSON.stringify(b.intent))
    say(id,'Visitor intent/topics changed — check against approved audience.');
   const simplify=link=>[link.toPageId,link.anchor,link.why];
   const previousLinks=a.links.map(simplify),currentLinks=b.links.map(simplify);
   if(JSON.stringify(previousLinks)!==JSON.stringify(currentLinks)){
    links++;say(id,'Contextual link plan changed. Inspect actual CMS/rendered links.');
   }
   const prevSec=a.sections.map(s=>JSON.stringify(s)),newSec=b.sections.map(s=>JSON.stringify(s));
   if(JSON.stringify(prevSec)!==JSON.stringify(newSec)){
    sections++;say(id,'Section/heading/CTA or media plan revised.');
   }
  }
  const badges=[['Moved URLs',moved],['Added pages',added],
   ['Removed pages',removed],['SEO head changes',seo],['Section changes',sections],
   ['Link changes',links]];
  for(const [name,n] of badges){
   const el=node('div',undefined,'stat');append(el,node('small',name),node('b',String(n)));
   $('baseline-stats').append(el);
  }
  $('baseline-status').textContent='UNVERIFIED BROWSER PREVIEW · '+
   baseline.pages.length+' baseline pages → '+data.pages.length+
   ' current draft pages. For authoritative source SHA256, P0/P1/P2 and 301 checks run compare-seo-blueprints.cjs.';
  if(!entries.length)$('baseline-list').append(node('li',
   'No differences in the fields covered by this lightweight preview; authoritative full compiler comparison still required.'));
  else entries.slice(0,130).forEach(x=>$('baseline-list').append(node('li',x)));
  if(entries.length>130)$('baseline-list').append(node('li','Additional changes omitted from browser preview.'));
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
  architecture();
  compareBaseline();
  return issue;
 }
 function usable(candidate){
  return candidate&&typeof candidate==='object'&&!Array.isArray(candidate)&&
   candidate.format===initial.format&&candidate.siteId===initial.siteId&&
   Array.isArray(candidate.pages)&&candidate.pages.length>0&&candidate.pages.length<=80&&
   Array.isArray(candidate.facts)&&candidate.facts.length<=100&&
   Array.isArray(candidate.research)&&candidate.research.length<=60&&
   candidate.facts.every(f=>f&&typeof f==='object'&&!Array.isArray(f))&&
   candidate.research.every(r=>r&&typeof r==='object'&&!Array.isArray(r))&&
   candidate.pages.every(p=>p&&typeof p==='object'&&
    p.intent&&typeof p.intent==='object'&&Array.isArray(p.intent.topics)&&
    p.seo&&typeof p.seo==='object'&&p.responsive&&typeof p.responsive==='object'&&
    Array.isArray(p.sections)&&p.sections.length>0&&p.sections.length<=40&&
    p.sections.every(s=>s&&typeof s==='object'&&!Array.isArray(s)&&
     Array.isArray(s.points)&&(!s.cta||typeof s.cta==='object')&&
     (!s.media||typeof s.media==='object'))&&
    Array.isArray(p.links)&&p.links.every(l=>l&&typeof l==='object')&&
    Array.isArray(p.schemaCandidates)&&p.schemaCandidates.every(c=>c&&typeof c==='object'&&Array.isArray(c.factIds)));

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
 $('baseline-import').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
   if(file.size>2000000)throw Error('Baseline file exceeds 2 MB');
   const original=JSON.parse(await file.text());
   if(!original||!['manufact-seo-brief-v1','manufact-seo-blueprint-v1'].includes(original.format)||
    original.siteId!==initial.siteId||!Array.isArray(original.pages)||
    original.pages.length<1||original.pages.length>80||
    !original.pages.every(p=>p&&idPattern.test(p.id)&&pathPattern.test(p.path)&&
     p.seo&&typeof p.seo==='object'&&p.intent&&typeof p.intent==='object'&&
     Array.isArray(p.sections)&&Array.isArray(p.links)))
    throw Error('A same-site v1 brief or Blueprint with identifiable pages is required');
   baseline={siteId:original.siteId,format:original.format,pages:original.pages,
    language:original.language,region:original.region,goal:original.goal,audience:original.audience};
   compareBaseline();
   $('message').textContent='Private baseline preview loaded; only the Node comparison authenticates canonical structure.';
  }catch(error){$('message').textContent='Baseline import refused: '+error.message;}
  e.target.value='';
 });
 $('baseline-clear').addEventListener('click',()=>{
  baseline=null;compareBaseline();
  $('message').textContent='Comparison cleared; current authoring draft was not changed.';
 });
 $('import').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
   if(file.size>2000000)throw Error('File exceeds 2 MB');
   const draft=JSON.parse(await file.text());
   if(!usable(draft))throw Error('Wrong site ID, unsupported or unsafe draft shape');
   data=clone(draft);expanded=new Set();draw();check();
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
  expanded.add('page:'+(data.pages.length-1));
  rerender();
 });
 draw();check();
}
module.exports=Object.freeze({starter,briefFromBlueprint,render});
