/* AI Site CMS Stage 1 RESEARCH ONLY.
 * Real PHP file-based durability across distinct CLI invocations and fresh JS
 * process. Strict CAS, invalid payload, injected failure, corrupt fallback,
 * explicit repair, immutable publication history and owner migration.
 * No production auth, shared-hosting proof, power-loss fsync or database.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const cp=require('node:child_process');
const {createRevisionStore,manifestFixtures,renderSafe,runUnit}=require('./versioned-site-reconciliation.cjs');
const file=path.join(__dirname,'durable-site-store.php');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage1-durable-site-'));
const journal=path.join(tmp,'storage'),inputs=path.join(tmp,'inputs');
fs.mkdirSync(journal,{mode:0o700});fs.mkdirSync(inputs,{mode:0o700});
let serial=0,checks=0;
const env={...process.env,STAGE1_DURABLE_DIRECTORY:journal};
function input(obj){
 const name=path.join(inputs,'input-'+(++serial)+'.json');
 fs.writeFileSync(name,JSON.stringify(obj),'utf8');return name;
}
function command(op,args=[],config={}){
 const result=cp.spawnSync('php',[file,op,...args.map(String)],{encoding:'utf8',env:{...env,...config},timeout:15000});
 const found=result.status===0?result.stdout.match(/STAGE1_DURABLE=(.+)/):result.stderr.match(/STAGE1_DURABLE_REJECTED=(.+)/);
 const payload=found?JSON.parse(found[1]):null;
 assert.ok(payload,'expected PHP transaction receipt '+op+' '+result.stderr+' '+result.stdout);
 return {ok:result.status===0,...payload};
}
function accepted(op,args=[],config={}){const x=command(op,args,config);assert.equal(x.ok,true,JSON.stringify(x));checks++;return x;}
function refused(op,args=[],expect=null,config={}){
 const x=command(op,args,config);assert.equal(x.ok,false,op+' unexpectedly accepted');if(expect)assert.ok(x.reason.includes(expect),JSON.stringify(x));checks++;return x;
}
function reread(status='current'){
 const x=accepted('read');
 assert.equal(x.status,status);return x.payload;
}
function deepEqual(x,y,label){assert.deepEqual(x,y,label);checks++}
function freshNode(data){
 const script="const fs=require('node:fs');const {createRevisionStore,renderSafe}=require(process.argv[1]);"+
 "const obj=JSON.parse(fs.readFileSync(0,'utf8'));"+
 "const store=createRevisionStore(obj.manifest,obj);"+
 "const r=store.snapshot();const rendered=renderSafe(r.manifest,r.saved);"+
 "process.stdout.write(JSON.stringify({generation:r.generation,version:r.manifest.version,history:r.history.length,publishedRevision:r.published.revision,ids:rendered.shape.map(x=>x.id),hero:rendered.shape.find(x=>x.kind==='hero')?.values.headline}));";
 const out=cp.spawnSync(process.execPath,['-e',script,path.join(__dirname,'versioned-site-reconciliation.cjs')],{input:JSON.stringify(data),encoding:'utf8',timeout:10000});
 assert.equal(out.status,0,'new JS process rehydrate: '+out.stderr);checks++;
 return JSON.parse(out.stdout);
}
function intentionallyCorrupt(target,kind){
 const p=path.join(journal,target);
 if(kind==='digest'){
  const raw=JSON.parse(fs.readFileSync(p,'utf8'));raw.digest='0'.repeat(64);fs.writeFileSync(p,JSON.stringify(raw));
 }else if(kind==='truncate')fs.writeFileSync(p,'{"payload":');
 else throw Error(kind);
}
function makeAliasedRename(){
 const filename=input({'hero-anchor':'hero-focal'});
 return filename;
}
(async()=>{
 runUnit();
 const {v1,v2,changed,removed,aliases}=manifestFixtures();
 const source=createRevisionStore(v1);
 const zero=source.snapshot();
 const seeded=input(zero);
 accepted('init',[seeded]);
 deepEqual(reread(),zero,'initial PHP read roundtrip');
 refused('init',[seeded],'store-already-initialized');
 const firstRun=freshNode(reread());
 assert.equal(firstRun.history,1);assert.equal(firstRun.publishedRevision,1);
 source.setOwner('hero-anchor/headline','Owner <script>should stay text</script>');
 source.setOwner('hero-anchor/gradientFrom','#112233');
 source.setOwner('hero-anchor/featureAsset','reef');
 source.setOwner('badge-image/alt','Owner gallery');
 source.setOwner('faq-block/open',true);
 source.saveDraft();
 const edited=source.snapshot();
 assert.equal(edited.published.revision,1);
 accepted('commit',[input(edited),zero.generation]);
 deepEqual(reread(),edited,'owner edits survive PHP transaction');
 const resumed=createRevisionStore(edited.manifest,reread());
 deepEqual(resumed.snapshot(),source.snapshot(),'fresh revision store rehydrates complete saved edit state');
 const ownerPublish=resumed.publish();
 accepted('commit',[input(resumed.snapshot()),edited.generation]);
 const publishedV1=reread();
 assert.equal(publishedV1.published.revision,2);
 assert.equal(publishedV1.published.overrides['hero-anchor/headline'],'Owner <script>should stay text</script>');
 const updated=resumed.stageAI(v2,aliases);
 assert.equal(updated.canPublish,true);
 resumed.acceptStage(updated.stageId);
 const renamed=resumed.snapshot();
 assert.equal(renamed.published.revision,2,'regeneration must not publish automatically');
 refused('commit',[input(renamed),publishedV1.generation],'owner-override-lost');
 const migrationReceipt=accepted('commit',[input(renamed),publishedV1.generation,makeAliasedRename()]);
 deepEqual(reread(),renamed,'reviewed alias retains saved owner values');
 assert.equal(migrationReceipt.publishedRevision,2);
 assert.equal(reread().saved['hero-focal/headline'],'Owner <script>should stay text</script>');
 const nodeResume=freshNode(reread());
 assert.equal(nodeResume.version,'2.0.0');assert.equal(nodeResume.history,2);
 assert.equal(nodeResume.hero,'Owner <script>should stay text</script>');
 assert.deepEqual(nodeResume.ids,['faq-block','badge-image','hero-focal','signup-block','editorial-notes']);
 const conflict=resumed.stageAI(changed);
 assert.equal(conflict.canPublish,false);assert.equal(conflict.quarantine[0].reason,'capability-changed');
 const deletion=resumed.stageAI(removed);
 assert.equal(deletion.canPublish,true,'unused signup defaults can disappear');
 // Deliberately try a candidate with missing owner fields to simulate a bad
 // AI adapter. This must never replace persistent data.
 const orphan=structuredClone(renamed);
 delete orphan.saved['hero-focal/headline'];delete orphan.draft['hero-focal/headline'];
 refused('commit',[input(orphan),renamed.generation],'generation-not-increasing');
 orphan.generation=renamed.generation+1;
 refused('commit',[input(orphan),renamed.generation],'owner-override-lost');
 const silent=structuredClone(renamed);
 silent.generation++;silent.published.shape[0].values.title='tampered';
 refused('commit',[input(silent),renamed.generation],'publication-shape-mismatch');
 const shape=structuredClone(renamed);
 shape.generation++;shape.history[0].shape[0].values.headline='rewritten history';
 refused('commit',[input(shape),renamed.generation],'publication-shape-mismatch');
 const malicious=structuredClone(renamed);
 malicious.generation++;malicious.saved['hero-focal/gradientFrom']='url(https://evil.invalid/style)';
 refused('commit',[input(malicious),renamed.generation],'invalid-owner');
 const variant=createRevisionStore(renamed.manifest,renamed);
 variant.setOwner('hero-focal/gradientTo','#aabbcc');
 variant.saveDraft();
 const safelyChanged=variant.snapshot();
 refused('commit',[input(safelyChanged),renamed.generation],'injected-crash', {STAGE1_DURABLE_FAILPOINT:'after-backup-before-current'});
 deepEqual(reread(),renamed,'failpoint leaves exact current pointer intact');
 accepted('commit',[input(safelyChanged),renamed.generation]);
 const currentAfter=fs.readFileSync(path.join(journal,'current.json'),'utf8');
 const goodBefore=fs.readFileSync(path.join(journal,'last-good.json'),'utf8');
 assert.ok(currentAfter!==goodBefore,'backup must represent preceding generation');
 const beforeCurrent=reread();
 // Two independent actor snapshots with the same expected storage generation.
 const actorB=createRevisionStore(beforeCurrent.manifest,beforeCurrent);
 actorB.setOwner('hero-focal/gradientTo','#bbccdd');actorB.saveDraft();
 const actorC=createRevisionStore(beforeCurrent.manifest,beforeCurrent);
 actorC.setOwner('hero-focal/gradientTo','#ccddee');actorC.saveDraft();
 accepted('commit',[input(actorB.snapshot()),beforeCurrent.generation]);
 refused('commit',[input(actorC.snapshot()),beforeCurrent.generation],'cas-stale');
 const afterCAS=reread();
 assert.equal(afterCAS.saved['hero-focal/gradientTo'],'#bbccdd');
 const actorD=createRevisionStore(afterCAS.manifest,afterCAS);
 actorD.publish();
 accepted('commit',[input(actorD.snapshot()),afterCAS.generation]);
 const liveV2=reread();
 assert.equal(liveV2.published.revision,3);
 assert.equal(liveV2.published.manifest.version,'2.0.0');
 // A rollback is itself a recorded revision, not a rewrite of history.
 const actorE=createRevisionStore(liveV2.manifest,liveV2);
 const rolled=actorE.rollback(ownerPublish.revision);
 assert.equal(rolled.revision,4);assert.equal(rolled.sourceRevision,2);
 accepted('commit',[input(actorE.snapshot()),liveV2.generation]);
 const restoreState=reread();
 assert.equal(restoreState.published.revision,4);
 assert.equal(restoreState.manifest.version,'1.0.0');
 assert.equal(restoreState.history.length,4);
 const rollbackNode=freshNode(restoreState);
 assert.equal(rollbackNode.hero,'Owner <script>should stay text</script>');
 assert.deepEqual(rollbackNode.ids,['hero-anchor','faq-block','signup-block','badge-image']);
 const html=renderSafe(restoreState.manifest,restoreState.saved).html;
 assert.ok(html.includes('Owner &lt;script&gt;should stay text&lt;/script&gt;'));assert.ok(!html.includes('<script>'));
 // Poison current pointer. Read ONLY previously validated last-good.
 const lastValid=reread();
 const validLastBackup=fs.readFileSync(path.join(journal,'last-good.json'),'utf8');
 intentionallyCorrupt('current.json','digest');
 const degraded=reread('fallback-last-good');
 assert.notDeepEqual(degraded,lastValid);
 refused('commit',[input(lastValid),lastValid.generation],'corrupt-or-missing-current');
 intentionallyCorrupt('last-good.json','truncate');
 refused('read',[],'no-usable-snapshot');
 refused('restore',[],'no-good-backup');
 fs.writeFileSync(path.join(journal,'last-good.json'),validLastBackup);
 const recoverable=reread('fallback-last-good');
 const repair=accepted('restore');assert.equal(repair.status,'restored-from-last-good');
 const repaired=reread();deepEqual({...repaired,generation:recoverable.generation+1},
    {...recoverable,generation:recoverable.generation+1},'explicit repair keeps approved fallback history');
 const finalInstance=createRevisionStore(repaired.manifest,repaired);
 assert.equal(finalInstance.snapshot().history.length,repaired.history.length);
 refused('restore',[],'healthy-current-no-restore');
 const limit=fs.statSync(path.join(journal,'current.json')).size;
 console.log('STAGE1_DURABLE_PHP='+JSON.stringify({pass:true,checks,realPHPProcesses:true,freshNodeRehydrations:3,
  typedDraftRoundtrip:true,regeneratedFrom4to5:true,ownerOverridesMigrated:5,approvedRenames:1,
  staleCASRejected:true,failedTransactionAtomic:true,corruptCurrentFallback:true,doubleCorruptionFailsClosed:true,
  explicitBackupRepair:true,historyTamperRejected:true,explicitRollbackAppendsRevision:true,
  savedPublicSeparation:true,unsafeCSSRejected:true,validStoredBytes:limit,
  limitations:'local PHP CLI research; hash is corruption detection not MAC; no power-loss fsync, network filesystems, actual Hostinger, auth or product CMS'}));
})().catch(e=>{console.error('STAGE1_DURABLE_PHP_FAIL='+String(e.stack||e));process.exitCode=1}).finally(()=>{
 fs.rmSync(tmp,{recursive:true,force:true});
});
