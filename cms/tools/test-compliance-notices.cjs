'use strict';
// No GitHub/Hostinger network, secrets, or production write access.
// Regression tests for exact-root Composer NOTICE capture.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {installedNotices}=require('./generate-compliance.cjs');
const root=path.resolve(__dirname,'..');
let checks=0;
function check(ok, label){assert.ok(ok,label);checks++;}
for(const packageName of ['opis/json-schema','opis/string']){
  const folder=path.join(root,'vendor',packageName);
  const data=installedNotices(folder);
  check(data.length>=1 && data.some(n=>n.file==='NOTICE'),
    'Pinned Apache root NOTICE present: '+packageName);
  const exact=fs.readFileSync(path.join(folder,'NOTICE'),'utf8');
  check(data.find(n=>n.file==='NOTICE')?.content===exact,
    'NOTICE retained byte-for-byte as UTF-8: '+packageName);
  check(crypto.createHash('sha256').update(exact).digest('hex').length===64,
    'NOTICE provides deterministic SHA256 provenance: '+packageName);
}
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage2-apache-notice-gate-'));
try {
  check(installedNotices(tmp).length===0,'Optional packages without root NOTICE are supported');
  const original='Upstream NOTICE\nCopyright 2026 Independent Author\n';
  fs.writeFileSync(path.join(tmp,'NOTICE'),original,{mode:0o600});
  check(installedNotices(tmp)[0].content===original,'Root NOTICE collected from fixture');
  fs.writeFileSync(path.join(tmp,'NOTICE.md'),'Markdown notice with legal attribution\n');
  check(installedNotices(tmp).length===2,'All root NOTICE variants preserved, not first only');
  fs.unlinkSync(path.join(tmp,'NOTICE.md'));
  fs.symlinkSync(path.join(tmp,'NOTICE'),path.join(tmp,'NOTICE.txt'));
  assert.throws(()=>installedNotices(tmp),/Unsafe upstream NOTICE/);checks++;
  fs.unlinkSync(path.join(tmp,'NOTICE.txt'));
  fs.writeFileSync(path.join(tmp,'NOTICE.txt'),'tiny');
  assert.throws(()=>installedNotices(tmp),/Unsafe upstream NOTICE/);checks++;
  fs.writeFileSync(path.join(tmp,'NOTICE.txt'),'Z'.repeat(100001));
  assert.throws(()=>installedNotices(tmp),/Unsafe upstream NOTICE/);checks++;
  fs.unlinkSync(path.join(tmp,'NOTICE.txt'));
  fs.writeFileSync(path.join(tmp,'NOTICE.txt'),'Invalid\x00Binary copyright notice');
  assert.throws(()=>installedNotices(tmp),/Non-text upstream NOTICE/);checks++;
  fs.unlinkSync(path.join(tmp,'NOTICE.txt'));
  check(installedNotices(tmp).length===1,'Rejected fixture leaves genuine NOTICE intact');
}finally {
  fs.rmSync(tmp,{recursive:true,force:true});
}
console.log('Stage2 exact-source Apache NOTICE regression PASS: '+checks+' assertions; no host, secrets or network');
