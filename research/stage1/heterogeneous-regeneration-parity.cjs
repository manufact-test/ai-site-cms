/* AI Site CMS stage 1 RESEARCH ONLY.
 * Heterogeneous graph 4→5 with owner edits, full mixed component view across
 * typed HTML, independently implemented PHP, React and Next static export.
 * NOT arbitrary generated-site import, production runtime or Next SSR.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {MixedSite}=require('./heterogeneous-react-view.cjs');
const {manifestFixtures,createRevisionStore,renderSafe,publicShape}=require('./versioned-site-reconciliation.cjs');
const {v1,v2,aliases}=manifestFixtures();
const approvedAssets=new Set(['/fixtures/orb.svg','/fixtures/reef.svg']);
const phpFile=path.join(__dirname,'heterogeneous-renderer.php');
let checks=0;
function check(test,...rest){assert.ok(test,...rest);checks++}
function deep(a,b,message){assert.deepEqual(a,b,message);checks++}
function equal(a,b,message){assert.equal(a,b,message);checks++}
function php(shape){
 const x=spawnSync('php',[phpFile],{input:JSON.stringify(shape),encoding:'utf8',timeout:15000});
 equal(x.status,0,'PHP refused valid shape: '+x.stderr);
 return x.stdout;
}
function semantic(markup,shape) {
 const doc=new JSDOM(markup).window.document;
 const mains=doc.querySelectorAll('main[data-site="tide-atlas"]');
 equal(mains.length,1,'exactly one root');
 const main=mains[0],sections=[...main.children];
 equal(sections.length,shape.length,'component count');
 equal(main.querySelectorAll('script,iframe,object,embed,form').length,0,'no copied executable or network form');
 const seen=new Set(),result=[];
 for(let i=0;i<shape.length;i++){
  const c=shape[i],node=sections[i],v=c.values;
  equal(node.tagName,'SECTION','only vetted sections');
  equal(node.getAttribute('data-cms-id'),c.id,'stable IDs and order');
  check(!seen.has(c.id),'duplicate ID');seen.add(c.id);
  for(const e of [node,...node.querySelectorAll('*')]){
   for(const attr of e.attributes) {
    check(!/^on/i.test(attr.name)&&attr.name!=='style','no injected script attribute/style');
    if(['href','src'].includes(attr.name))
     check(attr.name==='src'?approvedAssets.has(attr.value):/^#[a-z][a-z0-9-]{0,40}$/.test(attr.value),'URL allowlist');
   }
  }
  if(c.kind==='hero'){
   equal(node.id,'hero');equal(node.querySelector('h1').textContent,v.headline);
   equal(node.querySelector('a').textContent,'Explore');equal(node.querySelector('a').getAttribute('href'),v.ctaHref);
   equal(node.querySelector('img').getAttribute('src'),v.featureAsset==='orb'?'/fixtures/orb.svg':'/fixtures/reef.svg');
   equal(node.querySelector('img').getAttribute('alt'),'Curated artwork');
   equal(node.querySelectorAll('*').length,3);
  }else if(c.kind==='accordion'){
   const d=node.querySelector('details');
   equal(d.hasAttribute('open'),v.open);equal(d.querySelector('summary').textContent,v.title);
   equal(d.querySelector('p').textContent,'Reviewed disclosure');equal(node.querySelectorAll('*').length,3);
  }else if(c.kind==='form'){
   equal(node.id,'signup');
   const input=node.querySelector('input'),btn=node.querySelector('button');
   equal(input.type,'email');equal(input.getAttribute('placeholder'),v.placeholder);
   equal(btn.type,'button');equal(btn.disabled,!v.enabled);
   equal(btn.textContent,'Preview only');equal(node.querySelectorAll('*').length,3);
  }else if(c.kind==='media'){
   const img=node.querySelector('img');
   equal(img.getAttribute('src'),v.asset==='orb'?'/fixtures/orb.svg':'/fixtures/reef.svg');
   equal(img.getAttribute('alt'),v.alt);equal(node.querySelectorAll('*').length,1);
  }else if(c.kind==='copy'){
   equal(node.querySelector('p').textContent,v.body);equal(node.querySelectorAll('*').length,1);
  }else throw Error('unvetted component');
  result.push({id:c.id,kind:c.kind,values:v});
 }
 return result;
}
function raw(shape){
 const manifest=shape.map(c=>({...c,defaults:c.values}));
 // All output must originate in the validated typed manifest.
 const version='9.0.0';
 const result=renderSafe({siteId:'tide-atlas',version,components:manifest},{});
 return {markup:'<main data-site="tide-atlas">'+result.html+'</main>',css:result.css};
}
async function nextExport(shape,temp){
 fs.writeFileSync(path.join(temp,'package.json'),JSON.stringify({name:'stage1-hetero-export',private:true,version:'0.0.0'}));
 fs.writeFileSync(path.join(temp,'next.config.js'),"module.exports={output:'export',reactStrictMode:true,images:{unoptimized:true},eslint:{ignoreDuringBuilds:true}};\n");
 fs.copyFileSync(path.join(__dirname,'heterogeneous-react-view.cjs'),path.join(temp,'heterogeneous-react-view.cjs'));
 fs.mkdirSync(path.join(temp,'pages'));
 const page=[
  "const React=require('react');",
  "const MixedSite=require('../heterogeneous-react-view.cjs').MixedSite;",
  'const state='+JSON.stringify(shape)+';',
  'module.exports=function Page(){return React.createElement(MixedSite,{shape:state})};'
 ].join('\n');
 fs.writeFileSync(path.join(temp,'pages/index.js'),page);
 const p=spawnSync(process.execPath,[require.resolve('next/dist/bin/next'),'build',temp],{
  cwd:__dirname,encoding:'utf8',timeout:220000,env:{...process.env,CI:'1',NEXT_TELEMETRY_DISABLED:'1'},maxBuffer:4*1024*1024});
 equal(p.status,0,'Next build failed: '+p.stderr+'\n'+p.stdout.slice(-3000));
 const output=path.join(temp,'out','index.html');
 check(fs.existsSync(output),'Next did not export index.html');
 const doc=new JSDOM(fs.readFileSync(output,'utf8')).window.document;
 const main=doc.querySelector('main[data-site="tide-atlas"]');
 check(main,'missing exported main');
 // React/Next may add preload tags outside the mixed-site subtree; compare
 // the actual exported main, not a fabricated React render in place of Next.
 check(!doc.documentElement.outerHTML.includes('cms-editor'),'CMS code absent from export');
 return main.outerHTML;
}
async function run(){
 const temp=fs.mkdtempSync(path.join(__dirname,'.hetero-next-'));
 try{
  const store=createRevisionStore(v1);
  store.setOwner('hero-anchor/headline','Owner <script>alert(1)</script> & data');
  store.setOwner('hero-anchor/gradientFrom','#112233');
  store.setOwner('hero-anchor/ctaHref','#signup');
  store.setOwner('badge-image/alt','Curated <svg onload=evil()>');
  store.setOwner('faq-block/open',true);
  store.setOwner('signup-block/placeholder','owner@example.com');
  store.saveDraft();
  const published1=store.publish();
  const snapshot1=store.snapshot();
  equal(published1.manifest.version,'1.0.0');
  const staged=store.stageAI(v2,aliases);
  check(staged.canPublish,'reviewed stable-id migration should be compatible');
  store.acceptStage(staged.stageId);
  equal(store.snapshot().published.manifest.version,'1.0.0','staging cannot publish');
  const published2=store.publish();
  const states=[published1,published2];
  let matches=0;
  for(const rev of states){
   const shape=publicShape(rev.manifest,rev.overrides);
   const baseline=raw(shape);
   const viaPHP=php(shape);
   const viaReact=renderToStaticMarkup(React.createElement(MixedSite,{shape}));
   for(const html of [baseline.markup,viaPHP,viaReact]) {
    deep(semantic(html,shape),shape,'full mixed site semantic mismatch');
    matches++;
   }
   check(baseline.css.includes('linear-gradient(125deg,'),'gradient retained in trusted CSS');
   check(baseline.css.includes('prefers-reduced-motion:reduce'),'reduced-motion fallback');
   check(!baseline.css.includes('url('),'no arbitrary CSS url');
   check(!baseline.markup.includes('<script>'),'hostile text escaped');
   if(rev===published2) {
    deep(shape.map(x=>x.id),['faq-block','badge-image','hero-focal','signup-block','editorial-notes']);
    equal(shape[2].values.headline,'Owner <script>alert(1)</script> & data');
    equal(shape[2].values.gradientFrom,'#112233');
    equal(shape[1].values.alt,'Curated <svg onload=evil()>');
    const next=await nextExport(shape,temp);
    deep(semantic(next,shape),shape,'Next export lost a component or owner value');
    matches++;
    // Mutation oracle: the semantic validator must catch editability loss,
    // dropped components, unsafe interactions and incorrect a11y metadata.
    const attacks=[
     baseline.markup.replace('data-site="tide-atlas"','data-site="other"'),
     baseline.markup.replace('data-cms-id="faq-block"','data-missing="faq-block"'),
     baseline.markup.replace('</main>','<section data-cms-id="extra"></section></main>'),
     baseline.markup.replace('href="#signup"','href="javascript:alert(1)"'),
     baseline.markup.replace('type="button"','type="submit"'),
     baseline.markup.replace('alt="Curated artwork"','alt=""'),
     baseline.markup.replace('</main>','<script>alert(1)</script></main>'),
     baseline.markup.replace('data-cms-id="badge-image"','data-cms-id="faq-block"'),
     baseline.markup.replace('Preview only','Preview changed'),
     baseline.markup.replace('Owner &lt;script&gt;','Hidden &lt;script&gt;')
    ];
    for(const [idx,mutated] of attacks.entries()){
     assert.throws(()=>semantic(mutated,shape),'mutation was not detected: '+idx);checks++;
    }
    const invalid=[
     {...shape[0],values:{...shape[0].values,title:'unexpected'}},
     {...shape[0],id:'../../admin.php'},
     {...shape[2],values:{...shape[2].values,featureAsset:'../secret'}},
     {...shape[2],values:{...shape[2].values,ctaHref:'javascript:evil()'}},
     {...shape[2],values:{...shape[2].values,gradientFrom:'url(//exfil)'}},
     {...shape[2],values:{...shape[2].values,durationMs:0}},
     {...shape[3],values:{...shape[3].values,enabled:'true'}},
     {...shape[1],values:{...shape[1].values,alt:null}},
     {...shape[4],kind:'unknown'},
     {...shape[4],values:{...shape[4].values,body:'x'.repeat(500)}}
    ];
    let refused=0;
    for(const bad of invalid){
     const candidate=shape.map((x,i)=>i===shape.findIndex(z=>z.id===bad.id)?bad:x);
     // Nonmatching/malicious ID needs explicit replacement.
     if(bad.id==='../../admin.php')candidate[0]=bad;
     const p=spawnSync('php',[phpFile],{input:JSON.stringify(candidate),encoding:'utf8'});
     assert.notEqual(p.status,0,'PHP accepted invalid typed shape '+refused);refused++;checks++;
    }
    const duplicate=[...shape,structuredClone(shape[0])];
    const p=spawnSync('php',[phpFile],{input:JSON.stringify(duplicate),encoding:'utf8'});
    assert.notEqual(p.status,0,'PHP accepted duplicate stable IDs');checks++;
   }
  }
  deep(store.snapshot().published.overrides['hero-focal/headline'],'Owner <script>alert(1)</script> & data');
  const reverted=store.rollback(published1.revision);
  equal(reverted.manifest.version,'1.0.0');
  equal(reverted.overrides['hero-anchor/headline'],'Owner <script>alert(1)</script> & data');
  equal(store.snapshot().history.length,4);
  // The rollback is a new immutable revision, not a rewrite of the old one.
  deep(snapshot1.published,published1);
  console.log('STAGE1_HETEROGENEOUS_REGEN_PARITY='+JSON.stringify({
   pass:true,checks,states:2,sourceComponents:4,regeneratedComponents:5,
   renderers:['typed-html','php-cli','react-static','next-static-export'],
   semanticFullMixedViewMatches:matches,mutantDetection:10,phpInvalidRefusals:11,
   reviewedRename:1,ownerOverridesPreserved:6,rollbackReplayed:true,
   excludes:['arbitrary original HTML/CSS/JS import','React hydration/browser behavior','Next SSR','real shared-hosting','blind independent AI generation'],
   publicForm:'preview-only disabled network delivery',siteCMSCodeInNextExport:false
  }));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
run().catch(err=>{console.error('STAGE1_HETEROGENEOUS_REGEN_PARITY_FAIL '+String(err.stack||err));process.exitCode=1});
