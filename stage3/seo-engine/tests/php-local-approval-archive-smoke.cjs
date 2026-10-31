'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {review}=require('../lib/php-local-approval-archive.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'cms-seo-approval-index-'));
try{
 const digest=k=>k.repeat(64);
 const files={site:'site.json',desktop:'prototypes/desktop.png',
  tablet:'prototypes/tablet.png',mobile:'prototypes/mobile.png',
  clientExplanation:'client-explanation.md',implementationSpec:'spec.md',
  pagePrototypes:{'page-services':{desktop:'pages/services-d.png',
   tablet:'pages/services-t.png',mobile:'pages/services-m.png'}}};
 const integrityFiles=Object.fromEntries([
  'site.json','prototypes/desktop.png','prototypes/tablet.png','prototypes/mobile.png',
  'client-explanation.md','spec.md','pages/services-d.png','pages/services-t.png',
  'pages/services-m.png'].map((p,i)=>[p,digest('abcdef0123456789'[i])]));
 const handoff={format:'manufact-approved-site-handoff-v2',version:'v1',
  status:'approved',files,integrity:{files:integrityFiles}};
 const bytes=Buffer.from(JSON.stringify(handoff));fs.writeFileSync(path.join(folder,'handoff.json'),bytes);
 const site={siteId:'site-pilot',pages:[{id:'page-home',path:'/'},
  {id:'page-services',path:'/services/'}]};
 const source={siteId:'site-pilot',packageFormat:'manufact-approved-site-handoff-v2',
  packageVersion:'v1',integrity:'sha256-verified-at-read',
  fileSha256:integrityFiles['site.json'],
  homepagePrototypeSha256:{desktop:integrityFiles['prototypes/desktop.png'],
   tablet:integrityFiles['prototypes/tablet.png'],mobile:integrityFiles['prototypes/mobile.png']}};
 const expected=new Map([['handoff',{sha256:hash(bytes),bytes:bytes.length}]]);
 for(const kind of ['site','desktop','tablet','mobile','clientExplanation','implementationSpec'])
  expected.set(kind,{sha256:integrityFiles[files[kind]],bytes:100});
 for(const [i,dev] of ['desktop','tablet','mobile'].entries())
  expected.set('ref-0-'+dev,{sha256:integrityFiles[files.pagePrototypes['page-services'][dev]],bytes:100});
 const pkg={packageSha:hash(bytes),version:'v1',complete:true,
  files:Object.fromEntries(expected)};
 const pass=review(folder,site,source,{packages:[pkg]});
 assert.equal(pass.exactSealedPackageFound,true);
 assert.equal(pass.ownerArchiveKindsChecked,10);
 assert.equal(pass.findings.length,0);
 assert.equal(pass.clientApprovalSignatureVerified,false);
 assert.ok(!JSON.stringify(pass).includes('page-services'));
 const failed=review(folder,site,source,{packages:[]});
 assert.ok(failed.findings.some(x=>x.code==='php-approval:sealed-package-not-archived'));
 const corrupt=review(folder,site,source,{packages:[{...pkg,files:{...pkg.files,mobile:{sha256:'f'.repeat(64),bytes:100}}}]});
 assert.ok(corrupt.findings.some(x=>x.code==='php-approval:archived-approval-evidence-sha256-drift'));
 assert.equal(corrupt.prototypeImageBytesExposed,false);
 console.log('CMS owner private approval archive: SHA256 matching, page prototypes, missing and corrupt evidence PASS');
}finally{fs.rmSync(folder,{recursive:true,force:true});}
