'use strict';
/* No real customer data, network, or CMS calls. */
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const PIN=require('../lib/first-site-session-source-pin.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'manufact-seo-pin-'));
try{
 const file=(name,content)=>{const dest=path.join(root,name);
  fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);return dest;};
 const conf={phase:'public-capture',inputs:{
  candidate:path.join(root,'candidate'),
  approvedSite:path.join(root,'sealed'),
  publishedSite:file('published.json','{"version":3,"sourceRevision":5}'),
  staticExport:path.join(root,'export'),origin:'https://example.org/'}};
 file('sealed/handoff.json','{"format":"sealed"}');
 file('export/release-manifest.json','{"format":"static"}');
 file('candidate/CANDIDATE-STATUS.json','{"format":"candidate"}');
 file('candidate/seo-report/summary.json','{"format":"summary"}');
 file('candidate/seo-report/bundle.json','{"format":"bundle"}');
 file('candidate/static-upload/upload-inventory.json','{"format":"inventory"}');
 file('candidate/public-site.zip','synthetic-public-zip-for-pin-smoke');
 const before=PIN.capture(conf);
 assert.equal(before.pinnedRoles.length,8);
 assert.equal(PIN.unchanged(before,PIN.capture(conf)),true);
 fs.writeFileSync(conf.inputs.publishedSite,'{"version":4,"sourceRevision":6}');
 assert.throws(()=>PIN.unchanged(before,PIN.capture(conf)),/changed during integration/);
 fs.writeFileSync(conf.inputs.publishedSite,'{"version":3,"sourceRevision":5}');
 fs.appendFileSync(path.join(root,'candidate','public-site.zip'),'changed');
 assert.throws(()=>PIN.unchanged(before,PIN.capture(conf)),/changed during integration/);
 assert.throws(()=>PIN.shaFile(root),/ordinary bounded/);
 console.log('First-site source snapshot smoke PASS: detects owner and ZIP mutation');
}finally{fs.rmSync(root,{recursive:true,force:true});}
