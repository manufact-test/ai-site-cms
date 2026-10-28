'use strict';
// Private technical worksheet; visual and release sign-off remain manual.
const FORMAT='manufact-seo-first-site-operator-worksheet-v1';
const clean=(v,max=250)=>String(v??'').replace(/[\x00-\x1f\x7f]/g,' ')
 .replace(/[|]/g,' / ').replace(/[\x60*_{}\[\]<>#]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const status=issues=>issues.some(x=>x.severity==='error')?'BLOCKED':
 issues.length?'TECHNICAL REVIEW':'NO LOCAL FINDINGS — NOT APPROVED';
function build({site,source,phpHtml,phpCapture=null,bundle}){
 if(!site||!Array.isArray(site.pages)||!source||!phpHtml||!bundle||
  site.siteId!==source.siteId||site.siteId!==phpHtml.siteId||bundle.siteId!==site.siteId||
  !Array.isArray(bundle.release?.blockers))
  throw Error('Operator worksheet requires one matching site and verified PHP report');
 const fields=['localHead','localForms','localMedia','localComponents','localGraph','localNavigation','publication'];
 const all=fields.flatMap(key=>(phpHtml[key]?.findings||[]).map(x=>({...x,group:key})));
 if(phpCapture)for(const x of phpCapture.findings||[])all.push({...x,group:'lead-php-screenshots'});
 const stats={pages:site.pages.length,actualFindings:all.length,
  actualBlockingFindings:all.filter(x=>x.severity==='error').length,
  screenshotPages:phpCapture?.pages.length??0,
  releaseBlockingGates:bundle.release.blockers.length};
 const lines=[
  '# Первый сайт — рабочий лист технической и ручной приёмки',
  '',
  '**Это не одобрение сайта и не разрешение на публикацию.** Ручная проверка дизайна, исполнения сценариев и реального HTTPS обязательна.',
  '',
  '- Сайт: '+clean(site.siteId)+'; Approved Site v2: '+clean(source.packageVersion)+'.',
  '- SHA256 sealed site.json: '+clean(source.fileSha256,80)+'.',
  '- CMS published version по данным владельца: '+(source.publishedVersion??'нет экспорта')+
   '; сопоставление media ID: '+(source.approvedMediaIdRemappingChecked?'выполнено':'не предоставлено')+'.',
  '- PHP localhost: '+clean(phpHtml.baseUrl,190)+'; дата: '+clean(phpHtml.capturedAt,45)+'.',
  '- Release status: '+clean(bundle.release.decision)+
    '; блокирующих gates: '+stats.releaseBlockingGates+
    '; реальных PHP findings: '+stats.actualFindings+'.',
  '- Lead Chromium screenshots: '+(phpCapture?'SHA256 verified':'НЕ ПРЕДОСТАВЛЕНЫ')+
   '; визуальное совпадение автоматикой: НЕ ПРОВЕРЕНО.',
  '',
  '## Блокирующие причины',
  ''
 ];
 if(!bundle.release.blockers.length)lines.push('- Автоматических блокеров в имеющихся данных нет; ручная приёмка всё равно обязательна.');
 for(const gate of bundle.release.blockers)lines.push('- **'+clean(gate.gateId,100)+'**: '+
  clean(gate.title)+(gate.taskIds?.length?' ('+gate.taskIds.length+' связанных задач)':''));
 lines.push('','## Постраничная приёмка (desktop/tablet/mobile)','',
  'Каждая отметка по устройству означает только наличие исходного снимка или утверждённой картинки; не означает успешную ручную приёмку.','');
 for(const page of site.pages){
  const issues=all.filter(x=>x.pageId===page.id||x.path===page.path);
  const screenshots=phpCapture?.pages.find(x=>x.pageId===page.id);
  const reference=source.pageReferences?.find(x=>x.pageId===page.id);
  const forms=phpHtml.localForms?.pages.find(x=>x.pageId===page.id);
  const typed=phpHtml.localComponents?.pages.find(x=>x.pageId===page.id);
  const graph=phpHtml.localGraph?.pages.find(x=>x.pageId===page.id);
  const navigation=phpHtml.localNavigation?.pages.find(x=>x.pageId===page.id);
  lines.push('### '+clean(page.path,150)+' ('+clean(page.id,100)+')','',
   '- **PHP STATUS: '+status(issues)+'**; error count: '+
    issues.filter(x=>x.severity==='error').length+'; total findings: '+issues.length+'.',
   '- PHP HTML: forms '+(forms?.checkedFormSections??0)+
    '; typed sections '+(typed?.checkedTypedSections??0)+
    '; DesignGraph nodes '+(graph?.inspectedGraphNodes??0)+
    '; desktop/mobile menu links '+(navigation?.desktopLinks??'not checked')+'/'+(navigation?.mobileLinks??'not checked')+'.',
   '- Утверждённый макет именно этой страницы: '+
    (reference?.devices.length===3?'есть для трёх ширин':'ОТСУТСТВУЕТ; не подменять макетом главной')+'.');
  for(const device of ['desktop','tablet','mobile']){
   const shot=screenshots?.screenshots?.[device];
   lines.push('- '+device+': '+(shot?'сохранён '+clean(shot.file,105)+'; digest checked':'снимок отсутствует')+
    '; утверждённый эталон: '+(reference?.devices.includes(device)?'есть':'нет')+
    '; **MANUAL CHECK UNCONFIRMED**.');
  }
  if(issues.length){
   lines.push('','**Выявленные отличия:**');
   for(const item of issues.slice(0,14))lines.push('- '+(item.severity==='error'?'ERROR':'REVIEW')+
    ' '+clean(item.code,90)+(item.sectionId?' · section '+clean(item.sectionId,70):'')+
    (item.graphNodeId?' · node '+clean(item.graphNodeId,70):'')+
    ': '+clean(item.message));
   if(issues.length>14)lines.push('- Ещё '+(issues.length-14)+' findings в полном JSON bundle.');
  }
  lines.push('');
 }
 const common=all.filter(x=>!x.pageId&&!x.path);
 if(common.length){
  lines.push('## Общесайтовые отклонения','');
  for(const item of common.slice(0,25))lines.push('- '+clean(item.code,100)+': '+clean(item.message));
  if(common.length>25)lines.push('- Ещё '+(common.length-25)+' общих findings в JSON bundle.');
  lines.push('');
 }
 lines.push('## Только владелец/ведущий отмечает после реального теста','',
  '- [ ] Сверена фактически обслуживаемая PHP revision с утверждённым пакетом и owner-exported published release.',
  '- [ ] Каждая страница полностью сравнена с собственным утверждённым макетом в desktop/tablet/mobile; оценены вкладки, popup, overflow и кликабельность.',
  '- [ ] С разрешения владельца отправлена реальная тестовая форма, проверены сохранение заявки в CMS и доставленные уведомления.',
  '- [ ] На реальном HTTPS проверены DNS/TLS, canonical, robots, sitemap, 301, OG preview и файлы изображений.',
  '- [ ] Проверены backup/rollback и отдельное хранение исходной sealed-папки.',
  '- [ ] Решение о публикации принято владельцем отдельно. Ни одна галочка не устанавливается автоматически.',
  '',
  '## Границы доказательств','',
  'Основано на локальном SHA-256-проверенном HTML/медиа и оригинальной sealed Site v2 metadata. Наличие фотоэкрана не доказывает внешнее клиентское согласие. HMAC, HTML формы и приватные токены в этот рабочий лист не копируются.',
  '');
 const markdown=lines.join('\n');
 if(markdown.length>350000)throw Error('Private first-site worksheet exceeds bounded output');
 return Object.freeze({format:FORMAT,siteId:site.siteId,
  statistics:Object.freeze(stats),markdown,operatorSignedOff:false,releaseAuthorized:false});
}
module.exports=Object.freeze({FORMAT,build});
