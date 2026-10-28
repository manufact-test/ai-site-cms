'use strict';
// Compare two *local, operator-provided* first-site report bundles.
// No CMS writes. "Not observed" is never a verified fix or release approval.
const fs=require('node:fs'),path=require('node:path');
const FORMAT='manufact-seo-first-site-report-delta-v1';
const SOURCE='manufact-seo-first-site-check-v1';
const BUNDLE='manufact-seo-review-bundle-v1';
const MAX_SUMMARY=800000,MAX_BUNDLE=42000000;
const GROUPS=['localPhpHead','localPhpNavigation','localPhpGraph','localPhpComponents',
 'localPhpForms','localPhpMedia','localPhpPublication'];
const safe=(x,max=250)=>String(x??'').replace(/[\u0000-\u001f\u007f]/g,' ')
 .replace(/[|]/g,' / ').replace(/[\x60*_<>{}\[\]#]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
function file(folder,name,max){
 const target=path.join(folder,name);
 const st=fs.lstatSync(target);
 if(!st.isFile()||st.isSymbolicLink()||st.size<10||st.size>max)
  throw Error('Previous local first-site report has invalid '+name);
 return JSON.parse(fs.readFileSync(target,'utf8'));
}
function read(folder){
 const root=fs.realpathSync(path.resolve(folder));
 if(!fs.statSync(root).isDirectory())throw Error('Previous first-site report is not a directory');
 const summary=file(root,'summary.json',MAX_SUMMARY),bundle=file(root,'bundle.json',MAX_BUNDLE);
 if(summary?.format!==SOURCE||bundle?.format!==BUNDLE||
    !summary.siteId||summary.siteId!==bundle.siteId||
    summary.sourceSiteSha256!==bundle.approvedSiteSource?.fileSha256||
    !bundle.readOnly||!Array.isArray(bundle.release?.blockers))
  throw Error('Prior first-site report is not a coherent original generated report');
 return Object.freeze({root,summary,bundle});
}
const ident=x=>JSON.stringify([
 x.code||'',x.pageId||'',x.path||'',x.sectionId||'',x.graphNodeId||'',
 x.assetId||'',x.field||'',x.device||'',x.expectedPath||''
]);
function findings(bundle){
 const all=[];
 for(const group of GROUPS){
  const arr=bundle[group]?.findings;
  if(arr===null||arr===undefined)continue;
  if(!Array.isArray(arr)||arr.length>15000)throw Error('Invalid local findings group '+group);
  for(const issue of arr){
   if(!issue||typeof issue.code!=='string'||!['error','warning','recommendation'].includes(issue.severity))
    throw Error('Invalid local PHP finding in '+group);
   all.push({group,...issue});
  }
 }
 if(bundle.phpCapture?.findings)for(const issue of bundle.phpCapture.findings){
  if(!issue||typeof issue.code!=='string')throw Error('Invalid previous PHP screenshot finding');
  all.push({group:'phpCapture',...issue});
 }
 return all;
}
function diff(before,after){
 const beforeBy=new Map(),afterBy=new Map();
 const add=(map,f)=>{const key=f.group+'|'+ident(f);
  const previous=map.get(key);
  if(previous){previous.count++;previous.records.push(f);}
  else map.set(key,{key,record:f,count:1,records:[f]});
 };
 before.forEach(f=>add(beforeBy,f));after.forEach(f=>add(afterBy,f));
 const added=[],notObserved=[],persistent=[],changedSeverity=[];
 for(const key of new Set([...beforeBy.keys(),...afterBy.keys()])){
  const a=beforeBy.get(key),b=afterBy.get(key);
  if(a&&b){
   const count=Math.min(a.count,b.count);
   persistent.push({key,count,code:b.record.code,severity:b.record.severity,
    group:b.record.group,pageId:b.record.pageId||null,sectionId:b.record.sectionId||null});
   if(a.record.severity!==b.record.severity)
    changedSeverity.push({key,from:a.record.severity,to:b.record.severity,count});
  }
  const shrink=(a?.count??0)-(b?.count??0);
  if(shrink>0)notObserved.push({...a.record,occurrences:shrink});
  if(shrink<0)added.push({...b.record,occurrences:-shrink});
 }
 return {added,notObserved,persistent,changedSeverity};
}
function build(previous,currentSummary,currentBundle){
 if(!previous||currentSummary?.format!==SOURCE||currentBundle?.format!==BUNDLE||
    !currentBundle.readOnly||!Array.isArray(currentBundle.release?.blockers))
  throw Error('First-site progress requires prior and current generated local reports');
 const prior=previous.summary,pb=previous.bundle;
 if(currentSummary.siteId!==prior.siteId||currentBundle.siteId!==prior.siteId||
    currentSummary.sourceSiteSha256!==prior.sourceSiteSha256||
    currentSummary.packageVersion!==prior.packageVersion||
    currentSummary.origin!==prior.origin)
  throw Error('Comparing different approved packages, site IDs or localhost origins is not safe');
 const priorFindings=findings(pb),newFindings=findings(currentBundle);
 const changed=diff(priorFindings,newFindings);
 const previousGates=new Set(pb.release.blockers.map(x=>x.gateId));
 const latestGates=new Set(currentBundle.release.blockers.map(x=>x.gateId));
 const newGates=[...latestGates].filter(x=>!previousGates.has(x));
 const gatesNotObserved=[...previousGates].filter(x=>!latestGates.has(x));
 const persistentGates=[...latestGates].filter(x=>previousGates.has(x));
 const previousVersion=prior.publishedVersion??null;
 const currentVersion=currentSummary.publishedVersion??null;
 const summary=Object.freeze({
  comparedSameSealedSource:true,comparedSameLocalMount:true,
  beforePublishedVersion:previousVersion,afterPublishedVersion:currentVersion,
  previousObservedFindings:priorFindings.length,currentObservedFindings:newFindings.length,
  newFindingOccurrences:changed.added.reduce((n,x)=>n+x.occurrences,0),
  noLongerObservedOccurrences:changed.notObserved.reduce((n,x)=>n+x.occurrences,0),
  persistentFindingOccurrences:changed.persistent.reduce((n,x)=>n+x.count,0),
  changedSeverityGroups:changed.changedSeverity.length,
  previousBlockingGates:previousGates.size,currentBlockingGates:latestGates.size,
  newlyBlockingGates:newGates.length,blockingGatesNoLongerObserved:gatesNotObserved.length,
  operatorConfirmedFixes:0,actualWrites:0,automaticRelease:false
 });
 const lines=['# First-site technical report comparison — not release approval','',
  'Same sealed site.json SHA256 and local mount; previous CMS published version: '+
    (previousVersion??'unknown')+'; current version: '+(currentVersion??'unknown')+'.',
  '',
  'Previous observed PHP findings: '+summary.previousObservedFindings+
   '; current: '+summary.currentObservedFindings+'.',
  'New finding occurrences: '+summary.newFindingOccurrences+
   '; no longer observed: '+summary.noLongerObservedOccurrences+
   '; persistent occurrences: '+summary.persistentFindingOccurrences+'.',
  'Blocking gates: '+summary.previousBlockingGates+' → '+summary.currentBlockingGates+'.',
  '',
  '## New PHP evidence issues',''];
 for(const x of changed.added.slice(0,45))
  lines.push('- '+safe(x.group,70)+' '+safe(x.code,100)+' · '+safe(x.path||x.pageId,130)+
   (x.sectionId?' · '+safe(x.sectionId,80):'')+
   ' · '+safe(x.message,180)+' (x'+x.occurrences+')');
 if(!changed.added.length)lines.push('- None observed in these captured groups.');
 lines.push('','## Previously seen, not present in current local capture','',
  '**These are not confirmed fixes.** The served PHP build is not cryptographically attested; changed coverage or an invalid earlier report can give false improvement.');
 for(const x of changed.notObserved.slice(0,45))
  lines.push('- '+safe(x.group,70)+' '+safe(x.code,100)+' · '+safe(x.path||x.pageId,130)+
   ' (previous count not observed: '+x.occurrences+')');
 if(!changed.notObserved.length)lines.push('- None.');
 lines.push('','## Technical release blockers','',
  '- Newly present: '+(newGates.map(x=>safe(x,120)).join(', ')||'none')+'.',
  '- No longer present: '+(gatesNotObserved.map(x=>safe(x,120)).join(', ')||'none')+'.',
  '- Still present: '+(persistentGates.map(x=>safe(x,120)).join(', ')||'none')+'.',
  '','## Required operator check','',
  '- [ ] Confirm both captured versions correspond to the intended CMS published release and equivalent PHP server configuration.',
  '- [ ] Compare changed actual PHP HTML plus desktop/tablet/mobile screenshots for the affected pages.',
  '- [ ] Recheck real forms (POST, delivery) and public HTTPS separately.',
  '- [ ] Accept or reject fixes manually. No automatic closure, publish or deployment.',
  '');
 const result={format:FORMAT,siteId:prior.siteId,readOnly:true,
  comparedFromSourceSha256:prior.sourceSiteSha256,
  previousCaptureAt:prior.capturedAt,currentCaptureAt:currentSummary.capturedAt,
  summary,findings:changed,
  gates:{newlyPresent:newGates,noLongerPresent:gatesNotObserved,persistent:persistentGates},
  markdown:lines.join('\n'),
  manualFixesVerified:false,phpBuildIdentityVerified:false,publicHttpsVerified:false,
  releaseAuthorized:false};
 return Object.freeze(result);
}
module.exports=Object.freeze({FORMAT,read,build,diff,findings});
