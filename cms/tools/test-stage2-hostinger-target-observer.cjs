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
console.log('Stage2 live report parser contract: 13 offline checks PASS; no host I/O');
