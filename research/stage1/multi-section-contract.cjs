/* AI Site CMS: Stage 1 research only. Five distinct typed AI-authored section families.
 * Closed templates and safe field bindings; NOT general-purpose AI HTML/CSS sanitizer. */
'use strict';
const assets=Object.freeze({
 cover:{kind:'image',url:'/assets/cover.png'},portrait:{kind:'image',url:'/assets/portrait.jpg'},
 clip:{kind:'video',url:'/assets/clip.webm'}
});
const fields={
 faq:{heading:{type:'text',max:120},question:{type:'text',max:180},answer:{type:'text',max:500},expanded:{type:'boolean'},headingSize:{type:'responsive-length'}},
 contact:{heading:{type:'text',max:120},nameLabel:{type:'text',max:70},emailLabel:{type:'text',max:70},submitLabel:{type:'text',max:70},successText:{type:'text',max:200},supportUrl:{type:'internal-link'}},
 pricing:{heading:{type:'text',max:120},plan:{type:'text',max:100},amount:{type:'money'},cta:{type:'text',max:90},url:{type:'internal-link'},accent:{type:'color'},headingSize:{type:'responsive-length'}},
 gallery:{heading:{type:'text',max:120},image:{type:'asset',assetKind:'image'},alt:{type:'text',max:170},video:{type:'asset',assetKind:'video'},caption:{type:'text',max:180}},
 tabs:{heading:{type:'text',max:120},first:{type:'text',max:80},second:{type:'text',max:80},firstBody:{type:'text',max:300},secondBody:{type:'text',max:300},active:{type:'enum',values:['one','two']}}
};
const fixtures={
 faq:{heading:'Frequently asked questions',question:'Can I edit a custom section?',answer:'Yes — fields remain typed, with no injected HTML.',expanded:false,headingSize:{desktop:'42px',tablet:'',mobile:''}},
 contact:{heading:'Contact the team',nameLabel:'Your name',emailLabel:'Email address',submitLabel:'Send request',successText:'Form fixture submitted locally',supportUrl:'/support/'},
 pricing:{heading:'Simple pricing',plan:'Team plan',amount:49,cta:'See details',url:'/plans/team',accent:'#0063d9',headingSize:{desktop:'48px',tablet:'38px',mobile:''}},
 gallery:{heading:'Media showcase',image:'cover',alt:'Blue-and-green sample illustration',video:'clip',caption:'Local video and image sources'},
 tabs:{heading:'Explore capabilities',first:'Design',second:'Publishing',firstBody:'Edit visual properties.',secondBody:'Publish a validated revision.',active:'one'}
};
const protoFree=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
const keysEq=(o,keys)=>protoFree(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(o,k));
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const localUrl=s=>typeof s==='string'&&s.length<=160&&/^\/(?!\/)(?:[a-z0-9/_#-]*)$/.test(s)&&!s.includes('..')&&!s.includes('\\');
const len=s=>typeof s==='string'&&/^(?:[1-9]\d?|1\d\d|200)px$/.test(s);
function validate(kind,values){
 if(!Object.prototype.hasOwnProperty.call(fields,kind))throw Error('unregistered profile');
 const spec=fields[kind];if(!keysEq(values,Object.keys(spec)))throw Error('missing/extra values');
 for(const [key,def] of Object.entries(spec)){
  const v=values[key];
  if(def.type==='text'){if(typeof v!=='string'||v.length>def.max)throw Error('bad text: '+key)}
  else if(def.type==='boolean'){if(typeof v!=='boolean')throw Error('bad boolean: '+key)}
  else if(def.type==='money'){if(!Number.isSafeInteger(v)||v<0||v>1000000)throw Error('bad amount: '+key)}
  else if(def.type==='internal-link'){if(!localUrl(v))throw Error('bad local URL: '+key)}
  else if(def.type==='color'){if(typeof v!=='string'||!/^#[0-9a-fA-F]{6}$/.test(v))throw Error('bad color: '+key)}
  else if(def.type==='asset'){if(typeof v!=='string'||assets[v]?.kind!==def.assetKind)throw Error('bad asset: '+key)}
  else if(def.type==='enum'){if(!def.values.includes(v))throw Error('bad enum: '+key)}
  else if(def.type==='responsive-length'){
   if(!keysEq(v,['desktop','tablet','mobile'])||!len(v.desktop)||!['tablet','mobile'].every(bp=>v[bp]===''||len(v[bp])))throw Error('bad device lengths: '+key);
  }else throw Error('unregistered field type');
 }
 return true;
}
function resolveSize(v,device){
 if(!['desktop','tablet','mobile'].includes(device))throw Error('unknown device');
 return device==='desktop'?v.desktop:device==='tablet'?(v.tablet||v.desktop):(v.mobile||v.tablet||v.desktop);
}
function jsonSchema(kind){
 if(!fields[kind])throw Error('unregistered profile');
 const props={};for(const [key,def] of Object.entries(fields[kind])){
  if(def.type==='text')props[key]={type:'string',maxLength:def.max};
  if(def.type==='boolean')props[key]={type:'boolean'};
  if(def.type==='money')props[key]={type:'integer',minimum:0,maximum:1000000};
  if(def.type==='internal-link')props[key]={type:'string',maxLength:160,pattern:'^/(?!/)[a-z0-9/_#-]*$'};
  if(def.type==='color')props[key]={type:'string',pattern:'^#[a-fA-F0-9]{6}$'};
  if(def.type==='asset')props[key]={type:'string',enum:Object.keys(assets).filter(a=>assets[a].kind===def.assetKind)};
  if(def.type==='enum')props[key]={type:'string',enum:def.values};
  if(def.type==='responsive-length')props[key]={type:'object',additionalProperties:false,required:['desktop','tablet','mobile'],properties:{
   desktop:{type:'string',pattern:'^(?:[1-9][0-9]?|1[0-9][0-9]|200)px$'},
   tablet:{type:'string',pattern:'^(?:|[1-9][0-9]?px|1[0-9][0-9]px|200px)$'},
   mobile:{type:'string',pattern:'^(?:|[1-9][0-9]?px|1[0-9][0-9]px|200px)$'}
  }};
 }
 return {$schema:'https://json-schema.org/draft/2020-12/schema',type:'object',additionalProperties:false,required:Object.keys(props),properties:props};
}
const tag=(name,id,attrs={},body='')=>{
 if(!/^[a-z][a-z0-9-]+$/.test(id))throw Error('unstable element id');
 const attributes=['data-stable-id="'+id+'"',...Object.entries(attrs).map(([k,v])=>{if(!/^(?:class|type|href|src|alt|id|for|role|aria-[a-z-]+|data-[a-z-]+|required|hidden|muted|playsinline|preload)$/.test(k))throw Error('not permitted attribute');return k+'="'+esc(v)+'"'})];
 return '<'+name+' '+attributes.join(' ')+'>' +body+'</'+name+'>';
};
function render(kind,v,device='desktop'){
 validate(kind,v);
 if(!['desktop','tablet','mobile'].includes(device))throw Error('bad device');
 const E=esc;
 let html='';
 const t=(name,id,attrs={},body='')=>tag(name,kind+'-'+id,attrs,body);
 if(kind==='faq'){
  html=t('h2','heading',{'data-size':resolveSize(v.headingSize,device)},E(v.heading))+
   t('button','toggle',{type:'button','data-action':'toggle','aria-expanded':String(v.expanded)},E(v.question))+
   t('div','answer',v.expanded?{}:{hidden:'hidden'},t('p','answer-text',{},E(v.answer)));
 }
 if(kind==='contact'){
  html=t('h2','heading',{},E(v.heading))+
   t('form','form',{'data-action':'local-form'},
    t('label','name-label',{for:'contact-name'},E(v.nameLabel))+
    t('input','name',{id:'contact-name',type:'text',required:'required'})+
    t('label','email-label',{for:'contact-email'},E(v.emailLabel))+
    t('input','email',{id:'contact-email',type:'email',required:'required'})+
    t('button','submit',{type:'submit'},E(v.submitLabel)))+
   t('p','success',{'data-success-text':v.successText},'')+
   t('a','support',{href:v.supportUrl},'Support');
 }
 if(kind==='pricing'){
  html=t('h2','heading',{'data-size':resolveSize(v.headingSize,device)},E(v.heading))+
   t('article','plan',{'data-accent':v.accent},
    t('h3','plan-title',{},E(v.plan))+
    t('strong','price',{},'$'+v.amount)+
    t('a','cta',{href:v.url},E(v.cta)));
 }
 if(kind==='gallery'){
  html=t('h2','heading',{},E(v.heading))+
   t('figure','figure',{},
    t('img','image',{src:assets[v.image].url,alt:v.alt},'')+
    t('figcaption','caption',{},E(v.caption)))+
   t('video','video',{src:assets[v.video].url,preload:'metadata',muted:'muted',playsinline:'playsinline'},'');
 }
 if(kind==='tabs'){
  html=t('h2','heading',{},E(v.heading))+
   t('div','tab-buttons',{},t('button','tab-one',{type:'button','data-action':'one','aria-selected':String(v.active==='one')},E(v.first))+
    t('button','tab-two',{type:'button','data-action':'two','aria-selected':String(v.active==='two')},E(v.second)))+
   t('div','panel-one',v.active==='one'?{}:{hidden:'hidden'},E(v.firstBody))+
   t('div','panel-two',v.active==='two'?{}:{hidden:'hidden'},E(v.secondBody));
 }
 // Only trusted closed renderer functions, no direct user-supplied HTML.
 const out=t('section','root',{'data-kind':kind},html);
 if(out.length>16000)throw Error('render budget exceeded');
 return out;
}
module.exports={assets,fields,fixtures,validate,resolveSize,jsonSchema,render};
