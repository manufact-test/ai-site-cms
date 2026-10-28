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
echo "Native PHP interactive Graph renderer, validation and escaped output: OK\n";
