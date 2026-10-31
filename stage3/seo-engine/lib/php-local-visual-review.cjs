'use strict';
// Owner-copied GET /api/sites/SITE-ID/visual-review?revision=SOURCE_REV.
// The PHP API stores DRAFT revision observations, not client approvals.
// Never serialize operator notes, author names, timestamps or raw finding IDs.
const FORMAT='manufact-seo-owner-visual-review-v1';
const DEVICE=new Set(['desktop','tablet','mobile']);
const ID=/^[a-z][a-z0-9-]{2,79}$/;
function review(site,raw,sourceRevision){
 if(!site||!ID.test(site.siteId||'')||!Array.isArray(site.pages)||
    !Number.isSafeInteger(sourceRevision)||sourceRevision<1||
    !raw||typeof raw!=='object'||Array.isArray(raw)||
    typeof raw.available!=='boolean'||!Number.isSafeInteger(raw.revision)||
    raw.revision!==sourceRevision||typeof raw.historical!=='boolean'||
    !Array.isArray(raw.findings)||raw.findings.length>200||
    !Number.isSafeInteger(raw.openCount)||raw.openCount<0||
    raw.openCount>raw.findings.length)
  throw Error('Owner visual-review evidence must match the exact published CMS sourceRevision');
 const byPage=new Map(site.pages.map(p=>[p.id,p.path])),counts=new Map();
 const seen=new Set(),findings=[],groups=[],add=(code,severity,path,message,device=null)=>
  findings.push(Object.freeze({code:'php-visual:'+code,severity,pageId:null,path,
   ...(device?{device}:{}),message,
   evidence:'owner-provided-visual-draft-observations-not-client-approval',
   automatic:false}));
 if(!raw.available){
  if(raw.findings.length||raw.openCount!==0||raw.migrationRequired!==true)
   throw Error('Unavailable owner visual-review API status has unexpected findings');
  add('visual-review-storage-unavailable','warning',null,
   'The owner visual-review table is unavailable; manual three-device observation review is required.');
 }else if(raw.migrationRequired===true)throw Error('Visual review availability contradicts schema state');
 for(const row of raw.findings){
  if(!raw.available||!row||typeof row!=='object'||Array.isArray(row)||
     !ID.test(row.pageId||'')||byPage.get(row.pageId)!==row.path||
     !DEVICE.has(row.device)||!Number.isSafeInteger(row.scrollY)||
     row.scrollY<0||row.scrollY>60000||typeof row.resolved!=='boolean'||
     !Number.isSafeInteger(row.version)||row.version<1||
     typeof row.findingId!=='string'||!/^visual-[a-f0-9]{24}$/.test(row.findingId)||
     seen.has(row.findingId))
   throw Error('Owner visual-review findings contain stale page, duplicate ID, invalid device or unsafe state');
  seen.add(row.findingId);
  const key=row.pageId+'|'+row.device;
  const item=counts.get(key)||{pageId:row.pageId,path:row.path,device:row.device,
    total:0,open:0,resolved:0};
  item.total++;
  row.resolved?item.resolved++:item.open++;
  counts.set(key,item);
 }
 const actualOpen=[...counts.values()].reduce((n,x)=>n+x.open,0);
 if(actualOpen!==raw.openCount)
  throw Error('Owner visual-review openCount contradicts the actual revision findings');
 for(const c of counts.values()){
  groups.push(Object.freeze({...c}));
  if(c.open)add('published-revision-has-open-visual-findings','error',c.path,
   'The owner visual-review API records unresolved visual findings on this exact published source revision; inspect and resolve before release.',c.device);
 }
 return Object.freeze({format:FORMAT,siteId:site.siteId,
  sourceRevisionClaim:sourceRevision,ownerApiAvailable:raw.available,
  reviewTargetsPublishedSourceRevision:true,
  isHistoricalDraftRelativeToCurrent:raw.historical,
  checkedFindingCount:raw.findings.length,openCount:actualOpen,
  resolvedCount:raw.findings.length-actualOpen,
  pagesWithOpenFindings:new Set(groups.filter(x=>x.open).map(x=>x.pageId)).size,
  devicesWithOpenFindings:[...new Set(groups.filter(x=>x.open).map(x=>x.device))].sort(),
  perPageDevice:Object.freeze(groups),findings:Object.freeze(findings),
  operatorNotesExposed:false,findingIdentifiersExposed:false,
  authorIdentityExposed:false,approvedClientMockupsVerified:false,
  actualBrowserParityVerified:false,clientApprovalVerified:false,
  ownerApiResponseAuthenticated:false,automaticRelease:false,
  limitations:'This is a mutable owner-provided draft-visual observations snapshot for the pinned published source revision. Open findings block release. Resolved/absent findings do not prove visual fidelity, client sign-off or actual source identity.'});
}
module.exports=Object.freeze({FORMAT,review});
