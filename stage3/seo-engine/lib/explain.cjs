'use strict';
const {checkBlueprint}=require('./blueprint.cjs');
function safe(s){return String(s||'').replace(/[\\\`*_{}[\]()#+!|<>]/g,'\\$&').replace(/\n/g,' ');}
function explain(blueprint){
 const b=checkBlueprint(blueprint),lines=[
  '# План структуры и SEO: '+safe(b.title),'',
  'Этот раздел поясняет содержание и навигацию проекта. Визуальный дизайн, три статических макета, состояния элементов и полная спецификация интерактивности описываются отдельно.','',
  'Для кого: '+safe(b.audience)+'.','',
  'Цель: '+safe(b.goal)+'.',''
 ];
 for(const p of b.pages){
  lines.push('## '+safe(p.name)+' ('+safe(p.path)+')','',
   'Задача посетителя: '+safe(p.intent.need)+'.',
   'Основная тема страницы: '+safe(p.intent.topics.join(', '))+'.','',
   'Порядок основных блоков:','');
  for(const [index,s] of p.sections.entries()){
   lines.push((index+1)+'. **'+safe(s.heading)+'** — '+safe(s.why)+'.');
   if(s.cta)lines.push('   Действие «'+safe(s.cta.label)+'»: '+safe(s.cta.purpose)+'; ведёт на страницу '+safe(b.pages.find(x=>x.id===s.cta.toPageId).name)+'.');
   if(s.interaction)lines.push('   Предусмотренное взаимодействие: '+safe(s.interaction)+'.');
  }
  lines.push('', 'Связанные страницы: '+(p.links.length?p.links.map(l=>safe(l.anchor)+' → '+safe(b.pages.find(x=>x.id===l.toPageId).name)).join('; '):'отдельные контекстные ссылки не запланированы')+'.','',
    'SEO: уникальный заголовок страницы, описание и смысловая иерархия контента запланированы; это не обещание определённых позиций в поиске.','',
    'Адаптация: desktop — '+safe(p.responsive.desktop)+'; tablet — '+safe(p.responsive.tablet)+'; mobile — '+safe(p.responsive.mobile)+'.','');
 }
 if(b.unresolved.length)lines.push('## Что ещё требует подтверждения','',
  'Часть фактов для структурированных данных не подтверждена владельцем. До подтверждения эти разметки публиковать нельзя.','');
 lines.push('Примечание: предложения основаны на предоставленном брифе и перечисленных исследованиях, а не на выдуманных показателях спроса, позициях или замерах скорости.','');
 return lines.join('\n');
}
module.exports=Object.freeze({explain});
