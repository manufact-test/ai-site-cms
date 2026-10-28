'use strict';
// No execution or POST. Review whether the actual PUBLIC HTTPS CSP blocks
// the official static HTML's inline CSS/JS or form POST collectors.
// This is a bounded conservative policy check, not a browser CSP evaluator.
const crypto=require('node:crypto');
const FORMAT='manufact-seo-public-static-csp-v1',MAX_HTML=450000;
const sha=s=>"'sha256-"+crypto.createHash('sha256').update(s,'utf8').digest('base64')+"'";
function parse(raw){
 if(!raw)return null;
 if(typeof raw!=='string'||raw.length>4000)throw Error('Invalid bounded CSP HTTP header');
 if(raw.includes(','))return {ambiguous:true,values:new Map()};
 const values=new Map();
 for(const directive of raw.split(';')){
  const bits=directive.trim().split(/\s+/).filter(Boolean);
  if(!bits.length)continue;
  const key=bits.shift().toLowerCase();
  if(!/^[a-z0-9-]{1,60}$/.test(key)||values.has(key))
   return {ambiguous:true,values:new Map()};
  values.set(key,bits);
 }
 return {ambiguous:false,values};
}
function tokens(policy,...keys){
 if(!policy)return null;
 for(const key of keys)if(policy.values.has(key))return policy.values.get(key);
 return null;
}
const attrs=raw=>{
 const a={};
 for(const m of raw.matchAll(/([a-z][a-z0-9:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+)))?/gi))
  a[m[1].toLowerCase()]=m[2]??m[3]??m[4]??'';
 return a;
};
function inlineAllowed(text,nonce,sources){
 if(sources===null)return true;
 if(sources.includes("'unsafe-inline'")&&
    !sources.some(x=>/^'(?:nonce-|sha256-|sha384-|sha512-)/.test(x)))return true;
 // CSP ignores unsafe-inline in presence of nonces or hashes in its source list.
 if(sources.includes(sha(text)))return true;
 if(typeof nonce==='string'&&nonce&&sources.includes("'nonce-"+nonce+"'"))return true;
 return false;
}
function formAllowed(action,host,policy){
 const sources=tokens(policy,'form-action');
 if(sources===null)return true; // form-action has no default-src fallback.
 if(!sources.length||sources.includes("'none'"))return false;
 let target,base;
 try{target=new URL(action,host);base=new URL(host);}
 catch{return false;}
 for(const source of sources){
  if(source==="'self'"&&target.origin===base.origin)return true;
  if(source==='*')return true;
  if(source==='https:'&&target.protocol==='https:')return true;
  if(/^https:\/\//i.test(source)){
   try{
    const allowed=new URL(source);
    if(target.origin===allowed.origin&&
       (allowed.pathname==='/'||target.pathname.startsWith(allowed.pathname)))return true;
   }catch{}
  }
 }
 return false;
}
function review(siteId,page,html,headers,origin){
 if(typeof html!=='string'||html.length>MAX_HTML||!page||typeof page.path!=='string'||
    !headers||typeof headers!=='object'||typeof origin!=='string')
  throw Error('Public CSP review requires captured HTML, response headers and one page route');
 const findings=[],detail={inlineScriptCount:0,inlineStyleCount:0,
  inlineStyleAttributeCount:0,inlineEventHandlerCount:0,postFormCount:0};
 const add=(code,severity,message)=>findings.push(Object.freeze({
  code:'public-csp:'+code,severity,pageId:page.id,path:page.path,
  evidence:'operator-supplied-public-https-csp-vs-official-static-html',
  message,automatic:false}));
 const policy=parse(headers['content-security-policy']);
 if(!policy){
  add('missing-public-csp','warning',
   'No enforced CSP header was captured on this public static page; check production host policy.');
  return Object.freeze({format:FORMAT,siteId,pageId:page.id,policySupplied:false,
   ambiguousPolicy:false,findings,counts:detail,jsAndCssExecutableUnverified:true});
 }
 if(policy.ambiguous){
  add('ambiguous-public-csp','warning',
   'Multiple or ambiguous Content-Security-Policy headers cannot be evaluated with this conservative parser; verify in a real browser.');
  return Object.freeze({format:FORMAT,siteId,pageId:page.id,policySupplied:true,
   ambiguousPolicy:true,findings,counts:detail,jsAndCssExecutableUnverified:true});
 }
 for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  const a=attrs(m[1]);
  if(a.src||a.type?.toLowerCase()==='application/ld+json'||!m[2].trim())continue;
  detail.inlineScriptCount++;
  const allow=tokens(policy,'script-src-elem','script-src','default-src');
  if(!inlineAllowed(m[2],a.nonce,allow))
   add('inline-script-blocked','error',
    'Enforced public CSP does not permit an inline script used by the exported static page (form wizard or interaction may fail).');
 }
 for(const m of html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style\s*>/gi)){
  detail.inlineStyleCount++;
  const a=attrs(m[1]),allow=tokens(policy,'style-src-elem','style-src','default-src');
  if(!inlineAllowed(m[2],a.nonce,allow))
   add('inline-style-blocked','error',
    'Enforced public CSP does not permit a static page inline stylesheet; actual published design may be unstyled.');
 }
 // CSP style-src-attr and script-src-attr can independently forbid
 // per-node DesignGraph styling or inline button handlers even when
 // style-src-elem and script-src-elem permit regular style/script tags.
 const scan=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
 for(const match of scan.matchAll(/<[a-z][a-z0-9:-]*\b([^<>]{0,1800})>/gi)){
  const a=attrs(match[1]);
  if(Object.hasOwn(a,'style')&&a.style){
   detail.inlineStyleAttributeCount++;
   const policySources=tokens(policy,'style-src-attr','style-src','default-src');
   if(!inlineAllowed(a.style,null,policySources)&&
      !(policySources?.includes("'unsafe-hashes'")&&policySources.includes(sha(a.style))))
    add('inline-style-attribute-blocked','error',
     'Public CSP blocks inline style attributes used in the static design graph or responsive layout.');
  }
  for(const [key,value] of Object.entries(a).filter(([key])=>/^on[a-z]{2,}$/.test(key))){
   detail.inlineEventHandlerCount++;
   const policySources=tokens(policy,'script-src-attr','script-src','default-src');
   if(!inlineAllowed(value,null,policySources)&&
      !(policySources?.includes("'unsafe-hashes'")&&policySources.includes(sha(value))))
    add('inline-event-handler-blocked','error',
     'Public CSP prevents inline DOM event handlers required by static page interactions.');
  }
 }
 for(const m of html.matchAll(/<form\b([^>]*)>/gi)){
  const a=attrs(m[1]);
  if((a.method||'get').toLowerCase()!=='post')continue;
  detail.postFormCount++;
  if(!formAllowed(a.action||origin+page.path,origin,policy))
   add('form-collector-blocked','error',
    'Enforced public CSP form-action blocks a published POST form collector; submission cannot reach the intended endpoint.');
 }
 return Object.freeze({format:FORMAT,siteId,pageId:page.id,policySupplied:true,
  ambiguousPolicy:false,counts:Object.freeze(detail),findings:Object.freeze(findings),
  jsAndCssExecutableUnverified:true,
  limitations:'CSP source-expression parsing is conservative; browser execution and live form POST are not tested.'});
}
module.exports=Object.freeze({FORMAT,parse,review,inlineAllowed,formAllowed});
