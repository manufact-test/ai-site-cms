'use strict';
// Blueprint-bound SEO/UX section of the client's prototype explanation.
// The lead still owns the full visual/interaction spec and three static images.
const {checkBlueprint}=require('./blueprint.cjs');
const safe=x=>String(x??'').replace(/[\\`*_{}[\]()#+!|<>]/g,'\\$&')
 .replace(/\r?\n/g,' ').trim();
const item=(s)=>'- '+safe(s);
function explain(blueprint){
 const b=checkBlueprint(blueprint),pages=new Map(b.pages.map(p=>[p.id,p]));
 const lines=[
  '# Как устроен будущий сайт: структура, навигация и SEO',
  '',
  '**Проект:** '+safe(b.title)+'.',
  '**Для кого:** '+safe(b.audience)+'.',
  '**Задача сайта:** '+safe(b.goal)+'.',
  '',
  'Этот раздел объясняет содержание, действия посетителя и адаптивность. Он входит в полное описание прототипа, но **не заменяет три отдельные статические картинки** и не утверждает, что сайт уже создан. Конкретные цвета, шрифты, анимации, hover/focus/tap, timing и размеры должны быть подтверждены визуальной спецификацией. Их нельзя угадывать из SEO-плана.',
  '',
  '## Что мы знаем и что уточняем',
  ''
 ];
 const confirmed=b.facts.filter(f=>f.status==='confirmed'),unknown=b.facts.filter(f=>f.status!=='confirmed');
 if(confirmed.length){
  lines.push('Подтверждённые исходные сведения:','');
  for(const f of confirmed)lines.push(item(f.claim));
  lines.push('');
 }
 if(unknown.length){
  lines.push('Сведения, требующие подтверждения до публикации соответствующих утверждений:','');
  for(const f of unknown)lines.push(item(f.claim));
  lines.push('');
 }
 if(!b.facts.length)lines.push('Исходные факты пока не приложены; содержание требует подтверждения заказчика.','');
 lines.push('## Страницы и путь посетителя','');
 for(const p of b.pages){
  lines.push('### '+safe(p.name)+' · '+safe(p.path),'',
   '**Зачем эта страница:** '+safe(p.intent.need)+'.',
   '**О чём она:** '+safe(p.intent.topics.join('; '))+'.',
   '**Порядок блоков и причина каждого:**','');
  for(const [index,s] of p.sections.entries()){
   lines.push((index+1)+'. **'+safe(s.heading)+' (H'+s.level+')** — '+safe(s.why)+'.');
   for(const pt of s.points)lines.push('   - '+safe(pt));
   if(s.media){
    lines.push('   - Иллюстрация: '+safe(s.media.why)+'.');
    if(s.media.purpose==='informative')lines.push('   - Для доступности: запланировано смысловое описание изображения — '+safe(s.media.alt)+'.');
    else lines.push('   - Декоративная иллюстрация не должна дублировать описание для скринридера.');
   }
   if(s.cta){
    const target=pages.get(s.cta.toPageId);
    lines.push('   - **Действие «'+safe(s.cta.label)+'»:** '+safe(s.cta.purpose)+
     '. Запланированный переход: '+safe(target.name)+' ('+safe(target.path)+').');
   }
   if(s.interaction)lines.push('   - **Согласованный сценарий взаимодействия:** '+safe(s.interaction)+'.');
  }
  lines.push('','**Дополнительные смысловые переходы:**','');
  if(!p.links.length)lines.push('Пока не запланированы; дополнительные ссылки должны соответствовать содержанию.');
  for(const l of p.links){
   const target=pages.get(l.toPageId);
   lines.push(item('«'+l.anchor+'» → '+target.name+' ('+target.path+'): '+l.why));
  }
  lines.push('','**Поведение на разных экранах:**','',
   item('Desktop: '+p.responsive.desktop),
   item('Tablet: '+p.responsive.tablet),
   item('Mobile: '+p.responsive.mobile),
   '',
   '**Поисковая подготовка:**',
   '',
   item('Предложенный заголовок вкладки/результата: «'+p.seo.title+'».'),
   item('Предложенное описание: «'+p.seo.description+'».'),
   item('Режим индексации страницы: '+(p.seo.robots==='index'?'предлагаем включить индексацию':'предлагаем исключить из индекса')+'.'),
   item('Основной адрес для поисковых систем: '+p.seo.canonicalPath+
    ' — это предложение для проверки при публикации; CMS не предоставляет произвольное редактирование canonical.'),
  );
  if(p.schemaCandidates.length){
   lines.push('','**Структурированные данные — только кандидаты:**','');
   for(const s of p.schemaCandidates)lines.push(item(s.type+': '+s.why+
    (s.eligible?' — исходные факты предварительно доступны, но реальная разметка требует отдельной реализации и проверки.':
    ' — доказательств недостаточно, публиковать разметку сейчас нельзя.')));
  }
  lines.push('');
 }
 if(b.unresolved.length){
  lines.push('## Вопросы до утверждения и публикации','');
  for(const u of b.unresolved)lines.push(item(u.message||u.kind||'Требуется подтверждение источника.'));
  lines.push('');
 }
 lines.push('## Что ещё должно быть определено в визуальном прототипе','',
  'Для каждой основной кнопки, вкладки, формы и интерактивной секции полный дизайн-пакет фиксирует hover/focus/tap, доступность с клавиатуры, поведение на разных устройствах и анимационные переходы. SEO-план определяет цель и смысл переходов, но **не придумывает вместо клиента визуальные решения и не заменяет их согласование**.',
  '',
  '## Границы обещаний','',
  'Предложения по текстам, навигации и поисковой подготовке не означают измеренный рост посещаемости, гарантированные позиции, готовые формы, подтверждённый сайт, рабочий sitemap или доступность изображений. После утверждения трёх статических макетов ведущий реализует сайт, а публикация проходит отдельную проверку.',
  '');
 return lines.join('\n');
}
module.exports=Object.freeze({explain});
