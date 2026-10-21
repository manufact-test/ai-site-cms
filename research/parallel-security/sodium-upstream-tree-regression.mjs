#!/usr/bin/env node
// Hostile mutations against an observed GitHub upstream 211-entry tree;
// synthetic local files are used ONLY to prove source blob hash comparison.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {loadUpstream,checkUpstreamTranscript,checkInstalledGitSource} from './sodium-upstream-tree-proof.mjs';
const raw=JSON.stringify(loadUpstream()),original=JSON.parse(raw);
let n=0;const good=(ok,name)=>{assert.ok(ok,name);n++;};
const bad=(why,modify)=>{const obj=JSON.parse(raw);modify(obj);assert.throws(
  ()=>checkUpstreamTranscript(obj),/UPSTREAM_SODIUM_GIT_PROVENANCE_FAIL/,
  'failed to reject '+why);n++;};
const p=checkUpstreamTranscript(original);
good(p.realGitEntriesVerified===211&&p.exportedGitBlobIds===78&&
  !p.localPgpSignatureIndependentlyChecked,'real upstream Git manifest passes SHA root');
bad('changed tag object ID',o=>o.tag.objectSha='a'.repeat(40));
bad('changed tag signing classification',o=>o.tag.githubVerified=false);
bad('unsigned raw commit marked signed',o=>o.commit.githubVerified=true);
bad('wrong commit signed by tag',o=>o.tag.targetCommit='a'.repeat(40));
bad('altered signed tag payload',o=>o.tag.payload+='ATTACK');
bad('missing PGP tag signature',o=>o.tag.signature='UNSIGNED');
bad('false independently vetted upstream signer',o=>o.classification.authorOrPublisherIdentityIndependentlyVetted=true);
bad('false source archive bytes previously verified',o=>o.classification.actualVendorTreeVerified=true);
bad('false 2.5.2 cryptography audited',o=>o.classification.cryptographyReviewed=true);
bad('tag with new Git commit tree',o=>o.commit.treeSha='a'.repeat(40));
bad('recursive Git tree truncated',o=>o.git.truncated=true);
bad('missing source blob',o=>o.git.entries.pop());
bad('duplicated file',o=>o.git.entries.push({...o.git.entries[0]}));
bad('swapped encryption implementation Git SHA',o=>{
  o.git.entries.find(e=>e.path==='src/Compat.php').sha='a'.repeat(40);
});
bad('swapped LICENSE file Git SHA',o=>{
  o.git.entries.find(e=>e.path==='LICENSE').sha='a'.repeat(40);
});
bad('new symlink in archive Git tree',o=>{
  const e=o.git.entries.find(e=>e.path==='LICENSE');e.mode='120000';
});
bad('repo tree blob points outside trusted root',o=>{
  const e=o.git.entries.find(e=>e.path==='LICENSE');e.path='../escape';
});
bad('Git path separator replaced',o=>{
  const e=o.git.entries.find(e=>e.path==='src/Compat.php');e.path='src\\Compat.php';
});
bad('missing parent directory record',o=>{
  o.git.entries=o.git.entries.filter(e=>e.path!=='src');
  o.git.count=o.git.entries.length;
});
bad('wrong parent tree object ID',o=>{
  o.git.entries.find(e=>e.path==='src').sha='b'.repeat(40);
});
bad('modified Git export-ignore filters',o=>o.archiveExportIgnoreRoot.pop());
bad('critical source excluded from archive',o=>o.archiveExportIgnorePrefix='src');
bad('false Hostinger claim',o=>o.classification.productionApproved=true);
// A synthetic 4-entry tree correctly checks its own bytes, but checkInstalledGitSource
// must reject because this is NOT the real pinned 211-entry signed upstream tree.
const sha=x=>crypto.createHash('sha1').update(x).digest('hex');
const blob=x=>sha(Buffer.concat([Buffer.from('blob '+x.length),Buffer.from([0]),x]));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sodium-git-blob-mutation-'));
try{
  const copy=path.join(temp,'sodium_compat');
  fs.mkdirSync(copy);
  fs.writeFileSync(path.join(copy,'LICENSE'),'not the actual ParagonIE LICENSE');
  assert.throws(()=>checkInstalledGitSource(copy,original),
    /UPSTREAM_SODIUM_GIT_PROVENANCE_FAIL/);
  n++;
  fs.mkdirSync(path.join(copy,'src'));
  fs.writeFileSync(path.join(copy,'src/Compat.php'),'<?php echo "malicious";');
  assert.throws(()=>checkInstalledGitSource(copy,original),
    /UPSTREAM_SODIUM_GIT_PROVENANCE_FAIL/);
  n++;
  const symbol=path.join(copy,'symlink.php');
  fs.symlinkSync(path.join(copy,'LICENSE'),symbol);
  assert.throws(()=>checkInstalledGitSource(copy,original),
    /UPSTREAM_SODIUM_GIT_PROVENANCE_FAIL/);
  fs.unlinkSync(symbol);n++;
  good(blob(Buffer.from('upstream git blob')).length===40,
    'local git blob hash infrastructure');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
assert.equal(n,28,'Expected all upstream Git identity/attack cases');
console.log('REAL signed-tag 211-entry upstream Git source integrity offline regression PASS '+n+' assertions; 78 shipping Git blobs pinned; local installed source and signer key NOT independently verified');
