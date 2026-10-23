'use strict';
// Offline Stage2 delivery receipt. SHA-256 is a consistency check, NOT a
// publisher signature, independent host audit, legal opinion, or owner approval.
const fs=require('node:fs'),path=require('node:path');
const crypto=require('node:crypto');
const {STAGE,verify:verifyPackage}=require('./build-internal-package.cjs');
const legal=require('./stage2-license-dossier.cjs');
const review=require('./stage2-owner-decision.cjs');
const OUT=legal.OUT;
const SOURCE=['stage2-license-dossier.json','stage2-license-dossier.html',
 'stage2-owner-decision.json','stage2-owner-decision.html'];
const INDEX='stage2-handoff-index.json';
const WORKSHEET='stage2-owner-worksheet.md';
const PAGE='stage2-handoff-overview.html';
const ACTIONS='stage2-owner-actions.md';
const ACTIONS_PAGE='stage2-owner-actions.html';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=x=>JSON.stringify(x,null,2)+'\n';
const assert=(v,m)=>{if(!v)throw Error(m);};
function read(file,max=1048576){
 assert([...SOURCE,INDEX,WORKSHEET,PAGE,ACTIONS,ACTIONS_PAGE].includes(file),'unexpected_handoff_file');
 const p=path.join(OUT,file),st=fs.lstatSync(p);
 assert(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1
  &&st.size>50&&st.size<=max&&(st.mode&0o077)===0,'unsafe_review_file');
 return fs.readFileSync(p);
}
function snapshot(){
 const pkg=verifyPackage(),ld=legal.createDossier(),owner=review.assemble(ld);
 assert(pkg.files.length>=450,'package_incomplete');
 const files={};
 for(const name of SOURCE)files[name]=read(name);
 assert(files[SOURCE[0]].equals(Buffer.from(json(ld)))
  &&files[SOURCE[1]].equals(Buffer.from(legal.renderHtml(ld))),
  'stale_or_tampered_license_dossier');
 assert(files[SOURCE[2]].equals(Buffer.from(json(owner)))
  &&files[SOURCE[3]].equals(Buffer.from(review.render(owner))),
  'stale_or_tampered_owner_decision');
 assert(owner.packageManifestSha256===ld.packageManifestSha256
  &&ld.packageFilesChecked===pkg.files.length&&ld.componentCount===43
  &&ld.independentLegalApproval===false
  &&owner.stage2Accepted===false&&owner.stage3Authorized===false
  &&owner.productionReady===false&&owner.cryptographicEvidenceRecord===null
  &&Object.values(owner.attachedEvidence).every(x=>x===null),
  'untrusted_or_conflicting_owner_evidence');
 const gates=['architecture_and_isolation','license_review',
  'target_package_structure','target_https_and_routing','target_web_sapi_and_db',
  'site_survives_cms_outage','trial_empty_cms_install','owner_acceptance'];
 assert(owner.remainingCriteria.length===gates.length&&
  gates.every((id,i)=>owner.remainingCriteria[i].id===id),'unreviewed_exit_gate_change');
 return {pkg,ld,owner,files};
}
function worksheet(s){
 const gates=s.owner.remainingCriteria.map((item,i)=>
  (i+1)+'. '+item.name+'\n'
  +'   Existing status: '+item.state+'\n'
  +'   Human decision: NOT RECORDED. Reviewer/date/evidence/result: __________\n').join('\n');
 return '# AI Site CMS — independent Stage 2 owner review worksheet\n\n'
  +'INTERNAL ONLY; NOT ACCEPTED; STAGE 3 NOT AUTHORIZED.\n\n'
  +'Package release: '+s.ld.packageVersion+'\n'
  +'Manifest SHA-256: '+s.ld.packageManifestSha256+'\n'
  +'Verified files: '+s.ld.packageFilesChecked
  +'; locked components: '+s.ld.componentCount+'\n\n'
  +'## Eight open manual gates\n\n'+gates+'\n'
  +'## Explicit, separate permissions — ALL CURRENTLY MISSING\n\n'
  +'- Actual target Hostinger READ-ONLY inspection requires a separate explicit owner permission, hostnames, scope and duration.\n'
  +'- Any real installation or writing requires another separate approval; read-only evidence NEVER authorizes writes.\n'
  +'- Controlled outage of an actual CMS requires separate permission.\n'
  +'- Independent legal reviewer must assess locked licenses and notices; no software process can grant legal sign-off.\n'
  +'- Only explicit human owner acceptance can close Stage 2; this generated text cannot grant acceptance.\n\n'
  +'## Actual evidence boundary\n\n'
  +'- Verified: internal package manifest SHA-256, source-bound SBOM/NOTICE and four clean offline reports.\n'
  +'- Disposable GitHub Actions only: isolated MySQL 8.4, three PHP-FPM processes, Apache/Nginx, independent public visitor sites, crash/restore and temporary release signing.\n'
  +'- NOT verified: actual Hostinger PHP-FPM, document root, HTTPS, real site/DB isolation or target install; production signing key custody; authenticated admin; content backup.\n'
  +'- This handoff index is UNSIGNED. Hashes only detect alteration relative to the index. A malicious actor can replace the unsigned index along with its contents; independently pin the expected index hash from a trusted source.\n\n'
  +'## Offline verification\n\n'
  +'From checked-out repository after creating the exact internal package and review files: node cms/tools/stage2-handoff-index.cjs --verify\n'
  +'Never use handoff verification as a deployment command.\n';
}
// One consolidated owner-facing path through the FIVE independently gated
// decisions. Generated only from the verified Stage2 package + exit criteria.
// No button/signature here grants authority. All five remain human OPEN.
const ACTION_GROUPS=Object.freeze([
  {issue:5,title:'Независимая проверка 43 зависимостей',
   owner:'Независимый юридический/security специалист',
   input:'Сверить точный package manifest, 43 лицензии, NOTICE и advisories.',
   result:'Заключение по каждой зависимости, личность и квалификация проверены вне GitHub.',
   hold:'Без этого нельзя объявлять поставку юридически принятой.'},
  {issue:6,title:'Доверенные ключи и LiteSpeed без Sodium',
   owner:'Владелец + ответственные за publisher/operator',
   input:'Раздельно закрепить real identity, public SPKI pins, хранение и отзыв ключей; выбрать проверенный Ed25519 verifier.',
   result:'Независимо проверенные ключи и одобренный Sodium-free runtime путь для LiteSpeed LSAPI.',
   hold:'CI-тесты с временными ключами и локальная LSAPI проверка не заменяют это.'},
  {issue:7,title:'Ограниченное READ-ONLY разрешение Hostinger',
   owner:'Владелец выдаёт scope; назначенный оператор исполняет',
   input:'Утвердить конкретные два пустых test origins, разрешённые GET, срок и stop-условия в закрытом канале.',
   result:'Подписанные, независимо проверенные наблюдения реального HTTPS/LSAPI/routes/private-paths без SSH и записи.',
   hold:'Никаких новых сетевых запросов, пока scope не получен.'},
  {issue:8,title:'Отдельная тестовая MySQL установка и восстановление',
   owner:'Владелец отдельно разрешает write и контролируемый outage',
   input:'После успешного read-only: одобрить только пустую выделенную БД, CLI install, rollback и границы отключения.',
   result:'Задокументированная целевая установка и проверка, что visitor работает без CMS, с безопасным возвратом.',
   hold:'READ-ONLY разрешение никогда не разрешает запись, SSH или остановку сайта.'},
  {issue:9,title:'Формальное решение Stage 2 GO / NO-GO',
   owner:'Владелец после независимых проверок',
   input:'Рассмотреть результаты #5–#8, исключения, реальные ограничения LiteSpeed и эксплуатационные риски.',
   result:'Явное решение владельца; только после GO возможно начинать Stage 3.',
   hold:'Успешный CI, рабочий макет и этот лист сами ничего не принимают.'}
]);
function actionsMarkdown(s,index){
  const lines=[
    '# AI Site CMS — 5 реальных действий до приёмки Stage 2','',
    '**УСКОРЕННЫЙ РЕЖИМ: большой законченный блок → одна необходимая E2E проверка → текущий CI.**',
    'Не тратить время на косметику offline Studio и дублирующие лабораторные циклы.',
    'Нельзя начинать Stage3, выполнять Hostinger запросы/write или считать 0/135 принятыми без отдельного GO.','',
    'Проверенный локальный пакет: '+index.packageVersion+'; manifest SHA-256: '+index.packageManifestSha256,
    'Source SHA: '+(index.sourceCommitSha||'требует независимой сверки с GitHub commit')+'.',
    'Внутренних файлов пакета: '+index.packageFilesVerified+'; зависимостей: 43. Это НЕ реальная приёмка.','',
    '## Порядок действий (группы 1 и 2 можно выполнять параллельно)',''
  ];
  ACTION_GROUPS.forEach((x,i)=>{
    lines.push('### '+(i+1)+'. '+x.title,
      'GitHub: https://github.com/manufact-test/ai-site-cms/issues/'+x.issue,
      '- [ ] Ответственный: '+x.owner,
      '- [ ] Что подготовить: '+x.input,
      '- [ ] Критерий выполнения: '+x.result,
      '- [ ] Запрет/зависимость: '+x.hold,'');
  });
  lines.push('## Текущая контрольная точка','',
    '- Stage 0 и Stage 1 приняты; Stage 2 НЕ ПРИНЯТ (приблизительно 85–90% технической подготовки, не KPI).',
    '- Stage 3 не начат; официально принято 0/135 обязательных продуктовых требований.',
    '- Сайт и CMS на реальном Hostinger не изменяются этим пакетом; разрешения не возникают из GitHub issues.',
    '- Сначала пройти #5–#9, затем развивать настоящую CMS; не застревать в офлайн-прототипе.','',
    '## Ускоренный следующий заход','',
    'Сначала читать docs/NEXT-CHAT.md, handoffs/lead-integrator/ и docs/DEVELOPMENT-WORKFLOW.md.',
    'Работать большими сквозными блоками, минимальным CI, не распыляться на микротесты и однотипные исправления.',
    'Это UNSIGNED информационный документ. Контрольные SHA — хеши целостности, не доверенные подписи.','');
  return lines.join('\n');
}
function actionsHtml(s,index){
  const escape=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rows=ACTION_GROUPS.map((x,i)=>'<section><div class="head"><span>'+(i+1)+'/5</span><h2>'+
    escape(x.title)+'</h2><a href="https://github.com/manufact-test/ai-site-cms/issues/'+x.issue+
    '" rel="noreferrer noopener">Открыть задачу #'+x.issue+'</a></div>'+
    '<p><b>Кто:</b> '+escape(x.owner)+'</p><p><b>Действие:</b> '+escape(x.input)+
    '</p><p><b>Результат:</b> '+escape(x.result)+'</p><p class="warn">'+escape(x.hold)+'</p></section>').join('');
  return '<!doctype html><html lang="ru"><meta charset="utf-8">'+
   '<meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; object-src &#39;none&#39;; form-action &#39;none&#39;">'+
   '<title>AI Site CMS — 5 действий для закрытия Stage 2</title>'+
   '<style>body{font:15px/1.6 system-ui,sans-serif;color:#1c3240;background:#f3f6f8;margin:0;padding:24px}main{max-width:1000px;margin:auto}header{background:#152c3a;color:white;padding:30px;border-radius:16px}header p{color:#d7e7ed}h1{font-size:26px;line-height:1.3;margin:8px 0}h2{font-size:18px;margin:0}section{background:#fff;border:1px solid #dae5ec;border-radius:13px;padding:20px;margin-top:16px}section p{margin:9px 0}.head{display:flex;gap:13px;align-items:center;flex-wrap:wrap}.head span{background:#e4f3f4;border-radius:8px;padding:5px 10px;font-weight:750}.head a{margin-left:auto;color:#126b85;overflow-wrap:anywhere}.warn{background:#fff7e6;border-radius:8px;padding:10px 12px;color:#805b22}.badge{font-weight:800;color:#8ce6ef}.sub{color:#5b7280;font-size:13px}code{overflow-wrap:anywhere}</style>'+
   '<main><header><div class="badge">STAGE 2 · NO-GO · УСКОРЕННАЯ ПРОГРАММА</div>'+
   '<h1>Пять решений до начала настоящей CMS</h1>'+
   '<p>Все следующие действия требуют людей и отдельных разрешений. Кодовая подготовка ≈85–90%; Stage2 не принят, Stage3 не начат, 0/135.</p>'+
   '<div>Пакет '+escape(index.packageVersion)+' · '+index.packageFilesVerified+' файлов · 43 зависимости</div>'+
   '<p class="sub">Manifest SHA-256: <code>'+escape(index.packageManifestSha256)+'</code>. Никаких host запросов. UNSIGNED: этот лист не доказывает личность или право на деплой.</p></header>'+
   rows+'<section><strong>Приоритет разработки:</strong> крупные законченные функциональные блоки, один критичный smoke и обычный CI. Не расширять демолабораторию бесконечно. После #5–#9 перейти к полноценной CMS.</section></main></html>\n';
}
function html(s,index){
 const escape=x=>String(x).replace(/[&<>"']/g,c=>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=Object.entries(index.files).map(([name,value])=>
  '<tr><td>'+escape(name)+'</td><td>'+escape(value.sha256)+'</td></tr>').join('');
 return '<!doctype html><html lang="en"><meta charset="utf-8">'
  +'<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'
  +'<meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<title>AI Site CMS Stage2 handoff</title>'
  +'<style>body{font:16px/1.5 system-ui,sans-serif;max-width:980px;margin:2rem auto;padding:0 1rem}table{width:100%;border-collapse:collapse}td,th{padding:.7rem;border-bottom:1px solid #aaa;text-align:left;overflow-wrap:anywhere}</style>'
  +'<main><h1>Stage 2 independent review materials</h1>'
  +'<p><strong>NOT ACCEPTED. Stage 3 NOT AUTHORIZED. NO target host access.</strong></p>'
  +'<p>Internal release '+escape(index.packageVersion)+', '+index.packageFilesVerified+' files, '
  +index.lockedComponents+' components, '+index.gateCount+' open human gates.</p>'
  +'<p>Source checkout: '+escape(index.sourceCommitSha||'not recorded outside CI')+'</p>'
  +'<p>Package manifest SHA-256: '+escape(index.packageManifestSha256)+'</p>'
  +'<p><strong>Unsigned receipt.</strong> Independently confirm the expected index hash from a trusted GitHub Actions run. This cannot establish publisher authenticity or owner authorization.</p>'
  +'<table><thead><tr><th>Attachment</th><th>SHA-256</th></tr></thead><tbody>'+rows+'</tbody></table>'
  +'<p>See '+WORKSHEET+' for eight specific manual approval/permission items. Real Hostinger checks are prohibited until separately authorized. Public visitor sites remain independent.</p>'
  +'</main></html>\n';
}
function dataOf(s,worksheetBytes,sourceOverride){
 // Re-verifying a downloaded owner bundle outside Actions must reproduce the
 // ORIGINAL source metadata instead of substituting the verifier's context.
 const shaSource=sourceOverride===undefined?(process.env.GITHUB_SHA||null):sourceOverride;
 assert(shaSource===null||/^[a-f0-9]{40}$/.test(shaSource),'invalid_ci_sha');
 const files={};
 for(const [name,value] of Object.entries(s.files))
  files[name]={sha256:sha(value),bytes:value.length};
 files[WORKSHEET]={sha256:sha(worksheetBytes),bytes:worksheetBytes.length};
 const ownerActions=Buffer.from(actionsMarkdown(s,{packageVersion:s.ld.packageVersion,packageManifestSha256:s.ld.packageManifestSha256,packageFilesVerified:s.ld.packageFilesChecked,sourceCommitSha:shaSource}));
 const ownerPage=Buffer.from(actionsHtml(s,{packageVersion:s.ld.packageVersion,packageManifestSha256:s.ld.packageManifestSha256,packageFilesVerified:s.ld.packageFilesChecked,sourceCommitSha:shaSource}));
 files[ACTIONS]={sha256:sha(ownerActions),bytes:ownerActions.length};
 files[ACTIONS_PAGE]={sha256:sha(ownerPage),bytes:ownerPage.length};
 return {
  format:'ai-site-cms-stage2-integrity-handoff-v1',
  scope:'unsigned-offline-review-attachment-hashes',
  sourceCommitSha:shaSource,
  packageVersion:s.ld.packageVersion,
  packageManifestSha256:s.ld.packageManifestSha256,
  packageFilesVerified:s.ld.packageFilesChecked,
  lockedComponents:s.ld.componentCount,
  gateCount:s.owner.remainingCriteria.length,
  files,
  noHostAccessPerformed:true,untrustedUnsignedIndex:true,
  independentLegalApproval:false,stage2Accepted:false,
  stage3Authorized:false,productionReady:false
 };
}
function privateDir(){
 const st=fs.lstatSync(OUT);
 assert(st.isDirectory()&&!st.isSymbolicLink()&&(st.mode&0o077)===0,
  'unprotected_review_directory');
}
function build(){
 privateDir();
 const s=snapshot(),ws=Buffer.from(worksheet(s)),index=dataOf(s,ws);
 fs.writeFileSync(path.join(OUT,WORKSHEET),ws,{mode:0o600});
 fs.writeFileSync(path.join(OUT,ACTIONS),actionsMarkdown(s,index),{mode:0o600});
 fs.writeFileSync(path.join(OUT,ACTIONS_PAGE),actionsHtml(s,index),{mode:0o600});
 fs.writeFileSync(path.join(OUT,INDEX),json(index),{mode:0o600});
 fs.writeFileSync(path.join(OUT,PAGE),html(s,index),{mode:0o600});
 verify();
 console.log('Stage2 internal owner handoff: '+index.packageFilesVerified+
  ' verified files, '+Object.keys(index.files).length+
  ' hashed attachments, '+index.gateCount+' human gates, NO approval.');
 return index;
}
function verify(){
 privateDir();
 const s=snapshot(),ws=Buffer.from(worksheet(s));
 const index=JSON.parse(read(INDEX,32768));
 const generated=dataOf(s,ws,index.sourceCommitSha);
 // Source SHA is provenance metadata; not a signature nor a trusted key.
 const normalized={...index,sourceCommitSha:generated.sourceCommitSha};
 assert(json(normalized)===json(generated),'stale_or_unauthorized_handoff_index');
 assert(read(WORKSHEET,32768).equals(ws),'tampered_human_worksheet');
 assert(read(ACTIONS,32768).equals(Buffer.from(actionsMarkdown(s,index))),
  'tampered_owner_actions');
 assert(read(ACTIONS_PAGE,32768).equals(Buffer.from(actionsHtml(s,index))),
  'tampered_owner_actions_page');
 assert(read(PAGE,32768).equals(Buffer.from(html(s,index))),
  'tampered_handoff_overview');
 for(const [name,meta] of Object.entries(index.files)){
  const contents=read(name);
  assert(sha(contents)===meta.sha256&&contents.length===meta.bytes,
   'handoff_attached_file_mismatch');
 }
 return true;
}
if(require.main===module){
 try{
  if(process.argv.length!==3||!['--build','--verify'].includes(process.argv[2]))
   throw Error('explicit_handoff_command_required');
  if(process.argv[2]==='--build')build();
  else{verify();console.log('Stage2 offline handoff verification PASS (unsigned/no approval)');}
 }catch{
  process.stderr.write('STAGE2_HANDOFF_REFUSED\n');process.exitCode=3;
 }
}
module.exports={build,verify,worksheet,html,actionsMarkdown,actionsHtml,INDEX,WORKSHEET,PAGE,ACTIONS,ACTIONS_PAGE};
