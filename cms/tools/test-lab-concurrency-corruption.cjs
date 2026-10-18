'use strict';
// Stage2 hostile filesystem and concurrent-operator lab tests: entirely under OS temp.
// This does NOT model malicious root/admin users or tamper-proof persistent storage.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const {STAGE}=require('./build-internal-package.cjs');
const {LabRollout}=require('./lab-versioned-rollout.cjs');
const {LabOperatorGuard}=require('./lab-operator-guard.cjs');
const version='0.2.0-stage2.1';
const pub=crypto.generateKeyPairSync('ed25519').publicKey;
const lab=new LabRollout(),cleanLab=new LabRollout();
const guard=new LabOperatorGuard(lab,pub);
let checks=0;
const ok=(condition,msg)=>{assert.ok(condition,msg);checks++};
const denied=(fn,re,msg)=>{assert.throws(fn,re,msg);checks++};
function replaceTemporarily(file,operation,probe){
  const backup=file+'-test-backup';
  fs.renameSync(file,backup);
  try{
    operation(file,backup);
    probe();
  }finally{
    // Test fixture cleanup only. Never use this as an operator recovery routine.
    const st=fs.lstatSync(file);
    if(st.isDirectory()&&!st.isSymbolicLink())fs.rmSync(file,{recursive:true});
    else fs.unlinkSync(file);
    fs.renameSync(backup,file);
  }
}
try{
  const other=new LabOperatorGuard(lab,pub);
  ok(guard.inspect().status==='clean','Two local operator instances can read clean state');
  guard.withExclusive(()=>{
    denied(()=>other.execute({kind:'upgrade',version,expectedCurrent:null,expectedSequence:0}),
      /exclusive lock held/, 'Second operator cannot enter active critical section');
    // Concurrent separate process reading SAME lab directory: no in-memory lock shortcut.
    const script=[
      "const {LabRollout}=require('./tools/lab-versioned-rollout.cjs');",
      "const {LabOperatorGuard}=require('./tools/lab-operator-guard.cjs');",
      "const lab=Object.create(LabRollout.prototype);lab.root=process.argv[1];",
      "const guard=new LabOperatorGuard(lab,process.env.PUBLIC_KEY_PEM);",
      "try{guard.recover({mode:'abort'});process.exit(11)}",
      "catch(e){if(!/exclusive lock held/.test(e.message)){console.error(e);process.exit(12)}process.exit(0)}"
    ].join('\n');
    const child=spawnSync(process.execPath,['-e',script,lab.root],{
      cwd:path.resolve(__dirname,'..'),encoding:'utf8',timeout:15000,
      env:{...process.env,PUBLIC_KEY_PEM:pub.export({format:'pem',type:'spki'})}
    });
    ok(child.status===0,'Separate Node process refused while another operator holds exclusive lock: '+child.stderr);
  });
  ok(guard.inspect().status==='clean','Lock released on successful operation');
  denied(()=>guard.withExclusive(()=>{throw Error('Synthetic failure within critical section')}),
    /Synthetic failure/,'Failure inside critical section propagated');
  ok(!fs.existsSync(path.join(lab.root,'operator-exclusive.lock')),'Lock released on ordinary caught exception');
  const stale=path.join(lab.root,'operator-exclusive.lock');
  fs.mkdirSync(stale);
  denied(()=>guard.recover({mode:'abort'}),/exclusive lock held/,'Orphaned operator lock blocks recovery, no automatic stale deletion');
  ok(fs.existsSync(stale),'Stale lock deliberately retained for manual examination');
  fs.rmdirSync(stale); // CI fixture manual action only
  ok(guard.inspect().status==='clean','Manual test fixture cleanup restores inspection');
  const policy=path.join(lab.root,'operator-policy.json');
  replaceTemporarily(policy,(file,saved)=>fs.symlinkSync(saved,file),
    ()=>denied(()=>guard.policy(),/Unsafe operator state node/,'Policy symlink refused'));
  fs.linkSync(policy,policy+'.hardlink');
  try{denied(()=>guard.policy(),/Unsafe operator state node/,'Policy hardlink refused')}
  finally{fs.unlinkSync(policy+'.hardlink')}
  const pending=path.join(lab.root,'operator-intent.json');
  fs.symlinkSync('missing-outside-scratch',pending);
  try{denied(()=>guard.inspect(),/Unsafe operator state node/,'Dangling intent symlink cannot masquerade as no operation')}
  finally{fs.unlinkSync(pending)}
  const policyTmp=policy+'.new';
  fs.symlinkSync('dangling-temporary',policyTmp);
  try{denied(()=>guard.inspect(),/Unresolved policy write/,'Dangling policy temp file detected')}
  finally{fs.unlinkSync(policyTmp)}
  const currentPolicy=fs.readFileSync(policy);
  fs.writeFileSync(policy,'{');
  try{denied(()=>guard.policy(),/JSON|Unexpected|end of JSON/,'Truncated policy refuses operations')}
  finally{fs.writeFileSync(policy,currentPolicy)}
  ok(guard.inspect().status==='clean','Policy restored after injected damage');
  ok(lab.stage(STAGE)===version,'Trusted fixture can stage immutable local code slot');
  denied(()=>lab.stage(STAGE),/overwrite/,'Duplicate version cannot be restaged');
  const slot=lab.slot(version);
  replaceTemporarily(slot,(file,saved)=>fs.symlinkSync(saved,file,'dir'),
    ()=>denied(()=>lab.verifySlot(version),/Unsafe laboratory directory/, 'Version slot symlink refused'));
  const releases=path.join(lab.root,'releases');
  replaceTemporarily(releases,(file,saved)=>fs.symlinkSync(saved,file,'dir'),
    ()=>denied(()=>lab.state(),/Unsafe laboratory directory/, 'Releases root symlink refused'));
  const pointer=lab.pointerPath();
  ok(lab.switchTo(version,null).current===version,'Normal atomic activation still works');
  replaceTemporarily(pointer,(file,saved)=>fs.symlinkSync(saved,file),
    ()=>denied(()=>lab.state(),/Unsafe activation pointer/, 'Pointer symlink refused'));
  fs.linkSync(pointer,pointer+'.hardlink');
  try{denied(()=>lab.state(),/Unsafe activation pointer/, 'Hardlinked active pointer refused')}
  finally{fs.unlinkSync(pointer+'.hardlink')}
  const pointerBytes=fs.readFileSync(pointer);
  fs.writeFileSync(pointer,'{bad json');
  try{denied(()=>lab.state(),/JSON|Unexpected|end of JSON/,'Corrupt pointer refuses progress')}
  finally{fs.writeFileSync(pointer,pointerBytes)}
  ok(lab.state().current===version,'Original active pointer restored');
  const activeLock=path.join(lab.root,'active-exclusive.lock');
  fs.mkdirSync(activeLock);
  try{denied(()=>lab.switchTo(version,version),/Activation lock held/,'Stale activation lock blocks writes')}
  finally{fs.rmdirSync(activeLock)}
  // Already-staged code in another lab: dangling temp pointer must not be treated as free.
  const partial=path.join(cleanLab.releases(),'.staging-'+version);
  fs.symlinkSync('nonexistent-release',partial);
  try{denied(()=>cleanLab.stage(STAGE),/staging residue/,
    'Dangling staging symlink refuses stage before touching candidate slot')}
  finally{fs.unlinkSync(partial)}
  ok(cleanLab.stage(STAGE)===version,'Second laboratory has an isolated immutable slot');
  const tmp=cleanLab.pointerPath()+'.tmp';
  fs.symlinkSync('not-a-real-target',tmp);
  try{
    denied(()=>cleanLab.switchTo(version,null),/Unresolved pointer temporary file/,
      'Dangling active pointer temporary symlink refuses cutover');
    ok(cleanLab.state().current===null,'No cutover occurred after suspicious temp file');
  }finally{fs.unlinkSync(tmp)}
  ok(cleanLab.state().sequence===0,'No cross-lab activation');
  ok(!fs.existsSync(path.join(STAGE,'active.json')),'No mutation to built candidate package');
  console.log('Stage2 cross-process exclusive lock + filesystem corruption PASS: '+checks+
    ' assertions; disposable labs only, no real host or DB');
}finally{lab.dispose();cleanLab.dispose()}
