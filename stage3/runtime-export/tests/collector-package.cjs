#!/usr/bin/env node
'use strict';
// D8: package, verify, unpack and exercise the independent collector over real
// loopback PHP HTTP against the same disposable SQLite DB as the CMS inbox.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const net=require('node:net'),assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const {readArchive,create,hash}=require('../lib/delivery-zip.cjs');
const root=path.resolve(__dirname,'../../..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stage3-D8-collector-'));
const packageFile=path.join(tmp,'collector.zip');
const db=path.join(tmp,'cms.sqlite');
const siteFile=path.join(tmp,'site.json');
const secret='CI-only-form-hmac-secret-with-minimum-32-characters';
const env={
  ...process.env,STAGE3_DSN:'sqlite:'+db,STAGE3_OWNER_USER:'testowner',
  STAGE3_OWNER_PASSWORD:'CI-only-owner-password-123456',
  STAGE3_FORM_SECRET:secret,STAGE3_FORM_ORIGINS:'',
  STAGE3_MAIL_FROM:'',STAGE3_TELEGRAM_BOT_TOKEN:''
};
const run=(bin,args,extraEnv={})=>spawnSync(bin,args,{
  cwd:root,env:{...env,...extraEnv},encoding:'utf8',timeout:90000,maxBuffer:2_000_000
});
async function port(){
  const server=net.createServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const value=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return value;
}
let php=null;
async function stop(){
  if(php&&php.exitCode===null){
    const child=php;child.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>child.once('exit',resolve)),
      new Promise(resolve=>setTimeout(resolve,1500))]);
  }
}
async function main(){
  const packed=run(process.execPath,['stage3/runtime-export/bin/package-collector.cjs',packageFile]);
  assert.equal(packed.status,0,packed.stderr+'\n'+packed.stdout);
  const receipt=JSON.parse(packed.stdout);
  assert.equal(receipt.secretsIncluded,false);
  assert.equal(receipt.databaseIncluded,false);
  assert.equal(receipt.deployed,false);
  assert.equal(receipt.documentRoot,'collector/server/collector-public');
  const checked=run(process.execPath,['stage3/runtime-export/bin/verify-collector.cjs',packageFile]);
  assert.equal(checked.status,0,checked.stderr);
  const verification=JSON.parse(checked.stdout);
  assert.equal(verification.sha256,receipt.sha256);
  assert.ok(verification.privatePhpFiles>=20);
  assert.ok(verification.componentManifests>=10);
  const entries=readArchive(fs.readFileSync(packageFile));
  assert.equal(entries.has('collector/server/public/index.php'),false);
  assert.equal(entries.has('collector/server/Api.php'),false,'collector sidecar must exclude the CMS admin API');
  assert.equal(entries.has('collector/server/collector-public/index.php'),true);
  assert.equal(entries.has('collector/server/collector-public/.htaccess'),true);
  assert.equal([...entries.keys()].filter(x=>x.startsWith('collector/server/collector-public/')).length,2);
  assert.equal([...entries.keys()].some(x=>/[.]env$|[.]sqlite$|[.]db$|[/]studio[/]/i.test(x)),false);
  assert.equal([...entries.values()].some(b=>b.includes(Buffer.from(secret))),false,
    'The HMAC secret must never enter the package');
  const overwritten=run(process.execPath,['stage3/runtime-export/bin/package-collector.cjs',packageFile]);
  assert.notEqual(overwritten.status,0,'package builder must refuse overwrite');
  assert.match(overwritten.stderr,/destination must not exist|refused/i);
  const malicious=path.join(tmp,'malicious.zip');
  fs.writeFileSync(malicious,create([
    ...[...entries].map(([name,data])=>({name,data})),
    {name:'collector/server/collector-public/leak.txt',data:Buffer.from('not allowed')}
  ]));
  const refused=run(process.execPath,['stage3/runtime-export/bin/verify-collector.cjs',malicious]);
  assert.notEqual(refused.status,0,'verifier must reject unexpected public files');
  assert.match(refused.stderr,/unlisted|public document root|exact collector allowlist/i);

  const unpacked=path.join(tmp,'unpacked');
  for(const [name,bytes] of entries){
    const relative=name.slice('collector/'.length);
    const target=path.join(unpacked,relative);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,bytes,{mode:0o600});
  }
  for(const [name] of entries){
    if(!name.endsWith('.php'))continue;
    const target=path.join(unpacked,name.slice('collector/'.length));
    const lint=run('php',['-l',target]);
    assert.equal(lint.status,0,name+': '+lint.stderr+lint.stdout);
  }

  // Initialize the CMS database once. The package uses the same schema and DB,
  // but its web root exposes only the collector entrypoint.
  const setup=run('php',['stage3/server/bin/setup.php']);
  assert.equal(setup.status,0,setup.stderr);
  const site=JSON.parse(fs.readFileSync(path.join(root,'stage3/fixtures/industrial-site.json'),'utf8'));
  site.siteId='site-collector-package';
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'stage3/components/lead-form-flex.json'),'utf8'));
  const form={
    id:'section-collector-form',component:'lead-form-flex',
    manifestVersion:manifest.version,
    designGraph:{version:1,id:'graph-collector-form',nodes:[{id:'form-slot-collector',type:'form-slot'}]},
    elements:manifest.elements.map((slot,index)=>({
      id:'element-collector-form-'+index,slot:slot.slot,
      values:Object.fromEntries(slot.fields.map(field=>[field.path,field.default]))
    })),
    formFields:[
      {id:'field-service',label:'Тип заявки',kind:'select',required:true,
        options:['Оборудование','Сервис'],placeholder:''},
      {id:'field-model',label:'Модель оборудования',kind:'text',required:true,
        options:[],placeholder:'Укажите модель',when:{field:'field-service',option:1}},
      {id:'field-notes',label:'Комментарий',kind:'textarea',required:false,
        options:[],placeholder:'Дополнительная информация'}
    ],
    formSteps:[
      {title:'Контакты',fields:['name','email','field-service']},
      {title:'Детали',fields:['message','field-model','field-notes']}
    ]
  };
  const homePage=site.pages.find(page=>page.path==='/');
  assert.ok(homePage,'fixture must include a home page');
  homePage.sections.push(form);
  fs.writeFileSync(siteFile,JSON.stringify(site));
  const createSiteCode=
    "require getenv('TEST_BOOTSTRAP');"+
    "$site=json_decode(file_get_contents(getenv('TEST_SITE_FILE')),true,512,JSON_THROW_ON_ERROR);"+
    "$repo=stage3_repository();$repo->createSite($site);$repo->publish($site['siteId'],1);"+
    "echo 'created-and-published';";
  const createSite=run('php',['-r',createSiteCode],{
    TEST_BOOTSTRAP:path.join(unpacked,'server/bootstrap.php'),TEST_SITE_FILE:siteFile
  });
  assert.equal(createSite.status,0,createSite.stderr);
  assert.match(createSite.stdout,/created-and-published/);

  const collectorPort=await port(),visitorPort=await port();
  const collectorOrigin='http://127.0.0.1:'+collectorPort;
  const visitorOrigin='http://127.0.0.1:'+visitorPort;
  env.STAGE3_FORM_ORIGINS=visitorOrigin;
  const documentRoot=path.join(unpacked,'server/collector-public');
  php=spawn('php',['-S','127.0.0.1:'+collectorPort,'-t',documentRoot,path.join(documentRoot,'index.php')],{
    cwd:unpacked,env,stdio:['ignore','ignore','pipe']
  });
  let serverError='';
  php.stderr.on('data',data=>{serverError+=data.toString().slice(-4000);});
  let ready=false;
  for(let i=0;i<80;i++){
    if(php.exitCode!==null)throw Error('Collector PHP exited: '+serverError);
    try{
      const response=await fetch(collectorOrigin+'/');
      if(response.status===404){ready=true;break;}
    }catch(_){}
    await new Promise(resolve=>setTimeout(resolve,60));
  }
  assert.equal(ready,true,'collector did not start: '+serverError);
  assert.equal((await fetch(collectorOrigin+'/api/session')).status,404,
    'collector must not expose the CMS API');
  assert.equal((await fetch(collectorOrigin+'/studio')).status,404,
    'collector must not expose Studio');

  const renderCode=
    "require getenv('TEST_BOOTSTRAP');"+
    "$published=stage3_repository()->published('site-collector-package');"+
    "$class='Manufact'.chr(92).'Stage3'.chr(92).'PublicRenderer';"+
    "echo $class::html($published['site'],'/',null,"+
    "getenv('TEST_COLLECTOR_ORIGIN'),$published['version'],getenv('TEST_VISITOR_ORIGIN'));";
  const rendered=run('php',['-r',renderCode],{
    TEST_BOOTSTRAP:path.join(unpacked,'server/bootstrap.php'),
    TEST_COLLECTOR_ORIGIN:collectorOrigin,TEST_VISITOR_ORIGIN:visitorOrigin
  });
  assert.equal(rendered.status,0,rendered.stderr);
  const html=rendered.stdout;
  const action=/action="([^"]+)"/.exec(html)?.[1];
  const token=/name="_token" value="([a-f0-9]{64})"/.exec(html)?.[1];
  const returnUrl=/name="_return" value="([^"]+)"/.exec(html)?.[1];
  assert.equal(action,collectorOrigin+'/forms/site-collector-package/section-collector-form');
  assert.ok(token,'published HTML must carry the release-bound HMAC');
  assert.ok(returnUrl,'published HTML must carry its same-site return route');
  assert.match(html,/data-multi-step="yes"/);
  assert.match(html,/data-condition-source="field-service"/);
  assert.match(html,/name="field-model"/);
  const send=async(fields,origin=visitorOrigin)=>fetch(action,{
    method:'POST',redirect:'manual',
    headers:{origin,'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams(fields)
  });
  const base={
    _release:'1',_token:token,_return:returnUrl,website:'',
    name:'Тестовый клиент',email:'collector@example.test',
    message:'Нужен расчёт стоимости оборудования',consent:'yes'
  };
  const wrongOrigin=await send({...base,'field-service':'Оборудование','field-model':'Model X'},'https://evil.example');
  assert.equal(wrongOrigin.status,422,'foreign origin must be rejected');
  const wrongToken=await send({...base,_token:'0'.repeat(64),'field-service':'Оборудование','field-model':'Model X'});
  assert.equal(wrongToken.status,422,'incorrect HMAC must be rejected');
  const inactive=await send({...base,'field-service':'Сервис','field-model':'Model X'});
  assert.equal(inactive.status,422,'inactive conditional field must not be accepted');
  const valid=await send({...base,'field-service':'Оборудование','field-model':'Model X',
    'field-notes':'Нужна доставка в Минск'});
  const validBody=await valid.text();
  assert.equal(valid.status,201,validBody);
  assert.match(validBody,/заявка сохранена/i);

  const queryCode=
    "$db=new PDO(getenv('STAGE3_DSN'));"+
    "$q=$db->prepare('SELECT name,email,message,extras FROM stage3_submissions WHERE site_id=?');"+
    "$q->execute(['site-collector-package']);$rows=$q->fetchAll(PDO::FETCH_ASSOC);"+
    "echo json_encode($rows,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE);";
  const query=run('php',['-r',queryCode]);
  assert.equal(query.status,0,query.stderr);
  const leads=JSON.parse(query.stdout);
  assert.equal(leads.length,1,'invalid attempts must not create inbox rows');
  assert.equal(leads[0].name,'Тестовый клиент');
  assert.equal(leads[0].email,'collector@example.test');
  const extras=JSON.parse(leads[0].extras);
  assert.equal(extras['field-service'].value,'Оборудование');
  assert.equal(extras['field-model'].value,'Model X');
  assert.equal(extras['field-notes'].value,'Нужна доставка в Минск');
  console.log('D8 COLLECTOR SIDECAR PASS: isolated package, SHA inventory, private/public split, origin/HMAC/conditional validation and CMS inbox persistence');
}
main().catch(error=>{console.error(error);process.exitCode=1;})
  .finally(async()=>{await stop();fs.rmSync(tmp,{recursive:true,force:true});});
