'use strict';
// Single real HTTP/SQLite/renderer test. Disposable temp DB, loopback only.
// Tests multi-page CMS drafts, credentials, CSRF, stale edits, restore,
// explicit publishing, visitor isolation, HTML escaping and process restart.
const assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const root=path.resolve(__dirname,'../..');
const dbdir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-site-stage3-'));
const file=path.join(dbdir,'isolated.sqlite');
const fixture=JSON.parse(fs.readFileSync(path.join(root,'stage3/fixtures/industrial-site.json'),'utf8'));
const password='test-only-lab-password-not-a-real-secret';
const env={...process.env,STAGE3_DSN:'sqlite:'+file,STAGE3_OWNER_USER:'testowner',
  STAGE3_OWNER_PASSWORD:password,STAGE3_FORM_SECRET:'CI-only-form-hmac-secret-with-at-least-32-chars',
  STAGE3_MAIL_FROM:'',STAGE3_TELEGRAM_BOT_TOKEN:''};
let server, origin, cookie='', csrf='';
async function port(){
  const s=net.createServer();
  await new Promise((resolve,reject)=>{s.once('error',reject);s.listen(0,'127.0.0.1',resolve);});
  const p=s.address().port;await new Promise(resolve=>s.close(resolve));return p;
}
async function request(method,route,data,headers={}){
  const result=await fetch(origin+route,{method,redirect:'manual',
    headers:{...(cookie?{cookie}:{}),...(method==='POST'?{'content-type':'application/json'}:{}),
      ...(csrf&&method==='POST'?{'x-csrf-token':csrf}:{}),...headers},
    ...(method==='POST'?{body:JSON.stringify(data)}:{})});
  const set=result.headers.get('set-cookie');
  if(set)cookie=set.split(';',1)[0];
  const type=result.headers.get('content-type')||'';
  const body=type.startsWith('application/json')?await result.json():await result.text();
  return {status:result.status,body,headers:result.headers};
}
async function runServer(){
  origin='http://127.0.0.1:'+(await port());
  env.STAGE3_PUBLIC_ORIGIN=origin;
  server=spawn('php',['-S',new URL(origin).host,'-t','stage3/server/public','stage3/server/public/index.php'],{
    cwd:root,env,stdio:['ignore','ignore','pipe']});
  let logs='';
  server.stderr.on('data',d=>{logs+=d.toString().slice(0,3000);});
  for(let i=0;i<80;i++){
    if(server.exitCode!==null)throw Error('PHP server exited: '+logs);
    try{const r=await request('GET','/api/session');if(r.status===200)return;}catch(e){}
    await new Promise(resolve=>setTimeout(resolve,75));
  }
  throw Error('PHP server not ready: '+logs);
}
async function stop(){
  if(server&&server.exitCode===null){
    const old=server;old.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>old.once('exit',resolve)),
      new Promise(resolve=>setTimeout(resolve,2000))]);
  }
}
(async()=>{
  const installed=spawnSync('php',['-m'],{encoding:'utf8'});
  assert.match(installed.stdout,/pdo_sqlite/i,'CI needs PDO SQLite extension');
  const setup=spawnSync('php',['stage3/server/bin/setup.php'],{cwd:root,env,encoding:'utf8'});
  assert.equal(setup.status,0,setup.stderr);
  const again=spawnSync('php',['stage3/server/bin/setup.php'],{cwd:root,env,encoding:'utf8'});
  assert.notEqual(again.status,0,'must refuse overwriting existing schema');
  // Exercise the explicit upgrade from the previous single-owner schema, once.
  const legacy=spawnSync('php',['-r',
    '$db=new PDO(getenv("STAGE3_DSN")); foreach (["stage3_audit","stage3_site_grants","stage3_access_users"] as $t) $db->exec("DROP TABLE ".$t);'],{cwd:root,env,encoding:'utf8'});
  assert.equal(legacy.status,0,legacy.stderr);
  assert.notEqual(spawnSync('php',['stage3/server/bin/upgrade-access.php'],{cwd:root,env,encoding:'utf8'}).status,0);
  for(let i=0;i<2;i++){
    const migrated=spawnSync('php',['stage3/server/bin/upgrade-access.php'],{cwd:root,env:{...env,STAGE3_ALLOW_ACCESS_UPGRADE:'YES'},encoding:'utf8'});
    assert.equal(migrated.status,0,migrated.stderr);
  }
  // Previously upgraded Stage3 lab may lack the new manual licences table.
  const legacyLic=spawnSync('php',['-r',
    '$db=new PDO(getenv("STAGE3_DSN"));$db->exec("DROP TABLE stage3_site_licenses");'],
    {cwd:root,env,encoding:'utf8'});
  assert.equal(legacyLic.status,0,legacyLic.stderr);
  assert.notEqual(spawnSync('php',['stage3/server/bin/upgrade-licenses.php'],
    {cwd:root,env,encoding:'utf8'}).status,0);
  for(let i=0;i<2;i++){
    const migrated=spawnSync('php',['stage3/server/bin/upgrade-licenses.php'],
      {cwd:root,env:{...env,STAGE3_ALLOW_LICENSE_UPGRADE:'YES'},encoding:'utf8'});
    assert.equal(migrated.status,0,migrated.stderr);
  }
  const legacyDelivery=spawnSync('php',['-r',
    '$db=new PDO(getenv("STAGE3_DSN"));$db->exec("DROP TABLE stage3_delivery_outbox");$db->exec("DROP TABLE stage3_delivery_settings");'],
    {cwd:root,env,encoding:'utf8'});
  assert.equal(legacyDelivery.status,0,legacyDelivery.stderr);
  assert.notEqual(spawnSync('php',['stage3/server/bin/upgrade-delivery.php'],{cwd:root,env,encoding:'utf8'}).status,0);
  for(let i=0;i<2;i++){
    const migrated=spawnSync('php',['stage3/server/bin/upgrade-delivery.php'],
      {cwd:root,env:{...env,STAGE3_ALLOW_DELIVERY_UPGRADE:'YES'},encoding:'utf8'});
    assert.equal(migrated.status,0,migrated.stderr);
  }
  // Old isolated Stage3 labs need an explicit upgrade; web requests must never migrate.
  const oldVideo=spawnSync('php',['-r',
    '$db=new PDO(getenv("STAGE3_DSN"));$db->exec("DROP TABLE stage3_video_chunks");$db->exec("DROP TABLE stage3_video_uploads");'],
    {cwd:root,env,encoding:'utf8'});
  assert.equal(oldVideo.status,0,oldVideo.stderr);
  assert.notEqual(spawnSync('php',['stage3/server/bin/upgrade-video.php'],
    {cwd:root,env,encoding:'utf8'}).status,0);
  for(let i=0;i<2;i++){
    const upgraded=spawnSync('php',['stage3/server/bin/upgrade-video.php'],
      {cwd:root,env:{...env,STAGE3_ALLOW_VIDEO_UPGRADE:'YES'},encoding:'utf8'});
    assert.equal(upgraded.status,0,upgraded.stderr);
  }
  await runServer();
  assert.equal((await request('GET','/api/sites')).status,401,'private site list requires login');
  assert.equal((await request('POST','/api/login',{username:'testowner',password:'bad'})).status,401);
  const login=await request('POST','/api/login',{username:'testowner',password});
  assert.equal(login.status,200);
  csrf=login.body.csrfToken;assert.match(csrf,/^[a-f0-9]{64}$/);
  assert.equal((await request('POST','/api/sites',{site:fixture},{'x-csrf-token':'wrong'})).status,403);
  assert.equal((await request('POST','/api/sites',{site:fixture},{origin:'https://attacker.example'})).status,403);
  const created=await request('POST','/api/sites',{site:fixture});
  assert.equal(created.status,201);assert.equal(created.body.revision,1);
  const id=fixture.siteId,endpoint='/api/sites/'+id;
  assert.equal((await request('GET','/api/sites')).body.sites.length,1);
  assert.equal((await request('GET',endpoint)).body.site.pages.length,2);
  assert.equal((await request('GET','/published/'+id+'/')).status,404,'unpublished site invisible');
  const changed=structuredClone(fixture);
  changed.pages[0].sections[0].elements[0].values['content.text']='<img src=x onerror=alert(1)> Updated';
  const draftPreview=await request('POST',endpoint+'/preview',{expectedRevision:1,site:changed,path:'/'});
  assert.equal(draftPreview.status,200,JSON.stringify(draftPreview.body));
  assert.equal(draftPreview.body.published,false);
  assert.match(draftPreview.body.html,/http-equiv="Content-Security-Policy"/);
  assert.match(draftPreview.body.html,/name="robots" content="noindex,nofollow"/);
  assert.match(draftPreview.body.html,/&lt;img src=x onerror=alert\(1\)&gt; Updated/);
  assert.doesNotMatch(draftPreview.body.html,/<script\b/i,'Draft preview is script-free');
  assert.equal((await request('GET',endpoint+'/revisions')).body.revisions.length,1,
    'Preview does not create revisions');
  assert.equal((await request('GET','/published/'+id+'/')).status,404,
    'Preview never publishes a draft');
  const saved=await request('POST',endpoint+'/save',{expectedRevision:1,site:changed});
  assert.equal(saved.status,200);assert.equal(saved.body.revision,2);
  assert.equal((await request('POST',endpoint+'/save',{expectedRevision:1,site:fixture})).status,409);
  const history=(await request('GET',endpoint+'/revisions')).body.revisions;
  assert.deepEqual(history.map(h=>Number(h.revision)),[2,1]);
  const first=await request('POST',endpoint+'/publish',{expectedRevision:2});
  assert.equal(first.status,200);assert.equal(first.body.version,1);
  const pub=await request('GET','/published/'+id+'/');
  assert.equal(pub.status,200);
  assert.match(pub.body,/&lt;img src=x onerror=alert\(1\)&gt; Updated/);
  assert.doesNotMatch(pub.body,/<img src=x onerror/);
  assert.match(pub.body,/\/published\/site-industrial-demo\/contact\//);
  assert.equal((await request('GET','/published/'+id+'/contact/')).status,200);
  const invalid=structuredClone(changed);
  invalid.pages[0].sections[0].elements[0].values['style.hiddenExecutable']='alert(1)';
  assert.equal((await request('POST',endpoint+'/save',{expectedRevision:2,site:invalid})).status,422);
  const next=structuredClone(changed);
  next.pages[0].sections[0].elements[0].values['content.text']='Unpublished revision three';
  assert.equal((await request('POST',endpoint+'/save',{expectedRevision:2,site:next})).body.revision,3);
  assert.match((await request('GET','/published/'+id+'/')).body,/Updated/);
  assert.doesNotMatch((await request('GET','/published/'+id+'/')).body,/Unpublished revision three/);
  const stalePreview=await request('POST',endpoint+'/preview',{expectedRevision:2,site:next,path:'/'});
  assert.equal(stalePreview.status,409,'Preview refuses a stale server revision');
  const currentPreview=await request('POST',endpoint+'/preview',{expectedRevision:3,site:next,path:'/'});
  assert.equal(currentPreview.status,200);
  assert.match(currentPreview.body.html,/Unpublished revision three/);
  assert.doesNotMatch((await request('GET','/published/'+id+'/')).body,/Unpublished revision three/);
  const restored=await request('POST',endpoint+'/restore',{targetRevision:1,expectedRevision:3});
  assert.equal(restored.status,200);assert.equal(restored.body.revision,4);
  assert.equal(restored.body.site.pages[0].sections[0].elements[0].values['content.text'],
    fixture.pages[0].sections[0].elements[0].values['content.text']);
  assert.equal((await request('POST',endpoint+'/publish',{expectedRevision:3})).status,409);
  assert.equal((await request('POST',endpoint+'/publish',{expectedRevision:4})).body.version,2);
  assert.doesNotMatch((await request('GET','/published/'+id+'/')).body,/Updated/);
  // Media pipeline: authenticated upload, immutable bytes, valid component
  // binding, unpublished media isolation and static release without CMS.
  const png64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y6Pe3UAAAAASUVORK5CYII=';
  const pngBytes=Buffer.from(png64,'base64');
  assert.equal((await request('POST',endpoint+'/media',{
    base64:png64,alt:'Тестовый станок',expectedRevision:4
  },{'x-csrf-token':'wrong'})).status,403,'media upload requires CSRF');
  assert.equal((await request('POST',endpoint+'/media',{
    base64:Buffer.from('<svg onload=alert(1)>').toString('base64'),alt:'Bad',expectedRevision:4
  })).status,422,'SVG and non-raster uploads refused');
  const media=await request('POST',endpoint+'/media',{
    base64:png64,alt:'Тестовый станок',expectedRevision:4
  });
  assert.equal(media.status,201,JSON.stringify(media.body));
  assert.equal(media.body.revision,5);
  assert.equal(media.body.asset.mime,'image/png');
  const asset=media.body.asset;
  assert.equal((await request('GET','/published/'+id+'/assets/'+asset.id+'.png')).status,404,
    'Unpublished assets are never public');
  const image=await request('GET',endpoint+'/media/'+asset.id);
  assert.equal(image.status,200);
  assert.equal(image.headers.get('content-type'),'image/png');
  assert.equal((await request('POST',endpoint+'/media',{
    base64:png64,alt:'Stale',expectedRevision:4
  })).status,409,'Cannot upload against old revision');
  const imageDef=JSON.parse(fs.readFileSync(path.join(root,'stage3/components/image-showcase.json'),'utf8'));
  const doc=structuredClone(media.body.site);
  const showcase=require(path.join(root,'stage3/sdk/contract.cjs')).sectionFrom(imageDef,'section-photo');
  showcase.elements.find(el=>el.slot==='photo').values['content.media']=asset.id;
  doc.pages[0].sections.push(showcase);
  const fake=structuredClone(doc);
  fake.assets[0].src='/assets/not-real.png';
  assert.equal((await request('POST',endpoint+'/save',{expectedRevision:5,site:fake})).status,422);
  const correct=await request('POST',endpoint+'/save',{expectedRevision:5,site:doc});
  assert.equal(correct.status,200);assert.equal(correct.body.revision,6);
  const mediaPreview=await request('POST',endpoint+'/preview',{expectedRevision:6,site:doc,path:'/'});
  assert.equal(mediaPreview.status,200);
  assert.match(mediaPreview.body.html,/<img[^>]*width="\d+" height="\d+"/,
    'Hosted preview reserves the decoded image dimensions');
  assert.ok(mediaPreview.body.html.includes(endpoint+'/media/'+asset.id),
    'Preview media resolves through authenticated draft assets');
  assert.equal((await request('GET',endpoint+'/media/'+asset.id)).status,200);
  assert.equal((await request('GET','/published/'+id+'/assets/'+asset.id+'.png')).status,404,
    'Preview does not expose an unpublished asset publicly');
  assert.equal((await request('GET','/published/'+id+'/assets/'+asset.id+'.png')).status,404);
  assert.equal((await request('POST',endpoint+'/publish',{expectedRevision:6})).body.version,3);
  const publicImage=await fetch(origin+'/published/'+id+'/assets/'+asset.id+'.png');
  assert.equal(publicImage.status,200);
  assert.equal(publicImage.headers.get('content-type'),'image/png');
  assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()),pngBytes);
  assert.match((await request('GET','/published/'+id+'/')).body,new RegExp(asset.id+'[.]png'));

  const formDef=JSON.parse(fs.readFileSync(path.join(root,'stage3/components/lead-form.json'),'utf8'));
  const formDraft=structuredClone(correct.body.site);
  formDraft.pages[1].sections.push(require(path.join(root,'stage3/sdk/contract.cjs'))
    .sectionFrom(formDef,'section-quote-form'));
  const formSaved=await request('POST',endpoint+'/save',{expectedRevision:6,site:formDraft});
  assert.equal(formSaved.body.revision,7);
  const formPreview=await request('POST',endpoint+'/preview',{expectedRevision:7,site:formDraft,path:'/contact/'});
  assert.equal(formPreview.status,200);
  assert.match(formPreview.body.html,/action="#preview-only"/);
  assert.doesNotMatch(formPreview.body.html,/name="_token"/);
  assert.doesNotMatch(formPreview.body.html,/name="_release"/);
  assert.equal((await request('GET',endpoint+'/submissions')).body.submissions.length,0);
  assert.equal((await request('POST',endpoint+'/publish',{expectedRevision:7})).body.version,4);
  const formHtml=(await request('GET','/published/'+id+'/contact/')).body;
  assert.match(formHtml,/name="message"/);
  assert.match(formHtml,/action="\/forms\/site-industrial-demo\/section-quote-form"/);
  const token=/name="_token" value="([a-f0-9]{64})"/.exec(formHtml)?.[1];
  assert.ok(token);
  const deliveryRoute=endpoint+'/delivery';
  const deliverySetup=await request('POST',deliveryRoute,{emailEnabled:true,emailRecipient:'leads@example.test',
    telegramEnabled:false,telegramChatId:'',expectedVersion:0,reason:'CI delivery setup'});
  assert.equal(deliverySetup.status,200,JSON.stringify(deliverySetup.body));
  assert.equal(deliverySetup.body.settings.version,1);
  assert.equal(deliverySetup.body.channels.email.configurationStatus,'configuration_required');
  assert.equal(deliverySetup.body.transport.email.ready,false,'CI must never invoke a real mail transport');
  assert.equal((await request('POST',deliveryRoute,{emailEnabled:true,emailRecipient:'invalid',telegramEnabled:false,
    telegramChatId:'',expectedVersion:1,reason:'Reject invalid email'})).status,422);
  assert.equal((await request('POST',deliveryRoute,{emailEnabled:true,emailRecipient:'other@example.test',telegramEnabled:false,
    telegramChatId:'',expectedVersion:0,reason:'Reject stale version'})).status,409);
  const values={_release:'4',_token:token,website:'',name:'Тест Клиент',
    email:'client@example.test',message:'Интересует стоимость оборудования',consent:'yes'};
  const postForm=async(fields,from=origin)=>{
    const res=await fetch(origin+'/forms/'+id+'/section-quote-form',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded','origin':from},
      body:new URLSearchParams(fields)});
    return {status:res.status,body:await res.text()};
  };
  assert.equal((await postForm({...values,email:'not-an-email'})).status,422);
  assert.equal((await postForm({...values,website:'spam.example'})).status,422);
  assert.equal((await postForm({...values,_token:'0'.repeat(64)})).status,422);
  assert.equal((await postForm({...values,consent:''})).status,422);
  assert.equal((await postForm(values,'https://attacker.example')).status,422);
  const sent=await postForm(values);
  assert.equal(sent.status,201,sent.body);
  assert.match(sent.body,/заявка сохранена/);
  let delivery=(await request('GET',deliveryRoute)).body;
  assert.equal(delivery.totals.configuration_required,1,'Lead is saved but email delivery remains explicitly unconfigured');
  assert.equal(delivery.recent[0].state,'configuration_required');
  const retry=await request('POST',deliveryRoute+'/retry',{reason:'CI retry without transport',includeUncertain:false});
  assert.equal(retry.status,200);assert.equal(retry.body.totals.configuration_required,1);
  assert.equal(retry.body.totals.accepted,0,'Missing transport must never be reported as sent');
  const leads=(await request('GET',endpoint+'/submissions')).body.submissions;
  assert.equal(leads.length,1);
  assert.equal(leads[0].email,'client@example.test');
  assert.equal(leads[0].status,'new');
  assert.equal((await request('POST',endpoint+'/submissions/'+leads[0].submission_id+'/review',{})).status,200);
  assert.equal((await request('GET',endpoint+'/submissions')).body.submissions[0].status,'reviewed');
  for(let n=0;n<4;n++)assert.equal((await postForm(values)).status,201);
  assert.equal((await postForm(values)).status,429);
  delivery=(await request('GET',deliveryRoute)).body;
  assert.equal(delivery.totals.configuration_required,5,'Every accepted lead keeps a durable delivery state');

  // A bounded CLI worker recovers pending jobs after an interrupted public request.
  const workerDenied=spawnSync('php',['stage3/server/bin/process-delivery-queue.php'],
    {cwd:root,env,encoding:'utf8'});
  assert.notEqual(workerDenied.status,0,'Worker requires explicit CLI authorization');
  const allLeads=(await request('GET',endpoint+'/submissions')).body.submissions;
  assert.equal(allLeads.length,5);
  // Private operator inbox: bounded search, status, paging, CSV and transactional bulk review.
  const summary=await request('GET',endpoint+'/submissions?status=new&page=1');
  assert.equal(summary.status,200);
  assert.deepEqual(summary.body.counts,{all:5,new:4,in_progress:0,reviewed:1});
  assert.equal(summary.body.total,4);
  assert.equal(summary.body.submissions.length,4);
  assert.equal((await request('GET',endpoint+'/submissions?status=bogus')).status,422);
  assert.equal((await request('GET',endpoint+'/submissions?page=0')).status,422);
  assert.equal((await request('GET',endpoint+'/submissions?q=%25')).body.total,0,
    'LIKE search treats literal % as data rather than a wildcard');
  const searched=await request('GET',endpoint+'/submissions?q='+encodeURIComponent('client@example.test'));
  assert.equal(searched.body.total,5);
  const csv=await request('GET',endpoint+'/submissions/export?status=new');
  assert.equal(csv.status,200);
  assert.match(csv.headers.get('content-type'),/^text\/csv/);
  assert.match(csv.headers.get('cache-control'),/no-store/);
  assert.match(csv.body,/client@example.test/);
  assert.equal(csv.body.split('client@example.test').length-1,4);
  assert.equal((await request('POST',endpoint+'/submissions/bulk-review',
    {ids:[allLeads[1].submission_id,allLeads[1].submission_id]})).status,422);
  assert.equal((await request('POST',endpoint+'/submissions/bulk-review',
    {ids:[allLeads.find(lead=>lead.status==='reviewed').submission_id,
      allLeads.find(lead=>lead.status==='new').submission_id]})).status,409,
    'Already reviewed lead must roll back the entire selection');
  assert.equal((await request('GET',endpoint+'/submissions?status=new')).body.total,4);
  assert.equal((await request('POST',endpoint+'/submissions/bulk-review',
    {ids:[allLeads[1].submission_id,allLeads[2].submission_id]},
    {'x-csrf-token':'wrong'})).status,403);
  const newLeadIds=allLeads.filter(x=>x.status==='new').slice(0,2).map(x=>x.submission_id);
  assert.equal(newLeadIds.length,2);
  const bulk=await request('POST',endpoint+'/submissions/bulk-review',
    {ids:newLeadIds});
  assert.equal(bulk.status,200,JSON.stringify(bulk.body));
  assert.equal(bulk.body.reviewed,2);
  assert.deepEqual((await request('GET',endpoint+'/submissions?status=reviewed')).body.counts,
    {all:5,new:2,in_progress:0,reviewed:3});
  assert.equal((await request('GET',endpoint+'/submissions?status=new')).body.total,2);

  // B2: owner- and editor-only workflow state, private notes and event trail.
  const bulkTrail=await request('GET',endpoint+'/submissions/'+newLeadIds[0]+'/history');
  assert.equal(bulkTrail.status,200);
  assert.equal(bulkTrail.body.events.length,1,'Bulk review now writes durable operator history');
  assert.equal(bulkTrail.body.events[0].to_status,'reviewed');
  const leadWorkflowId=allLeads.find(x=>x.status==='new'&&!newLeadIds.includes(x.submission_id)).submission_id;
  const workflowRoute=endpoint+'/submissions/'+leadWorkflowId+'/workflow';
  const historyRoute=endpoint+'/submissions/'+leadWorkflowId+'/history';
  assert.equal((await request('GET',endpoint+'/submissions?priority=unknown')).status,422);
  assert.equal((await request('GET',endpoint+'/submissions?priority=high')).body.total,0);
  const deniedUpgrade=spawnSync('php',['stage3/server/bin/upgrade-leads.php'],
    {cwd:root,env,encoding:'utf8'});
  assert.notEqual(deniedUpgrade.status,0,'Lead schema changes are CLI gated');
  const authorizedUpgrade=spawnSync('php',['stage3/server/bin/upgrade-leads.php'],
    {cwd:root,env:{...env,STAGE3_ALLOW_LEAD_WORKFLOW_UPGRADE:'YES'},encoding:'utf8'});
  assert.equal(authorizedUpgrade.status,0,authorizedUpgrade.stderr);
  const originalState=(await request('GET',endpoint+'/submissions')).body.submissions
    .find(x=>x.submission_id===leadWorkflowId);
  assert.equal(originalState.priority,'normal');
  assert.equal(originalState.note,'');
  assert.equal(originalState.workflow_revision,0);
  assert.equal((await request('POST',workflowRoute,{
    status:'in_progress',priority:'high',note:'=SUM(1,1) Внутренняя заметка',
    expectedWorkflowRevision:0},{'x-csrf-token':'bogus'})).status,403);
  assert.equal((await request('POST',workflowRoute,{
    status:'invalid',priority:'high',note:'test',expectedWorkflowRevision:0})).status,422);
  assert.equal((await request('POST',workflowRoute,{
    status:'in_progress',priority:'high',note:'a'.repeat(2001),expectedWorkflowRevision:0})).status,422);
  const updatedLead=await request('POST',workflowRoute,{
    status:'in_progress',priority:'high',note:'=SUM(1,1) Внутренняя заметка',
    expectedWorkflowRevision:0});
  assert.equal(updatedLead.status,200,JSON.stringify(updatedLead.body));
  assert.equal(updatedLead.body.workflow_revision,1);
  assert.equal(updatedLead.body.changed,true);
  assert.equal((await request('POST',workflowRoute,{
    status:'reviewed',priority:'normal',note:'bad overwrite',
    expectedWorkflowRevision:0})).status,409,'Stale operator cannot overwrite new notes');
  assert.equal((await request('GET',endpoint+'/submissions?priority=high')).body.total,1);
  assert.equal((await request('GET',endpoint+'/submissions?status=in_progress')).body.total,1);
  const priorityCsv=await request('GET',endpoint+'/submissions/export?priority=high');
  assert.equal(priorityCsv.status,200);
  assert.match(priorityCsv.body,/'=SUM\(1,1\)|'=SUM\(1,1\)/);
  assert.match(priorityCsv.body,/'=SUM/,'Private notes are protected against CSV spreadsheet formula execution');
  const updatedHistory=await request('GET',historyRoute);
  assert.equal(updatedHistory.status,200);
  assert.equal(updatedHistory.body.events.length,1);
  assert.equal(updatedHistory.body.events[0].from_status,'new');
  assert.equal(updatedHistory.body.events[0].to_status,'in_progress');
  assert.equal(updatedHistory.body.events[0].note_changed,1);
  assert.ok(!JSON.stringify(updatedHistory.body).includes('Внутренняя заметка'),
    'History records edit metadata without duplicating private note contents');
  const restoredLead=await request('POST',workflowRoute,{
    status:'new',priority:'high',note:'=SUM(1,1) Внутренняя заметка',
    expectedWorkflowRevision:1});
  assert.equal(restoredLead.status,200);
  assert.deepEqual((await request('GET',endpoint+'/submissions?status=reviewed')).body.counts,
    {all:5,new:2,in_progress:0,reviewed:3});
  assert.equal((await request('GET',historyRoute)).body.events.length,2);
  assert.equal((await request('GET','/published/site-industrial-demo/contact/')).status,200,
    'Private workflow must not affect visitor website');
  // B3: two stages in one bounded, rollback-safe operator triage.
  const triageLeads=(await request('GET',endpoint+'/submissions')).body.submissions;
  const mixedTriage=[
    triageLeads.find(x=>x.submission_id===newLeadIds[0]),
    triageLeads.find(x=>x.status==='new'&&x.submission_id!==leadWorkflowId)
  ];
  assert.equal(mixedTriage.length,2);
  assert.equal(mixedTriage[0].status,'reviewed');
  assert.equal(mixedTriage[1].status,'new');
  const bulkWorkflow=endpoint+'/submissions/bulk-workflow';
  const chosen=mixedTriage.map(x=>({id:x.submission_id,expectedWorkflowRevision:x.workflow_revision}));
  assert.equal((await request('POST',bulkWorkflow,{items:chosen,status:null,priority:null})).status,422,
    'Batch must have at least one deliberate action');
  assert.equal((await request('POST',bulkWorkflow,{items:[chosen[0],chosen[0]],
    status:'reviewed',priority:null})).status,422,'Duplicate selection rejected');
  assert.equal((await request('POST',bulkWorkflow,{items:chosen,status:'in_progress',priority:'high'},
    {'x-csrf-token':'wrong'})).status,403,'Triage respects CSRF');
  assert.equal((await request('POST',bulkWorkflow,{items:[
    chosen[0],{...chosen[1],expectedWorkflowRevision:chosen[1].expectedWorkflowRevision+1}],
    status:'in_progress',priority:'high'})).status,409,
    'One stale revision rolls back entire batch');
  const beforeTriage=(await request('GET',endpoint+'/submissions')).body.submissions;
  for(const old of mixedTriage){
    const now=beforeTriage.find(x=>x.submission_id===old.submission_id);
    assert.equal(now.workflow_revision,old.workflow_revision);
    assert.equal(now.status,old.status);
    assert.equal(now.priority,old.priority);
  }
  const batch=await request('POST',bulkWorkflow,{
    items:chosen,status:'in_progress',priority:'high'});
  assert.equal(batch.status,200,JSON.stringify(batch.body));
  assert.deepEqual(batch.body,{selected:2,changed:2});
  const triageSummary=(await request('GET',endpoint+'/submissions?status=in_progress')).body;
  assert.equal(triageSummary.total,2);
  assert.equal(triageSummary.pipeline.in_progress.high,2);
  assert.equal((await request('GET',endpoint+'/submissions?priority=high')).body.total,3);
  const afterTriage=(await request('GET',endpoint+'/submissions')).body.submissions;
  for(const old of mixedTriage){
    const now=afterTriage.find(x=>x.submission_id===old.submission_id);
    assert.equal(now.workflow_revision,old.workflow_revision+1);
    assert.equal(now.note,old.note,'Bulk stage and priority must preserve private notes');
    const history=(await request('GET',endpoint+'/submissions/'+now.submission_id+'/history')).body;
    assert.ok(history.events.some(event=>event.to_status==='in_progress'&&
      event.to_priority==='high'),'Bulk triage audit remains queryable even when events share one UTC second');
  }
  assert.equal((await request('POST',bulkWorkflow,{
    items:chosen,status:'reviewed',priority:'normal'})).status,409,
    'A repeated stale batch may not change an already completed batch');
  for(const original of mixedTriage){
    const now=afterTriage.find(x=>x.submission_id===original.submission_id);
    const restored=await request('POST',endpoint+'/submissions/'+original.submission_id+'/workflow',{
      status:original.status,priority:original.priority,note:original.note,
      expectedWorkflowRevision:now.workflow_revision});
    assert.equal(restored.status,200,JSON.stringify(restored.body));
  }
  assert.equal((await request('GET',endpoint+'/submissions?status=in_progress')).body.total,0);
  assert.equal((await request('GET','/published/site-industrial-demo/contact/')).status,200,
    'Private triage is not a site publish operation');
  const pendingSetup=spawnSync('php',['-r',
    '$db=new PDO(getenv("STAGE3_DSN"));$q=$db->prepare("UPDATE stage3_delivery_outbox SET state=?,last_error=NULL WHERE site_id=? AND submission_id=? AND channel=?");$q->execute(["pending","site-industrial-demo",$argv[1],"email"]);if($q->rowCount()!==1)exit(3);',
    allLeads[0].submission_id],{cwd:root,env,encoding:'utf8'});
  assert.equal(pendingSetup.status,0,pendingSetup.stderr);
  const workerEnv={...env,STAGE3_ALLOW_DELIVERY_WORKER:'YES'};
  const processed=spawnSync('php',['stage3/server/bin/process-delivery-queue.php','1'],
    {cwd:root,env:workerEnv,encoding:'utf8'});
  assert.equal(processed.status,0,processed.stderr);
  const workerResult=JSON.parse(processed.stdout.trim());
  assert.equal(workerResult.selected,1);
  assert.equal(workerResult.outcomes.configuration_required,1,
    'Worker records missing transport without pretending a notification was sent');

  // An abandoned send is uncertain, not automatically resent.
  const staleSetup=spawnSync('php',['-r',
    '$db=new PDO(getenv("STAGE3_DSN"));$q=$db->prepare("UPDATE stage3_delivery_outbox SET state=?,updated_at=? WHERE site_id=? AND submission_id=? AND channel=?");$q->execute(["sending","2000-01-01T00:00:00Z","site-industrial-demo",$argv[1],"email"]);if($q->rowCount()!==1)exit(3);',
    allLeads[1].submission_id],{cwd:root,env,encoding:'utf8'});
  assert.equal(staleSetup.status,0,staleSetup.stderr);
  const recovered=spawnSync('php',['stage3/server/bin/process-delivery-queue.php','1'],
    {cwd:root,env:workerEnv,encoding:'utf8'});
  assert.equal(recovered.status,0,recovered.stderr);
  const recoveredResult=JSON.parse(recovered.stdout.trim());
  assert.equal(recoveredResult.selected,0);
  assert.equal(recoveredResult.staleMarkedUncertain,1);
  delivery=(await request('GET',deliveryRoute)).body;
  assert.equal(delivery.totals.uncertain,1);
  const noUncertainRetry=await request('POST',deliveryRoute+'/retry',
    {reason:'Do not resend uncertain delivery automatically',includeUncertain:false});
  assert.equal(noUncertainRetry.status,200);
  assert.equal(noUncertainRetry.body.totals.uncertain,1,
    'Ordinary retry must leave uncertain external sends untouched');
  const explicitUncertainRetry=await request('POST',deliveryRoute+'/retry',
    {reason:'Owner explicitly confirms uncertain resend',includeUncertain:true});
  assert.equal(explicitUncertainRetry.status,200);
  assert.equal(explicitUncertainRetry.body.totals.uncertain,0);
  assert.equal(explicitUncertainRetry.body.totals.configuration_required,5);

  // Second site verifies extended form fields, notices, and isolated receiver.
  const sdk=require(path.join(root,'stage3/sdk/contract.cjs'));
  const componentIds=['company-hero','feature-highlights','contact-panel','image-showcase','lead-form','lead-form-flex'];
  const available=componentIds.map(n=>JSON.parse(fs.readFileSync(path.join(root,'stage3/components',n+'.json'),'utf8')));
  const flexDef=available.find(x=>x.id==='lead-form-flex');
  const flexSite=sdk.siteFromBrief({siteId:'site-flex-ci',title:'Конструктор'},available);
  const extraSection=sdk.sectionFrom(flexDef,'section-flex');
  const set=(slot,key,value)=>{extraSection.elements.find(x=>x.slot===slot).values[key]=value;};
  set('extra-one','content.text','Как доставить');
  set('extra-one','behavior.kind','select');
  set('extra-one','behavior.required',true);
  set('extra-one','content.options','Доставка\nСамовывоз');
  set('extra-two','content.text','Телефон');
  set('extra-two','behavior.kind','tel');
  set('extra-two','behavior.required',true);
  set('extra-three','content.text','Комментарий');
  set('extra-three','behavior.kind','textarea');
  extraSection.formFields=[
    {id:'field-delivery-note',label:'Время доставки',kind:'text',required:true,
      options:[],placeholder:'Удобное время',when:{field:'extra1',option:1}},
    {id:'field-reply-email',label:'Email для ответа',kind:'email',required:false,
      options:[],placeholder:'name@example.test'},
    {id:'field-product-select',label:'Группа товаров',kind:'select',required:false,
      options:['Оборудование','Запчасти'],placeholder:''},
    {id:'field-product-detail',label:'Подробности по запчастям',kind:'textarea',required:true,
      options:[],placeholder:'Укажите наименование',when:{field:'field-product-select',option:2}},
    {id:'field-contact-method',label:'Предпочтительный способ связи',kind:'radio',required:true,
      options:['Email','Телефон','Telegram'],placeholder:''},
    {id:'field-newsletter',label:'Получать новости',kind:'checkbox',required:false,
      options:[],placeholder:''},
    {id:'field-order-quantity',label:'Количество',kind:'number',required:true,
      options:[],placeholder:'Например, 2.5'},
    {id:'field-delivery-date',label:'Дата доставки',kind:'date',required:false,
      options:[],placeholder:''},
    {id:'field-reference-url',label:'Ссылка на товар',kind:'url',required:false,
      options:[],placeholder:'https://example.test/item'}
  ];
  flexSite.pages[1].sections.push(extraSection);
  assert.equal((await request('POST','/api/sites',{site:flexSite})).status,201);
  assert.equal((await request('GET','/api/sites/site-flex-ci/notifications')).body.unread,0);
  assert.equal((await request('POST','/api/sites/site-flex-ci/publish',{expectedRevision:1})).body.version,1);
  const flexHTML=(await request('GET','/published/site-flex-ci/contact/')).body;
  assert.match(flexHTML,/name="extra1"/);
  assert.match(flexHTML,/type="tel" name="extra2"/);
  assert.match(flexHTML,/name="extra3"/);
  assert.match(flexHTML,/value="Самовывоз"/);
  assert.match(flexHTML,/name="field-delivery-note"/);
  assert.match(flexHTML,/type="email" name="field-reply-email"/);
  assert.match(flexHTML,/name="field-product-select"/);
  assert.match(flexHTML,/type="radio" name="field-contact-method"/);
  assert.match(flexHTML,/type="checkbox" name="field-newsletter"/);
  assert.match(flexHTML,/type="number" name="field-order-quantity"/);
  assert.match(flexHTML,/type="date" name="field-delivery-date"/);
  assert.match(flexHTML,/type="url" name="field-reference-url"/);
  assert.match(flexHTML,/@supports selector\(form:has\(option:checked\)\)/);
  const flexToken=/name="_token" value="([a-f0-9]{64})"/.exec(flexHTML)?.[1];
  assert.ok(flexToken);
  const flexValues={_release:'1',_token:flexToken,website:'',name:'Новый клиент',
    email:'flex@example.test',message:'Нужно подобрать оборудование',consent:'yes',
    extra1:'Доставка',extra2:'+49 (211) 1234567',extra3:'Детали запроса',
    'field-delivery-note':'После 18:00','field-reply-email':'reply@example.test',
    'field-product-select':'Оборудование','field-product-detail':'',
    'field-contact-method':'Email','field-newsletter':'yes','field-order-quantity':'2.5',
    'field-delivery-date':'2026-11-12','field-reference-url':'https://example.test/item/42'};
  const submitFlex=async(fields,receiver=origin,from=origin)=>{
    const response=await fetch(receiver+'/forms/site-flex-ci/section-flex',{method:'POST',
      headers:{'content-type':'application/x-www-form-urlencoded','origin':from},
      body:new URLSearchParams(fields)});
    return {status:response.status,text:await response.text()};
  };
  assert.equal((await submitFlex({...flexValues,extra1:'Другой вариант'})).status,422);
  assert.equal((await submitFlex({...flexValues,extra2:'<script>'})).status,422);
  assert.equal((await submitFlex({...flexValues,extra2:''})).status,422);
  assert.equal((await submitFlex({...flexValues,extra4:'injected'})).status,422);
  assert.equal((await submitFlex({...flexValues,'field-delivery-note':''})).status,422);
  assert.equal((await submitFlex({...flexValues,extra1:'Самовывоз'})).status,422,
    'Inactive condition cannot be spoofed with a nonempty value');
  assert.equal((await submitFlex({...flexValues,'field-reply-email':'not-an-email'})).status,422);
  assert.equal((await submitFlex({...flexValues,'field-product-select':'Unknown'})).status,422);
  assert.equal((await submitFlex({...flexValues,'field-product-select':'Запчасти'})).status,422,
    'Chained conditional required field must be present');
  assert.equal((await submitFlex({...flexValues,'field-contact-method':'Fax'})).status,422,
    'Radio values must match the published choices');
  assert.equal((await submitFlex({...flexValues,'field-newsletter':'true'})).status,422,
    'Checkbox accepts only its explicit checked value');
  assert.equal((await submitFlex({...flexValues,'field-order-quantity':'1e3'})).status,422,
    'Numbers reject exponent and non-canonical input');
  assert.equal((await submitFlex({...flexValues,'field-delivery-date':'2026-02-30'})).status,422,
    'Dates reject impossible calendar days');
  assert.equal((await submitFlex({...flexValues,'field-reference-url':'javascript:alert(1)'})).status,422,
    'URLs allow only validated HTTP(S) destinations');

  assert.equal((await submitFlex(flexValues)).status,201);
  assert.equal((await request('GET','/api/sites/site-flex-ci/notifications')).body.unread,1);
  const flexInbox=(await request('GET','/api/sites/site-flex-ci/submissions')).body.submissions;
  assert.equal(flexInbox.length,1);
  assert.equal(flexInbox[0].extras.extra1.value,'Доставка');
  assert.equal(flexInbox[0].extras['field-delivery-note'].value,'После 18:00');
  assert.equal(flexInbox[0].extras['field-reply-email'].value,'reply@example.test');
  assert.equal(flexInbox[0].extras['field-contact-method'].value,'Email');
  assert.equal(flexInbox[0].extras['field-newsletter'].value,'yes');
  assert.equal(flexInbox[0].extras['field-order-quantity'].value,'2.5');
  assert.equal(flexInbox[0].extras['field-delivery-date'].value,'2026-11-12');
  assert.equal(flexInbox[0].extras['field-reference-url'].value,'https://example.test/item/42');
  assert.equal(flexInbox[0].extras['field-product-detail'],undefined);
  assert.equal(flexInbox[0].extras.extra2.label,'Телефон');
  assert.equal((await request('POST','/api/sites/site-flex-ci/notifications/seen',{})).body.unread,0);
  assert.equal((await request('GET','/api/sites/site-flex-ci/notifications')).body.unread,0);
  // Native unchecked checkbox controls are omitted from the browser POST body.
  const withoutNewsletter={...flexValues,email:'unchecked@example.test'};
  delete withoutNewsletter['field-newsletter'];
  const unchecked=await submitFlex(withoutNewsletter);
  assert.equal(unchecked.status,201,unchecked.text);
  const uncheckedLead=(await request('GET','/api/sites/site-flex-ci/submissions')).body.submissions
    .find(item=>item.email==='unchecked@example.test');
  assert.ok(uncheckedLead,'Optional unchecked checkbox submission is saved');
  assert.equal(uncheckedLead.extras['field-newsletter'].value,'');
  // Collector-only web root refuses CMS routes even when sharing the isolated DB.
  const collectorOrigin='http://127.0.0.1:'+(await port());
  env.STAGE3_FORM_ORIGINS=origin;
  const collector=spawn('php',['-S',new URL(collectorOrigin).host,'-t',
    'stage3/server/collector-public','stage3/server/collector-public/index.php'],{
      cwd:root,env,stdio:['ignore','ignore','pipe']});
  let collectorErr='';collector.stderr.on('data',x=>{collectorErr+=x.toString();});
  try{
    for(let n=0;n<60;n++){
      try{if((await fetch(collectorOrigin+'/api/session')).status===404)break;}catch(e){}
      await new Promise(resolve=>setTimeout(resolve,80));
    }
    assert.equal((await fetch(collectorOrigin+'/api/sites')).status,404);
    assert.equal((await fetch(collectorOrigin+'/studio')).status,404);
    assert.equal((await fetch(collectorOrigin+'/forms/site-flex-ci/section-flex')).status,404);
    assert.equal((await submitFlex(flexValues,collectorOrigin,origin)).status,201,collectorErr);
    assert.equal((await request('GET','/api/sites/site-flex-ci/notifications')).body.unread,2,
      'Unchecked optional checkbox and collector submissions both create unread leads');
    env.STAGE3_FORM_ENDPOINT=collectorOrigin;
    const flexOut=path.join(dbdir,'flex-static-release');
    const exportedFlex=spawnSync('php',['stage3/server/bin/export-published.php','site-flex-ci',flexOut],
      {cwd:root,env,encoding:'utf8'});
    assert.equal(exportedFlex.status,0,exportedFlex.stderr);
    const exportedHTML=fs.readFileSync(path.join(flexOut,'contact','index.html'),'utf8');
    assert.ok(exportedHTML.includes('action="'+collectorOrigin+'/forms/'));
    assert.match(exportedHTML,/name="extra1"/);
    assert.match(exportedHTML,/name="field-delivery-note"/);
    assert.match(exportedHTML,/lead-conditional-field-delivery-note/);
    assert.doesNotMatch(exportedHTML,/<script/i);
  }finally{
    const stopped=new Promise(resolve=>collector.once('exit',resolve));
    collector.kill('SIGTERM');
    await Promise.race([stopped,new Promise(resolve=>setTimeout(resolve,2000))]);
  }
  delete env.STAGE3_FORM_ENDPOINT;
  // Site-scoped saved-section templates are independent of draft/published state.
  const tplRoot=endpoint+'/templates';
  assert.equal((await request('GET',tplRoot)).body.templates.length,0);
  const sourceRevision=(await request('GET',endpoint)).body.revision;
  const made=await request('POST',tplRoot,{name:'Наша обложка',pageId:'page-home',
    sectionId:'section-hero',expectedRevision:sourceRevision});
  assert.equal(made.status,201,JSON.stringify(made.body));
  const templateId=made.body.template.id;
  assert.match(templateId,/^template-[0-9a-f]{18}$/);
  assert.equal(made.body.template.section.component,'company-hero');
  assert.equal((await request('GET',endpoint)).body.revision,sourceRevision,
    'Saving a section template is not a new draft or publish');
  assert.equal((await request('POST',tplRoot,{name:'Stale',pageId:'page-home',
    sectionId:'section-hero',expectedRevision:1})).status,409);
  assert.equal((await request('POST',tplRoot,{name:'Wrong',pageId:'page-home',
    sectionId:'section-not-found',expectedRevision:sourceRevision})).status,404);
  assert.equal((await request('GET',tplRoot)).body.templates.length,1);
  assert.equal((await request('GET','/api/sites/site-flex-ci/templates')).body.templates.length,0,
    'Saved presets cannot leak across sites');
  assert.equal((await request('POST','/api/sites/site-flex-ci/templates/'+templateId+'/delete',{})).status,404);
  assert.equal((await request('POST',tplRoot+'/'+templateId+'/delete',{})).status,200);
  assert.equal((await request('GET',tplRoot)).body.templates.length,0);
  assert.equal((await request('GET','/published/'+id+'/')).status,200,'No implicit publication');
  // Backup -> read-only plan -> transactional recovery -> release restoration.
  await request('POST',tplRoot,{name:'Архивный шаблон',pageId:'page-home',sectionId:'section-hero',expectedRevision:sourceRevision});
  const archiveResult=await request('GET',endpoint+'/backup');
  assert.equal(archiveResult.status,200,JSON.stringify(archiveResult.body));
  const archive=archiveResult.body;
  assert.equal(archive.format,'manufact-site-backup-v1');
  assert.equal(archive.payload.media.length,1);
  assert.equal(archive.payload.templates.length,1);
  assert.ok(archive.payload.submissions.length>0);
  const archivedWorkflow=archive.payload.submissions.find(lead=>lead.submission_id===leadWorkflowId);
  assert.equal(archivedWorkflow.workflow.priority,'high');
  assert.equal(archivedWorkflow.workflow.note,'=SUM(1,1) Внутренняя заметка');
  assert.equal(archivedWorkflow.workflowEvents.length,2,'Complete CRM event history is backed up');
  assert.equal(archive.payload.revisions.length,sourceRevision);
  assert.equal(archive.payload.releases.length,4);
  assert.doesNotMatch(JSON.stringify(archive),/password_hash|visitor_hash|STAGE3_FORM_SECRET/);
  const target='site-restored-ci',payload={archive,targetSiteId:target};
  const planned=await request('POST','/api/backups/plan',payload);
  assert.equal(planned.status,200,JSON.stringify(planned.body));
  assert.equal(planned.body.plan.willPublish,false);
  assert.equal((await request('GET','/api/sites/'+target)).status,404,'Preflight must not create data');
  assert.equal((await request('POST','/api/backups/restore',{...payload,confirmationToken:'wrong'})).status,409);
  const damaged=structuredClone(archive);damaged.payload.draft.site.title='Tampered';
  assert.equal((await request('POST','/api/backups/plan',{archive:damaged,targetSiteId:target})).status,422);
  const invalidLeadBackup=structuredClone(archive);
  invalidLeadBackup.payload.submissions.find(x=>x.submission_id===leadWorkflowId).workflow.note='X'.repeat(2001);
  invalidLeadBackup.sha256=require('node:crypto').createHash('sha256')
    .update(JSON.stringify(invalidLeadBackup.payload)).digest('hex');
  assert.equal((await request('POST','/api/backups/plan',
    {archive:invalidLeadBackup,targetSiteId:target})).status,422,
    'Tampered private lead notes are rejected even with recomputed checksum');
  // Historical v1 backups without operator workflow fields remain readable.
  const legacyLeadArchive=structuredClone(archive);
  for(const lead of legacyLeadArchive.payload.submissions){
    delete lead.workflow;delete lead.workflowEvents;
  }
  legacyLeadArchive.sha256=require('node:crypto').createHash('sha256')
    .update(JSON.stringify(legacyLeadArchive.payload)).digest('hex');
  assert.equal((await request('POST','/api/backups/plan',
    {archive:legacyLeadArchive,targetSiteId:target})).status,200,
    'Older content-only backups can still be restored after CRM upgrade');
  // A successful second plan intentionally invalidates the previous token;
  // explicitly re-plan the exact new archive before the final restore.
  const currentPlan=await request('POST','/api/backups/plan',payload);
  assert.equal(currentPlan.status,200,JSON.stringify(currentPlan.body));
  const missingImage=structuredClone(archive);missingImage.payload.media=[];
  // Recompute PHP's compact JSON representation: every key is textual, no floats in this fixture.
  missingImage.sha256=require('node:crypto').createHash('sha256').update(JSON.stringify(missingImage.payload)).digest('hex');
  assert.equal((await request('POST','/api/backups/plan',{archive:missingImage,targetSiteId:target})).status,422);
  const recoveredArchive=await request('POST','/api/backups/restore',{...payload,confirmationToken:currentPlan.body.confirmationToken});
  assert.equal(recoveredArchive.status,201,JSON.stringify(recoveredArchive.body));
  assert.equal(recoveredArchive.body.site.siteId,target);
  assert.equal(recoveredArchive.body.revision,sourceRevision);
  assert.equal((await request('GET','/published/'+target+'/')).status,404,'Restoring never activates a public snapshot');
  assert.equal((await request('GET','/api/sites/'+target+'/releases')).body.releases.length,4);
  const copyBackup=await request('GET','/api/sites/'+target+'/backup');
  assert.equal(copyBackup.status,200,JSON.stringify(copyBackup.body));
  assert.equal(copyBackup.body.payload.media[0].sha256,archive.payload.media[0].sha256);
  assert.equal(copyBackup.body.payload.submissions.length,archive.payload.submissions.length);
  const restoredWorkflow=copyBackup.body.payload.submissions.find(l=>l.workflow?.note===
    '=SUM(1,1) Внутренняя заметка');
  assert.ok(restoredWorkflow,'Private operator note survives independent-site backup restore');
  assert.equal(restoredWorkflow.workflow.priority,'high');
  assert.equal(restoredWorkflow.workflowEvents.length,2);
  assert.notEqual(restoredWorkflow.submission_id,leadWorkflowId,
    'Restored leads get a new global identity without losing operator history');
  assert.notEqual(copyBackup.body.payload.submissions[0].submission_id,archive.payload.submissions[0].submission_id);
  assert.equal(copyBackup.body.payload.templates.length,1);
  assert.equal((await request('POST','/api/backups/plan',payload)).status,409,'No overwrite of existing sites');
  assert.equal((await request('POST','/api/sites/'+target+'/restore-release',{version:1,expectedRevision:1})).status,409,'CAS on publication recovery');
  const rollback=await request('POST','/api/sites/'+target+'/restore-release',{version:1,expectedRevision:sourceRevision});
  assert.equal(rollback.status,200,JSON.stringify(rollback.body));
  assert.equal(rollback.body.revision,sourceRevision+1);
  assert.equal((await request('GET','/published/'+target+'/')).status,404);
  const activated=await request('POST','/api/sites/'+target+'/publish',{expectedRevision:sourceRevision+1});
  assert.equal(activated.status,200,JSON.stringify(activated.body));
  assert.equal(activated.body.version,5,'Publication versions continue after imported history');
  assert.equal((await request('GET','/published/'+target+'/')).status,200);
  assert.equal((await request('GET',endpoint)).body.revision,sourceRevision,'Original draft intact');
  // Site-scoped manual licences: due date is a reminder, not an automatic shutdown.
  const licenceRoute='/api/licenses/'+target,today=new Date().toISOString().slice(0,10);
  const setLicence=await request('POST',licenceRoute,{type:'subscription',reminderDate:today,
    domain:'client.example',expectedVersion:0,reason:'Owner set renewal reminder'});
  assert.equal(setLicence.status,200,JSON.stringify(setLicence.body));
  assert.equal(setLicence.body.license.reminderStatus,'today');
  assert.equal(setLicence.body.license.paused,false);
  assert.equal((await request('POST',licenceRoute,{type:'subscription',reminderDate:today,
    domain:'',expectedVersion:0,reason:'Stale edit'})).status,409);
  assert.equal((await request('GET','/api/licenses')).body.licenses.find(x=>x.siteId===target).domain,'client.example');
  const paused=await request('POST',licenceRoute+'/pause',{expectedVersion:1,reason:'Manual billing verification'});
  assert.equal(paused.status,200,JSON.stringify(paused.body));
  assert.equal(paused.body.license.paused,true);
  const targetDraft=(await request('GET','/api/sites/'+target)).body;
  for(const [route,data] of [
    ['/api/sites/'+target+'/save',{site:targetDraft.site,expectedRevision:targetDraft.revision}],
    ['/api/sites/'+target+'/publish',{expectedRevision:targetDraft.revision}],
    ['/api/sites/'+target+'/restore-release',{version:1,expectedRevision:targetDraft.revision}],
    ['/api/sites/'+target+'/templates',{name:'Blocked',pageId:'page-home',sectionId:'section-hero',expectedRevision:targetDraft.revision}]
  ]) assert.equal((await request('POST',route,data)).status,409,'Paused write blocked: '+route);
  assert.equal((await request('GET','/published/'+target+'/')).status,200,'Visitors unaffected');
  assert.equal((await request('GET','/api/sites')).body.sites.find(s=>s.site_id===id).license.paused,false,'Other sites unaffected');
  assert.equal((await request('POST',licenceRoute+'/resume',{expectedVersion:1,reason:'Stale resume'})).status,409);
  const resumed=await request('POST',licenceRoute+'/resume',{expectedVersion:2,reason:'Operator verified account'});
  assert.equal(resumed.status,200,JSON.stringify(resumed.body));
  assert.equal(resumed.body.license.operator,'testowner');
  assert.equal(resumed.body.license.paused,false);
  assert.equal((await request('POST',licenceRoute,{type:'perpetual',reminderDate:null,
    domain:'',expectedVersion:3,reason:'Granted perpetual licence'})).body.license.reminderStatus,'none');
  // Scoped multi-user path: edit without publish, grant change, password revocation,
  // disabled user, read-only viewer, and private owner audit metadata.
  const staffPassword='test-only-staff-password-123456',newStaffPassword='test-only-updated-password-123456';
  assert.equal((await request('POST','/api/users',{username:'labeditor',password:staffPassword,role:'editor',sites:[target],reason:'Test editor access'})).status,201);
  assert.equal((await request('POST','/api/users',{username:'labviewer',password:staffPassword,role:'viewer',sites:[target],reason:'Test viewer access'})).status,201);
  const ownerCookie=cookie,ownerCsrf=csrf;
  async function asUser(username,password){cookie='';csrf='';const auth=await request('POST','/api/login',{username,password});assert.equal(auth.status,200,JSON.stringify(auth.body));csrf=auth.body.csrfToken;return auth;}
  await asUser('labeditor',staffPassword);
  assert.deepEqual((await request('GET','/api/sites')).body.sites.map(x=>x.site_id),[target]);
  for(const route of [endpoint,endpoint+'/media/'+asset.id,'/api/users','/api/audit','/api/licenses','/api/sites/'+target+'/backup','/api/sites/'+target+'/delivery']){
    assert.equal((await request('GET',route)).status,403,'Scoped editor denial: '+route);
  }
  // Private lead workflows cannot be read or mutated via an ungranted site.
  assert.equal((await request('GET',endpoint+'/submissions/'+leadWorkflowId+'/history')).status,403);
  assert.equal((await request('POST',endpoint+'/submissions/bulk-workflow',{
    items:chosen,status:'reviewed',priority:null})).status,403,'Editor cannot triage foreign site');
  assert.equal((await request('POST',workflowRoute,{
    status:'reviewed',priority:'high',note:'not allowed',expectedWorkflowRevision:2})).status,403);
  assert.equal((await request('POST','/api/sites/'+target+'/publish',{expectedRevision:sourceRevision+1})).status,403);
  const editable=(await request('GET','/api/sites/'+target)).body;
  assert.equal((await request('POST','/api/sites/'+target+'/save',{site:editable.site,expectedRevision:editable.revision})).status,200);
  cookie=ownerCookie;csrf=ownerCsrf;
  assert.equal((await request('POST','/api/users/labeditor',{role:'publisher',disabled:false,sites:[target],expectedVersion:1,reason:'Allow explicit publishing'})).status,200);
  await asUser('labeditor',staffPassword);
  assert.equal((await request('POST','/api/sites/'+target+'/publish',{expectedRevision:editable.revision+1})).status,200);
  const revokedCookie=cookie,revokedCsrf=csrf;
  assert.equal((await request('POST','/api/password',{currentPassword:staffPassword,newPassword:newStaffPassword})).status,200);
  cookie=revokedCookie;csrf=revokedCsrf;
  assert.equal((await request('GET','/api/sites/'+target)).status,401,'Password change revokes all older sessions');
  await asUser('labeditor',newStaffPassword);
  const disableCookie=cookie,disableCsrf=csrf;
  cookie=ownerCookie;csrf=ownerCsrf;
  assert.equal((await request('POST','/api/users/labeditor',{role:'publisher',disabled:true,sites:[target],expectedVersion:3,reason:'Disable staff access'})).status,200);
  assert.equal((await request('POST','/api/users/testowner',{role:'viewer',disabled:true,sites:[],expectedVersion:1,reason:'Must reject owner lockout'})).status,409);
  cookie=disableCookie;csrf=disableCsrf;
  assert.equal((await request('GET','/api/sites/'+target)).status,401,'Disabled account session is invalid');
  assert.equal((await request('GET','/published/'+target+'/')).status,200,'Public site independent of account state');
  await asUser('labviewer',staffPassword);
  assert.equal((await request('GET','/api/sites/'+target)).status,200);
  assert.equal((await request('GET','/api/sites/'+target+'/submissions')).status,403,'Viewer cannot read contact data');
  assert.equal((await request('GET','/api/sites/'+target+'/submissions/'+leadWorkflowId+'/history')).status,403,
    'Viewer cannot read private lead event history');
  assert.equal((await request('POST','/api/sites/'+target+'/submissions/'+leadWorkflowId+'/workflow',{
    status:'new',priority:'normal',note:'viewer forbidden',expectedWorkflowRevision:2})).status,403,
    'Viewer cannot write operator notes');
  assert.equal((await request('POST','/api/sites/'+target+'/submissions/bulk-workflow',{
    items:chosen,status:'reviewed',priority:'high'})).status,403,
    'Viewer cannot triage even granted site');
  assert.equal((await request('POST','/api/sites/'+target+'/save',{site:editable.site,expectedRevision:editable.revision+1})).status,403);
  cookie=ownerCookie;csrf=ownerCsrf;
  const auditLog=await request('GET','/api/audit');
  assert.equal(auditLog.status,200);
  assert.ok(auditLog.body.events.some(e=>e.actor==='labeditor'&&e.outcome==='denied'));
  assert.ok(auditLog.body.events.some(e=>e.action==='POST /api/users/labeditor'&&e.outcome==='success'));
  assert.ok(!JSON.stringify(auditLog.body).includes(staffPassword));
  assert.ok(!JSON.stringify(auditLog.body).includes(newStaffPassword));

  // Four rich repeaters on one independent site: PHP contract, save, publish,
  // static export and client-safe rendering, without a form collector.
  const csdk=require(path.join(root,'stage3/sdk/contract.cjs'));
  const richDefs=fs.readdirSync(path.join(root,'stage3/components'))
    .filter(n=>n.endsWith('.json')).map(n=>JSON.parse(fs.readFileSync(path.join(root,'stage3/components',n),'utf8')));
  const rich=structuredClone(fixture);rich.siteId='site-rich-ci';rich.language='pl';
  rich.theme={background:'#121f2c',surface:'#ffffff',text:'#dce6ef',primary:'#ff8800',font:'system',maxWidth:960,
    bodySize:18,lineHeight:'relaxed',headingScale:'large',buttonStyle:'outline',buttonRadius:12,buttonText:'#fdfdfd'};
  rich.pages[0].seo={title:'Секции услуг',description:'Страница теста услуг',robots:'noindex',
    ogTitle:'Каталог для соцсетей',ogDescription:'Отдельное описание для публикаций',ogImage:''};
  for(const name of ['service-grid','faq-accordion','testimonials','photo-gallery',
    'pricing-plans','process-timeline','comparison-matrix','content-switcher','adaptive-gallery']){
    const section=csdk.sectionFrom(richDefs.find(m=>m.id===name),'section-rich-'+name);
    rich.pages[0].sections.push(section);
  }
  const svc=rich.pages[0].sections.find(s=>s.component==='service-grid');
  svc.items[0].values['content.title']='Программирование шкафа управления';
  svc.items[0].values['behavior.href']='/contact/';
  const faq=rich.pages[0].sections.find(s=>s.component==='faq-accordion');
  faq.items[0].values['content.question']='<img src=x onerror=alert(1)>';
  const quote=rich.pages[0].sections.find(s=>s.component==='testimonials');
  quote.items[0].values['content.quote']='Подтверждённый отзыв тестового автора';
  const price=rich.pages[0].sections.find(s=>s.component==='pricing-plans');
  price.items[0].values['content.title']='Комплексный пакет';
  price.items[0].values['content.price']='По запросу';
  price.items[0].values['content.features']='Базовая поддержка\nВёрстка страниц';
  price.items[0].values['behavior.featured']=true;
  price.items[0].values['behavior.href']='/contact/';
  const steps=rich.pages[0].sections.find(s=>s.component==='process-timeline');
  steps.items[0].values['content.title']='Согласование брифа';
  const matrix=rich.pages[0].sections.find(s=>s.component==='comparison-matrix');
  matrix.items[0].values['content.metric']='<img src=x onerror=alert(1)>';
  matrix.items[0].values['content.first']='Да';
  matrix.items[0].values['content.second']='По запросу';
  const switcher=rich.pages[0].sections.find(s=>s.component==='content-switcher');
  switcher.items[0].values['content.title']='Для бизнеса';
  switcher.items[1].values['content.title']='Для частных клиентов';
  switcher.items[1].values['content.heading']='Второй раздел';
  const cta=csdk.sectionFrom(richDefs.find(m=>m.id==='cta-banner'),'section-rich-cta');
  cta.elements.find(e=>e.slot==='primary').values['behavior.href']='/contact/';
  cta.elements.find(e=>e.slot==='secondary').values['behavior.href']='/';
  cta.appearance={surface:'paper',spacing:'normal',align:'left',width:'narrow',
    heading:'expressive',corners:'round',mobileAlign:'center',mobileSpacing:'tight',button:'pill'};
  rich.pages[0].sections.push(cta);
  rich.redirects=[{from:'/old-services/',to:'/contact/'}];
  rich.pages[1].navigation={label:'Свяжитесь с нами',hidden:false,parentId:'page-home'};
  rich.menu={style:'bold',sticky:true,mobile:'collapsible',
    ctaPageId:'page-contact',ctaLabel:'Получить консультацию'};
  rich.pages[0].sections[0].appearance={surface:'dark',spacing:'airy',align:'center',button:'solid'};
  const richCreated=await request('POST','/api/sites',{site:rich});
  assert.equal(richCreated.status,201,JSON.stringify(richCreated.body));
  assert.equal((await request('GET','/published/site-rich-ci/')).status,404);
  assert.equal((await request('POST','/api/sites/site-rich-ci/publish',{expectedRevision:1})).status,200);
  const richPublished=await request('GET','/published/site-rich-ci/');
  assert.equal(richPublished.status,200);
  assert.match(richPublished.body,/--cms-body-size:18px/);
  assert.match(richPublished.body,/--cms-line-height:1\.8/);
  assert.match(richPublished.body,/--cms-h2-size:clamp\(36px,4\.5vw,56px\)/);
  assert.match(richPublished.body,/--cms-button-bg:transparent/);
  assert.match(richPublished.body,/--cms-button-color:var\(--cms-primary\)/);
  assert.match(richPublished.body,/--cms-button-radius:12px/);
  assert.match(richPublished.body,/--cms-button-text:#fdfdfd/);
  assert.match(richPublished.body,/cms-button-solid/);
  assert.match(richPublished.body,/\.cms-button-solid>section \.action\{background:var\(--cms-primary\);color:var\(--cms-button-text\);box-shadow:none\}/);
  assert.match(richPublished.body,/Программирование шкафа управления/);
  assert.match(richPublished.body,/<details><summary>&lt;img src=x onerror=alert\(1\)&gt;<\/summary>/);
  assert.doesNotMatch(richPublished.body,/<img src=x onerror=/);
  assert.match(richPublished.body,/Подтверждённый отзыв тестового автора/);
  assert.match(richPublished.body,/class="cms-pricing"/);
  assert.match(richPublished.body,/Комплексный пакет/);
  assert.match(richPublished.body,/class="cms-pricing-card is-featured"/);
  assert.match(richPublished.body,/Вёрстка страниц/);
  assert.match(richPublished.body,/class="cms-process-list"/);
  assert.match(richPublished.body,/Согласование брифа/);
  assert.match(richPublished.body,/<table><caption>Сравнение вариантов<\/caption>/);
  assert.match(richPublished.body,/<th scope="row">&lt;img src=x onerror=alert\(1\)&gt;<\/th>/);
  assert.match(richPublished.body,/class="cms-switcher-radio"/);
  assert.match(richPublished.body,/type="radio"/);
  assert.match(richPublished.body,/Второй раздел/);
  assert.match(richPublished.body,/cms-width-narrow cms-heading-expressive cms-corners-round cms-mobile-align-center cms-mobile-spacing-tight cms-button-pill/);
  assert.match(richPublished.body,/class="cta-banner"/);
  assert.match(richPublished.body,/Готовы обсудить проект/);
  assert.match(richPublished.body,/class="cms-site-header cms-menu-bold cms-menu-sticky"/);
  assert.match(richPublished.body,/class="cms-nav-submenu"/);
  assert.match(richPublished.body,/Свяжитесь с нами/);
  assert.match(richPublished.body,/aria-label="Мобильная навигация"/);
  assert.match(richPublished.body,/Получить консультацию/);
  assert.match(richPublished.body,/href="\/published\/site-rich-ci\/contact\/"/);
  assert.doesNotMatch(richPublished.body,/<script/i,'No runtime JS required by menu');
  assert.match(richPublished.body,/href="\/published\/site-rich-ci\/contact\/"/);
  assert.match(richPublished.body,/background:var\(--cms-bg\)/);
  assert.match(richPublished.body,/class="cms-section-skin cms-surface-dark cms-spacing-airy cms-align-center cms-button-solid"/);
  assert.match(richPublished.body,/name="description" content="Страница теста услуг"/);
  assert.match(richPublished.body,/rel="canonical"/);
  assert.match(richPublished.body,/<html lang="pl">/);
  assert.match(richPublished.body,/property="og:locale" content="pl_PL"/);
  assert.match(richPublished.body,/property="og:title" content="Каталог для соцсетей"/);
  assert.match(richPublished.body,/property="og:description" content="Отдельное описание для публикаций"/);
  assert.match(richPublished.body,/name="twitter:title" content="Каталог для соцсетей"/);
  assert.match(richPublished.body,/name="twitter:card" content="summary"/);
  const redirect=await request('GET','/published/site-rich-ci/old-services/');
  assert.equal(redirect.status,301);
  assert.equal(redirect.headers.get('location'),'/published/site-rich-ci/contact/');
  assert.equal((await request('GET','/published/site-rich-ci/unregistered/')).status,404);
  const sitemap=await request('GET','/published/site-rich-ci/sitemap.xml');
  assert.equal(sitemap.status,200);
  assert.match(sitemap.headers.get('content-type'),/application\/xml/);
  assert.ok(sitemap.body.includes(origin+'/published/site-rich-ci/contact/'));
  assert.ok(!sitemap.body.includes(origin+'/published/site-rich-ci/</loc>'),'noindex home absent from XML sitemap');
  const robots=await request('GET','/published/site-rich-ci/robots.txt');
  assert.equal(robots.status,200);
  assert.match(robots.body,/Sitemap: http:\/\/127\.0\.0\.1:/);

  const brokenLive=structuredClone(rich);
  brokenLive.pages[0].sections.find(s=>s.component==='service-grid')
    .items[0].values['behavior.href']='/missing-target/';
  const brokenSaved=await request('POST','/api/sites/site-rich-ci/save',{expectedRevision:1,site:brokenLive});
  assert.equal(brokenSaved.status,200,'Editing a broken link is still allowed as a draft');
  const blocked=await request('POST','/api/sites/site-rich-ci/publish',{expectedRevision:2});
  assert.equal(blocked.status,422,'Publication must reject broken internal links');
  assert.match(blocked.body.error,/broken internal link/);
  assert.equal((await request('GET','/published/site-rich-ci/')).status,200,
    'Public site survives a rejected publish');
  const richRollback=await request('POST','/api/sites/site-rich-ci/restore',{expectedRevision:2,targetRevision:1});
  assert.equal(richRollback.status,200);
  const badRepeat=structuredClone(rich);
  badRepeat.pages[0].sections.find(s=>s.component==='photo-gallery').items[0].values['content.media']='asset-from-another-site';
  assert.equal((await request('POST','/api/sites/site-rich-ci/save',{expectedRevision:3,site:badRepeat})).status,422);
  const richExport=path.join(dbdir,'rich-static');
  const exp=spawnSync('php',['stage3/server/bin/export-published.php','site-rich-ci',richExport],
    {cwd:root,env:{...env,STAGE3_EXPORT_ORIGIN:'https://example.test'},encoding:'utf8'});
  assert.equal(exp.status,0,exp.stderr);
  const staticHtml=fs.readFileSync(path.join(richExport,'index.html'),'utf8');
  assert.match(staticHtml,/Программирование шкафа управления/);
  assert.match(staticHtml,/cms-pricing-grid/);
  assert.match(staticHtml,/cms-process-list/);
  assert.match(staticHtml,/cms-compare-scroll/);
  assert.match(staticHtml,/class="cms-switcher-radio"/);
  assert.match(staticHtml,/cms-switcher-panels/);
  assert.doesNotMatch(staticHtml,/<img src=x onerror=/);
  assert.doesNotMatch(staticHtml,/<script/i,'All four components work without JavaScript');
  assert.match(staticHtml,/cms-surface-dark cms-spacing-airy cms-align-center/);
  assert.match(staticHtml,/href="\/contact\/"/);
  assert.match(staticHtml,/rel="canonical" href="https:\/\/example.test\//);
  assert.match(fs.readFileSync(path.join(richExport,'sitemap.xml'),'utf8'),/https:\/\/example.test\/contact\//);
  assert.doesNotMatch(fs.readFileSync(path.join(richExport,'sitemap.xml'),'utf8'),/https:\/\/example.test\/<\/loc>/);
  assert.match(fs.readFileSync(path.join(richExport,'robots.txt'),'utf8'),/https:\/\/example.test\/sitemap.xml/);
  assert.match(fs.readFileSync(path.join(richExport,'old-services/index.html'),'utf8'),/noindex,follow/);
  assert.match(fs.readFileSync(path.join(richExport,'old-services/index.html'),'utf8'),/url=\/contact\//);

  assert.doesNotMatch(staticHtml,/\/published\/|\/api\//);

  // Full media lifecycle on the separate rich fixture: actual uploaded bytes,
  // media story, repeatable linked partner, lazy output and immutable visitor ETag.
  const attached=await request('POST','/api/sites/site-rich-ci/media',{
    base64:png64,alt:'Логотип производственного партнёра',expectedRevision:3
  });
  assert.equal(attached.status,201,JSON.stringify(attached.body));
  const picture=attached.body.asset;
  const richLive=structuredClone(attached.body.site);
  richLive.pages[0].seo.ogImage=picture.id;
  const story=csdk.sectionFrom(richDefs.find(m=>m.id==='media-story'),'section-media-story');
  story.elements.find(el=>el.slot==='photo').values['content.media']=picture.id;
  story.elements.find(el=>el.slot==='heading').values['content.text']='Наша история';
  const logos=csdk.sectionFrom(richDefs.find(m=>m.id==='partner-logos'),'section-partner-logos');
  logos.items[0].values['content.media']=picture.id;
  logos.items[0].values['content.caption']='Партнёр A';
  logos.items[0].values['behavior.href']='/contact/';
  const gallerySection=richLive.pages[0].sections.find(x=>x.component==='photo-gallery');
  gallerySection.items[0].values['content.media']=picture.id;
  // One real uploaded bitmap reused in three layout modes; no derivative
  // phantom files and no public JS requirement for any gallery.
  const adaptive=richLive.pages[0].sections.find(x=>x.component==='adaptive-gallery');
  adaptive.items[0].values['content.media']=picture.id;
  adaptive.items[0].values['content.caption']='<img src=x onerror=alert(1)>';
  adaptive.elements.find(x=>x.slot==='settings').values['behavior.layout']='grid';
  adaptive.items[0].values['behavior.featured']=true;
  const maker=richDefs.find(x=>x.id==='adaptive-gallery');
  const masonry=csdk.sectionFrom(maker,'section-adaptive-masonry');
  masonry.elements.find(x=>x.slot==='settings').values['behavior.layout']='masonry';
  masonry.items[0].values['content.media']=picture.id;
  masonry.items[0].values['content.caption']='Мозаика';
  const carousel=csdk.sectionFrom(maker,'section-adaptive-carousel');
  carousel.elements.find(x=>x.slot==='settings').values['behavior.layout']='carousel';
  carousel.items[0].values['content.media']=picture.id;
  carousel.items[1].values['content.media']=picture.id;
  carousel.items[0].values['content.caption']='Первый слайд';
  carousel.items[1].values['content.caption']='Второй слайд';
  richLive.pages[0].sections.push(masonry,carousel);
  richLive.pages[0].sections.push(story,logos);
  const graphSdk=require(path.join(root,'stage3/sdk/design-graph.cjs'));
  const graphSocial=structuredClone(richLive.pages[0]);
  graphSocial.id='page-graph-social';graphSocial.path='/graph-social/';graphSocial.title='Graph social preview';
  graphSocial.navigation={label:'Graph social preview',hidden:true};
  graphSocial.seo={title:'Graph image SEO',description:'Graph image social preview description',robots:'index',
    ogTitle:'',ogDescription:'',ogImage:''};
  const graphSection=csdk.sectionFrom(richDefs.find(m=>m.id==='company-hero'),'section-graph-social');
  for(const field of [...graphSection.elements,...(graphSection.items||[])])
    if(field.values&&Object.hasOwn(field.values,'content.media'))field.values['content.media']='';
  graphSection.designGraph=graphSdk.baseGraph(graphSection.id);
  // The PHP visitor renderer must honor the exact fluid typography rule
  // already exercised in the editor and typed JS contract.
  const richHeading=graphSection.designGraph.nodes[0].children[0];
  delete richHeading.styles.fontSize;
  richHeading.styles.fluidFont={min:30,max:72};
  graphSection.designGraph.nodes[0].children.push({
    id:'graph-social-image',type:'image',assetId:picture.id,alt:picture.alt,styles:{}
  });
  graphSocial.sections=[graphSection];richLive.pages.push(graphSocial);
  const invalidSocial=structuredClone(richLive);invalidSocial.pages[0].seo.ogImage='missing-social-image';
  assert.equal((await request('POST','/api/sites/site-rich-ci/save',{expectedRevision:4,site:invalidSocial})).status,422,
    'Server contract rejects an unowned social preview image');
  assert.equal((await request('POST','/api/sites/site-rich-ci/save',{expectedRevision:4,site:richLive})).status,200);
  assert.equal((await request('POST','/api/sites/site-rich-ci/publish',{expectedRevision:5})).status,200);
  const richVisitor=(await request('GET','/published/site-rich-ci/')).body;
  const graphSocialVisitor=await request('GET','/published/site-rich-ci/graph-social/');
  assert.equal(graphSocialVisitor.status,200,'Graph-only image page publishes normally');
  assert.match(graphSocialVisitor.body,/font-size:clamp\(30px,calc\(4\.7727vw \+ 14\.7273px\),72px\)/,
    'Real PHP publication must match browser fluid typography interpolation');
  assert.ok(graphSocialVisitor.body.includes('<meta property="og:image" content="'+origin+'/published/site-rich-ci/assets/'+picture.id+'.png">'),
    'Automatic Open Graph fallback must find nested Design Graph images');
  assert.ok(graphSocialVisitor.body.includes('<meta name="twitter:image" content="'+origin+'/published/site-rich-ci/assets/'+picture.id+'.png">'),
    'Twitter card must use the same Design Graph image as Open Graph');
  assert.match(richVisitor,/Наша история/);
  assert.match(richVisitor,/Партнёр A/);
  assert.match(richVisitor,/class="story-photo"/);
  assert.match(richVisitor,/class="partner-logo"/);
  assert.match(richVisitor,/cms-gallery-grid cms-gallery-fit-cover/);
  assert.match(richVisitor,/cms-gallery-masonry cms-gallery-fit-cover/);
  assert.match(richVisitor,/cms-gallery-carousel cms-gallery-fit-cover/);
  assert.match(richVisitor,/aria-roledescription="carousel"/);
  assert.match(richVisitor,/scroll-snap-type:x mandatory/);
  assert.match(richVisitor,/cms-gallery-featured/);
  assert.match(richVisitor,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(richVisitor,/<img src=x onerror=/);
  assert.match(richVisitor,/Второй слайд/);
  assert.match(richVisitor,/loading="lazy"/);
  assert.match(richVisitor,new RegExp(picture.id+'.png'));
  assert.ok(richVisitor.includes('<meta property="og:image" content="'+origin+'/published/site-rich-ci/assets/'+picture.id+'.png">'));
  assert.ok(richVisitor.includes('<meta name="twitter:image" content="'+origin+'/published/site-rich-ci/assets/'+picture.id+'.png">'));
  assert.match(richVisitor,/property="og:image:alt" content="Логотип производственного партнёра"/);
  assert.match(richVisitor,/name="twitter:image:alt" content="Логотип производственного партнёра"/);
  assert.match(richVisitor,/href="\/published\/site-rich-ci\/contact\/"/);
  const imgRoute='/published/site-rich-ci/assets/'+picture.id+'.png';
  const imgResponse=await request('GET',imgRoute);
  assert.equal(imgResponse.status,200);
  const immutableTag=imgResponse.headers.get('etag');
  assert.match(immutableTag,/^"[a-f0-9]{64}"$/);
  assert.match(imgResponse.headers.get('cache-control'),/immutable/);
  const unchanged=await request('GET',imgRoute,undefined,{'if-none-match':immutableTag});
  assert.equal(unchanged.status,304);
  const renamed=structuredClone(richLive);
  renamed.assets[0].alt='Новый alt без изменения двоичных данных';
  assert.equal((await request('POST','/api/sites/site-rich-ci/save',{expectedRevision:5,site:renamed})).status,200);
  assert.match((await request('GET','/published/site-rich-ci/')).body,/Логотип производственного партнёра/,
    'Unpublished alt edits must not leak into immutable visitor pages');
  const released=await request('POST','/api/sites/site-rich-ci/publish',{expectedRevision:6});
  assert.equal(released.status,200);
  assert.match((await request('GET','/published/site-rich-ci/')).body,/Новый alt без изменения двоичных данных/);
  // Real pixel dimensions and SHA256: publish binary 360/720/1200 variants,
  // export them, keep them through archive restore and reject forged checksums.
  const {deflateSync}=require('node:zlib');
  const crypto=require('node:crypto');
  function solidPng(width,height){
    const stride=width*3+1,raw=Buffer.alloc(stride*height);
    for(let y=0;y<height;y++){
      const off=y*stride;raw[off]=0;
      for(let x=0;x<width;x++){raw[off+1+x*3]=45;raw[off+2+x*3]=108;raw[off+3+x*3]=185;}
    }
    function crc(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let n=0;n<8;n++)c=c&1?(c>>>1)^0xedb88320:c>>>1;}return (c^0xffffffff)>>>0;}
    function chunk(type,data){const t=Buffer.from(type),length=Buffer.alloc(4),hash=Buffer.alloc(4);
      length.writeUInt32BE(data.length);hash.writeUInt32BE(crc(Buffer.concat([t,data])));
      return Buffer.concat([length,t,data,hash]);}
    const head=Buffer.alloc(13);head.writeUInt32BE(width,0);head.writeUInt32BE(height,4);
    head[8]=8;head[9]=2;
    return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),
      chunk('IHDR',head),chunk('IDAT',deflateSync(raw,{level:6})),chunk('IEND',Buffer.alloc(0))]);
  }
  const hash=buf=>crypto.createHash('sha256').update(buf).digest('hex');
  const original=solidPng(1440,960);
  const variants=[360,720,1200].map(width=>{
    const bytes=solidPng(width,width*2/3);
    return {width,bytes,base64:bytes.toString('base64'),sha256:hash(bytes)};
  });
  const responsiveEndpoint='/api/sites/site-rich-ci';
  const input={base64:original.toString('base64'),alt:'Физические версии изображения',
    sha256:hash(original),expectedRevision:6,
    variants:variants.map(({width,base64,sha256})=>({width,base64,sha256}))};
  const corrupted=structuredClone(input);corrupted.variants[1].sha256='0'.repeat(64);
  assert.equal((await request('POST',responsiveEndpoint+'/media',corrupted)).status,422);
  const responsiveUpload=await request('POST',responsiveEndpoint+'/media',input);
  assert.equal(responsiveUpload.status,201,JSON.stringify(responsiveUpload.body));
  assert.equal(responsiveUpload.body.revision,7);
  const responsiveAsset=responsiveUpload.body.asset;
  assert.equal(responsiveAsset.width,1440);
  assert.equal(responsiveAsset.height,960);
  assert.deepEqual(responsiveAsset.variants.map(v=>v.width),[360,720,1200]);
  assert.deepEqual(responsiveAsset.variants.map(v=>v.sha256),variants.map(v=>v.sha256));
  assert.equal((await request('POST',responsiveEndpoint+'/media',input)).status,409,'stale batch cannot write');
  const forgedDimensions=structuredClone(responsiveUpload.body.site);
  forgedDimensions.assets.find(a=>a.id===responsiveAsset.id).width=1199;
  assert.equal((await request('POST',responsiveEndpoint+'/save',
    {site:forgedDimensions,expectedRevision:7})).status,422,
    'Stored image bytes, not editable metadata, own the intrinsic dimensions');
  const newDoc=structuredClone(responsiveUpload.body.site);
  newDoc.pages[0].sections.find(sec=>sec.component==='adaptive-gallery').items[0].values['content.media']=responsiveAsset.id;
  assert.equal((await request('POST',responsiveEndpoint+'/save',{site:newDoc,expectedRevision:7})).status,200);
  assert.equal((await request('GET','/published/site-rich-ci/')).body.includes(responsiveAsset.id),false);
  assert.equal((await request('POST',responsiveEndpoint+'/publish',{expectedRevision:8})).status,200);
  const responsiveHTML=(await request('GET','/published/site-rich-ci/')).body;
  assert.match(responsiveHTML,/srcset="[^"]+ 360w,[^"]+ 720w,[^"]+ 1200w,[^"]+ 1440w"/);
  assert.match(responsiveHTML,/sizes="\(max-width: 600px\) 100vw/);
  assert.match(responsiveHTML,/<img[^>]*width="1440" height="960"/,
    'Published responsive images reserve intrinsic layout space');
  const socialExport=path.join(dbdir,'rich-static-social');
  const socialExportResult=spawnSync('php',['stage3/server/bin/export-published.php','site-rich-ci',socialExport],
    {cwd:root,env:{...env,STAGE3_EXPORT_ORIGIN:'https://example.test'},encoding:'utf8'});
  assert.equal(socialExportResult.status,0,socialExportResult.stderr);
  const socialStatic=fs.readFileSync(path.join(socialExport,'index.html'),'utf8');
  assert.match(socialStatic,/<html lang="pl">/);
  assert.ok(socialStatic.includes('<meta property="og:image" content="https://example.test/assets/'+picture.id+'.png">'));
  assert.ok(socialStatic.includes('<meta name="twitter:image" content="https://example.test/assets/'+picture.id+'.png">'));
  assert.match(fs.readFileSync(path.join(socialExport,'old-services/index.html'),'utf8'),/<html lang="pl">/);
  for(let n=0;n<3;n++){
    const variant=responsiveAsset.variants[n];
    const url='/published/site-rich-ci'+variant.src;
    const resource=await fetch(origin+url);
    assert.equal(resource.status,200);
    assert.equal(resource.headers.get('etag'),'"'+variant.sha256+'"');
    assert.deepEqual(Buffer.from(await resource.arrayBuffer()),variants[n].bytes);
    const privateVariant=await fetch(origin+responsiveEndpoint+'/media/'+variant.id,{headers:{cookie}});
    assert.equal(privateVariant.status,200);
  }
  const responsiveArchive=(await request('GET',responsiveEndpoint+'/backup')).body;
  assert.equal(responsiveArchive.payload.media.length,5);
  const copyId='site-responsive-copy';
  const plan=await request('POST','/api/backups/plan',{archive:responsiveArchive,targetSiteId:copyId});
  assert.equal(plan.status,200,JSON.stringify(plan.body));
  const responsiveRestored=await request('POST','/api/backups/restore',
    {archive:responsiveArchive,targetSiteId:copyId,confirmationToken:plan.body.confirmationToken});
  assert.equal(responsiveRestored.status,201,JSON.stringify(responsiveRestored.body));
  assert.equal(responsiveRestored.body.site.assets.find(a=>a.id===responsiveAsset.id).variants.length,3);
  assert.equal((await request('GET','/published/'+copyId+'/')).status,404,'restore does not publish');
  const staticResponsive=path.join(dbdir,'responsive-export');
  const outcome=spawnSync('php',['stage3/server/bin/export-published.php','site-rich-ci',staticResponsive],
    {cwd:root,env,encoding:'utf8'});
  assert.equal(outcome.status,0,outcome.stderr);
  const releaseJSON=JSON.parse(fs.readFileSync(path.join(staticResponsive,'release-manifest.json'),'utf8'));
  assert.equal(releaseJSON.assets.length,5);
  const staticPage=fs.readFileSync(path.join(staticResponsive,'index.html'),'utf8');
  assert.match(staticPage,/srcset="\/assets\/[^"]+ 360w,[^"]+ 720w,[^"]+ 1200w,[^"]+ 1440w"/);
  assert.match(staticPage,/<img[^>]*width="1440" height="960"/,
    'Static release retains intrinsic image dimensions');
  for(let n=0;n<3;n++){
    const rendition=releaseJSON.assets.find(a=>a.id===responsiveAsset.variants[n].id);
    assert.equal(rendition.parentId,responsiveAsset.id);
    assert.equal(rendition.sha256,variants[n].sha256);
    assert.deepEqual(fs.readFileSync(path.join(staticResponsive,rendition.file)),variants[n].bytes);
  }
  // A native CMS design graph: AI composition stays editable and has byte-for-byte
  // equivalent safe HTML/CSS on PHP visitor and statically exported release.
  const designSdk=require(path.join(root,'stage3/sdk/design-graph.cjs'));
  const designEndpoint='/api/sites/site-rich-ci';
  const graphDraft=await request('GET',designEndpoint);
  const designDoc=structuredClone(graphDraft.body.site);
  const designSec=designDoc.pages[0].sections.find(x=>x.component==='adaptive-gallery');
  designDoc.designTokens=structuredClone(designSdk.DEFAULT_TOKENS);
  designDoc.designTokens.colors.accent='#bb6633';
  const designGraph=designSdk.baseGraph(designSec.id);
  designGraph.nodes[0].styles.background='@background';
  designGraph.nodes[0].styles.gradient={angle:135,from:'@accent',to:'#ffffff'};
  designGraph.nodes[0].styles.paddingX='@large';
  designGraph.nodes[0].styles.rowGap='@small';
  designGraph.nodes[0].styles.shadow='medium';
  designGraph.nodes[0].styles.alignContent='between';
  designGraph.nodes[0].styles.gridAutoFlow='row-dense';
  designGraph.nodes[0].styles.widthPx=900;
  designGraph.nodes[0].styles.position='relative';
  designGraph.nodes[0].styles.zIndex=3;
  designGraph.nodes[0].styles.right='@small';
  designGraph.nodes[0].styles.gradient.via='#abcdef';
  designGraph.nodes[0].styles.gradient.viaAt=55;
  designGraph.nodes[0].responsive.tablet={gridColumnsPreset:'sidebar-right',translateY:-24};
  designGraph.nodes[0].responsive.mobile={columns:1,paddingX:'@small',flexWrap:'wrap',translateY:0};
  designGraph.nodes[0].children[0].styles.fontFamily='georgia';
  designGraph.nodes[0].children[0].styles.letterSpacing=-12;
  Object.assign(designGraph.nodes[0].children[0].styles,{
    fontStyle:'italic',textTransform:'uppercase',textWrap:'balance',
    textShadow:'strong',wordSpacing:-6,gridColumnStart:2,
    translateX:12,translateY:-8,rotateDeg:-4,scalePercent:104,
    transformOrigin:'top-left'});
  Object.assign(designGraph.nodes[0].styles,{
    isolation:'isolate',clipShape:'diagonal',backdropBlur:4,
    borderTopLeftRadius:'@soft'});
  designGraph.nodes[0].children[0].motion={effect:'fade-up',duration:600,delay:150};
  designGraph.nodes[0].children[0].text='Архитектурная композиция & сетка';
  designGraph.nodes[0].children[0].states={hover:{color:'@accent'},focus:{opacity:80,outlineColor:'@accent',outlineWidth:2}};
  designGraph.nodes[0].children.push({
    id:designSec.id+'-photo',type:'image',assetId:responsiveAsset.id,
    alt:'Промышленный цех',styles:{maxWidth:720,objectFit:'cover',objectPositionX:20,objectPositionY:65},
    responsive:{mobile:{objectPositionX:75}}});
  designGraph.nodes[0].children.push({
    id:designSec.id+'-shield',type:'icon',icon:'shield',
    alt:'Защищённый дизайн',styles:{fontSize:32,color:'@accent'}});
  designGraph.nodes[0].children.push({
    id:designSec.id+'-action',type:'button',text:'Подробнее',href:'/contact/',
    styles:{background:'@accent',color:'@background',padding:'@small',radius:'@soft'},
    states:{hover:{opacity:85}}});
  designGraph.nodes[0].children.push({
    id:designSec.id+'-group',type:'container',
    styles:{display:'grid',columns:1,gap:12},
    responsive:{mobile:{padding:12}},
    children:[
      {id:designSec.id+'-group-text',type:'text',
        text:'Редактируемая группа & вложенность',styles:{color:'@foreground'}},
      {id:designSec.id+'-group-link',type:'button',
        text:'Связаться',href:'/contact/',styles:{radius:'@soft'}}
    ]
  });
  const copiedGraph=designSdk.editTree(designGraph,{
    action:'duplicate',nodeId:designSec.id+'-group',
    ids:[designSec.id+'-group-copy',designSec.id+'-group-text-copy',designSec.id+'-group-link-copy']
  });
  const nestedGraph=designSdk.editTree(copiedGraph,{
    action:'move',nodeId:designSec.id+'-action',
    targetId:designSec.id+'-group-copy',placement:'inside'
  });
  designSec.designGraph=nestedGraph;
  const injectedDesign=structuredClone(designDoc);
  injectedDesign.pages[0].sections.find(s=>s.id===designSec.id).designGraph.nodes[0].styles.background='url(javascript:alert(1))';
  assert.equal((await request('POST',designEndpoint+'/save',{expectedRevision:graphDraft.body.revision,
    site:injectedDesign})).status,422,'Unsafe CSS cannot be saved');
  const badIcon=structuredClone(designDoc);
  badIcon.pages[0].sections.find(s=>s.id===designSec.id).designGraph.nodes[0]
    .children.find(n=>n.type==='icon').icon='foreign-inline-svg';
  assert.equal((await request('POST',designEndpoint+'/save',{expectedRevision:graphDraft.body.revision,
    site:badIcon})).status,422,'Foreign inline SVG cannot be saved');
  const badMotion=structuredClone(designDoc);
  badMotion.pages[0].sections.find(s=>s.id===designSec.id).designGraph.nodes[0]
    .children[0].motion.effect='custom-js-effect';
  assert.equal((await request('POST',designEndpoint+'/save',{expectedRevision:graphDraft.body.revision,
    site:badMotion})).status,422,'Unknown motion is rejected by PHP');
  const staged=await request('POST',designEndpoint+'/save',{expectedRevision:graphDraft.body.revision,site:designDoc});
  assert.equal(staged.status,200,JSON.stringify(staged.body));
  assert.doesNotMatch((await request('GET','/published/site-rich-ci/')).body,/Архитектурная композиция/,
    'No implicit publishing of graph edits');
  const live=await request('POST',designEndpoint+'/publish',{expectedRevision:staged.body.revision});
  assert.equal(live.status,200,JSON.stringify(live.body));
  const htmlDesign=(await request('GET','/published/site-rich-ci/')).body;
  assert.match(htmlDesign,/Архитектурная композиция &amp; сетка/);
  assert.match(htmlDesign,/cmsdg-/);
  assert.match(htmlDesign,/Редактируемая группа &amp; вложенность/);
  assert.match(htmlDesign,new RegExp('cmsdg-n-'+designSec.id+'-group-copy'));
  assert.match(htmlDesign,new RegExp('cmsdg-n-'+designSec.id+'-group-link-copy'));
  assert.match(htmlDesign,new RegExp('cmsdg-n-'+designSec.id+'-action'));

  assert.match(htmlDesign,/linear-gradient\(135deg,#bb6633,#abcdef 55%,#ffffff\)/);
  assert.match(htmlDesign,/font-family:Georgia,serif/);
  assert.match(htmlDesign,/row-gap:12px/);
  for(const property of ['align-content:space-between','grid-auto-flow:row dense','width:900px',
    'z-index:3','right:12px','outline-width:2px','--cmsdg-object-x:20%',
    'object-position:var(--cmsdg-object-x,50%) var(--cmsdg-object-y,50%)'])
    assert.ok(htmlDesign.includes(property),property+' should publish with PHP');
  assert.match(htmlDesign,/padding-inline:48px/);
  for(const css of ['font-style:italic','text-transform:uppercase','text-wrap:balance',
    'text-shadow:0 4px 18px #10182080','word-spacing:-0.6px','grid-column-start:2',
    'rotate:-4deg','scale:1.04','transform-origin:top-left',
    'grid-template-columns:minmax(0,2fr) minmax(0,1fr)',
    '--cmsdg-tx:12px','--cmsdg-ty:-8px','clip-path:polygon(0 0,100% 0,100% 90%,0 100%)',
    'backdrop-filter:blur(4px)','border-top-left-radius:12px'])
    assert.ok(htmlDesign.includes(css),'Server renderer editorial CSS: '+css);
  assert.match(htmlDesign,/animation:cmsdg-fade-up 600ms ease-out 150ms both/);
  assert.match(htmlDesign,/prefers-reduced-motion:reduce/);
  assert.match(htmlDesign,/role="img" aria-label="Защищённый дизайн"/);
  assert.match(htmlDesign,/<svg[^>]+viewBox="0 0 24 24"/);
  assert.match(htmlDesign,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(htmlDesign,/@media\(max-width:600px\)/);
  assert.match(htmlDesign,/:hover\{opacity:0.85\}/);
  assert.match(htmlDesign,/srcset="[^"]+ 360w,[^"]+ 720w,[^"]+ 1200w,[^"]+ 1440w"/);
  assert.match(htmlDesign,new RegExp('id="'+designSec.id+'"'));
  assert.ok(htmlDesign.includes('class="cmsdg-n-'+designSec.id+'-action" href="/published/site-rich-ci/contact/"'),
    'Graph internal links follow the PHP publication prefix');
  assert.doesNotMatch(htmlDesign,/<script\b|<img[^>]+onerror=/);
  const staticDesign=path.join(dbdir,'static-ai-composition');
  const compiledDesign=spawnSync('php',['stage3/server/bin/export-published.php','site-rich-ci',staticDesign],
    {cwd:root,env,encoding:'utf8'});
  assert.equal(compiledDesign.status,0,compiledDesign.stderr);
  const htmlStatic=fs.readFileSync(path.join(staticDesign,'index.html'),'utf8');
  assert.match(htmlStatic,/Архитектурная композиция &amp; сетка/);
  assert.match(htmlStatic,/cmsdg-/);
  assert.match(htmlStatic,/Редактируемая группа &amp; вложенность/);
  assert.match(htmlStatic,new RegExp('cmsdg-n-'+designSec.id+'-group-copy'));
  assert.match(htmlStatic,new RegExp('cmsdg-n-'+designSec.id+'-group-link-copy'));

  assert.match(htmlStatic,/linear-gradient\(135deg,#bb6633,#abcdef 55%,#ffffff\)/);
  assert.match(htmlStatic,/font-family:Georgia,serif/);
  for(const property of ['align-content:space-between','grid-auto-flow:row dense','width:900px',
    'z-index:3','right:12px','outline-width:2px','--cmsdg-object-x:20%'])
    assert.ok(htmlStatic.includes(property),property+' should survive static export');
  for(const css of ['font-style:italic','text-transform:uppercase','text-wrap:balance',
    'rotate:-4deg','scale:1.04','--cmsdg-tx:12px','--cmsdg-ty:-8px',
    'grid-template-columns:minmax(0,2fr) minmax(0,1fr)','backdrop-filter:blur(4px)'])
    assert.ok(htmlStatic.includes(css),'Static exporter editorial CSS: '+css);
  assert.match(htmlStatic,/animation:cmsdg-fade-up 600ms ease-out 150ms both/);
  assert.match(htmlStatic,/role="img" aria-label="Защищённый дизайн"/);
  assert.match(htmlStatic,/prefers-reduced-motion:reduce/);
  assert.ok(htmlStatic.includes('class="cmsdg-n-'+designSec.id+'-action" href="/contact/"'),
    'Graph links are root-relative only in standalone static export');
  assert.match(htmlStatic,/srcset="[^"]+ 360w,[^"]+ 720w,[^"]+ 1200w,[^"]+ 1440w"/);
  assert.doesNotMatch(htmlStatic,/\/published\/|\/api\/|<script/i);
  const designArchive=(await request('GET',designEndpoint+'/backup')).body;
  const designCopy='site-design-archive';
  const designPlan=await request('POST','/api/backups/plan',{archive:designArchive,targetSiteId:designCopy});
  assert.equal(designPlan.status,200,JSON.stringify(designPlan.body));
  const designRecovered=await request('POST','/api/backups/restore',{archive:designArchive,
    targetSiteId:designCopy,confirmationToken:designPlan.body.confirmationToken});
  assert.equal(designRecovered.status,201,JSON.stringify(designRecovered.body));
  assert.deepEqual(designRecovered.body.site.pages[0].sections.find(s=>s.id===designSec.id).designGraph,
    designSec.designGraph,'Design Graph survives private backup restore unchanged');
  assert.equal((await request('GET','/published/'+designCopy+'/')).status,404,'Imported design not auto-published');

  // Complete local MP4 workflow: persisted bytes, SHA256, explicit publish,
  // native browser source, byte ranges, static export, archive and restoration.
  const videoBytes=Buffer.from(fs.readFileSync(path.join(root,'stage3/tests/fixtures/tiny-h264.mp4.b64'),'utf8').trim(),'base64');
  const videoHash=require('node:crypto').createHash('sha256').update(videoBytes).digest('hex');
  assert.equal(videoHash,'3febfe3799904e7bc177abc47f95b5abad5e54bf5d039603b9fcbfd9538bbfcf','Real encoded MP4 fixture must be unchanged');
  const draftBeforeVideo=await request('GET',designEndpoint);
  assert.equal((await request('POST',designEndpoint+'/video',{base64:'bm90IGEgdmlkZW8=',alt:'Ошибка',
    sha256:videoHash,expectedRevision:draftBeforeVideo.body.revision})).status,422,
    'Non-MP4 payload must not enter storage');
  const uploadedVideo=await request('POST',designEndpoint+'/video',{base64:videoBytes.toString('base64'),
    alt:'Короткое видео испытания',sha256:videoHash,expectedRevision:draftBeforeVideo.body.revision});
  assert.equal(uploadedVideo.status,201,JSON.stringify(uploadedVideo.body));
  assert.equal(uploadedVideo.body.sha256,videoHash);
  const videoAsset=uploadedVideo.body.asset;
  assert.equal(videoAsset.mime,'video/mp4');
  assert.equal(videoAsset.src,'/assets/'+videoAsset.id+'.mp4');
  const vidPrivate=await request('GET',designEndpoint+'/media/'+videoAsset.id);
  assert.equal(vidPrivate.status,200);
  assert.equal(vidPrivate.headers.get('content-type'),'video/mp4');
  assert.equal(Buffer.from(await (await fetch(origin+designEndpoint+'/media/'+videoAsset.id,{
    headers:{cookie}})).arrayBuffer()).toString('hex'),videoBytes.toString('hex'));
  assert.equal((await request('GET','/published/site-rich-ci/assets/'+videoAsset.id+'.mp4')).status,404,
    'Unpublished video must not be accessible to visitors');
  const videoDocument=structuredClone(uploadedVideo.body.site);
  const videoSection=videoDocument.pages[0].sections.find(x=>x.id===designSec.id);
  videoSection.designGraph.nodes[0].children.push({
    id:designSec.id+'-film',type:'video',assetId:videoAsset.id,
    posterAssetId:responsiveAsset.id,alt:'Видеопрезентация производства',
    loop:false,styles:{widthPercent:100,aspectRatio:'wide'}});
  const stagedVideo=await request('POST',designEndpoint+'/save',{
    expectedRevision:uploadedVideo.body.revision,site:videoDocument});
  assert.equal(stagedVideo.status,200,JSON.stringify(stagedVideo.body));
  assert.doesNotMatch((await request('GET','/published/site-rich-ci/')).body,/<video class="cmsdg-/);
  assert.equal((await request('POST',designEndpoint+'/publish',{expectedRevision:stagedVideo.body.revision})).status,200);
  const publishedVideo=(await request('GET','/published/site-rich-ci/')).body;
  assert.match(publishedVideo,/<video[^>]* controls playsinline preload="metadata"[^>]*aria-label="Видеопрезентация производства"/);
  assert.match(publishedVideo,new RegExp('src="/published/site-rich-ci/assets/'+videoAsset.id+'[.]mp4" type="video/mp4"'));
  const baseVideo='/published/site-rich-ci/assets/'+videoAsset.id+'.mp4';
  const allVideo=await fetch(origin+baseVideo);
  assert.equal(allVideo.status,200);
  assert.equal(allVideo.headers.get('content-type'),'video/mp4');
  assert.equal(allVideo.headers.get('x-content-type-options'),'nosniff');
  assert.equal(allVideo.headers.get('etag'),'"'+videoHash+'"');
  assert.equal(Buffer.from(await allVideo.arrayBuffer()).toString('hex'),videoBytes.toString('hex'));
  const rangedVideo=await fetch(origin+baseVideo,{headers:{Range:'bytes=0-15'}});
  assert.equal(rangedVideo.status,206);
  assert.equal(rangedVideo.headers.get('content-range'),'bytes 0-15/'+videoBytes.length);
  assert.equal(Buffer.from(await rangedVideo.arrayBuffer()).toString('hex'),videoBytes.subarray(0,16).toString('hex'));
  const invalidRange=await fetch(origin+baseVideo,{headers:{Range:'bytes=999999-'}});
  assert.equal(invalidRange.status,416);
  const videoOut=path.join(dbdir,'static-video-ci');
  const videoExport=spawnSync('php',['stage3/server/bin/export-published.php','site-rich-ci',videoOut],
    {cwd:root,env,encoding:'utf8'});
  assert.equal(videoExport.status,0,videoExport.stderr);
  assert.equal(fs.readFileSync(path.join(videoOut,'assets',videoAsset.id+'.mp4')).toString('hex'),
    videoBytes.toString('hex'));
  const staticVideoHtml=fs.readFileSync(path.join(videoOut,'index.html'),'utf8');
  assert.match(staticVideoHtml,new RegExp('src="/assets/'+videoAsset.id+'[.]mp4" type="video/mp4"'));
  const videoBackup=(await request('GET',designEndpoint+'/backup')).body;
  const archiveWithVideo=await request('POST','/api/backups/plan',{
    archive:videoBackup,targetSiteId:'site-video-archive'});
  assert.equal(archiveWithVideo.status,200,JSON.stringify(archiveWithVideo.body));
  const restoredVideo=await request('POST','/api/backups/restore',{
    archive:videoBackup,targetSiteId:'site-video-archive',
    confirmationToken:archiveWithVideo.body.confirmationToken});
  assert.equal(restoredVideo.status,201,JSON.stringify(restoredVideo.body));
  assert.equal(restoredVideo.body.site.assets.find(a=>a.id===videoAsset.id).mime,'video/mp4');
  assert.equal((await request('GET','/published/site-video-archive/assets/'+videoAsset.id+'.mp4')).status,404);

  // Medium-sized playable MP4 with a legal top-level free atom forces multiple
  // bounded, independently SHA256-checked requests (no enormous JSON body).
  const free=Buffer.alloc(2097152);
  free.writeUInt32BE(free.length,0);free.write('free',4,'ascii');
  const bigger=Buffer.concat([videoBytes,free]);
  const digest=v=>require('node:crypto').createHash('sha256').update(v).digest('hex');
  const base='/api/sites/site-rich-ci/video-uploads/';
  const current=await request('GET',designEndpoint);
  const count=Math.ceil(bigger.length/524288);
  const start={expectedRevision:current.body.revision,alt:'Крупный MP4 для сайта',
    bytes:bigger.length,chunks:count,sha256:digest(bigger)};
  assert.equal((await request('POST',base+'start',start,{'x-csrf-token':'wrong'})).status,403);
  const started=await request('POST',base+'start',start);
  assert.equal(started.status,201,JSON.stringify(started.body));
  assert.equal(started.body.chunkBytes,524288);
  const upload=base+started.body.uploadId;
  assert.equal((await request('POST',upload+'/finish',{})).status,409,'Incomplete MP4 must not commit');
  assert.equal((await request('POST','/api/sites/site-unrelated/video-uploads/'+started.body.uploadId+'/finish',{})).status,404);
  const parts=Array.from({length:count},(_,i)=>bigger.subarray(i*524288,Math.min((i+1)*524288,bigger.length)));
  const firstPart={index:0,base64:parts[0].toString('base64'),sha256:digest(parts[0])};
  assert.equal((await request('POST',upload+'/chunk',{...firstPart,sha256:'0'.repeat(64)})).status,422,
    'Chunk SHA256 tampering denied');
  assert.equal((await request('POST',upload+'/chunk',firstPart)).status,200);
  const repeated=await request('POST',upload+'/chunk',firstPart);
  assert.equal(repeated.status,200);assert.equal(repeated.body.duplicate,true,'Safe retry is idempotent');
  for(let i=1;i<count;i++){
    const chunk=await request('POST',upload+'/chunk',{index:i,base64:parts[i].toString('base64'),sha256:digest(parts[i])});
    assert.equal(chunk.status,200,JSON.stringify(chunk.body));
  }
  assert.equal((await request('GET',designEndpoint)).body.revision,current.body.revision,
    'Staged video chunks must not modify draft revision');
  const finished=await request('POST',upload+'/finish',{});
  assert.equal(finished.status,201,JSON.stringify(finished.body));
  assert.equal(finished.body.sha256,digest(bigger));
  assert.equal(finished.body.revision,current.body.revision+1);
  assert.equal((await request('POST',upload+'/finish',{})).status,404,
    'Completed upload session cannot be reused');
  assert.equal((await request('GET','/published/site-rich-ci/assets/'+finished.body.asset.id+'.mp4')).status,404,
    'Large unpublished media is private');
  assert.equal((await request('POST',designEndpoint+'/publish',{expectedRevision:finished.body.revision})).status,200);
  const largePublic=await fetch(origin+'/published/site-rich-ci/assets/'+finished.body.asset.id+'.mp4',
    {headers:{Range:'bytes=524288-524303'}});
  assert.equal(largePublic.status,206);
  assert.equal(Buffer.from(await largePublic.arrayBuffer()).toString('hex'),
    bigger.subarray(524288,524304).toString('hex'));
  const badHeader=await fetch(origin+'/published/site-rich-ci/assets/'+finished.body.asset.id+'.mp4',
    {headers:{Range:'bytes=1-2,4-5'}});
  assert.equal(badHeader.status,416,'Multiple ranges are denied rather than misparsed');
  const sizeOverflow=await request('POST',base+'start',
    {...start,bytes:16777217,chunks:Math.ceil(16777217/524288)});
  assert.equal(sizeOverflow.status,422,'Oversized video refused before staging');


  // Full URL rename flow through the same validated SDK used by Studio.
  const urlSite=structuredClone(fixture);urlSite.siteId='site-url-ci';
  const urlCreated=await request('POST','/api/sites',{site:urlSite});
  assert.equal(urlCreated.status,201,JSON.stringify(urlCreated.body));
  assert.equal((await request('POST','/api/sites/site-url-ci/publish',{expectedRevision:1})).status,200);
  assert.equal((await request('GET','/published/site-url-ci/contact/')).status,200);
  const Draft=require(path.join(root,'stage3/sdk/draft.cjs'));
  let urlDraft=Draft.begin(urlSite,richDefs);
  urlDraft=Draft.structure(urlDraft,richDefs,{action:'updatePage',pageId:'page-contact',
    title:'Свяжитесь с нами',path:'/get-in-touch/',expectedRevision:urlDraft.revision});
  const renamedSite=urlDraft.current;
  assert.deepEqual(renamedSite.redirects,[{from:'/contact/',to:'/get-in-touch/'}]);
  assert.equal(renamedSite.pages[0].sections[0].elements.find(e=>e.values['behavior.href'])
    .values['behavior.href'],'/get-in-touch/');
  const savedUrl=await request('POST','/api/sites/site-url-ci/save',{expectedRevision:1,site:renamedSite});
  assert.equal(savedUrl.status,200);assert.equal(savedUrl.body.revision,2);
  assert.equal((await request('GET','/published/site-url-ci/contact/')).status,200,
    'Saved URL changes do not mutate the previous published snapshot');
  assert.equal((await request('GET','/published/site-url-ci/get-in-touch/')).status,404,
    'New URL remains private until explicit publish');
  assert.equal((await request('POST','/api/sites/site-url-ci/publish',{expectedRevision:2})).body.version,2);
  const renamedPublic=await request('GET','/published/site-url-ci/get-in-touch/');
  assert.equal(renamedPublic.status,200);
  assert.match(renamedPublic.body,/rel="canonical" href="http:\/\/127\.0\.0\.1:[0-9]+\/published\/site-url-ci\/get-in-touch\/"/);
  assert.match((await request('GET','/published/site-url-ci/')).body,/href="\/published\/site-url-ci\/get-in-touch\/"/);
  const oldUrl=await request('GET','/published/site-url-ci/contact/');
  assert.equal(oldUrl.status,301);assert.equal(oldUrl.headers.get('location'),'/published/site-url-ci/get-in-touch/');
  const renamedSitemap=await request('GET','/published/site-url-ci/sitemap.xml');
  assert.equal(renamedSitemap.status,200);
  assert.ok(renamedSitemap.body.includes(origin+'/published/site-url-ci/get-in-touch/'));
  assert.ok(!renamedSitemap.body.includes(origin+'/published/site-url-ci/contact/'));
  assert.ok((await request('GET','/published/site-url-ci/robots.txt')).body.includes(
    'Sitemap: '+origin+'/published/site-url-ci/sitemap.xml'));
  const urlOut=path.join(dbdir,'url-static');
  const urlExport=spawnSync('php',['stage3/server/bin/export-published.php','site-url-ci',urlOut],
    {cwd:root,env:{...env,STAGE3_EXPORT_ORIGIN:'https://example.test'},encoding:'utf8'});
  assert.equal(urlExport.status,0,urlExport.stderr);
  const urlManifest=JSON.parse(fs.readFileSync(path.join(urlOut,'release-manifest.json'),'utf8'));
  assert.deepEqual(urlManifest.pages.map(p=>p.path),['/','/get-in-touch/']);
  assert.equal(urlManifest.redirects.length,1);
  assert.equal(urlManifest.redirects[0].from,'/contact/');
  assert.equal(urlManifest.redirects[0].to,'/get-in-touch/');
  assert.equal(urlManifest.redirects[0].file,'contact/index.html');
  assert.match(fs.readFileSync(path.join(urlOut,'index.html'),'utf8'),/href="\/get-in-touch\/"/);
  assert.match(fs.readFileSync(path.join(urlOut,'get-in-touch','index.html'),'utf8'),
    /rel="canonical" href="https:\/\/example[.]test\/get-in-touch\/"/);
  const urlStaticSitemap=fs.readFileSync(path.join(urlOut,'sitemap.xml'),'utf8');
  assert.match(urlStaticSitemap,/https:\/\/example[.]test\/get-in-touch\//);
  assert.doesNotMatch(urlStaticSitemap,/https:\/\/example[.]test\/contact\//);
  assert.match(fs.readFileSync(path.join(urlOut,'contact','index.html'),'utf8'),/url=\/get-in-touch\//);

  assert.equal((await request('POST','/api/logout',{})).status,200);
  assert.equal((await request('GET',endpoint)).status,401);
  assert.equal((await request('GET',endpoint+'/backup')).status,401,'Archives remain private');
  assert.equal((await request('POST','/api/backups/plan',payload)).status,401);
  assert.equal((await request('GET','/published/'+id+'/')).status,200,'visitor needs no CMS login');
  // Export only the published snapshot. Build static files without modifying
  // live CMS routes, then serve with Node AFTER stopping the PHP CMS completely.
  const out=path.join(dbdir,'export-v4');
  const cmd=['stage3/server/bin/export-published.php',id,out];
  assert.notEqual(spawnSync('php',cmd,{cwd:root,env,encoding:'utf8'}).status,0,
    'Export refuses form without explicit separate collector');
  env.STAGE3_FORM_ENDPOINT=origin;
  const exported=spawnSync('php',cmd,{cwd:root,env,encoding:'utf8'});
  assert.equal(exported.status,0,exported.stderr);
  assert.notEqual(spawnSync('php',cmd,{cwd:root,env,encoding:'utf8'}).status,0,
    'Static releases cannot overwrite existing output');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'release-manifest.json'),'utf8'));
  assert.equal(manifest.format,'manufact-ai-static-site-v1');
  assert.equal(manifest.publishedVersion,4);
  assert.equal(manifest.sourceRevision,7);
  assert.deepEqual(manifest.pages.map(p=>p.path),['/','/contact/']);
  assert.equal(manifest.formCollector,origin);
  const contactPage=fs.readFileSync(path.join(out,'contact','index.html'),'utf8');
  assert.ok(contactPage.includes('action="'+origin+'/forms/'));
  assert.match(contactPage,/name="_token" value="[a-f0-9]{64}"/);
  assert.equal(manifest.assets.length,1);
  assert.equal(manifest.assets[0].id,asset.id);
  assert.deepEqual(fs.readFileSync(path.join(out,manifest.assets[0].file)),pngBytes);
  assert.equal(manifest.assets[0].sha256,require('node:crypto').createHash('sha256').update(pngBytes).digest('hex'));

  for(const p of manifest.pages){
    const body=fs.readFileSync(path.join(out,p.file),'utf8');
    assert.equal(require('node:crypto').createHash('sha256').update(body).digest('hex'),p.sha256);
    assert.doesNotMatch(body,/\/api\/|\/published\//,'Standalone output has no CMS links');
    assert.doesNotMatch(body,/<script|<\?php/i,'No scripts or dynamic PHP output');
  }
  assert.match(fs.readFileSync(path.join(out,'index.html'),'utf8'),/href="\/contact\/"/);
  await stop();
  const http=require('node:http');
  const staticServer=http.createServer((req,res)=>{
    if(req.url==='/assets/'+asset.id+'.png'){
      res.setHeader('Content-Type','image/png');res.end(fs.readFileSync(path.join(out,'assets',asset.id+'.png')));return;
    }
    const page=req.url==='/'?'index.html':req.url==='/contact/'?'contact/index.html':null;
    if(!page){res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end(fs.readFileSync(path.join(out,page)));
  });
  await new Promise(resolve=>staticServer.listen(0,'127.0.0.1',resolve));
  try{
    const remote='http://127.0.0.1:'+staticServer.address().port;
    const home=await fetch(remote+'/'),contact=await fetch(remote+'/contact/');
    assert.equal(home.status,200);assert.equal(contact.status,200);
    assert.match(await home.text(),/Производим технологическое оборудование/);
    assert.match(await contact.text(),/Свяжитесь с нами/);
    const staticImage=await fetch(remote+'/assets/'+asset.id+'.png');
    assert.equal(staticImage.status,200);
    assert.deepEqual(Buffer.from(await staticImage.arrayBuffer()),pngBytes);

  }finally{
    await new Promise(resolve=>staticServer.close(resolve));
  }
  // Return to the CMS process only to verify the original DB was untouched.
  cookie='';csrf='';
  await runServer();
  assert.equal((await request('GET','/published/'+id+'/')).status,200,
    'published snapshot remains after restarting admin PHP process');
  console.log('Stage3 PHP/SQLite HTTP E2E PASS: collector, anti-spam, inbox, media, standalone HTML, visitor');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  await stop();fs.rmSync(dbdir,{recursive:true,force:true});
});
