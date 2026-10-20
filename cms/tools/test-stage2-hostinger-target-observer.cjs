'use strict';
// Pure offline checks of the parser: NO actual Hostinger/network access.
const assert=require('node:assert/strict');
const {evaluate,summary,REVISION}=require('./stage2-hostinger-target-observer.cjs');
const good={
 format:'ai-site-cms-stage2-target-php-preflight-v1',
 probeRevision:REVISION,observationOnly:true,cmsInstalled:false,stage2Accepted:false,
 stage3Authorized:false,productionReady:false,databaseConnectionAttempted:false,
 privateFilesystemVerified:false,cmsVisitorOutageTested:false,
 phpVersionMajorMinor:'8.3',phpSapi:'fpm-fcgi',
 requirements:Object.fromEntries(['php81OrLater','json','pdo','pdoMysql','openssl',
  'sodium','webSapi','documentRootMatchesPublicEntrypoint',
  'privateParentExistsAndReadable','privateParentAppearsWritable',
  'httpsVisibleToPhp'].map(k=>[k,true]))
};
const r=(s,b,ct='application/json')=>({status:s,
 headers:{'content-type':ct},body:Buffer.from(b)});
const check=(n,b)=>assert.strictEqual(Boolean(b),true,n);
check('valid actual PHP probe',evaluate('phpPreflight',r(200,JSON.stringify(good))).pass);
check('wrong revision refused',!evaluate('phpPreflight',r(200,JSON.stringify({...good,probeRevision:'old'}))).pass);
check('cannot claim acceptance',!evaluate('phpPreflight',r(200,JSON.stringify({...good,stage2Accepted:true}))).pass);
check('no DB claim',!evaluate('phpPreflight',r(200,JSON.stringify({...good,databaseConnectionAttempted:true}))).pass);
check('invalid shape',!evaluate('phpPreflight',r(200,JSON.stringify({...good,requirements:{}}))).pass);
check('invalid HTML',!evaluate('phpPreflight',r(200,'not json','text/html')).pass);
const routeGood={format:'ai-site-cms-stage2-routing-observation-v1',
 probeRevision:REVISION,exactNonFileRoute:true,frontControllerMapped:true,
 installationReady:false,privateStorageVerified:false,databaseConnected:false,
 stage2Accepted:false};
check('real non-file rewrite proof accepted',
 evaluate('lsapiFrontController',r(200,JSON.stringify(routeGood))).pass);
check('wrong PHP front controller refused',
 !evaluate('lsapiFrontController',r(503,JSON.stringify({...routeGood,frontControllerMapped:false}))).pass);
check('routing proof cannot claim install',
 !evaluate('lsapiFrontController',r(200,JSON.stringify({...routeGood,installationReady:true}))).pass);
check('routing proof redirect not accepted',
 !evaluate('lsapiFrontController',r(302,JSON.stringify(routeGood))).pass);
const privateMarker={format:'ai-site-cms-stage2-private-boundary-observation-v1',
 probeRevision:REVISION,outsideThisPublicRootMarkerObserved:false,
 cmsInstalled:false,privateCmsCodeInstalled:false,peerAccountIsolationVerified:false,
 databaseConnected:false,stage2Accepted:false};
check('uninstalled sibling marker is not a fake success',
 evaluate('privateBoundaryMarker',r(503,JSON.stringify(privateMarker))).pass);
check('real sibling marker can be recorded but not mistaken for CMS install',
 evaluate('privateBoundaryMarker',r(200,JSON.stringify({...privateMarker,outsideThisPublicRootMarkerObserved:true}))).observed);
check('fabricated marker not accepted',
 !evaluate('privateBoundaryMarker',r(200,JSON.stringify(privateMarker))).pass);
check('public marker blocked',
 evaluate('privateMarkerHttpExposure',r(404,'not found')).pass);
check('private marker publicly exposed rejected',
 !evaluate('privateMarkerHttpExposure',r(200,'secret')).pass);
check('visitor OK',evaluate('visitorHome',r(200,'<h1>hello</h1>','text/html')).pass);
check('visitor redirect refused',!evaluate('visitorHome',r(301,'moved','text/html')).pass);
check('health not installed',evaluate('notInstalled',r(503,'{"status":"not_installed"}')).pass);
check('health accepted refused',!evaluate('notInstalled',r(200,'{"status":"ok"}')).pass);
check('GET write route forbidden',evaluate('writeNotExposed',r(404,'not found')).pass);
check('forbid exposed files',!evaluate('gitPrivate',r(200,'secret')).pass);
const s=summary({requests:[{name:'phpPreflight',httpStatus:200,
 tlsVerified:true,passed:true,phpVersion:'8.3',webSapi:'fpm-fcgi',
 requirements:good.requirements}],allChecksPassed:true});
check('summary explicitly not installed',s.includes('CMS is NOT installed'));
const s2=summary({requests:[{name:'phpPreflight',httpStatus:200,tlsVerified:true,
 passed:true,phpVersion:'8.3',webSapi:'litespeed',requirements:good.requirements}],
 allChecksPassed:true,targetRuntimeCompatibilityConfirmed:false,
 compatibilityGaps:['php_sodium_missing','target_web_sapi_requires_compatibility_review']});
check('two capability gaps shown',s2.includes('php_sodium_missing')
 &&s2.includes('target_web_sapi_requires_compatibility_review'));
check('HTTPS pass not deploy acceptance',s2.includes('Target runtime compatibility for the current signed deployment: **STILL OPEN**'));
console.log('Stage2 live report parser contract: 24 offline checks PASS; no host I/O');
