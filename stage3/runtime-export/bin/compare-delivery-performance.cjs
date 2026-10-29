#!/usr/bin/env node
'use strict';
/**
 * Compare TWO SHA-verified, immutable customer release ZIPs.
 * No CMS credentials, DNS, external requests, deployment or publish actions.
 * This is not a measurement of actual client-side network or LCP.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {audit}=require('../lib/delivery-preflight.cjs');
const {readArchive}=require('../lib/delivery-zip.cjs');
const fail=m=>{throw Error('D7 offline release comparison refused: '+m);};
const [olderPath,newerPath,...flags]=process.argv.slice(2);
function exists(p){try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
function checkFile(p){
  if(!path.isAbsolute(p??'')||!fs.existsSync(p)||!fs.statSync(p).isFile()||
    fs.lstatSync(p).isSymbolicLink()||fs.realpathSync(p)!==p)
    fail('Expected existing canonical absolute ZIP file');
}
function options(){
  if(flags.length>3||flags.some(x=>x!=='--fail-on-regression'&&x!=='--fail-on-budget'&&!x.startsWith('--report='))||
    new Set(flags.map(x=>x.split('=')[0])).size!==flags.length)
    fail('Usage: compare-delivery-performance.cjs /ABS/old.zip /ABS/new.zip [--fail-on-regression] [--fail-on-budget] [--report=/ABS/new.json]');
  const report=flags.find(x=>x.startsWith('--report='))?.slice(9)??null;
  if(report&&( !path.isAbsolute(report)||exists(report)||path.dirname(report)!==fs.realpathSync(path.dirname(report))
    ||[olderPath,newerPath].includes(report)))fail('Report path must be unused, canonical, absolute and separate');
  return report;
}
const diff=(oldValue,newValue)=>newValue-oldValue;
const changes=['htmlBytes','htmlGzipEstimateBytes','pageCssBytes','referencedMediaBytes','eagerImageCandidateBytes'];
function main(){
  checkFile(olderPath);checkFile(newerPath);const target=options();
  if(olderPath===newerPath)fail('Two separate versions required');
  const older=audit(olderPath),newer=audit(newerPath);
  if(older.siteId!==newer.siteId)fail('Cannot compare different customer sites');
  if(newer.publishedVersion<=older.publishedVersion)
    fail('New release must have a strictly greater publishedVersion');
  if(!newer.performance||!older.performance)fail('Missing verified performance data');
  const byOld=new Map(older.performance.pages.map(p=>[p.route,p]));
  const byNew=new Map(newer.performance.pages.map(p=>[p.route,p]));
  const routes=[...new Set([...byOld.keys(),...byNew.keys()])].sort();
  const regressions=[],pageChanges=[];
  const regression=(code,route,prev,next,limit)=>regressions.push({
    code,route,previousBytes:prev,currentBytes:next,deltaBytes:next-prev,
    thresholdBytes:limit
  });
  for(const route of routes){
    const before=byOld.get(route),after=byNew.get(route);
    const status=!before?'added':!after?'removed':changes.some(k=>before[k]!==after[k])?'changed':'unchanged';
    const delta=before&&after?Object.fromEntries(changes.map(k=>[k,diff(before[k],after[k])])):null;
    if(before&&after){
      if(delta.htmlGzipEstimateBytes>8192&&after.htmlGzipEstimateBytes>before.htmlGzipEstimateBytes*1.25)
        regression('HTML_GZIP_GROWTH',route,before.htmlGzipEstimateBytes,after.htmlGzipEstimateBytes,8192);
      if(delta.pageCssBytes>32768)regression('CSS_GROWTH',route,before.pageCssBytes,after.pageCssBytes,32768);
      if(delta.eagerImageCandidateBytes>350*1024)regression('EAGER_IMAGES_GROWTH',route,
        before.eagerImageCandidateBytes,after.eagerImageCandidateBytes,350*1024);
      if(delta.referencedMediaBytes>2*1024*1024)regression('PAGE_MEDIA_GROWTH',route,
        before.referencedMediaBytes,after.referencedMediaBytes,2*1024*1024);
    }
    pageChanges.push({route,status,previous:before??null,current:after??null,delta});
  }
  const totals={};
  for(const name of ['publishedMediaBytes','referencedMediaBytes','unreferencedInHtmlMediaBytes',
    'sharedCssBytes','publishedHtmlBytes','publishedHtmlGzipEstimateBytes']){
    totals[name]={before:older.performance.totals[name],after:newer.performance.totals[name],
      delta:diff(older.performance.totals[name],newer.performance.totals[name])};
  }
  const report={
    format:'manufact-offline-release-performance-diff-v1',
    scope:'TWO_VERIFIED_PUBLISHED_RELEASE_ZIPS',
    siteId:newer.siteId,fromVersion:older.publishedVersion,toVersion:newer.publishedVersion,
    fromTechnology:older.technology,toTechnology:newer.technology,
    fromZipSha256:older.zipSha256,toZipSha256:newer.zipSha256,
    totals,pageChanges,regressions,newBudgetFindings:newer.performance.findings,
    performanceRegressed:regressions.length>0,
    hostMeasured:false,ownerAccepted:false,productionDeployed:false,
    notice:'Published source file-size comparisons only; HTML gzip is estimated and responsive candidate bytes are not actual browser transfers. New pages lack a prior baseline. Remote TLS, LCP, Core Web Vitals, HTTP cache behavior and client acceptance are NOT verified.'
  };
  if(target){
    const temp=path.join(path.dirname(target),'.stage3-d7-'+crypto.randomBytes(8).toString('hex'));
    try{
      fs.writeFileSync(temp,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
      fs.linkSync(temp,target);
    }finally{if(exists(temp))fs.rmSync(temp,{force:true});}
  }
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(flags.includes('--fail-on-regression')&&regressions.length)process.exitCode=3;
  else if(flags.includes('--fail-on-budget')&&newer.performance.findings.length)process.exitCode=4;
}
try{main();}catch(e){console.error(e.message);process.exitCode=1;}
