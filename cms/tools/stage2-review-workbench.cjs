'use strict';
/*
 * Stage2 dependency-review workbench: OFFLINE human review UI for the exact
 * verified internal release. Generated output never asserts human identity,
 * legal approval, production readiness, or Stage2 acceptance. No live hosts.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {createDossier,OUT,stable}=require('./stage2-license-dossier.cjs');
const {buildWorksheet,inspectWorksheet}=require('./stage2-human-license-review.cjs');
const UI=path.join(__dirname,'stage2-review-workbench-ui.js');
const OUTPUT='stage2-human-review-workbench.html';
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));}
function sha256base64(s){return crypto.createHash('sha256').update(s).digest('base64');}
const CSS=`
:root{color-scheme:light;font:15px/1.5 Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#f4f6f9;color:#172338}
*{box-sizing:border-box}body{margin:0}main{max-width:1440px;margin:auto;padding:28px 24px 70px}
h1{font-size:29px;letter-spacing:-.8px;margin:0 0 6px}h2{font-size:17px;margin:0}p{margin:5px 0 12px}
.muted{color:#516077}.top{background:#111c34;color:white;padding:28px;border-radius:18px}
.top .muted{color:#c0cede}.eyebrow{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#93baff}
.warning{margin:18px 0;padding:13px 17px;border:1px solid #e7bb73;background:#fff6e4;border-radius:12px}
.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0}
.stat{background:white;padding:15px;border:1px solid #dce2eb;border-radius:12px;font-size:13px}
.stat strong{display:block;font-size:29px;line-height:1.25;font-variant-numeric:tabular-nums}
.toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:22px 0}
button,.file{border:1px solid #ccd5e3;background:white;color:#172338;padding:10px 14px;border-radius:9px;cursor:pointer;font:inherit;font-weight:600}
button.primary{background:#2165d5;border-color:#2165d5;color:white}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:3px solid #8ab9ff;outline-offset:2px}
.file{position:relative;overflow:hidden}.file input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}
.toolbar input[type=search]{flex:1;min-width:180px}
input,select,textarea{font:inherit;border:1px solid #c4d0df;background:#fff;border-radius:7px;color:#172338;padding:8px;width:100%;min-width:0}
textarea{resize:vertical;min-height:65px}label{display:block;font-weight:600;font-size:12px;color:#364862}
.feedback{font-weight:600;margin:14px 0;white-space:pre-wrap} .feedback.error{color:#a72227}.feedback.good{color:#185d3c}
.review-gaps{background:#fff6e6;border:1px solid #f1d7ac;padding:10px 12px;border-radius:9px;margin:12px 18px 0;font-size:12px;color:#804819}
.review-gaps strong{color:#783f12}.review-gaps ul{margin:6px 0 0;padding-left:18px}
.review-gaps.complete{background:#eaf7ef;border-color:#addac2;color:#195e40}.review-gaps.complete strong{color:#195e40}
.scope-dashboard{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin:16px 0}
.scope-choice{background:white;text-align:left;border:1px solid #d2deea;padding:13px 15px;display:grid;gap:6px;border-radius:11px}
.scope-choice[aria-pressed=true]{border:2px solid #2a70c4;background:#edf5ff}
.scope-choice small{color:#61738b;font-size:12px}.scope-choice strong{font-size:15px}
@media(max-width:720px){.scope-dashboard{grid-template-columns:1fr}}

#gap-count{font-weight:800;color:#a75c1e}

.card{background:#fff;border:1px solid #dbe2ed;border-radius:13px;margin:12px 0;overflow:hidden}
.card-top{display:flex;gap:12px;justify-content:space-between;align-items:start;background:#f9fbff;padding:14px 18px;border-bottom:1px solid #e4e9f1}
.package-name{font-weight:750;overflow-wrap:anywhere}.meta{font-size:12px;color:#5a6980;overflow-wrap:anywhere}
.card-body{padding:15px 18px;display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:13px}
.span-12{grid-column:span 12}.span-6{grid-column:span 6}.span-4{grid-column:span 4}.span-3{grid-column:span 3}
.checks{display:flex;flex-wrap:wrap;gap:12px}.checks label{display:flex;gap:6px;align-items:center;font-weight:500}.checks input{width:auto}
.status{max-width:140px}.hint{font-size:12px;color:#66758b;margin:6px 0 0}
code{font:12px/1.5 ui-monospace,Consolas,monospace;overflow-wrap:anywhere}
[hidden]{display:none!important}
@media(max-width:720px){main{padding:12px}.top{padding:19px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}
.card-body .span-6,.card-body .span-4,.card-body .span-3{grid-column:span 12}.toolbar{align-items:stretch}}
`;
function render(dossier,worksheet,uiSource=fs.readFileSync(UI,'utf8')){
  inspectWorksheet(dossier,worksheet);
  const content=JSON.stringify({dossier,worksheet}).replace(/</g,'\\u003c').replace(/&/g,'\\u0026');
  const csp="default-src 'none'; script-src 'sha256-"+sha256base64(uiSource)+
    "'; style-src 'sha256-"+sha256base64(CSS)+"'; img-src 'none'; connect-src 'none'; "+
    "object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'";
  return '<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta http-equiv="Content-Security-Policy" content="'+escapeHtml(csp)+'">'+
    '<title>AI Site CMS — независимая проверка зависимостей Stage 2</title><style>'+CSS+'</style></head><body>'+
    '<main><header class="top"><div class="eyebrow">Stage 2 / independent review</div>'+
    '<h1>Проверка зависимостей CMS</h1><p>43 закреплённых компонента · отдельная юридическая и security-оценка</p>'+
    '<p class="muted">Досье создано из проверенного внутреннего пакета, а не из произвольного списка. Никаких запросов к Hostinger.</p>'+
    '<code id="manifest">'+escapeHtml(dossier.packageManifestSha256)+'</code></header>'+
    '<div class="warning"><strong>Это рабочий лист, а не одобрение релиза.</strong> Итог проверяется отдельно через штатную CLI-проверку и подпись независимого ревьюера. Ни выбранные флажки, ни экспортированный JSON сами по себе не разрешают Stage 3, деплой или приёмку Stage 2. Браузер не сохраняет данные автоматически — скачивайте JSON.</div>'+
    '<section class="stats"><div class="stat">Всего<strong id="total">43</strong></div><div class="stat">Подтверждено<strong id="approved">0</strong></div><div class="stat">Отклонено<strong id="rejected">0</strong></div><div class="stat">Ожидает<strong id="pending">43</strong></div></section>'+
    '<p class="muted" role="status">Требуют проверки или исправлений: <strong id="gap-count">43</strong> / 43. Это статус заполнения рабочего листа, не юридическое одобрение.</p>'+
    '<div class="scope-dashboard" role="group" aria-label="Приоритет по назначению зависимостей">'+
    '<button type="button" class="scope-choice" data-scope="php-runtime" aria-pressed="false"><strong>PHP / Runtime</strong><small id="scope-php">14 компонентов</small></button>'+
    '<button type="button" class="scope-choice" data-scope="browser-runtime" aria-pressed="false"><strong>Браузер / Runtime</strong><small id="scope-browser">1 компонент</small></button>'+
    '<button type="button" class="scope-choice" data-scope="build" aria-pressed="false"><strong>Сборка и тестирование</strong><small id="scope-build">28 компонентов</small></button></div>'+
    '<div class="toolbar"><input id="filter" type="search" aria-label="Поиск по зависимостям" placeholder="Название, лицензия, технология…">'+
    '<select id="view" aria-label="Фильтр статуса"><option value="all">Все решения</option><option value="incomplete">Требуют действий</option><option value="pending">Ожидают</option><option value="approved">Подтверждены</option><option value="rejected">Отклонены</option></select>'+
    '<button id="next-gap" type="button">Следующая незавершённая ↗</button>'+
    '<label class="file">Импорт JSON<input id="import" type="file" accept=".json,application/json" aria-label="Импорт рабочего листа JSON"></label>'+
    '<button id="validate" type="button">Проверить 43 строки</button><button id="export" class="primary" type="button">Скачать JSON</button><button id="gap-export" type="button">Скачать список действий .md</button></div>'+
    '<div class="feedback" id="feedback" role="status" aria-live="polite">Все решения требуют независимого подтверждения.</div>'+
    '<section id="rows" aria-label="Пакеты для проверки"></section>'+
    '<p class="hint">Исходные версии и контрольные суммы связаны с пакетом. Отдельно проверяйте оригинальные лицензии, NOTICE, уязвимости и совместимость с коммерческим распространением. Автоматических внешних запросов нет.</p></main>'+
    '<script id="review-data" type="application/json">'+content+'</script>'+
    '<script>'+uiSource+'</script></body></html>\n';
}
function build(){
  const dossier=createDossier();
  const worksheet=buildWorksheet(dossier);
  const out=render(dossier,worksheet);
  fs.mkdirSync(OUT,{recursive:true,mode:0o700});
  const target=path.join(OUT,OUTPUT);
  fs.writeFileSync(target,out,{mode:0o600});
  process.stdout.write('STAGE2_DEPENDENCY_WORKBENCH '+dossier.componentCount+
    ' rows, verified manifest '+dossier.packageManifestSha256+
    '; offline/no human legal approval/no deployment\n');
  return target;
}
if(require.main===module){
  if(process.argv.length!==3||process.argv[2]!=='--build'){process.stderr.write('STAGE2_WORKBENCH_BUILD_REFUSED\n');process.exitCode=3;}
  else try{build();}catch(e){process.stderr.write('STAGE2_WORKBENCH_BUILD_FAILED: '+e.message+'\n');process.exitCode=4;}
}
module.exports={render,build,CSS,OUTPUT};
