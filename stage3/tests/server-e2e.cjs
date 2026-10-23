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
  STAGE3_OWNER_PASSWORD:password,STAGE3_FORM_SECRET:'CI-only-form-hmac-secret-with-at-least-32-chars'};
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
  assert.equal((await request('POST',endpoint+'/save',{expectedRevision:6,site:formDraft})).body.revision,7);
  assert.equal((await request('GET',endpoint+'/submissions')).body.submissions.length,0);
  assert.equal((await request('POST',endpoint+'/publish',{expectedRevision:7})).body.version,4);
  const formHtml=(await request('GET','/published/'+id+'/contact/')).body;
  assert.match(formHtml,/name="message"/);
  assert.match(formHtml,/action="\/forms\/site-industrial-demo\/section-quote-form"/);
  const token=/name="_token" value="([a-f0-9]{64})"/.exec(formHtml)?.[1];
  assert.ok(token);
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
  const leads=(await request('GET',endpoint+'/submissions')).body.submissions;
  assert.equal(leads.length,1);
  assert.equal(leads[0].email,'client@example.test');
  assert.equal(leads[0].status,'new');
  assert.equal((await request('POST',endpoint+'/submissions/'+leads[0].submission_id+'/review',{})).status,200);
  assert.equal((await request('GET',endpoint+'/submissions')).body.submissions[0].status,'reviewed');
  for(let n=0;n<4;n++)assert.equal((await postForm(values)).status,201);
  assert.equal((await postForm(values)).status,429);

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
  flexSite.pages[1].sections.push(extraSection);
  assert.equal((await request('POST','/api/sites',{site:flexSite})).status,201);
  assert.equal((await request('GET','/api/sites/site-flex-ci/notifications')).body.unread,0);
  assert.equal((await request('POST','/api/sites/site-flex-ci/publish',{expectedRevision:1})).body.version,1);
  const flexHTML=(await request('GET','/published/site-flex-ci/contact/')).body;
  assert.match(flexHTML,/name="extra1"/);
  assert.match(flexHTML,/type="tel" name="extra2"/);
  assert.match(flexHTML,/name="extra3"/);
  assert.match(flexHTML,/value="Самовывоз"/);
  const flexToken=/name="_token" value="([a-f0-9]{64})"/.exec(flexHTML)?.[1];
  assert.ok(flexToken);
  const flexValues={_release:'1',_token:flexToken,website:'',name:'Новый клиент',
    email:'flex@example.test',message:'Нужно подобрать оборудование',consent:'yes',
    extra1:'Самовывоз',extra2:'+49 (211) 1234567',extra3:'Детали запроса'};
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
  assert.equal((await submitFlex(flexValues)).status,201);
  assert.equal((await request('GET','/api/sites/site-flex-ci/notifications')).body.unread,1);
  const flexInbox=(await request('GET','/api/sites/site-flex-ci/submissions')).body.submissions;
  assert.equal(flexInbox.length,1);
  assert.equal(flexInbox[0].extras.extra1.value,'Самовывоз');
  assert.equal(flexInbox[0].extras.extra2.label,'Телефон');
  assert.equal((await request('POST','/api/sites/site-flex-ci/notifications/seen',{})).body.unread,0);
  assert.equal((await request('GET','/api/sites/site-flex-ci/notifications')).body.unread,0);
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
    assert.equal((await request('GET','/api/sites/site-flex-ci/notifications')).body.unread,1);
    env.STAGE3_FORM_ENDPOINT=collectorOrigin;
    const flexOut=path.join(dbdir,'flex-static-release');
    const exportedFlex=spawnSync('php',['stage3/server/bin/export-published.php','site-flex-ci',flexOut],
      {cwd:root,env,encoding:'utf8'});
    assert.equal(exportedFlex.status,0,exportedFlex.stderr);
    const exportedHTML=fs.readFileSync(path.join(flexOut,'contact','index.html'),'utf8');
    assert.ok(exportedHTML.includes('action="'+collectorOrigin+'/forms/'));
    assert.match(exportedHTML,/name="extra1"/);
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
  const missingImage=structuredClone(archive);missingImage.payload.media=[];
  // Recompute PHP's compact JSON representation: every key is textual, no floats in this fixture.
  missingImage.sha256=require('node:crypto').createHash('sha256').update(JSON.stringify(missingImage.payload)).digest('hex');
  assert.equal((await request('POST','/api/backups/plan',{archive:missingImage,targetSiteId:target})).status,422);
  const recoveredArchive=await request('POST','/api/backups/restore',{...payload,confirmationToken:planned.body.confirmationToken});
  assert.equal(recoveredArchive.status,201,JSON.stringify(recoveredArchive.body));
  assert.equal(recoveredArchive.body.site.siteId,target);
  assert.equal(recoveredArchive.body.revision,sourceRevision);
  assert.equal((await request('GET','/published/'+target+'/')).status,404,'Restoring never activates a public snapshot');
  assert.equal((await request('GET','/api/sites/'+target+'/releases')).body.releases.length,4);
  const copyBackup=await request('GET','/api/sites/'+target+'/backup');
  assert.equal(copyBackup.status,200,JSON.stringify(copyBackup.body));
  assert.equal(copyBackup.body.payload.media[0].sha256,archive.payload.media[0].sha256);
  assert.equal(copyBackup.body.payload.submissions.length,archive.payload.submissions.length);
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
  for(const route of [endpoint,endpoint+'/media/'+asset.id,'/api/users','/api/audit','/api/licenses','/api/sites/'+target+'/backup']){
    assert.equal((await request('GET',route)).status,403,'Scoped editor denial: '+route);
  }
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
  const rich=structuredClone(fixture);rich.siteId='site-rich-ci';
  rich.theme={background:'#121f2c',surface:'#ffffff',text:'#dce6ef',primary:'#ff8800',font:'system',maxWidth:960};
  rich.pages[0].seo={title:'Секции услуг',description:'Страница теста услуг',robots:'noindex'};
  for(const name of ['service-grid','faq-accordion','testimonials','photo-gallery']){
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
  rich.redirects=[{from:'/old-services/',to:'/contact/'}];
  const richCreated=await request('POST','/api/sites',{site:rich});
  assert.equal(richCreated.status,201,JSON.stringify(richCreated.body));
  assert.equal((await request('GET','/published/site-rich-ci/')).status,404);
  assert.equal((await request('POST','/api/sites/site-rich-ci/publish',{expectedRevision:1})).status,200);
  const richPublished=await request('GET','/published/site-rich-ci/');
  assert.equal(richPublished.status,200);
  assert.match(richPublished.body,/Программирование шкафа управления/);
  assert.match(richPublished.body,/<details><summary>&lt;img src=x onerror=alert\(1\)&gt;<\/summary>/);
  assert.doesNotMatch(richPublished.body,/<img src=x onerror=/);
  assert.match(richPublished.body,/Подтверждённый отзыв тестового автора/);
  assert.match(richPublished.body,/href="\/published\/site-rich-ci\/contact\/"/);
  assert.match(richPublished.body,/background:var\(--cms-bg\)/);
  assert.match(richPublished.body,/name="description" content="Страница теста услуг"/);
  assert.match(richPublished.body,/rel="canonical"/);
  assert.match(richPublished.body,/property="og:title"/);
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
  badRepeat.pages[0].sections.at(-1).items[0].values['content.media']='asset-from-another-site';
  assert.equal((await request('POST','/api/sites/site-rich-ci/save',{expectedRevision:3,site:badRepeat})).status,422);
  const richExport=path.join(dbdir,'rich-static');
  const exp=spawnSync('php',['stage3/server/bin/export-published.php','site-rich-ci',richExport],
    {cwd:root,env:{...env,STAGE3_EXPORT_ORIGIN:'https://example.test'},encoding:'utf8'});
  assert.equal(exp.status,0,exp.stderr);
  const staticHtml=fs.readFileSync(path.join(richExport,'index.html'),'utf8');
  assert.match(staticHtml,/Программирование шкафа управления/);
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
  const story=csdk.sectionFrom(richDefs.find(m=>m.id==='media-story'),'section-media-story');
  story.elements.find(el=>el.slot==='photo').values['content.media']=picture.id;
  story.elements.find(el=>el.slot==='heading').values['content.text']='Наша история';
  const logos=csdk.sectionFrom(richDefs.find(m=>m.id==='partner-logos'),'section-partner-logos');
  logos.items[0].values['content.media']=picture.id;
  logos.items[0].values['content.caption']='Партнёр A';
  logos.items[0].values['behavior.href']='/contact/';
  const gallerySection=richLive.pages[0].sections.find(x=>x.component==='photo-gallery');
  gallerySection.items[0].values['content.media']=picture.id;
  richLive.pages[0].sections.push(story,logos);
  assert.equal((await request('POST','/api/sites/site-rich-ci/save',{expectedRevision:4,site:richLive})).status,200);
  assert.equal((await request('POST','/api/sites/site-rich-ci/publish',{expectedRevision:5})).status,200);
  const richVisitor=(await request('GET','/published/site-rich-ci/')).body;
  assert.match(richVisitor,/Наша история/);
  assert.match(richVisitor,/Партнёр A/);
  assert.match(richVisitor,/class="story-photo"/);
  assert.match(richVisitor,/class="partner-logo"/);
  assert.match(richVisitor,/loading="lazy"/);
  assert.match(richVisitor,new RegExp(picture.id+'.png'));
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
