'use strict';
// Validates this public-source publication route without GitHub or hosting I/O.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/stage2-hostinger-private-stage.yml'),'utf8');
// A source-only test commit must not change Composer root VERSION inside
// the uploaded package; release.json is the explicit version source.
assert.ok(workflow.includes('export COMPOSER_ROOT_VERSION=')&&
  workflow.includes("split('-stage2.')")&&workflow.includes("'-alpha'"));
const required=[
  'workflow_run:',"head_branch == 'main'", "conclusion == 'success'",
  'head_repository.full_name == github.repository',
  'stage2-hostinger-offweb-runtime','STAGE_PUBLIC_SOURCE_OFFWEB_ONLY',
  'branches/main', 'node tools/test-stage2-hostinger-private-stage.cjs',
  'node tools/build-internal-package.cjs',
  'gh auth setup-git', 'refs/heads/$branch',
  'git -C "$dst" diff --cached --quiet',
  'Identical verified package; keep existing deployment branch SHA.'
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
// A changed test/workflow commit MUST NOT alter Composer-generated root
// metadata inside the runnable offweb package. This is a byte-level stability
// prerequisite, not publisher signature evidence.
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../release.json'),'utf8'));
const releaseMatch=/^0\.([0-9]+)\.([0-9]+)-stage2\.([0-9]+)$/.exec(manifest.version);
assert.ok(releaseMatch,'Stage2 explicit version required');
const expectedVersion=manifest.version.split('-stage2.')[0]+'-alpha'+releaseMatch[3];
const installedFile=path.join(__dirname,'../.build/internal-stage2-package/vendor/composer/installed.php');
const installed=fs.readFileSync(installedFile,'utf8');
const rootStart=installed.indexOf("'root' => array(");
const versionsStart=installed.indexOf("'versions' => array(",rootStart);
const ownStart=installed.indexOf("'manufact/ai-site-cms' => array(",versionsStart);
const ownEnd=installed.indexOf("        ),",ownStart);
assert.ok(rootStart>=0 && versionsStart>rootStart && ownStart>versionsStart && ownEnd>ownStart,
  'Composer installed metadata root/project records must be present');
for(const part of [installed.slice(rootStart,versionsStart),installed.slice(ownStart,ownEnd)]){
 assert.ok(part.includes("'pretty_version' => '"+expectedVersion+"'"),
  'Composer root version must be release-bound not commit SHA');
 assert.ok(part.includes("'reference' => null"),
  'Composer root reference must not follow every source-only git commit');
}
console.log('Stage2 Composer root version/reference stable and source-only commit independent.');
console.log('Stage2 public-repo offweb staging trigger, scope, and no-host/no-secret contract PASS.');
