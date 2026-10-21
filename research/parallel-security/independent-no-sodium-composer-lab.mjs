#!/usr/bin/env node
// Independent native-free real PHP 8.3 + actual Composer vendor provenance.
// All build/source artifacts live outside the repository in disposable OS temp.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {fetchPublicZip,readZipEntries,verifyComposerZip} from './sodium-real-zip-proof.mjs';
import {loadUpstream,checkInstalledGitSource} from './sodium-upstream-tree-proof.mjs';
import {attest} from './sodium-compat-attest.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const PIN='3246b36803c177847e677862fedeb7f937869adb';
const ZIP='53944302442e609c0443f680a6195f8d7467e3d0f0c4503e8a690fd9e7ee22f2';
const report={schema:'security-physical-php83-composer-v1',noSodium:{status:'blocked'},
  compat:{status:'blocked'},upstreamCommit:PIN,pgpPublisherTrusted:false,
  hostValidated:false,productionApproved:false};
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const demand=(ok,why)=>{if(!ok)throw Error('VERIFIED_EVIDENCE_FAILURE '+why)};
const run=(bin,args,env={},timeout=120000)=>{
  const r=cp.spawnSync(bin,args,{env:{...process.env,...env},encoding:'utf8',
    maxBuffer:3*1024*1024,timeout});
  return {status:r.status,error:r.error?.message||null,signal:r.signal||null,
    stdout:r.stdout||'',stderr:(r.stderr||'').slice(-1300)};
};
const readJson=r=>{try{return JSON.parse(r.stdout)}catch{throw Error('VERIFIED_EVIDENCE_FAILURE incomplete original runtime JSON')}};
function reviewedSourceTreeDigest(zip){
  // Hash is computed from individually authentic Git-object bytes, not from
  // the Composer installed source we will later inspect.
  const f=[...readZipEntries(zip).entries].filter(([n])=>!n.endsWith('/'));
  demand(f.length===78,'missing upstream Git-shipped files');
  const top=f[0][0].split('/')[0];
  f.sort((a,b)=>Buffer.compare(Buffer.from(a[0]),Buffer.from(b[0])));
  const d=crypto.createHash('sha256').update('AI-SITE-CMS-SODIUM-COMPAT-SOURCE-TREE-V1\n');
  for(const [name,val] of f){
    const rel=name.slice(top.length+1),buf=val.bytes;
    d.update(rel+'\0'+buf.length+'\0'+sha(buf)+'\n');
  }
  return d.digest('hex');
}
let temporary,code=3,phase='preflight';
try{
  if(process.argv.length!==2){report.reason='usage: no arguments';code=2}
  else if(process.platform!=='linux'||process.env.CI!=='true'||!process.env.RUNNER_TEMP){
    report.reason='Only disposable Linux CI with RUNNER_TEMP may execute physical source build';
  }else{
    temporary=fs.mkdtempSync(path.join(os.tmpdir(),'security-php83-original-composer-'));
    phase='build-real-sodium-absent-php';
    const build=[
      'set -euo pipefail',
      "sudo tee /etc/apt/sources.list.d/ai-site-cms-security-php-src.sources >/dev/null <<'APT'",
      'Types: deb-src',
      'URIs: http://archive.ubuntu.com/ubuntu/',
      'Suites: noble noble-updates noble-security',
      'Components: main universe',
      'Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg',
      'APT',
      'sudo apt-get update -qq',
      'sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends build-essential autoconf bison re2c pkg-config > /dev/null',
      'mkdir -p "$SECURITY_TMP/source"',
      'cd "$SECURITY_TMP/source"',
      'apt-get source php8.3 > "$SECURITY_TMP/apt-source.log"',
      "src=\"$(find . -mindepth 1 -maxdepth 1 -type d -name 'php8.3-*' -print -quit)\"",
      'test -n "$src"',
      'cd "$src"',
      './configure --disable-all --enable-cli --disable-cgi --disable-phpdbg --without-pear --without-sodium --enable-ctype > "$SECURITY_TMP/configure.log"',
      'make -s -j2 > "$SECURITY_TMP/build.log" 2>&1',
      'cp sapi/cli/php "$SECURITY_TMP/php83-no-native"',
      'chmod 0700 "$SECURITY_TMP/php83-no-native"'
    ].join('\n');
    const b=run('bash',['-c',build],{SECURITY_TMP:temporary},310000);
    if(b.status!==0||b.error||b.signal)report.reason='Ubuntu physical PHP build unavailable: '+(b.error||b.stderr||b.status);
    else{
      phase='original-absent-mode';
      const php=path.join(temporary,'php83-no-native');
      const absent=run(process.execPath,[path.join(here,'runtime-sodium-proof.mjs')],
        {PHP_NO_SODIUM_BIN:php,SODIUM_COMPAT_AUTOLOAD:''},120000);
      const a=readJson(absent);
      demand(absent.status===3&&a.nativeFreeProven===true&&
        /^8\.3\.\d+$/.test(a.runtime?.version||'')&&
        a.runtime?.ext===false&&a.runtime?.verify===false&&
        a.runtime?.size===8&&a.runtime?.sapi==='cli'&&
        a.tests?.length===2&&a.tests.every(t=>t.passed&&t.proofCompleted),
        'physical native-free PHP did not reject signed evidence');
      report.php=a.runtime.version;
      report.physicalBinarySha256=sha(fs.readFileSync(php));
      report.noSodium={status:'passed',physicalPhp83WithoutSodium:true,absenceAssertions:2};
      phase='actual-upstream-git-zip';
      const zip=await fetchPublicZip();
      const original=verifyComposerZip(zip,loadUpstream());
      demand(original.archiveSha256===ZIP&&original.sourceFilesCompared===78,
        'real pinned Composer ZIP was not exactly 78 Git blob identities');
      const reviewed=reviewedSourceTreeDigest(zip);
      report.sourceZipSha256=original.archiveSha256;
      phase='real-temp-composer-install';
      const project=path.join(temporary,'composer-project');
      fs.mkdirSync(project,{recursive:true});
      fs.writeFileSync(path.join(project,'composer.json'),
        JSON.stringify({name:'ai-site-cms/security-lab',type:'project',
          require:{'paragonie/sodium_compat':'2.5.2'}},null,2)+'\n');
      const installed=run('composer',['install','--working-dir='+project,
        '--no-interaction','--no-plugins','--no-scripts','--prefer-dist','--no-progress'],
        {COMPOSER_HOME:path.join(temporary,'composer-home'),
          COMPOSER_CACHE_DIR:path.join(temporary,'composer-cache')},150000);
      if(installed.status!==0||installed.error||installed.signal)
        report.reason='Isolated Composer upstream download unavailable: '+
          (installed.error||installed.stderr||installed.status);
      else{
        phase='composer-installed-source-attestation';
        const source=path.join(project,'vendor/paragonie/sodium_compat');
        const lock=path.join(project,'composer.lock');
        const before=checkInstalledGitSource(source,loadUpstream());
        demand(before.upstreamGitBlobFilesVerified===78,'installed source differs from signed Git tree');
        const first=attest(source,lock,reviewed);
        demand(first.fileCount===78&&first.treeSha256===reviewed,
          'isolated lock and installed tree pre-attestation differs from original source');
        phase='real-signed-crypto';
        const cryptoEnv={PHP_NO_SODIUM_BIN:php,
          SODIUM_COMPAT_AUTOLOAD:path.join(source,'autoload.php'),
          SODIUM_COMPAT_LOCK:lock,SODIUM_COMPAT_TREE_SHA256:reviewed};
        const tested=run(process.execPath,[path.join(here,'runtime-sodium-proof.mjs')],cryptoEnv,135000);
        const t=readJson(tested);
        demand(tested.status===0&&t.nativeFreeProven===true&&t.compatVerified===true&&
          t.sourceAttestationRechecked===true&&t.tests?.length===4&&
          t.tests.every(x=>x.passed&&x.proofCompleted)&&
          t.sourceAttestation?.treeSha256===reviewed&&
          t.productionApproved===false,'physical compat signatures or source pre/post proof failed');
        // Security-relevant upstream v2.5.2 repair: ensure identity-key
        // forgery, mixed subgroup, global static state and scalar bounds are
        // really rejected by the independently verified installed vendor.
        phase='verified-v252-ed25519-fix';
        const boundary=run(php,['-n',path.join(here,'sodium-v252-ed25519-boundary.php')],
          {CI:'true',SODIUM_COMPAT_AUTOLOAD:cryptoEnv.SODIUM_COMPAT_AUTOLOAD},90000);
        const boundaryLines=boundary.stdout.trimEnd().split('\n');
        let boundaryJson=null;
        try{boundaryJson=JSON.parse(boundaryLines.at(-1))}catch{}
        demand(boundary.status===0&&boundaryLines.includes(
          'REAL original sodium_compat 2.5.2 Ed25519 identity, subgroup and state-boundary PASS 14 assertions; physical native-free PHP; NOT formal crypto audit or production approval')&&
          boundaryJson?.assertions===14&&boundaryJson?.physicalNoNative===true&&
          boundaryJson?.cryptoExpertSignoff===false&&boundaryJson?.productionApproved===false,
          'independently installed 2.5.2 cryptographic boundary checks failed: '+
          (boundary.stderr||boundary.stdout).slice(-380));
        report.ed25519UpstreamPatchAssertions=14;
        const after=checkInstalledGitSource(source,loadUpstream());
        const second=attest(source,lock,reviewed);
        demand(after.upstreamGitBlobFilesVerified===78&&JSON.stringify(first)===JSON.stringify(second),
          'installed original Git files or Composer lock changed during PHP');
        report.installedTreeSha256=reviewed;
        report.isolatedComposerLockSha256=first.isolatedLockSha256;
        report.compat={status:'passed',composerInstalled:true,installedOriginalGitBlobs:78,
          preAndPostSourceAttested:true,physicalCompatRfcAndEnvelopeCases:4,
          upstreamV252Ed25519BoundaryAssertions:14};
        code=0;
      }
    }
  }
}catch(e){
  const error=String(e.message||e);
  report.reason=phase+': '+error;
  if(error.includes('VERIFIED_EVIDENCE_FAILURE')||
     error.includes('SODIUM_COMPAT_UNATTESTED')||
     error.includes('UPSTREAM_SODIUM_GIT_PROVENANCE_FAIL')||
     error.includes('SODIUM_REAL_ZIP_REFUSED')){
    if(report.noSodium.status==='passed')report.compat={status:'failed'};
    else report.noSodium={status:'failed'};
    code=1;
  }else code=3;
}finally{
  if(temporary)try{fs.rmSync(temporary,{force:true,recursive:true})}catch(e){
    report.cleanupError=String(e.message||e);
    if(code===0){report.compat={status:'failed'};code=1}
  }
  console.log('INDEPENDENT_PHYSICAL_NO_SODIUM_GATES '+JSON.stringify(report));
  if(report.noSodium.status==='passed')
    console.log('PHYSICAL original Ubuntu PHP 8.3 WITHOUT native sodium PASS two absent-mode rejection proofs; not Hostinger');
  if(report.compat.status==='passed')
    console.log('REAL Composer installed sodium_compat 2.5.2 78 original Git blobs and PHP native-free pre/post crypto PASS four fixtures; not production approval');
  if(report.reason)console.error('PHYSICAL_SECURITY_CI_'+(code===1?'FAIL':'BLOCKED')+' '+report.reason);
  process.exitCode=code;
}
