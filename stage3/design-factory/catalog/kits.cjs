'use strict';
// D4 first-party sector kits. Four genuine pages per kit, never fabricated
// customer proofs or real contact details. All HTML components are registered.
const SEQUENCES=Object.freeze({
 editorial:{
  home:['company-hero','feature-highlights','service-grid','cta-banner'],
  services:['company-hero','service-grid','media-story','cta-banner'],
  approach:['company-hero','feature-highlights','faq-accordion','cta-banner'],
  contact:['company-hero','contact-panel','faq-accordion']
 },
 industrial:{
  home:['company-hero','media-story','feature-highlights','cta-banner'],
  services:['company-hero','service-grid','feature-highlights','cta-banner'],
  approach:['company-hero','media-story','faq-accordion'],
  contact:['company-hero','contact-panel','faq-accordion']
 },
 minimal:{
  home:['company-hero','feature-highlights','cta-banner'],
  services:['company-hero','service-grid','faq-accordion','cta-banner'],
  approach:['company-hero','media-story','feature-highlights','cta-banner'],
  contact:['company-hero','contact-panel','faq-accordion']
 },
 product:{
  home:['company-hero','service-grid','feature-highlights','cta-banner'],
  services:['company-hero','media-story','service-grid','cta-banner'],
  approach:['company-hero','faq-accordion','feature-highlights','cta-banner'],
  contact:['company-hero','contact-panel','faq-accordion']
 },
 story:{
  home:['company-hero','media-story','cta-banner','feature-highlights'],
  services:['company-hero','service-grid','media-story','cta-banner'],
  approach:['company-hero','media-story','feature-highlights','faq-accordion'],
  contact:['company-hero','faq-accordion','contact-panel']
 },
 directory:{
  home:['company-hero','service-grid','cta-banner'],
  services:['company-hero','service-grid','faq-accordion','cta-banner'],
  approach:['company-hero','feature-highlights','media-story','cta-banner'],
  contact:['company-hero','contact-panel','faq-accordion']
 }
});
const RAW=[
 {id:'agency',label:['Диджитал-агентство','Digital agency'],archetype:'editorial',theme:'editorial',
  ru:['Помогите клиентам понять ваши цифровые услуги','Опишите подтверждённые направления дизайна, разработки и поддержки.','Веб-разработка','Дизайн интерфейсов','Уточните процесс передачи макетов и задач.','Опишите реальные этапы запуска сайта.'],
  en:['Introduce your digital services clearly','Describe verified design, development and support services.','Website development','Interface design','Confirm how projects are handed off.','Add your actual site delivery process.']},
 {id:'industrial',label:['Производство и B2B','Manufacturing and B2B'],archetype:'industrial',theme:'technical',
  ru:['Представьте возможности вашего производства','Укажите реальные технические компетенции, материалы и условия.','Производственные операции','Инженерное сопровождение','Уточните объёмы производства и технологические ограничения.','Добавьте подтверждённое описание контроля качества.'],
  en:['Present your manufacturing capabilities','State verified capacities, materials and conditions.','Production services','Engineering support','Confirm technical constraints and capacity.','Describe your approved quality workflow.']},
 {id:'consulting',label:['Консалтинг','Consulting'],archetype:'minimal',theme:'minimal',
  ru:['Опишите задачи, с которыми вы помогаете','Уточните экспертизу и реальный порядок консультаций.','Анализ задачи','План действий','Разграничьте консультацию и реализацию.','Опишите фактический порядок взаимодействия.'],
  en:['Clarify the challenges you help address','Explain verified expertise and your consultation process.','Needs assessment','Action planning','Distinguish advice from implementation.','Describe your actual engagement steps.']},
 {id:'local-services',label:['Локальные профессиональные услуги','Local professional services'],archetype:'directory',theme:'verdant',
  ru:['Объясните, какую локальную услугу вы оказываете','Добавьте подтверждённую территорию работы и условия приёма.','Основная услуга','Дополнительная помощь','Уточните районы и способы записи.','Опишите реальные требования к заявке.']},
 {id:'saas',label:['SaaS и цифровые продукты','SaaS and digital products'],archetype:'product',theme:'cobalt',
  ru:['Покажите, какую задачу решает ваш продукт','Используйте проверенные функции, ограничения и условия доступа.','Функциональные возможности','Подключение и настройка','Не заявляйте неподтверждённые интеграции.','Опишите реальные шаги подключения продукта.']},
 {id:'logistics',label:['Логистика и доставка','Logistics and delivery'],archetype:'industrial',theme:'oceanic',
  ru:['Расскажите о направлениях вашей логистики','Укажите реальные маршруты, типы грузов и условия доставки.','Доставка и маршруты','Обработка отправлений','Подтвердите географию работы и ограничения.','Опишите реальный путь отправления от запроса до получения.'],
  en:['Explain your logistics service coverage','Confirm actual routes, shipment types and delivery terms.','Delivery routes','Shipment handling','Verify supported regions and restrictions.','Describe your real shipment workflow.']},
 {id:'architecture',label:['Архитектура и проектирование','Architecture and design'],archetype:'story',theme:'atelier',
  ru:['Представьте архитектурный подход через реальные проекты','Разделите концепцию, проектирование и авторское сопровождение.','Архитектурное проектирование','Дизайн пространства','Не используйте вымышленные визуализации как реальные проекты.','Опишите фактические этапы проектирования.']},
 {id:'education',label:['Образование и курсы','Education and courses'],archetype:'product',theme:'plum',
  ru:['Покажите содержание вашей образовательной программы','Подтвердите формат, программу и требования к участникам.','Учебные направления','Формат занятий','Не заявляйте аккредитации или результаты без доказательств.','Опишите действительный формат изучения материала.']},
 {id:'portfolio',label:['Личное портфолио','Personal portfolio'],archetype:'story',theme:'noir',
  ru:['Расскажите о собственной специализации','Добавьте реальные работы и только разрешённые изображения.','Проекты и направления','Подход к работе','Не придумывайте клиентские проекты и достижения.','Опишите свой подтверждённый опыт без вымышленных цифр.']},
 {id:'restaurant',label:['Ресторан и меню (информация)','Restaurant information'],archetype:'editorial',theme:'copper',
  ru:['Представьте формат заведения без выдуманных обещаний','Укажите подтверждённые блюда, актуальные часы и адрес.','Меню и предложения','Информация для посетителей','Не обещайте бронирование, если его нет.','Подтвердите способы связи, условия посещения и меню.']},
 {id:'repair',label:['Ремонт и обслуживание','Repair and home services'],archetype:'directory',theme:'technical',
  ru:['Опишите услуги ремонта и обслуживания','Уточните реальные специализации, выезд и ограничения.','Диагностика и осмотр','Ремонтные работы','Указывайте только реальные условия гарантии.','Опишите проверенную последовательность обращения и ремонта.']},
 {id:'nonprofit',label:['Некоммерческий проект','Nonprofit organization'],archetype:'story',theme:'verdant',
  ru:['Расскажите о цели общественного проекта','Публикуйте проверенную миссию, программы и отчётность.','Программы и инициативы','Способы участия','Не придумывайте статистику помощи и партнёров.','Добавьте проверенную информацию об инициативах и прозрачности.']}
];
const VALID_COMPONENTS=new Set(['company-hero','feature-highlights','service-grid','media-story','faq-accordion','cta-banner','contact-panel']);
const out={};
for(const row of RAW){
 if(!/^[a-z][a-z0-9-]{2,79}$/.test(row.id)||Object.hasOwn(out,row.id)||!Object.hasOwn(SEQUENCES,row.archetype))
  throw Error('Unsafe kit entry');
 const seq=SEQUENCES[row.archetype];
 if(Object.keys(seq).join(',')!=='home,services,approach,contact')throw Error('Kit must have four ordered pages');
 if(Object.values(seq).some(a=>!Array.isArray(a)||a.length<3||a.some(c=>!VALID_COMPONENTS.has(c))))throw Error('Unregistered component');
 if(row.ru.length!==6||(row.en&&row.en.length!==6))throw Error('Incomplete sector copy');
 function copy(v){return Object.freeze({hero:v[0],description:v[1],serviceOne:v[2],serviceTwo:v[3],featureOne:v[4],storyCopy:v[5]});}
 out[row.id]=Object.freeze({
  label:Object.freeze({ru:row.label[0],en:row.label[1]}),archetype:row.archetype,
  theme:row.theme,sequences:seq,
  copy:Object.freeze({ru:copy(row.ru),...(row.en?{en:copy(row.en)}:{})}),
  bilingual:Boolean(row.en)
 });
}
if(Object.keys(out).length!==12||Object.values(out).filter(x=>x.bilingual).length<4)throw Error('Incomplete D4 catalog');
module.exports=Object.freeze(out);
