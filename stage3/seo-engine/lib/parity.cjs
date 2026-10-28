'use strict';
// Static HTML versus approved Site v1: bounded, offline and non-executing.
const {checkBlueprint}=require('./blueprint.cjs');
const {snapshotAudit}=require('./analyze.cjs');
const FORMAT='manufact-seo-publication-parity-v1';
const clean=x=>String(x??'').replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|apos|nbsp);/gi,s=>(
 {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '}[s.toLowerCase()]||s))
 .replace(/\s+/g,' ').trim();
const normalize=x=>clean(x).normalize('NFKC').toLowerCase();
function attrs(str){
 const out={};
 for(const m of str.matchAll(/([a-z][a-z0-9:_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi))
  out[m[1].toLowerCase()]=clean(m[2]??m[3]??m[4]);
 return out;
}
function readHead(html){
 const match=/<head(?:\s[^>]*)?>([\s\S]*?)<\/head\s*>/i.exec(html);
 if(!match)return {status:'head-not-supplied',title:null,description:null,ogTitle:null,ogDescription:null,robots:null,canonical:null,baseHref:null,h1:null,language:null};
 // Raw script/style text may contain apparent <title> or <meta> markup; never parse it as actual head elements.
 const head=match[1].replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 const title=/<title(?:\s[^>]*)?>([\s\S]*?)<\/title\s*>/i.exec(head);
 const metas=[...head.matchAll(/<meta\b([^>]*?)\/?>/gi)].map(m=>attrs(m[1]));
 const links=[...head.matchAll(/<link\b([^>]*?)\/?>/gi)].map(m=>attrs(m[1]));
 const base=/<base\b([^>]*?)\/?\s*>/i.exec(head);
 const meta=(key,value)=>metas.find(m=>String(m[key]||'').toLowerCase()===value)?.content??null;
 const lang=attrs(/<html\b([^>]*)>/i.exec(html)?.[1]||'').lang||null;
 const heading=/<h1(?:\s[^>]*)?>([\s\S]*?)<\/h1\s*>/i.exec(html);
 return {status:'parsed-head',title:title?clean(title[1]):null,
  description:meta('name','description'),ogTitle:meta('property','og:title'),
  ogDescription:meta('property','og:description'),robots:meta('name','robots'),
  canonical:links.find(l=>(l.rel||'').toLowerCase().split(/\s+/).includes('canonical'))?.href??null,
  baseHref:base?(attrs(base[1]).href||null):null,
  h1:heading?clean(heading[1]):null,language:lang};
}
function compare(site,blueprint,snapshot){
 if(!site||!Array.isArray(site.pages))throw Error('Publication parity requires Site v1 site');
 const plan=checkBlueprint(blueprint);
 if(plan.siteId!==site.siteId)throw Error('Publication parity siteId mismatch');
 if(!snapshot||snapshot.format!=='manufact-seo-html-snapshot-v1')throw Error('Trusted HTML snapshot required');
 if(snapshot.siteId&&snapshot.siteId!==site.siteId)throw Error('HTML snapshot siteId mismatch');
 const base=snapshotAudit(snapshot),byId=new Map(site.pages.map(p=>[p.id,p])),byBlueprint=new Map(plan.pages.map(p=>[p.id,p]));
 const checked=[],findings=[];
 const add=(code,severity,pageId,path,field,expected,observed,reason)=>findings.push({
  code,severity,pageId,path,field,expected,observed,reason,evidence:'supplied-static-html',automatic:false
 });
 for(const p of snapshot.pages){
  const page=byId.get(p.id),expectedPlan=byBlueprint.get(p.id);
  if(!page){add('parity:unmapped-html-page','warning',p.id,p.path,'page.id',null,p.id,'Snapshot page ID not in Site v1');continue;}
  if(page.path!==p.path){add('parity:path-mismatch','error',p.id,p.path,'page.path',page.path,p.path,'Snapshot route differs from Site v1');continue;}
  const head=readHead(p.html);
  checked.push({pageId:p.id,path:p.path,fields:head,source:'supplied-static-html'});
  if(head.status!=='parsed-head'){
   add('parity:head-unavailable','warning',p.id,p.path,'head',null,null,'Complete head was not supplied');continue;
  }
  const seo=page.seo||{},expectedTitle=seo.title?.trim()||page.title+' | '+site.title;
  const expectedDesc=seo.description||'',expectedOgTitle=seo.ogTitle?.trim()||expectedTitle;
  const expectedOgDesc=seo.ogDescription?.trim()||expectedDesc;
  for(const [field,expected,actual] of [
   ['title',expectedTitle,head.title],['description',expectedDesc,head.description],
   ['ogTitle',expectedOgTitle,head.ogTitle],['ogDescription',expectedOgDesc,head.ogDescription]
  ])if(normalize(expected)!==normalize(actual))add('parity:metadata-drift','warning',p.id,p.path,
    field,expected,actual,'Supplied HTML differs from Site v1 metadata or documented publisher fallback');
  const expectedNoindex=(seo.robots||'index')==='noindex';
  const gotNoindex=/(?:^|[,\s])noindex(?:[,\s]|$)/i.test(head.robots||'');
  if(expectedNoindex!==gotNoindex)add('parity:indexation-drift','error',p.id,p.path,'robots',
   expectedNoindex?'noindex':'index',gotNoindex?'noindex':'index','Indexation differs from Site v1');
  if(head.language&&site.language&&head.language.toLowerCase()!==site.language.toLowerCase())
   add('parity:language-drift','recommendation',p.id,p.path,'html.lang',site.language,head.language,'Check language-specific deployment requirements');
  if(head.canonical&&p.path!=='/'){
   const value=head.canonical;
   const m=/^(?:https?:\/\/[^/\s?#]+)?(\/[^?#]*)$/.exec(value);
   if(m&&m[1]!==p.path&&!m[1].endsWith(p.path))
    add('parity:canonical-route-drift','warning',p.id,p.path,'canonical.path',p.path,m[1],
      'Canonical path differs even when optional publisher mount is allowed');
  }
  if(expectedPlan&&expectedPlan.seo.robots!==(seo.robots||'index'))
   add('parity:blueprint-indexation-diff','recommendation',p.id,p.path,'blueprint.seo.robots',
      expectedPlan.seo.robots,seo.robots||'index','Source project differs from blueprint; check approval');
 }
 return {format:FORMAT,version:1,siteId:site.siteId,sourcePages:snapshot.pages.length,
  baselineHtmlIssueCount:base.issues.length,checked,findings,
  limitations:'Supplied HTML only, and possibly a partial page set. No rendered browser/JS, network, live host, mount-origin verification, mobile content parity, field Web Vitals, or rich-result eligibility.'};
}
module.exports=Object.freeze({FORMAT,readHead,compare});
