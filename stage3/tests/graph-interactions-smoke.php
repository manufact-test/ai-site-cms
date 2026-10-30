<?php
declare(strict_types=1);
require dirname(__DIR__) . '/server/bootstrap.php';

use Manufact\Stage3\ContractValidator;
use Manufact\Stage3\PublicRenderer;

function graphTest(bool $ok,string $message): void { if(!$ok)throw new RuntimeException($message); }
$site=json_decode(file_get_contents(dirname(__DIR__).'/fixtures/industrial-site.json'),true,512,JSON_THROW_ON_ERROR);
$site['pages'][0]['sections'][]=[
  'id'=>'section-interactive','component'=>'custom-section','manifestVersion'=>'1.0.0',
  'elements'=>[['id'=>'graph-section-note','slot'=>'section-note','values'=>['content.text'=>'Интерактивная секция']]], 'designGraph'=>['version'=>1,'id'=>'graph-interactive',
    'nodes'=>[
      ['id'=>'graph-disclosure','type'=>'disclosure','text'=>'Вопрос и ответ',
        'children'=>[['id'=>'graph-answer','type'=>'text','text'=>'Ответ с деталями']]],
      ['id'=>'graph-tabs','type'=>'tabs','children'=>[
        ['id'=>'graph-tab-one','type'=>'tab','text'=>'О компании',
          'children'=>[['id'=>'graph-panel-one','type'=>'text','text'=>'Первый контент']]],
        ['id'=>'graph-tab-two','type'=>'tab','text'=>'Услуги',
          'children'=>[['id'=>'graph-panel-two','type'=>'text','text'=>'Второй контент']]]
      ]]
    ]]];
$validator=new ContractValidator(dirname(__DIR__).'/components');
$validator->validate($site);
$html=PublicRenderer::html($site,'/');
$site['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
    'id'=>'graph-list','type'=>'list','ordered'=>true,'children'=>[
      ['id'=>'graph-list-one','type'=>'list-item','text'=>'Шаг один'],
      ['id'=>'graph-list-two','type'=>'list-item','text'=>'Шаг два']]];
$validator->validate($site);
$html=PublicRenderer::html($site,'/');
graphTest(str_contains($html,'<ol class="cmsdg-n-graph-list cmsdg-list">') && str_contains($html,'<li class="cmsdg-n-graph-list-one">Шаг один</li>'),'PHP semantic ordered list');
$rich=&$site['pages'][0]['sections'][2]['designGraph']['nodes'];
$rich[]=['id'=>'graph-rich-link','type'=>'link','text'=>'На главную','href'=>'/'];
$rich[]=['id'=>'graph-rich-quote','type'=>'quote','text'=>'Подтверждённая формулировка',
    'cite'=>'<Источник>'];
$rich[]=['id'=>'graph-rich-table','type'=>'table','text'=>'Сравнение планов','children'=>[
    ['id'=>'graph-rich-row-header','type'=>'table-row','children'=>[
        ['id'=>'graph-rich-header-one','type'=>'table-cell','text'=>'Параметр'],
        ['id'=>'graph-rich-header-two','type'=>'table-cell','text'=>'План']]],
    ['id'=>'graph-rich-row-data','type'=>'table-row','children'=>[
        ['id'=>'graph-rich-value-one','type'=>'table-cell','text'=>'Срок'],
        ['id'=>'graph-rich-value-two','type'=>'table-cell','text'=>'По договору']]]]];
$validator->validate($site);
$html=PublicRenderer::html($site,'/');
graphTest(str_contains($html,'<table class="cmsdg-n-graph-rich-table cmsdg-table">'),'PHP typed table missing');
graphTest(str_contains($html,'<th scope="col" class="cmsdg-n-graph-rich-header-one">Параметр</th>'),'PHP column headers not semantic');
graphTest(str_contains($html,'<td class="cmsdg-n-graph-rich-value-two">По договору</td>'),'PHP data rows missing');
graphTest(str_contains($html,'&lt;Источник&gt;')&&!str_contains($html,'<Источник>'),'quote attribution must be escaped');
graphTest(str_contains($html,'<a class="cmsdg-n-graph-rich-link" href="/published/site-industrial-demo/">На главную</a>'),
    'PHP published mounted link rendering');
$raster=['id'=>'asset-art-fixture','src'=>'/assets/asset-art-fixture.png','mime'=>'image/png',
    'alt'=>'Тестовая иллюстрация','width'=>2,'height'=>2];
$site['assets'][]=$raster;
$rich[]=['id'=>'graph-art-directed','type'=>'image','assetId'=>$raster['id'],
    'alt'=>'Иллюстрация для ПК и телефона','responsiveMedia'=>[
        'tabletAssetId'=>$raster['id'],'mobileAssetId'=>$raster['id']]];
$validator->validate($site);
$html=PublicRenderer::html($site,'/');
graphTest(str_contains($html,'<picture class="cmsdg-picture">')&&
    str_contains($html,'<source media="(max-width:600px)" srcset="/published/site-industrial-demo/assets/'),
    'PHP renders phone art-direction as real mounted picture source');
graphTest(str_contains($html,'<source media="(max-width:900px)" srcset="/published/site-industrial-demo/assets/'),
    'PHP renders tablet art-direction as real mounted picture source');
graphTest(str_contains($html,'<img loading="lazy" class="cmsdg-n-graph-art-directed"'),
    'Graph below the first page section must retain lazy image loading');
$firstGraphSite=$site;
$frontGraph=array_splice($firstGraphSite['pages'][0]['sections'],2,1)[0];
array_unshift($firstGraphSite['pages'][0]['sections'],$frontGraph);
$validator->validate($firstGraphSite);
$firstGraphHtml=PublicRenderer::html($firstGraphSite,'/');
graphTest(str_contains($firstGraphHtml,
    '<img loading="eager" fetchpriority="high" class="cmsdg-n-graph-art-directed"'),
    'Top-section Design Graph image must receive one actual visitor LCP hint');

unset($rich); // Avoid leaking PHP reference semantics into copied negative fixtures.
$brokenDevice=$site;
$brokenDevice['pages'][0]['sections'][2]['designGraph']['nodes'][6]['responsiveMedia']['mobileAssetId']='asset-foreign';
try{$validator->validate($brokenDevice);throw new RuntimeException('foreign phone image accepted');}
catch(InvalidArgumentException $expected){}
$rootHtml=PublicRenderer::html($site,'/','/');
graphTest(str_contains($rootHtml,'<a class="cmsdg-n-graph-rich-link" href="/">На главную</a>'),
    'PHP root mount must not create protocol-relative URL');
$invalid=$site;
$invalid['pages'][0]['sections'][2]['designGraph']['nodes'][5]['children'][1]['children'][]=
    ['id'=>'graph-rich-extra-cell','type'=>'table-cell','text'=>'Лишняя ячейка'];
try{$validator->validate($invalid);throw new RuntimeException('ragged table accepted');}
catch(InvalidArgumentException $expected){}
$invalid=$site;
$invalid['pages'][0]['sections'][2]['designGraph']['nodes'][3]['href']='javascript:alert(1)';
try{$validator->validate($invalid);throw new RuntimeException('unsafe link accepted');}
catch(InvalidArgumentException $expected){}
unset($rich);
graphTest(is_string($html)&&str_contains($html,'<summary>Вопрос и ответ</summary>'),'native disclosure missing');
graphTest(str_contains($html,'type="radio"')&&str_contains($html,':checked) > .cmsdg-tabs-panels'),'interactive tab rendering missing');
$broken=$site;
$broken['pages'][0]['sections'][2]['designGraph']['nodes'][1]['children'][0]['type']='text';
try{$validator->validate($broken);throw new RuntimeException('invalid tabs accepted');}
catch(InvalidArgumentException $expected){}
$site['pages'][0]['sections'][2]['designGraph']['nodes'][0]['text']='<script>alert(1)</script>';
$html=PublicRenderer::html($site,'/');
graphTest(str_contains($html,'&lt;script&gt;alert(1)&lt;/script&gt;'),'unsafe label encoding');
$backgroundSite=$site;
$backgroundSite['assets'][]=['id'=>'asset-backdrop-clip','src'=>'/assets/asset-backdrop-clip.mp4',
    'mime'=>'video/mp4','alt'=>'Декоративное видео'];
$backgroundSite['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
    'id'=>'graph-background-container','type'=>'container',
    'backgroundVideo'=>['assetId'=>'asset-backdrop-clip','posterAssetId'=>'asset-art-fixture',
        'mobilePosterAssetId'=>'asset-art-fixture','overlay'=>['color'=>'#000000','opacity'=>40]],
    'children'=>[['id'=>'graph-background-title','type'=>'text','text'=>'Фон видео']]];
$validator->validate($backgroundSite);
$backdropHtml=PublicRenderer::html($backgroundSite,'/');
graphTest(str_contains($backdropHtml,'class="cmsdg-video-backdrop" aria-hidden="true"')&&
    str_contains($backdropHtml,'autoplay muted loop playsinline preload="none"')&&
    str_contains($backdropHtml,'prefers-reduced-motion:reduce'),'PHP MP4 decorative background');
$badBackdrop=$backgroundSite;
$last=count($badBackdrop['pages'][0]['sections'][2]['designGraph']['nodes'])-1;
$badBackdrop['pages'][0]['sections'][2]['designGraph']['nodes'][$last]['backgroundVideo']['assetId']='asset-art-fixture';
try{$validator->validate($badBackdrop);throw new RuntimeException('raster accepted as video');}
catch(InvalidArgumentException $expected){}
$popupSite=$site;
$popupSite['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
    'id'=>'graph-popup-button','type'=>'button','text'=>'Показать',
    'popupTarget'=>'graph-popup-panel'];
$popupSite['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
    'id'=>'graph-popup-panel','type'=>'popup','text'=>'Условия',
    'children'=>[['id'=>'graph-popup-text','type'=>'text','text'=>'Текст окна']]];
$popupSite['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
    'id'=>'graph-popup-sequence','type'=>'container',
    'sequence'=>['effect'=>'fade-up','duration'=>500,'delay'=>50,'stagger'=>180,'easing'=>'ease-out'],
    'children'=>[
        ['id'=>'graph-popup-first','type'=>'text','text'=>'Первый'],
        ['id'=>'graph-popup-second','type'=>'text','text'=>'Второй']]];
$validator->validate($popupSite);
$popupHtml=PublicRenderer::html($popupSite,'/');
graphTest(str_contains($popupHtml,'popover="auto" id="cmsdg-popup-graph-popup-panel"')&&
    str_contains($popupHtml,'popovertarget="cmsdg-popup-graph-popup-panel"')&&
    str_contains($popupHtml,'popovertargetaction="hide"'),'PHP native popover binding');
graphTest(str_contains($popupHtml,'animation:cmsdg-fade-up 500ms ease-out 230ms both'),
    'PHP deterministic staggered animation');
$badPopup=$popupSite;
$badPopup['pages'][0]['sections'][2]['designGraph']['nodes'][count($badPopup['pages'][0]['sections'][2]['designGraph']['nodes'])-3]['popupTarget']='foreign-popup';
try{$validator->validate($badPopup);throw new RuntimeException('foreign popup target allowed');}
catch(InvalidArgumentException $expected){}
$effectsSite=$popupSite;
$effectsSite['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
  'id'=>'graph-visual-effects','type'=>'container',
  'styles'=>['shadowFine'=>['x'=>-8,'y'=>16,'blur'=>30,'spread'=>0,'color'=>'#122334','inset'=>false]],
  'children'=>[
    ['id'=>'graph-scroll-motion','type'=>'text','text'=>'Появляется при прокрутке',
      'motion'=>['effect'=>'fade-up','duration'=>620,'delay'=>0,'trigger'=>'scroll','easing'=>'ease-in-out']],
    ['id'=>'graph-hover-action','type'=>'button','href'=>'/','text'=>'Далее',
      'states'=>['hover'=>['scalePercent'=>106],'active'=>['scalePercent'=>95]],
      'transition'=>['duration'=>240,'easing'=>'ease-in-out']]
  ]];
$validator->validate($effectsSite);
$effectsHtml=PublicRenderer::html($effectsSite,'/');
graphTest(str_contains($effectsHtml,'box-shadow:-8px 16px 30px 0px #122334')&&
  str_contains($effectsHtml,'animation-timeline:view(block)')&&
  str_contains($effectsHtml,'transition:color 240ms ease-in-out')&&
  str_contains($effectsHtml,'scale:1.06'),'PHP scroll / fine shadow / hover interaction parity');
$badEffect=$effectsSite;
$last=count($badEffect['pages'][0]['sections'][2]['designGraph']['nodes'])-1;
$badEffect['pages'][0]['sections'][2]['designGraph']['nodes'][$last]['styles']['shadowFine']['blur']=161;
try{$validator->validate($badEffect);throw new RuntimeException('invalid detailed shadow allowed');}
catch(InvalidArgumentException $expected){}
// Shared section instances must have unique IDs but identical editable content.
$linked=$site;
$original=&$linked['pages'][0]['sections'][0];
$original['sharedKey']='shared-main-hero';
$copy=$original;
$copy['id']='section-main-hero-copy';
foreach($copy['elements'] as &$item)$item['id']='section-copy-'.$item['slot'];
unset($item);
$linked['pages'][1]['sections'][]=$copy;
$validator->validate($linked);
graphTest(str_contains(PublicRenderer::html($linked,'/contact/'),'section-main-hero-copy'),
  'PHP renders page-local shared section instance');
$badShared=$linked;
$badShared['pages'][1]['sections'][count($badShared['pages'][1]['sections'])-1]['elements'][0]['values']['content.text']='Другая версия';
try{$validator->validate($badShared);throw new RuntimeException('Divergent shared sections allowed');}
catch(InvalidArgumentException $expected){}

$iconsSite=$site;
$iconsSite['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
  'id'=>'graph-specified-icon','type'=>'icon','icon'=>'map-pin',
  'iconSize'=>48,'iconWeight'=>'bold','alt'=>'Точка на карте',
  'styles'=>['color'=>'@accent']];
$validator->validate($iconsSite);
$iconsHtml=PublicRenderer::html($iconsSite,'/');
graphTest(str_contains($iconsHtml,'width="48" height="48" fill="none" stroke="currentColor" stroke-width="3"')&&
  str_contains($iconsHtml,'aria-label="Точка на карте"'),
  'PHP icon catalog uses typed size/stroke and semantic label');

$richSite=$site;
$richSite['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
  'id'=>'graph-rich-heading','type'=>'heading','level'=>2,
  'text'=>'Сильное <слово>',
  'runs'=>[['text'=>'Сильное ','strong'=>true,'color'=>'@accent'],
    ['text'=>'<слово>','italic'=>true,'href'=>'/contact/']]];
$validator->validate($richSite);
$richHtml=PublicRenderer::html($richSite,'/');
graphTest(str_contains($richHtml,'<strong>Сильное </strong>')&&
  str_contains($richHtml,'<a href="/published/site-industrial-demo/contact/"><em>&lt;слово&gt;</em></a>')&&
  !str_contains($richHtml,'<слово>'),
  'PHP semantic rich fragments and HTML escaping');
$badLink=$richSite;
$badLink['pages'][0]['sections'][2]['designGraph']['nodes'][count($richSite['pages'][0]['sections'][2]['designGraph']['nodes'])-1]['runs'][1]['href']='javascript:alert(1)';
try{$validator->validate($badLink);throw new RuntimeException('Unsafe rich link accepted');}
catch(InvalidArgumentException $expected){}
$badRich=$richSite;
$badRich['pages'][0]['sections'][2]['designGraph']['nodes'][count($richSite['pages'][0]['sections'][2]['designGraph']['nodes'])-1]['runs'][0]['color']='expression(1)';
try{$validator->validate($badRich);throw new RuntimeException('Unsafe rich fragment accepted');}
catch(InvalidArgumentException $expected){}

$geomSite=$site;
$geomSite['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
  'id'=>'geometry-hero','type'=>'container',
  'styles'=>['display'=>'grid','padding'=>40,'paddingTop'=>12,
    'minHeightViewport'=>90,'gradient'=>['type'=>'radial','angle'=>0,
    'from'=>'#112233','to'=>'#ffffff','centerX'=>25,'centerY'=>70,'radius'=>'closest-side']],
  'responsive'=>['mobile'=>['minHeightViewport'=>75,'paddingRight'=>8]],
  'children'=>[['id'=>'geometry-heading','type'=>'heading','level'=>2,'text'=>'Адаптивная композиция']]];
$validator->validate($geomSite);
$geomHtml=PublicRenderer::html($geomSite,'/');
graphTest(str_contains($geomHtml,'min-height:90vh;min-height:90svh')&&
    str_contains($geomHtml,'padding-top:12px')&&
    str_contains($geomHtml,'radial-gradient(circle closest-side at 25% 70%'),
    'PHP renderer must preserve authored viewport and radial geometry');
$figureSite=$site;
$figureSite['assets'][]=['id'=>'figure-asset-ci','src'=>'/assets/figure-asset-ci.png','alt'=>'Plan','mime'=>'image/png'];
$figureSite['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
    'id'=>'figure-standalone-ci','type'=>'image','assetId'=>'figure-asset-ci',
    'alt'=>'Plan','caption'=>'Plan <safe> & annotated','href'=>'/contact/','styles'=>[]
];
$validator->validate($figureSite);
$figureHtml=PublicRenderer::html($figureSite,'/');
graphTest(str_contains($figureHtml,'<figure class="cmsdg-image-figure">')&&
    str_contains($figureHtml,'<figcaption>Plan &lt;safe&gt; &amp; annotated</figcaption>')&&
    str_contains($figureHtml,'/contact/"'),'PHP standalone captioned linked figure preserves escaped content');
$gallerySite=$site;
$gallerySite['assets'][]=['id'=>'asset-photo-alpha','src'=>'/assets/asset-photo-alpha.png',
    'alt'=>'Фасад','mime'=>'image/png'];
$gallerySite['assets'][]=['id'=>'asset-photo-beta','src'=>'/assets/asset-photo-beta.png',
    'alt'=>'Интерьер','mime'=>'image/png'];
$gallerySite['pages'][0]['sections'][2]['designGraph']['nodes'][]=[
    'id'=>'gallery-portfolio','type'=>'gallery','text'=>'Объекты компании',
    'layout'=>'grid','columnsDesktop'=>4,'columnsTablet'=>2,'columnsMobile'=>1,'lightbox'=>true,'photoShape'=>'landscape','photoShapeTablet'=>'square','photoShapeMobile'=>'portrait',
    'children'=>[
      ['id'=>'gallery-photo-alpha','type'=>'image','assetId'=>'asset-photo-alpha',
        'alt'=>'Фасад','caption'=>'Проект <первый>','styles'=>[]],
      ['id'=>'gallery-photo-beta','type'=>'image','assetId'=>'asset-photo-beta',
        'alt'=>'Интерьер','caption'=>'Уют & свет','styles'=>[]]
    ]];
$gallerySite['pages'][0]['sections'][2]['designGraph']['nodes'][
    count($gallerySite['pages'][0]['sections'][2]['designGraph']['nodes'])-1]['styles']=['position'=>'sticky','top'=>12];
$validator->validate($gallerySite);
$galleryHtml=PublicRenderer::html($gallerySite,'/');
graphTest(str_contains($galleryHtml,'cmsdg-gallery-tablet-square')&&str_contains($galleryHtml,'cmsdg-gallery-mobile-portrait'),'PHP gallery responsive photo shapes');
graphTest(str_contains($galleryHtml,'cmsdg-gallery-shape-landscape'),'PHP gallery must render selected photo shape');
graphTest(str_contains($galleryHtml,'cmsdg-gallery-grid')&&
    str_contains($galleryHtml,'position:sticky;top:12px')&&
    str_contains($galleryHtml,'--cmsdg-gallery-columns:4;--cmsdg-gallery-tablet:2;--cmsdg-gallery-mobile:1')&&
    str_contains($galleryHtml,'popovertarget="cmsdg-lightbox-gallery-photo-alpha"')&&
    str_contains($galleryHtml,'aria-label="Следующая фотография"')&&
    str_contains($galleryHtml,'popovertarget="cmsdg-lightbox-gallery-photo-beta"')&&
    str_contains($galleryHtml,'<figcaption>Проект &lt;первый&gt;</figcaption>')&&
    !str_contains($galleryHtml,'<первый>'),
    'PHP renders real gallery with safe captions and native lightbox');
$scrollGallery=$gallerySite;
$scrollIndex=count($scrollGallery['pages'][0]['sections'][2]['designGraph']['nodes'])-1;
$scrollNode=&$scrollGallery['pages'][0]['sections'][2]['designGraph']['nodes'][$scrollIndex];
$scrollNode['layout']='scroll';$scrollNode['scrollControls']=true;
$scrollNode['visibleDesktop']=4;$scrollNode['visibleTablet']=2;$scrollNode['visibleMobile']=1;
unset($scrollNode['columnsDesktop'],$scrollNode['columnsTablet'],$scrollNode['columnsMobile']);
$validator->validate($scrollGallery);
$scrollHtml=PublicRenderer::html($scrollGallery,'/');
graphTest(str_contains($scrollHtml,'--cmsdg-visible-desktop:4;--cmsdg-visible-tablet:2;--cmsdg-visible-mobile:1'),'PHP responsive carousel card count');
graphTest(str_contains($scrollHtml,'cmsdg-gallery-scroll-nav')&&
    str_contains($scrollHtml,'href="#cmsdg-photo-gallery-photo-beta"'),
    'PHP gallery emits native no-JavaScript photo navigation');
$scrollNode['scrollControls']='true';
try{$validator->validate($scrollGallery);throw new RuntimeException('Nonboolean scroll control accepted');}
catch(InvalidArgumentException $expected){}
unset($scrollNode);
$englishGallery=$gallerySite;$englishGallery['language']='en';
$englishGalleryHtml=PublicRenderer::html($englishGallery,'/');
graphTest(str_contains($englishGalleryHtml,'aria-label="Next photo"')&&
    str_contains($englishGalleryHtml,'aria-label="Close photo"'),
    'Published gallery controls follow the site language');
$badGallery=$gallerySite;
$last=count($badGallery['pages'][0]['sections'][2]['designGraph']['nodes'])-1;
$badGallery['pages'][0]['sections'][2]['designGraph']['nodes'][$last]['children'][0]['href']='/';
try{$validator->validate($badGallery);throw new RuntimeException('Conflicting lightbox link accepted');}
catch(InvalidArgumentException $expected){}
$editorialSite=$site;
$editorialSite['pages'][0]['sections'][2]['designGraph']=['version'=>1,'id'=>'editorial-php-graph','nodes'=>[
 ['id'=>'editorial-php-card','type'=>'container','semanticTag'=>'article','ariaLabel'=>'Client <case> & delivery',
  'styles'=>['display'=>'grid','gridTracks'=>[2,3,1],'gridAutoRowsPx'=>96,'gap'=>20],
  'responsive'=>['tablet'=>['gridTracks'=>[1,2]],'mobile'=>['columns'=>1]],
  'children'=>[
   ['id'=>'editorial-php-heading','type'=>'heading','text'=>'Результаты','level'=>2,'styles'=>['gridColumnStart'=>1,'gridColumnSpan'=>2,'gridRowStart'=>1,'gridRowSpan'=>2]],
   ['id'=>'editorial-php-copy','type'=>'text','text'=>'Описание','styles'=>[]]
  ]]]
];
$validator->validate($editorialSite);
$editorialHtml=PublicRenderer::html($editorialSite,'/');
graphTest(str_contains($editorialHtml,'<article class="cmsdg-n-editorial-php-card" aria-label="Client &lt;case&gt; &amp; delivery">'),'PHP semantic container and escaping');
graphTest(str_contains($editorialHtml,'grid-template-columns:minmax(0,2fr) minmax(0,3fr) minmax(0,1fr)')&&
 str_contains($editorialHtml,'grid-auto-rows:minmax(96px,auto)')&&
 str_contains($editorialHtml,'grid-column:1 / span 2')&&
 str_contains($editorialHtml,'grid-row:1 / span 2'),'PHP weighted grid geometry');
foreach(['gridTracks'=>[1,'bad'],'gridAutoRowsPx'=>9999] as $key=>$value){
 $invalid=$editorialSite;$invalid['pages'][0]['sections'][2]['designGraph']['nodes'][0]['styles'][$key]=$value;
 try{$validator->validate($invalid);throw new RuntimeException('Bad editorial setting accepted');}catch(InvalidArgumentException $expected){}
}
$invalid=$editorialSite;$invalid['pages'][0]['sections'][2]['designGraph']['nodes'][0]['semanticTag']='script';
try{$validator->validate($invalid);throw new RuntimeException('Bad semantic tag accepted');}catch(InvalidArgumentException $expected){}
$deviceSite=$site;
$deviceSite['pages'][0]['sections'][0]['deviceVisibility']=['mobile'=>false,'tablet'=>false];
$validator->validate($deviceSite);
$deviceHtml=PublicRenderer::html($deviceSite,'/');
graphTest(str_contains($deviceHtml,'cms-device-section cms-device-hide-tablet cms-device-hide-mobile')
 && str_contains($deviceHtml,'@media(max-width:600px){.cms-device-hide-mobile{display:none!important}}'),
 'PHP typed per-device visibility');
$badDevice=$deviceSite;
$badDevice['pages'][0]['sections'][0]['deviceVisibility']=['desktop'=>false,'tablet'=>false,'mobile'=>false];
try{$validator->validate($badDevice);throw new RuntimeException('All-hidden section accepted');}
catch(InvalidArgumentException $expected){}
$emptyPage=$site;
foreach($emptyPage['pages'][0]['sections'] as &$item)$item['deviceVisibility']=['mobile'=>false];
unset($item);
try{$validator->validate($emptyPage);throw new RuntimeException('Blank mobile page accepted');}
catch(InvalidArgumentException $expected){}
/* Approved client layouts can mount one real, signed form inside a typed Graph. */
$formSite=json_decode(file_get_contents(dirname(__DIR__).'/fixtures/industrial-site.json'),true,512,JSON_THROW_ON_ERROR);
$formManifest=json_decode(file_get_contents(dirname(__DIR__).'/components/lead-form.json'),true,512,JSON_THROW_ON_ERROR);
$formElements=[];
foreach($formManifest['elements'] as $field)$formElements[]=[
    'id'=>'form-element-'.$field['slot'],'slot'=>$field['slot'],
    'values'=>['content.text'=>$field['fields'][0]['default']]
];
$formSection=['id'=>'section-graph-lead','component'=>'lead-form','manifestVersion'=>'1.0.0',
    'elements'=>$formElements,'designGraph'=>['version'=>1,'id'=>'graph-live-lead',
        'nodes'=>[['id'=>'graph-lead-layout','type'=>'container','styles'=>['display'=>'grid','columns'=>2],
            'responsive'=>['mobile'=>['columns'=>1]],'children'=>[
                ['id'=>'graph-lead-intro','type'=>'text','text'=>'Вопрос по проекту'],
                ['id'=>'graph-live-form-slot','type'=>'form-slot','styles'=>['padding'=>16],
                  'formAppearance'=>['gap'=>20,'inputRadius'=>15,'buttonRadius'=>24,
                      'inputBackground'=>'#f5f8fa','buttonBackground'=>'@accent'],
                  'formAppearanceMobile'=>['gap'=>9,'buttonRadius'=>10]]
            ]]]]];
$formSite['pages'][0]['sections'][]=$formSection;
$validator->validate($formSite);
$beforeSecret=getenv('STAGE3_FORM_SECRET');
putenv('STAGE3_FORM_SECRET=isolated-test-only-form-secret-32-char-boundary');
try{$publishedForm=PublicRenderer::html($formSite,'/',null,null,1);}
finally{
    if($beforeSecret===false)putenv('STAGE3_FORM_SECRET');
    else putenv('STAGE3_FORM_SECRET='.$beforeSecret);
}
graphTest(substr_count($publishedForm,'<form class="lead-form"')===1
    &&str_contains($publishedForm,'class="cmsdg-n-graph-live-form-slot cmsdg-form-slot"')
    &&str_contains($publishedForm,'action="/forms/site-industrial-demo/section-graph-lead"')
    &&str_contains($publishedForm,'name="_token"')
    &&str_contains($publishedForm,'name="consent"'),
    'A typed Graph form slot renders the existing real secure PHP form once');
graphTest(str_contains($publishedForm,'--cmsdg-form-gap:20px')
    &&str_contains($publishedForm,'--cmsdg-form-input-radius:15px')
    &&str_contains($publishedForm,'--cmsdg-form-button-bg:#0a5bff')
    &&str_contains($publishedForm,'@media(max-width:600px){.cmsdg-graph-live-lead .cmsdg-n-graph-live-form-slot{--cmsdg-form-gap:9px;--cmsdg-form-button-radius:10px}}')
    &&str_contains($publishedForm,'var(--cmsdg-form-input-radius,8px)'),
    'Public PHP form exposes validated per-device appearance overrides');
$invalidForm=$formSite;
$invalidForm['pages'][0]['sections'][2]['designGraph']['nodes'][0]['children'][1]['formAppearance']['inputRadius']=999;
try{$validator->validate($invalidForm);throw new RuntimeException('Oversized form radius accepted');}
catch(InvalidArgumentException $expected){}
$invalidForm=$formSite;
$invalidForm['pages'][0]['sections'][2]['designGraph']['nodes'][0]['children'][1]['formAppearance']['buttonBackground']='url(javascript:bad)';
try{$validator->validate($invalidForm);throw new RuntimeException('Unsafe form background accepted');}
catch(InvalidArgumentException $expected){}
$invalidForm=$formSite;
$invalidForm['pages'][0]['sections'][2]['designGraph']['nodes'][0]['children'][0]['formAppearance']=['gap'=>10];
try{$validator->validate($invalidForm);throw new RuntimeException('Non-form node appearance accepted');}
catch(InvalidArgumentException $expected){}
$invalidForm=$formSite;
$invalidForm['pages'][0]['sections'][2]['designGraph']['nodes'][]=['id'=>'second-live-slot','type'=>'form-slot'];
try{$validator->validate($invalidForm);throw new RuntimeException('Duplicate form slot accepted');}
catch(InvalidArgumentException $expected){}
$invalidForm=$formSite;
$invalidForm['pages'][0]['sections'][2]['designGraph']['nodes'][0]['children'][1]['href']='https://untrusted.example/';
try{$validator->validate($invalidForm);throw new RuntimeException('Form slot external action accepted');}
catch(InvalidArgumentException $expected){}
echo "Native PHP interactive Graph renderer, validation and escaped output: OK\n";
