'use strict';
/**
 * Owner-clickable, script-free-preview demonstration kit.
 * NOT the private CMS package, installer, publisher or production release.
 * Only explicit allowlisted Stage2 UI files and the pinned built Jedison entry.
 */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const cms=path.resolve(__dirname,'../..'),preview=path.join(cms,'stage2-preview');
const out=path.join(preview,'out','ai-site-cms-stage2-owner-review-kit.zip');
const files=['index.html','style.css','studio.css','content.js','repeaters.js','library.js','project.js','content-ops.js','quality.js','media.js','renderer.js','site-export.js','brief.js','workspaces.js','art-direction.js','page-recipes.js','canvas-edit.js','canvas-media.js','media-ops.js','app.js'];
const dist=path.join(cms,'editor','dist');
const entry=path.join(dist,'editor.js');
const attribution=path.join(dist,'THIRD_PARTY_LICENSES.txt');
for(const file of [entry,attribution,...files.map(f=>path.join(preview,f))]){
  if(!fs.statSync(file).isFile()||fs.lstatSync(file).isSymbolicLink())throw Error('Owner kit source file is missing or unsafe: '+file);
}
if(fs.statSync(entry).size<100_000||!fs.readFileSync(attribution,'utf8').includes('MIT')){
  throw Error('Pinned editor build or license attribution unavailable');
}
const staging=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-cms-stage2-owner-'));
try{
  const ui=path.join(staging,'stage2-preview'),built=path.join(staging,'editor','dist');
  fs.mkdirSync(ui,{recursive:true});fs.mkdirSync(built,{recursive:true});
  for(const f of files)fs.copyFileSync(path.join(preview,f),path.join(ui,f));
  fs.copyFileSync(entry,path.join(built,'editor.js'));
  fs.copyFileSync(attribution,path.join(built,'THIRD_PARTY_LICENSES.txt'));
  fs.writeFileSync(path.join(staging,'OPEN-ME-FIRST.txt'),[
    'AI Site CMS — offline owner UX review kit (Stage 2 ONLY)','',
    '1. Unpack this ZIP on your computer.',
    '2. Open stage2-preview/index.html in Chrome or Edge.',
    '3. Click a section in the preview: its real editor appears on the right.',
    '4. Use the preview navigation to switch pages.',
    '5. Try full-screen, start a 3-page site, save locally and export demo HTML ZIP.',
    '',
    'No Node, Composer, PHP, database, hosting or Internet is needed to OPEN this kit.',
    'Changes saved locally stay on this browser and device; export JSON for a backup.',
    'This demo does NOT authenticate, publish, deploy, collect forms or touch customers.',
    'It is not the production CMS, not a full backup, and not Stage2 acceptance.',
    'Editor bundle is pinned Jedison; see editor/dist/THIRD_PARTY_LICENSES.txt.',
    'Open source code: https://github.com/manufact-test/ai-site-cms',
    ''
  ].join('\n'));
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.rmSync(out,{force:true});
  const r=spawnSync('zip',['-X','-q','-r',out,'stage2-preview','editor','OPEN-ME-FIRST.txt'],{cwd:staging,encoding:'utf8'});
  if(r.error||r.status!==0)throw Error('zip failed: '+(r.stderr||r.error));
  console.log('Owner review ZIP READY: '+out+' ('+fs.statSync(out).size+' bytes)');
}finally{
  fs.rmSync(staging,{recursive:true,force:true});
}
