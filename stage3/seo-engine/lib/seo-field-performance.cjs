'use strict';
/* Offline, operator-supplied Chrome UX Report API response review.
 * A rolling field aggregation is neither a current-release attestation nor
 * a Lighthouse/browser measurement. Never retrieve Google credentials here.
 */
const FORMAT='manufact-seo-field-performance-review-v1';
const HASH=/^[a-f0-9]{64}$/;
const ROUTE=/^\/(?:[a-z0-9-]+\/)*$/;
const DEVICES=new Set(['PHONE','TABLET','DESKTOP','ALL']);
const METRICS=Object.freeze([
 {key:'largest_contentful_paint',label:'LCP',unit:'ms',good:2500,poor:4000,max:120000},
 {key:'interaction_to_next_paint',label:'INP',unit:'ms',good:200,poor:500,max:120000},
 {key:'cumulative_layout_shift',label:'CLS',unit:'score',good:0.1,poor:0.25,max:10}
]);
const fail=s=>{throw Error('SEO field performance: '+s)};
const date=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d$/.test(s)&&
 !Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function period(raw){
 if(raw===undefined)return null;
 const d=x=>{
  if(!x||!Number.isInteger(x.year)||!Number.isInteger(x.month)||!Number.isInteger(x.day))
   fail('invalid collection period');
  const s=[String(x.year).padStart(4,'0'),String(x.month).padStart(2,'0'),
   String(x.day).padStart(2,'0')].join('-');
  if(!date(s))fail('invalid collection date');
  return s;
 };
 const from=d(raw?.firstDate),to=d(raw?.lastDate);
 if(from>to||(Date.parse(to)-Date.parse(from))/86400000>45)
  fail('invalid collection window');
 return {from,to};
}
function p75(metric,def){
 const n=metric?.percentiles?.p75;
 if(n===undefined)return null;
 if(def.unit==='score'){
  if(typeof n!=='string'&&typeof n!=='number')fail('invalid CLS p75 type');
  if(typeof n==='string'&&!/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(n))
   fail('invalid CLS p75');
 }else if(!Number.isInteger(n))fail('invalid millisecond p75');
 const value=Number(n);
 if(!Number.isFinite(value)||value<0||value>def.max)fail('out-of-range '+def.label+' p75');
 return value;
}
function review({source,sourceSha256,siteId,base,paths,referenceDate=null}={}){
 if(!HASH.test(sourceSha256||'')||typeof siteId!=='string'||siteId.length<3||
  !Array.isArray(paths)||paths.length<1||paths.length>60||
  new Set(paths).size!==paths.length||paths.some(p=>!ROUTE.test(p)))
  fail('source SHA, site ID and approved route inventory required');
 let mount;
 try{
  mount=new URL(base);
  if(mount.protocol!=='https:'||mount.username||mount.password||mount.search||mount.hash||
   !mount.pathname.endsWith('/')||mount.href!==base)throw Error('mount');
 }catch{fail('canonical approved HTTPS base required')}
 if(referenceDate!==null&&!date(referenceDate))fail('invalid reference date');
 const allowed=new Map(paths.map(p=>[new URL(p.slice(1),mount).href,p]));
 const raws=Array.isArray(source)?source:[source];
 if(!raws.length||raws.length>60||raws.some(x=>!x||typeof x!=='object'||Array.isArray(x)))
  fail('1–60 original CrUX API response objects required');
 const records=[],findings=[],seen=new Set();
 function note(rec,code,priority,detail,metric=null){
  findings.push({code:'field:'+code,priority,scope:rec.scope,path:rec.path,
   device:rec.device,metric,detail,manualOnly:true,automaticFix:false});
 }
 for(const raw of raws){
  const input=raw.record,key=input?.key;
  if(!key||typeof key!=='object'||Array.isArray(key)||
   !input.metrics||typeof input.metrics!=='object'||Array.isArray(input.metrics))
   fail('original CrUX queryRecord response with record/key/metrics required');
  const device=key.formFactor===undefined?'ALL':key.formFactor;
  if(!DEVICES.has(device))fail('unknown CrUX form factor');
  if(Boolean(key.url)===Boolean(key.origin))fail('one URL or origin identifier required');
  let scope,path=null;
  if(key.origin!==undefined){
   if(key.origin!==mount.origin)fail('CrUX origin does not match approved host');
   scope='origin';
  }else{
   if(typeof key.url!=='string'||!allowed.has(key.url))
    fail('CrUX page URL is not an exact approved Blueprint route');
   path=allowed.get(key.url);scope='page';
  }
  const identity=[scope,path||'',device].join(':');
  if(seen.has(identity))fail('duplicate CrUX URL/origin and form-factor record');
  seen.add(identity);
  const window=period(input.collectionPeriod);
  const metrics={};
  const rec={scope,path,device,period:window,metrics};
  for(const def of METRICS){
   const value=p75(input.metrics[def.key],def);
   const classification=value===null?'unknown':value>def.poor?'poor':
    value>def.good?'needs-improvement':'good';
   metrics[def.label]={p75:value,unit:def.unit,classification};
   if(classification==='poor')note(rec,def.label.toLowerCase()+'-poor','P1',
    'CrUX rolling field '+def.label+' p75 is in the poor range; investigate current customer experience separately.',def.label);
   else if(classification==='needs-improvement')note(rec,def.label.toLowerCase()+'-needs-improvement','P2',
    'CrUX rolling field '+def.label+' p75 is in the needs-improvement range; investigate separately.',def.label);
  }
  if(METRICS.some(def=>metrics[def.label].p75===null))
   note(rec,'metric-coverage-incomplete','P2',
    'One or more LCP/INP/CLS p75 values are absent; absence is unknown, never a good score.');
  if(!window)note(rec,'collection-window-unknown','P2',
   'CrUX collection dates are missing; field data freshness cannot be established.');
  if(window&&referenceDate&&Date.parse(referenceDate)-Date.parse(window.to)>35*86400000)
   note(rec,'collection-window-stale','P2',
    'Supplied CrUX collection ended more than 35 days before this review date.');
  if(window&&referenceDate&&window.to>referenceDate)
   note(rec,'collection-window-future','P2',
    'Supplied CrUX collection ends after this review date; check the original export and local clock.');
  if(scope==='origin'&&mount.pathname!=='/')
   note(rec,'origin-exceeds-approved-mount','P2',
    'Origin-wide CrUX includes URLs outside the approved subdirectory mount; do not attribute it to this Site v1 alone.');
  records.push(rec);
 }
 const count=classification=>records.reduce((n,r)=>n+METRICS.filter(d=>
  r.metrics[d.label].classification===classification).length,0);
 const represented=new Set(records.filter(r=>r.scope==='page').map(r=>r.path));
 const summary={records:records.length,pageRecords:records.filter(x=>x.scope==='page').length,
  originRecords:records.filter(x=>x.scope==='origin').length,
  approvedPages:paths.length,representedApprovedPages:represented.size,
  unrepresentedApprovedPages:paths.length-represented.size,
  deviceSpecificRecords:records.filter(x=>x.device!=='ALL').length,
  unknownMetricValues:count('unknown'),goodMetricValues:count('good'),
  needsImprovementMetricValues:count('needs-improvement'),poorMetricValues:count('poor'),
  missingPeriodRecords:records.filter(x=>!x.period).length,
  stalePeriodRecords:findings.filter(x=>x.code==='field:collection-window-stale').length,
  futurePeriodRecords:findings.filter(x=>x.code==='field:collection-window-future').length,
  P1:findings.filter(x=>x.priority==='P1').length,
  P2:findings.filter(x=>x.priority==='P2').length};
 return {format:FORMAT,siteId,base,rawCruxSourceSha256:sourceSha256,
  reviewReferenceDate:referenceDate,records,findings,summary,
  readOnly:true,sourceAuthenticated:false,googlePropertyAuthenticated:false,
  currentReleaseRepresented:false,releaseAuthorized:false,
  limitations:['Operator-supplied CrUX API JSON; no Google query or key is used by this tool.',
   'URL records cover one page; origin records aggregate other pages too.',
   'CrUX aggregates a historical rolling collection period, not the current deployed revision.',
   'Missing approved page records are unobserved; origin-wide records do not fill their page coverage.',
   'Missing metrics are unknown; field p75 is distinct from isolated browser/lab timing.',
   'Owner, published revision, provenance and any release decision remain human-only.']};
}
module.exports=Object.freeze({FORMAT,METRICS,review});
