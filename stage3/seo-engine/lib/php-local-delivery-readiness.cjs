'use strict';
// Owner-provided GET /api/sites/SITE-ID/delivery readiness for published forms.
// NEVER copy recipient email, Telegram chat, submission ID, token or raw
// endpoint response into public SEO reports. Not proof of actual delivery.
const FORMAT='manufact-seo-owner-form-delivery-readiness-v1';
const MODES=new Set(['inherit','off','custom']);
const SECT=/^[a-z][a-z0-9-]{2,79}$/;
function review(site,raw,ownerVersion){
 if(!site||!Array.isArray(site.pages)||!SECT.test(site.siteId||'')||
    !Number.isSafeInteger(ownerVersion)||ownerVersion<1||!raw||
    typeof raw!=='object'||Array.isArray(raw)||
    !raw.settings||!raw.transport||!raw.channels||!Array.isArray(raw.routes)||
    raw.routes.length>200)
  throw Error('Delivery readiness requires matching published Site v1 and bounded owner API status');
 const {settings,transport,channels}=raw;
 if(!['email','telegram'].every(ch=>typeof transport[ch]?.ready==='boolean'&&
    typeof channels[ch]?.enabled==='boolean'&&typeof channels[ch]?.recipientConfigured==='boolean')||
    typeof settings.emailEnabled!=='boolean'||typeof settings.telegramEnabled!=='boolean')
  throw Error('Owner API delivery status missing known channel configuration');
 const declared=site.pages.flatMap(p=>(p.sections||[])
  .filter(s=>['lead-form','lead-form-flex'].includes(s.component)&&!s.designGraph)
  .map(s=>({pageId:p.id,path:p.path,sectionId:s.id})));
 const routes=new Map(),findings=[],forms=[];
 const add=(form,code,severity,message)=>findings.push(Object.freeze({
  code:'php-delivery:'+code,severity,
  pageId:form?.pageId||null,path:form?.path||null,sectionId:form?.sectionId||null,
  message,evidence:'owner-provided-unverified-cms-delivery-status',automatic:false}));
 for(const r of raw.routes){
  if(!r||typeof r!=='object'||!SECT.test(r.sectionId||'')||routes.has(r.sectionId)||
     !MODES.has(r.emailMode)||!MODES.has(r.telegramMode)||
     !Array.isArray(r.sources)||r.sources.some(s=>!['draft','published'].includes(s))||
     !Number.isSafeInteger(r.version)||r.version<0)
   throw Error('Unexpected owner API form route structure or duplicated section IDs');
  routes.set(r.sectionId,r);
 }
 for(const f of declared){
  const route=routes.get(f.sectionId);
  if(!route){
   add(f,'published-form-route-absent','error',
    'A published form has no corresponding owner delivery route; the owner must verify live CMS routing.');
   forms.push(Object.freeze({...f,email:'unknown',telegram:'unknown',
    configuredChannels:0,routeObserved:false}));
   continue;
  }
  if(!route.sources.includes('published'))
   add(f,'route-not-marked-published','error',
    'The owner delivery API does not identify a currently published form.');
  const effective={};
  let configured=0,enabled=0;
  for(const channel of ['email','telegram']){
   const mode=route[channel+'Mode'];
   const inheritedEnabled=settings[channel+'Enabled'];
   const active=mode==='custom'||mode==='inherit'&&inheritedEnabled;
   const recipient=mode==='custom'?String(route[channel==='email'?'emailRecipient':'telegramChatId']||''):
    mode==='inherit'?String(settings[channel==='email'?'emailRecipient':'telegramChatId']||''):'';
   const recipientConfigured=recipient.trim().length>0;
   const transportReady=transport[channel].ready===true;
   const status=!active?'off':!recipientConfigured?'recipient-missing':
    !transportReady?'transport-unavailable':'configured';
   effective[channel]=status;
   if(active)enabled++;
   if(status==='configured')configured++;
   if(status==='recipient-missing')
    add(f,channel+'-recipient-missing','error',
     'A selected form delivery channel has no configured recipient; check owner-only delivery settings.');
   if(status==='transport-unavailable')
    add(f,channel+'-transport-unavailable','warning',
     'A selected form notification channel is not ready in the owner API transport preflight.');
  }
  if(enabled===0)add(f,'all-notifications-off','warning',
   'This published form has all outgoing notifications disabled. Confirm inbox-only collection is intentional.');
  if(enabled>0&&configured===0)
   add(f,'no-ready-notification-channel','error',
    'The form has selected notification channels but none are currently ready for delivery.');
  forms.push(Object.freeze({...f,email:effective.email,telegram:effective.telegram,
   configuredChannels:configured,routeObserved:true,ownerRouteVersion:route.version}));
 }
 const declaredSet=new Set(declared.map(x=>x.sectionId));
 const publishedExtras=[...routes.values()].filter(x=>x.sources.includes('published')&&!declaredSet.has(x.sectionId));
 if(publishedExtras.length)add(null,'owner-published-site-routing-drift','warning',
  'Owner delivery API advertises published forms absent from the pinned Site v1; recheck exported publication identity.');
 return Object.freeze({format:FORMAT,siteId:site.siteId,pinnedPublishedVersion:ownerVersion,
  suppliedByOwnerUnverified:true,checkedForms:forms.length,
  configuredForms:forms.filter(x=>x.configuredChannels>0).length,
  formRoutesFromOwner:routes.size,publishedExtraRoutes:publishedExtras.length,
  forms:Object.freeze(forms),findings:Object.freeze(findings),
  recipientsExposed:false,submissionIdsExposed:false,
  actualPostPerformed:false,storedSubmissionVerified:false,deliveryProven:false,
  sourceCmsRevisionAuthenticated:false,publicHttpsVerified:false,
  limitations:'Source is owner-copied mutable delivery configuration and transport hints; no GET authentication, POST, delivery queue confirmation, sent mail or Telegram receipt. Recipient addresses, chat IDs, operator notes and submissions deliberately omitted.'});
}
module.exports=Object.freeze({FORMAT,review});
