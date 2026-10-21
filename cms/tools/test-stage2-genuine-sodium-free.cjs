'use strict';
/*
 * Stage2 disposable-only genuine PHP 8.3/64-bit WITHOUT ext-sodium.
 * Runs original RFC8032 and signed-release adversarial suites against
 * the real CMS PHP verifier. No Hostinger access or product lock update.
 */
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
const REF='3246b36803c177847e677862fedeb7f937869adb';
const PACKAGE='paragonie/sodium_compat';
const RELEASE='v2.5.2';
const URL='https://api.github.com/repos/paragonie/sodium_compat/zipball/'+REF;
function exactCandidate(lock){
  assert.equal(lock?.packages?.length,1,'Only one candidate package may be installed');
  assert.equal(lock?.['packages-dev']?.length,0,'No development packages may be installed');
  const p=lock.packages[0];
  assert.equal(p.name,PACKAGE);
  assert.equal(p.version,RELEASE);
  assert.deepEqual(p.license,['ISC']);
  assert.equal(p.source?.type,'git');
  assert.equal(p.source?.url,'https://github.com/paragonie/sodium_compat.git');
  assert.equal(p.source?.reference,REF);
  assert.equal(p.dist?.type,'zip');
  assert.equal(p.dist?.reference,REF);
  assert.equal(p.dist?.url,URL);
  assert.equal(p.require?.php,'^8.1');
  assert.equal(p.require?.['php-64bit'],'*');
  return p;
}
function run(program,args,opts={}){
  const result=cp.spawnSync(program,args,{cwd:ROOT,encoding:'utf8',timeout:120000,
    maxBuffer:4*1024*1024,...opts});
  if(result.error||result.status!==0){
    throw Error('Disposable check failed: '+path.basename(program)+' '+args.slice(0,3).join(' ')+
      '\n'+(result.error?.message||result.stderr||result.stdout||'').slice(-2500));
  }
  return result.stdout;
}
function selfTest(){
  const p={name:PACKAGE,version:RELEASE,license:['ISC'],
    source:{type:'git',url:'https://github.com/paragonie/sodium_compat.git',reference:REF},
    dist:{type:'zip',url:URL,reference:REF},
    require:{php:'^8.1','php-64bit':'*'}};
  const good={packages:[p],'packages-dev':[]};
  exactCandidate(good);
  let negative=0;
  for(const mutated of [
    {packages:[{...p,version:'v2.5.1'}],'packages-dev':[]},
    {packages:[{...p,source:{...p.source,reference:'0'.repeat(40)}}],'packages-dev':[]},
    {packages:[{...p,dist:{...p.dist,url:'https://example.invalid/fake.zip'}}],'packages-dev':[]},
    {packages:[{...p,license:['MIT']}],'packages-dev':[]},
    {packages:[p,p],'packages-dev':[]},
    {packages:[p],'packages-dev':[p]},
    {packages:[{...p,require:{php:'^7.4','php-64bit':'*'}}],'packages-dev':[]},
    {packages:[{...p,require:{php:'^8.1'}}],'packages-dev':[]}
  ]){assert.throws(()=>exactCandidate(mutated));negative++;}
  process.stdout.write('STAGE2_EXACT_CANDIDATE_MUTATIONS '+negative+'/8 PASS; no network/host\n');
}
function main(){
  if(process.argv.length===3&&process.argv[2]==='--self-test')return selfTest();
  assert.equal(process.argv.length,2,'Usage: node test-stage2-genuine-sodium-free.cjs [--self-test]');
  const php=process.env.CMS_PHP83_NO_SODIUM_BINARY||'/usr/bin/php8.3';
  assert.ok(path.isAbsolute(php),'PHP executable must be an explicit absolute path');
  const state=JSON.parse(run(php,['-n','-r',
    'echo json_encode(["php"=>PHP_VERSION,"id"=>PHP_VERSION_ID,"bits"=>PHP_INT_SIZE*8,"sodium"=>extension_loaded("sodium"),"function"=>function_exists("sodium_crypto_sign_verify_detached")]);']));
  assert.ok(state.id>=80300&&state.id<80400&&state.bits===64&&state.sodium===false&&state.function===false,
    'REFUSED: require genuine Sodium-free PHP 8.3/64-bit before loading polyfill');
  const sandbox=fs.mkdtempSync(path.join(os.tmpdir(),'cms-stage2-php83-crypto-'));
  try{
    fs.chmodSync(sandbox,0o700);
    fs.writeFileSync(path.join(sandbox,'composer.json'),JSON.stringify({
      name:'manufact/stage2-disposable-crypto-candidate',
      require:{[PACKAGE]:'2.5.2'},
      config:{'allow-plugins':false,'secure-http':true}
    })+'\n',{mode:0o600,flag:'wx'});
    run('composer',['install','--no-interaction','--no-plugins','--no-scripts',
      '--prefer-dist','--no-progress','--no-dev'],{cwd:sandbox,timeout:180000});
    const lock=JSON.parse(fs.readFileSync(path.join(sandbox,'composer.lock'),'utf8'));
    exactCandidate(lock);
    const pkgRoot=path.join(sandbox,'vendor/paragonie/sodium_compat');
    for(const filename of ['LICENSE','autoload.php']){
      const file=path.join(pkgRoot,filename),s=fs.lstatSync(file);
      assert.ok(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size>30&&s.size<200000,
        'Installed pinned upstream '+filename+' must be a safe regular file');
    }
    const license=fs.readFileSync(path.join(pkgRoot,'LICENSE'),'utf8');
    assert.match(license,/ISC|Permission to use, copy, modify, and\/or distribute/i);
    const autoload=path.join(sandbox,'vendor/autoload.php');
    assert.ok(fs.statSync(autoload).isFile());
    const env={...process.env,PHP_BINARY:php,SODIUM_COMPAT_AUTOLOAD:autoload};
    const research=path.join(ROOT,'research/parallel-security');
    const absent=run(php,['-n',path.join(research,'ed25519-lab.php'),'absent'],
      {env:{...env,SODIUM_COMPAT_AUTOLOAD:''}});
    assert.match(absent,/NO_CRYPTO_TEST/);
    const absentEnvelope=run('node',[path.join(research,'release-fixture.mjs'),'absent'],
      {env:{...env,SODIUM_COMPAT_AUTOLOAD:''},timeout:60000});
    assert.match(absentEnvelope,/missing verifier fails closed/);
    const vectors=run(php,['-n',path.join(research,'ed25519-lab.php'),'compat'],
      {env,timeout:90000});
    assert.match(vectors,/RFC 8032 Ed25519 valid detached/);
    const envelope=run('node',[path.join(research,'release-fixture.mjs'),'compat'],
      {env,timeout:90000});
    assert.match(envelope,/genuine signed envelope still accepted/);
    assert.match(envelope,/"securityApproved":false/);
    // Same external Node Ed25519 evidence is verified by both actual PHP
    // implementations, including permit, receipt and settlement anti-replay.
    const signedChainOutput=run(process.execPath,[path.join(source,'tools/test-stage2-signed-chain-parity.cjs')],
      {env:{...env,CMS_PHP83_NO_SODIUM_BINARY:php},timeout:120000});
    const signedChain=JSON.parse(signedChainOutput);
    assert.equal(signedChain.checks,33,'Incomplete native / true no-Sodium signed-chain parity');
    assert.equal(signedChain.sameSignedHead,true);
    assert.equal(signedChain.stage2Accepted,false);
    process.stdout.write(JSON.stringify({
      evidence:'true-sodium-absent-php83',php:state.php,bits:state.bits,
      extensionLoadedBeforeCandidate:state.sodium,
      candidate:PACKAGE,version:RELEASE,sourceReference:REF,license:'ISC',
      absentVerification:'fail_closed',rfc8032:'passed',
      signedEnvelopeAdversarial:'passed',
      completeSignedChainParity:signedChain,
      performance:JSON.parse(vectors.trim().split('\n').at(-1)),
      productionLockChanged:false,hostingerTested:false,
      publisherKeyOwnershipVerified:false,licenseApproved:false,
      cryptographicReviewApproved:false,stage2Accepted:false
    },null,2)+'\n');
  }finally{
    fs.rmSync(sandbox,{recursive:true,force:true});
  }
}
if(require.main===module){try{main();}catch(e){
  process.stderr.write('STAGE2_TRUE_SODIUM_FREE_GATE_REFUSED: '+e.message+'\n');
  process.exitCode=1;
}}
module.exports={exactCandidate,selfTest};
