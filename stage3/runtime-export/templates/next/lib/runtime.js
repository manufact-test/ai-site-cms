import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {expectedWizardSha256} from './wizard-contract.js';
import {notFound, permanentRedirect} from 'next/navigation';
import Script from 'next/script';
import React from 'react';

// Published visitor files only. No CMS code, private DB, sessions or credentials.
const base=path.join(process.cwd(),'data');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'release-manifest.json'),'utf8'));
const decode=text=>String(text??'').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|#039);/gi,(_,code)=>{
  const common={amp:'&',quot:'"',apos:"'",lt:'<',gt:'>','#039':"'"};
  if(common[code.toLowerCase()])return common[code.toLowerCase()];
  if(code[0]==='#'){
    const n=code[1].toLowerCase()==='x'?parseInt(code.slice(2),16):parseInt(code.slice(1),10);
    return Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';
  }
  return _;
});
export const routeFromSlug=slug=>slug?.length?'/'+slug.join('/')+'/':'/';
export const sharedStylesheetHref=()=>manifest.stylesheets?.[0]?'/'+manifest.stylesheets[0].file:null;
const entry=route=>manifest.pages.find(p=>p.path===route)??manifest.redirects.find(p=>p.from===route);
const htmlFor=route=>{
  const item=entry(route);
  if(!item)notFound();
  return fs.readFileSync(path.join(base,item.file),'utf8');
};
const tag=(html,re)=>decode(html.match(re)?.[1]??'');
export function metadataFor(route){
  const html=htmlFor(route);
  const value=(name,key='name')=>tag(html,new RegExp('<meta\\s+'+key+'="'+name+'"\\s+content="([^"]*)"','i'));
  const title=tag(html,/<title>([\s\S]*?)<\/title>/i);
  const description=value('description');
  const robots=value('robots');
  const canonical=tag(html,/<link rel="canonical" href="([^"]*)"/i);
  const iconUrl=tag(html,/<link rel="icon" type="image\/png" href="([^"]*)"/i);
  const ogTitle=value('og:title','property')||title;
  const ogDescription=value('og:description','property')||description;
  const ogImage=value('og:image','property');
  const ogImageAlt=value('og:image:alt','property');
  const ogUrl=value('og:url','property');
  const ogLocale=value('og:locale','property');
  const twitterImage=value('twitter:image');
  const twitterImageAlt=value('twitter:image:alt');
  return {
    title,description,
    ...(iconUrl?{icons:{icon:[{url:iconUrl,type:'image/png'}]}}:{}),
    ...(robots?{robots}:{}),
    ...(canonical?{alternates:{canonical}}:{}),
    openGraph:{type:'website',title:ogTitle,description:ogDescription,
      ...(ogLocale?{locale:ogLocale}:{}),
      ...(ogUrl?{url:ogUrl}:{}),
      ...(ogImage?{images:[{url:ogImage,...(ogImageAlt?{alt:ogImageAlt}:{})}]}:{})},
    twitter:{card:value('twitter:card')||(twitterImage?'summary_large_image':'summary'),
      title:value('twitter:title')||ogTitle,
      description:value('twitter:description')||ogDescription,
      ...(twitterImage?{images:[{url:twitterImage,...(twitterImageAlt?{alt:twitterImageAlt}:{})}]}:{})}
  };
}

/**
 * The sealed PHP publisher emits one identical first-party wizard script per
 * multi-step form. Scripts injected via React innerHTML do NOT execute.
 * Isolate only that known code for Next Script afterInteractive. Reject all
 * other script markup; a visitor page is not a place for arbitrary plugins.
 */
export function visitorBody(html){
  const body=html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1];
  if(body===undefined)throw Error('Published HTML body missing');
  const scripts=[...body.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
  const withoutScripts=body.replace(/<script>([\s\S]*?)<\/script>/gi,'');
  if(/<\/?script\b/i.test(withoutScripts))
    throw Error('Unsupported script markup in published Next visitor page');
  const wizard=scripts[0]?.[1]??null;
  if(scripts.some(x=>x[1]!==wizard))throw Error('Multiple distinct visitor scripts');
  if(wizard!==null&&(!wizard.startsWith("(()=>{\n  for(const form of document.querySelectorAll('form[data-multi-step]')){")
    ||!wizard.trimEnd().endsWith('})();')||!withoutScripts.includes('data-multi-step="yes"')
    ||createHash('sha256').update(wizard.trimEnd()).digest('hex')!==expectedWizardSha256))
    throw Error('Unexpected visitor script');
  return {body:withoutScripts,wizard};
}
/** Only the publisher's bounded JSON-LD document crosses from static head to
 * Next's React visitor body. No arbitrary head JavaScript is executable.
 */
export function visitorStructuredData(html){
  const head=html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1]??'';
  const matches=[...head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if(!matches.length)return null;
  if(matches.length!==1||matches[0][1].length>50000)throw Error('Unexpected published JSON-LD count/size');
  const data=JSON.parse(matches[0][1]);
  if(data?.['@context']!=='https://schema.org'||
    !['WebPage','AboutPage','ContactPage','FAQPage'].includes(data?.['@type'])||
    typeof data.url!=='string'||typeof data.name!=='string'||
    (data['@type']==='FAQPage'&&(!Array.isArray(data.mainEntity)||!data.mainEntity.length)))
    throw Error('Unexpected published structured data');
  return JSON.stringify(data).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
}
export function renderPage(route,serverRedirect=false){
  const redirect=manifest.redirects.find(r=>r.from===route);
  if(serverRedirect&&redirect)permanentRedirect(redirect.to); // middleware returns HTTP 301
  const html=htmlFor(route);
  const {body,wizard}=visitorBody(html);
  const structured=visitorStructuredData(html);
  const styles=Array.from(html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi),m=>m[1]).join('\n');
  return React.createElement(React.Fragment,null,
    React.createElement('style',{dangerouslySetInnerHTML:{__html:styles}}),
    structured?React.createElement('script',{type:'application/ld+json',
      dangerouslySetInnerHTML:{__html:structured}}):null,
    React.createElement('div',{dangerouslySetInnerHTML:{__html:body}}),
    // A unique route ID prevents Next's script de-duplication from silently
    // skipping wizard initialization on a later client-side navigation.
    wizard?React.createElement(Script,{
      id:'cms-form-steps-'+createHash('sha256').update(route).digest('hex').slice(0,16),
      strategy:'afterInteractive'
    },wizard):null
  );
}
export function language(){return tag(htmlFor('/'),/<html lang="([^"]*)"/i)||'ru';}
