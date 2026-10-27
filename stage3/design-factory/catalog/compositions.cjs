'use strict';
// D3 catalog: 42 first-party composition patterns. Enhanced previews that
// cannot be expressed in current CMS are explicitly integration_required.
const GROUPS=[
 ['hero','First impression','company-hero',[
  ['hero-split','Split masthead','parallel','left','frame','airy'],
  ['hero-center','Centered statement','centered','center','orb','airy'],
  ['hero-offset','Asymmetric editorial','offset','left','arch','normal']]],
 ['benefits','Reasons to choose','feature-highlights',[
  ['benefits-bento','Large and small value blocks','bento','left','tiles','normal'],
  ['benefits-metrics','Editorial benefits','columns','center','rule','tight'],
  ['benefits-rail','Horizontal feature rail','rail','left','frame','airy']]],
 ['services','Service structure','service-grid',[
  ['services-cards','Service cards','cards','left','tiles','normal'],
  ['services-list','Large indexed list','stack','left','rule','airy'],
  ['services-sidebar','Sidebar directory','sidebar','left','frame','normal']]],
 ['process','Process','feature-highlights',[
  ['process-steps','Stepped workflow','steps','left','rule','normal'],
  ['process-track','Milestone track','rail','center','dots','airy'],
  ['process-vertical','Vertical method','stack','left','line','normal']]],
 ['team','People and culture','media-story',[
  ['team-portraits','Portrait placeholders','cards','left','portrait','normal'],
  ['team-editorial','People-first editorial','split','left','arch','airy'],
  ['team-roles','Role directory','sidebar','left','rule','tight']]],
 ['portfolio','Selected work','media-story',[
  ['portfolio-featured','Featured case-study placeholder','offset','left','frame','airy'],
  ['portfolio-gallery','Case study mosaic','mosaic','left','tiles','normal'],
  ['portfolio-index','Project directory','stack','left','rule','normal']]],
 ['pricing','Scope and terms','service-grid',[
  ['pricing-columns','Scope comparison','columns','left','tiles','normal'],
  ['pricing-table','Scope breakdown','table','left','rule','tight'],
  ['pricing-consult','Consultation-first layout','cards','center','frame','airy']]],
 ['testimonials','Customer voices','feature-highlights',[
  ['testimonials-quote','Verified quote feature','centered','center','quotes','airy'],
  ['testimonials-grid','Consent-based quote cards','cards','left','tiles','normal'],
  ['testimonials-rail','Quote collection rail','rail','left','rule','normal']]],
 ['faq','Questions and answers','faq-accordion',[
  ['faq-minimal','Native accessible accordion','stack','left','rule','normal'],
  ['faq-split','Questions with context','sidebar','left','line','airy'],
  ['faq-compact','Compact Q&A directory','columns','left','rule','tight']]],
 ['contact','Contact','contact-panel',[
  ['contact-split','Conversation split','split','left','frame','normal'],
  ['contact-center','Center-stage invitation','centered','center','orb','airy'],
  ['contact-directory','Contact channel directory','sidebar','left','rule','normal']]],
 ['cta','Call to action','cta-banner',[
  ['cta-band','Wide directional CTA','band','left','line','normal'],
  ['cta-card','Framed invitation','cards','left','frame','airy'],
  ['cta-minimal','Minimal call to action','centered','center','rule','airy']]],
 ['gallery','Photography and media','photo-gallery',[
  ['gallery-mosaic','Alternating mosaic','mosaic','left','frame','normal'],
  ['gallery-columns','Quiet photo columns','columns','center','tiles','airy'],
  ['gallery-rail','Scroll-snap photo strip','rail','left','frame','normal']]],
 ['trust','Credentials and references','feature-highlights',[
  ['trust-credentials','Verification checklist','stack','left','rule','normal'],
  ['trust-partners','Partner logo placeholders','columns','center','tiles','normal'],
  ['trust-facts','Owner-confirmed fact sheet','sidebar','left','frame','airy']]],
 ['editorial','Content and storytelling','media-story',[
  ['editorial-feature','Magazine cover story','split','left','arch','airy'],
  ['editorial-numbered','Numbered narrative','stack','left','rule','normal'],
  ['editorial-aside','Story with editorial aside','sidebar','left','frame','airy']]]
];
const REQUIREMENTS={
 hero:['verified headline','verified description'],benefits:['owner-approved advantages'],
 services:['confirmed list of real services'],process:['confirmed sequence of work'],
 team:['permission to use real names and photos'],portfolio:['permission to show completed projects'],
 pricing:['verified offer and pricing if displayed'],testimonials:['verbatim review with author consent'],
 faq:['fact-checked answers'],contact:['verified contact channels and privacy text'],
 cta:['owner-approved call to action'],gallery:['image rights, alt and captions'],
 trust:['independently verified partner names or certifications'],editorial:['owner-approved story']
};
const WARNINGS={
 testimonials:'Never fabricate testimonials, reviewers or client outcomes',
 pricing:'Never invent prices, discounts, deadlines or guarantees',
 team:'Never fabricate staff names, portraits or job titles',
 portfolio:'Never claim a fictitious completed client project',
 trust:'Never invent partners, awards, accreditations or metrics',
 gallery:'Do not use unlicensed images'
};
const PROPOSALS={
 process:'process-steps-v1',team:'team-directory-v1',portfolio:'case-studies-v1',
 pricing:'pricing-comparison-v1',testimonials:'verified-testimonials-v1',
 gallery:'responsive-gallery-v1',trust:'proof-register-v1',editorial:'editorial-content-v1'
};
const valid={
 layout:['parallel','centered','offset','bento','columns','rail','cards','stack','sidebar','steps','split','mosaic','table','band'],
 align:['left','center'],art:['frame','orb','arch','tiles','rule','dots','line','portrait','quotes'],
 density:['tight','normal','airy']
};
const seen=new Set(),compositions=[];
for(const [category,categoryLabel,cmsComponent,presets] of GROUPS){
 if(presets.length!==3)throw Error('Invalid pattern group');
 for(const [id,label,layout,align,art,density] of presets){
  if(!/^[a-z][a-z0-9-]{2,79}$/.test(id)||seen.has(id)||
    !valid.layout.includes(layout)||!valid.align.includes(align)||!valid.art.includes(art)||!valid.density.includes(density))
    throw Error('Invalid composition token');
  seen.add(id);
  const richer=Object.hasOwn(PROPOSALS,category);
  compositions.push(Object.freeze({
   id,category,label,categoryLabel,cmsComponent,status:richer?'integration_required':'supported',
   adapterProposal:richer?PROPOSALS[category]:null,layout,align,art,density,
   responsive:Object.freeze({desktop:'Composition-specific desktop composition',
     tablet:'Collapse split layouts; preserve semantic reading order',
     mobile:'Single-column, 44px controls and scroll-snap for optional rails'}),
   requirements:Object.freeze(REQUIREMENTS[category].slice()),
   a11y:'Semantic headings, keyboard focus, explicit placeholders; no decorative fake claims',
   fallback:richer?'Registered '+cmsComponent+' as semantic fallback only, without layout parity':
     'Registered '+cmsComponent+' as semantic component with standalone design-only CSS',
   warning:WARNINGS[category]||'Verify all owner claims before publishing'
  }));
 }
}
if(compositions.length!==42)throw Error('Incomplete composition catalogue');
function get(id){
 if(typeof id!=='string'||!seen.has(id))throw Error('Unknown composition ID');
 return compositions.find(x=>x.id===id);
}
function list(category){
 if(category!=null&&!GROUPS.some(x=>x[0]===category))throw Error('Unknown category');
 return category?compositions.filter(x=>x.category===category):compositions.slice();
}
module.exports=Object.freeze({FORMAT:'manufact-design-compositions-v1',
 GROUPS:Object.freeze(GROUPS),PROPOSALS:Object.freeze(PROPOSALS),
 compositions:Object.freeze(compositions),get,list});
