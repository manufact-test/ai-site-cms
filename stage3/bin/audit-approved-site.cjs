'use strict';
// Offline, READ-ONLY pilot handoff report. It does not certify design approval,
// visual pixel fidelity, working form delivery, or completed publication.
const fs=require('node:fs'),path=require('node:path');
const {preflight}=require('./verify-approved-site.cjs');
function md(text){return String(text??'').replace(/[\r\n|<>]/g,' ').replace(/[\u0000-\u001f]/g,' ').slice(0,200);}
function run(folder){
  const checked=preflight(folder);
  const root=fs.realpathSync(folder);
  const h=JSON.parse(fs.readFileSync(path.join(root,'handoff.json'),'utf8'));
  const site=JSON.parse(fs.readFileSync(path.join(root,h.files.site),'utf8'));
  const sections=site.pages.flatMap(p=>p.sections);
  const faq=sections.filter(s=>s.component==='faq-accordion');
  const forms=sections.filter(s=>s.component==='lead-form-flex');
  const custom=sections.filter(s=>s.component==='custom-section');
  const usedMedia=new Set();
  const ids=new Set(site.assets.map(asset=>asset.id));
  // Traverse the typed site document; no code is executed.
  function scan(value,key=''){
    if(typeof value==='string'&&ids.has(value))usedMedia.add(value);
    else if(Array.isArray(value))for(const v of value)scan(v,key);
    else if(value&&typeof value==='object')
      for(const [k,v] of Object.entries(value))scan(v,k);
  }
  for(const page of site.pages)scan(page);
  const orphan=site.assets.filter(a=>!usedMedia.has(a.id));
  const missingAlt=site.assets.filter(a=>!String(a.alt||'').trim());
  const brokenSeo=site.pages.filter(p=>!p.seo||!p.seo.title||!p.seo.description);
  const redirects=site.redirects||[];
  const rows=[
    '# Pilot acceptance checklist — '+md(site.title),
    '',
    '> Unverified human checklist, not an approval certificate or automatic visual QA.',
    '',
    '- Package: '+md(h.version)+' ('+md(h.format)+')',
    '- Integrity: '+md(checked.integrity),
    '- Site ID: '+md(site.siteId),
    '- Pages: '+site.pages.length+' · sections: '+sections.length+' · custom authored sections: '+custom.length,
    '- Approved device screenshot sets: '+(1+Object.keys(h.files.pagePrototypes||{}).length)+
      ' (homepage + optional page-specific references)',
    '- FAQ sections: '+faq.length+' · FAQ questions: '+faq.reduce((n,s)=>n+(s.items||[]).length,0),
    '- Flexible forms: '+forms.length+' · assets: '+site.assets.length+' · responsive variants: '+
      site.assets.reduce((n,a)=>n+(a.variants||[]).length,0),
    '- Redirects: '+redirects.length,
    '',
    '## Page inventory',
    '',
    '| Page URL | Title | SEO title | SEO description | Sections |',
    '| --- | --- | --- | --- | ---: |'
  ];
  for(const p of site.pages)
    rows.push('| '+md(p.path)+' | '+md(p.title)+' | '+md(p.seo?.title||'MISSING')+
      ' | '+md(p.seo?.description||'MISSING')+' | '+p.sections.length+' |');
  rows.push('','## Potential gaps to check manually','','- SEO metadata missing: '+
    (brokenSeo.length?brokenSeo.map(p=>md(p.path)).join(', '):'none found'),
    '- Assets with empty ALT: '+(missingAlt.length?missingAlt.map(a=>md(a.id)).join(', '):'none found'),
    '- Assets not referenced by page content: '+(orphan.length?orphan.map(a=>md(a.id)).join(', '):'none found'),
    '- All responsive image bytes and SHA256: '+(checked.integrity==='sha256-verified'?
      'verified against local v2 lock':'legacy v1: full bundle not locked'),
    '',
    '## Real visual acceptance — operator must fill in',
    '',
    '| Page | Desktop (1280px) | Tablet (768px) | Mobile (390px) |',
    '| --- | --- | --- | --- |');
  for(const p of site.pages){
    const hasSource=p.path==='/'||Boolean(h.files.pagePrototypes?.[p.id]);
    rows.push('| '+md(p.path)+(hasSource?'':' · no approved per-page reference')+
      ' | [ ] compare | [ ] compare | [ ] compare |');
  }
  rows.push('','## Real behavior and release gate','','- [ ] Review three client-approved prototypes and both text specifications; verify client approval outside the CMS',
    '- [ ] Compare actual page at all three widths; check typography, spacing, media crops, navigation, menu, CTA and hover/motion',
    '- [ ] Verify content links, FAQ order/open-close behavior, responsive layout and keyboard navigation',
    '- [ ] Save a real H1, image/ALT and responsive typography edit; reload without losing it',
    '- [ ] Reorder/add/delete one FAQ item and confirm public page and schema after Publish',
    '- [ ] Check SEO title, description, canonical, robots, sitemap, OG image and redirects',
    '- [ ] Submit real form using configured delivery and inspect successful receipt and anti-spam',
    '- [ ] Confirm a saved draft does NOT modify published pages before Publish',
    '- [ ] Publish with permitted role; check HTTP, media, analytics/SEO links and mobile devices',
    '- [ ] Restore one previous revision into a new draft and confirm public version stays unchanged',
    '- [ ] Preserve v2 sealed folder and backups; obtain explicit owner GO before any production rollout',
    '',
    '## Scope disclaimer','','This CLI checks the versioned source contract and asset integrity only. A pass is not proof of pixel-perfect design, real client approval, email delivery, platform compatibility or production readiness.',
    '');
  return Object.freeze({report:rows.join('\n'),summary:checked});
}
if(require.main===module){
  try{
    if(process.argv.length!==3)throw Error('Usage: node stage3/bin/audit-approved-site.cjs /absolute/path/to/approved-site');
    process.stdout.write(run(process.argv[2]).report);
  }catch(e){console.error('PILOT AUDIT FAILED: '+e.message);process.exitCode=1;}
}
module.exports=Object.freeze({run});
