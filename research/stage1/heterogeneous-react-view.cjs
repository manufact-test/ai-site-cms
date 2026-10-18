/* Stage 1 ONLY: an independent React renderer of the vetted mixed site
 * shape. Used in SSR static markup and real Next.js static export research. */
'use strict';
const React=require('react');
const h=React.createElement;
const assets=Object.freeze({orb:'/fixtures/orb.svg',reef:'/fixtures/reef.svg'});
function MixedSite({shape}) {
  if(!Array.isArray(shape))throw Error('typed shape required');
  return h('main',{'data-site':'tide-atlas'},shape.map(c=>{
    const v=c.values,key=c.id,outer={'data-cms-id':key,key};
    if(c.kind==='hero')return h('section',{...outer,id:'hero'},
      h('h1',null,v.headline),
      h('a',{href:v.ctaHref},'Explore'),
      h('img',{src:assets[v.featureAsset],alt:'Curated artwork'}));
    if(c.kind==='accordion')return h('section',outer,
      h('details',{open:v.open},
        h('summary',null,v.title),h('p',null,'Reviewed disclosure')));
    if(c.kind==='form')return h('section',{...outer,id:'signup'},
      h('label',null,'Email',h('input',{type:'email',placeholder:v.placeholder})),
      h('button',{disabled:!v.enabled,type:'button'},'Preview only'));
    if(c.kind==='media')return h('section',outer,h('img',{src:assets[v.asset],alt:v.alt}));
    if(c.kind==='copy')return h('section',outer,h('p',null,v.body));
    throw Error('unknown kind');
  }));
}
module.exports={MixedSite};
