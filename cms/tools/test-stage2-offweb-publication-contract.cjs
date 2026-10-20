'use strict';
// Validates this public-source publication route without GitHub or hosting I/O.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/stage2-hostinger-private-stage.yml'),'utf8');
const required=[
  'workflow_run:',"head_branch == 'main'", "conclusion == 'success'",
  'head_repository.full_name == github.repository',
  'stage2-hostinger-offweb-runtime','STAGE_PUBLIC_SOURCE_OFFWEB_ONLY',
  'branches/main', 'node tools/test-stage2-hostinger-private-stage.cjs',
  'node tools/build-internal-package.cjs',
  'gh auth setup-git', 'refs/heads/$branch'
];
for(const word of required)assert.ok(workflow.includes(word),'Required safe public-source staging control: '+word);
for(const forbidden of [
  'EVENT_PRIVATE', "'.private'", 'STAGE_PRIVATE_PACKAGE_ONLY',
  'public_html/"', 'CMS_DB_PASSWORD', 'secrets.', 'ssh ', 'rsync ',
  'curl -d', 'Hostinger API','--force', 'force-with-lease'
])assert.ok(!workflow.includes(forbidden),'Unexpected insecure operation/old privacy gate: '+forbidden);
assert.ok(workflow.indexOf('gh auth setup-git')<workflow.indexOf('git -C "$dst" push'));
const node=fs.readFileSync(path.join(__dirname,'stage2-hostinger-private-stage.cjs'),'utf8');
assert.ok(node.includes('verify(destination)')&&node.includes('manifest.files.map')&&
  node.includes('fs.copyFileSync')&&node.includes('STAGE2_UNSAFE_PACKAGE_LAYOUT'));
console.log('Stage2 public-repo offweb staging trigger, scope, and no-host/no-secret contract PASS.');
