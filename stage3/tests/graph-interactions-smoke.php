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
