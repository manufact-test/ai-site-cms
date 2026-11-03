#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'../..');
const builder=path.join(root,'stage3/bin/cms-release.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-hostinger-package-'));
const release=path.join(tmp,'release');

function run(args,expected=0){
  const result=spawnSync(process.execPath,[builder,...args],{cwd:root,encoding:'utf8',timeout:180000});
  if(result.error)throw result.error;
  if(result.status!==expected)throw new Error('cms-release '+args.join(' ')+' exit '+result.status+' expected '+expected+
    '\nSTDERR:\n'+(result.stderr||'')+'\nSTDOUT:\n'+(result.stdout||''));
  return result;
}
function sha(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
try{
  const built=run(['pack-hostinger-sibling',root,release]);
  const buildReport=JSON.parse(built.stdout.trim());
  assert.equal(buildReport.action,'pack-hostinger-sibling');
  assert.equal(buildReport.hostingerSiblingLayout,true);
  assert.equal(buildReport.deployed,false);
  assert.equal(buildReport.ownerApprovalRequired,true);
  assert.equal(buildReport.publicRootFiles,2);
  assert.equal(buildReport.publicRootFileMode,'0444');

  const verified=JSON.parse(run(['verify',release]).stdout);
  assert.equal(verified.valid,true);
  assert.equal(verified.hostingerSiblingLayout,true);
  assert.deepEqual(fs.readdirSync(release).sort(),['cms-release.json','public_html','stage3']);
  assert.deepEqual(fs.readdirSync(path.join(release,'public_html')).sort(),['.htaccess','index.php']);
  assert.equal(fs.existsSync(path.join(release,'stage3/server/private-config-path.json')),false);
  for(const name of ['.htaccess','index.php']){
    const target=path.join(release,'public_html',name);
    const source=path.join(release,'stage3/server/public',name);
    const stat=fs.lstatSync(target);
    assert.equal(stat.isSymbolicLink(),false);
    assert.equal(stat.nlink,1);
    assert.equal(stat.mode&0o222,0,'public_html template must be read-only');
    assert.equal(sha(target),sha(source),'public_html template must match the private source byte-for-byte');
  }

  /* FOX is already installed: provide a separate, verified runtime-only
     package so File Manager cannot accidentally overwrite public_html. */
  const foxUpdate=path.join(tmp,'fox-code-only');
  const builtFox=JSON.parse(run(['pack-php-host',root,foxUpdate]).stdout);
  assert.equal(builtFox.profile,'php-host');
  const checkedFox=JSON.parse(run(['verify-fox-code-only',foxUpdate]).stdout);
  assert.equal(checkedFox.valid,true);
  assert.equal(checkedFox.publicRootPresent,false);
  assert.equal(checkedFox.deployed,false);
  assert.equal(checkedFox.ownerApprovalRequired,true);
  assert.equal(checkedFox.fingerprint,verified.fingerprint,
    'FOX update code must be byte-for-byte identical to tested sibling runtime');
  assert.deepEqual(fs.readdirSync(foxUpdate).sort(),['cms-release.json','stage3']);
  assert.equal(fs.existsSync(path.join(foxUpdate,'public_html')),false);
  assert.equal(fs.existsSync(path.join(foxUpdate,'stage3/server/private-config-path.json')),false);

  const unsafeFox=path.join(tmp,'fox-with-public-root');
  fs.cpSync(foxUpdate,unsafeFox,{recursive:true});
  fs.cpSync(path.join(release,'public_html'),path.join(unsafeFox,'public_html'),
    {recursive:true});
  assert.equal(JSON.parse(run(['verify',unsafeFox]).stdout).hostingerSiblingLayout,true);
  run(['verify-fox-code-only',unsafeFox],1);

  const alteredFox=path.join(tmp,'fox-altered');
  fs.cpSync(foxUpdate,alteredFox,{recursive:true});
  fs.appendFileSync(path.join(alteredFox,'stage3/studio/bundle.js'),'\n/* tampered */');
  run(['verify-fox-code-only',alteredFox],1);

  const tampered=path.join(tmp,'tampered');
  fs.cpSync(release,tampered,{recursive:true});
  const tamperedIndex=path.join(tampered,'public_html/index.php');
  fs.chmodSync(tamperedIndex,0o644);
  fs.appendFileSync(tamperedIndex,'\n// tampered public entrypoint\n');
  run(['verify',tampered],1);

  const extra=path.join(tmp,'extra');
  fs.cpSync(release,extra,{recursive:true});
  fs.writeFileSync(path.join(extra,'public_html','robots.txt'),'untracked');
  run(['verify',extra],1);

  process.stdout.write(JSON.stringify({
    action:'hostinger-sibling-package-smoke',
    validPackage:true,
    tamperedPublicEntrypointRejected:true,
    extraPublicRootFileRejected:true,
    foxCodeOnlyVerified:true,
    foxPublicRootRejected:true,
    foxTamperedRuntimeRejected:true,
    deploymentPerformed:false
  })+'\n');
}finally{
  fs.rmSync(tmp,{recursive:true,force:true});
}
