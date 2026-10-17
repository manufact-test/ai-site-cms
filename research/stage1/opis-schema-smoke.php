<?php
/* Stage-1 research ONLY: real Apache-2.0 Opis JSON Schema 2.6.0, not CMS server code. */
declare(strict_types=1);
require __DIR__.'/vendor/autoload.php';
use Opis\JsonSchema\CompliantValidator;
$schema=json_decode(file_get_contents(__DIR__.'/typed-manifest.schema.json'),false,32,JSON_THROW_ON_ERROR);
$validator=new CompliantValidator();
$valid=json_decode('{"fontSize":"64px","shadow":{"x":0,"y":5,"blur":10,"color":"#112233"},"gradient":{"angle":45,"from":"#112233","to":"#334455"},"animation":{"enabled":true,"duration":400,"easing":"ease"}}',false,32,JSON_THROW_ON_ERROR);
function cloneJson(object $v):object{return json_decode(json_encode($v,JSON_THROW_ON_ERROR),false,32,JSON_THROW_ON_ERROR);}
function check_case(string $name,mixed $input,bool $expected,CompliantValidator $validator,object $schema):void {
  $actual=$validator->validate($input,$schema)->isValid();
  if($actual!==$expected)throw new RuntimeException($name.' expected '.($expected?'valid':'invalid').' but got '.($actual?'valid':'invalid'));
  echo 'OPIS_SCHEMA_CASE '.$name.' '.($actual?'accept':'reject').PHP_EOL;
}
check_case('initial', $valid,true,$validator,$schema);
$v=cloneJson($valid);$v->fontSize='72rem';$v->shadow->blur=25;$v->gradient->angle=120;$v->animation->duration=850;check_case('edited', $v,true,$validator,$schema);
$bad=cloneJson($valid);$bad->fontSize='calc(10px + url(https://attacker.invalid))';check_case('css-function',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->fontSize='1vh';check_case('unapproved-unit',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->shadow->blur=-1;check_case('negative-blur',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->shadow->color='<script>alert(1)</script>';check_case('html-color',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->gradient->angle=361;check_case('gradient-overflow',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->animation->easing='cubic-bezier(0,0,0,0)';check_case('enum-mismatch',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->animation->duration='400';check_case('incorrect-type',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->animation->duration=10001;check_case('duration-overflow',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->shadow->unknown='x';check_case('additional-nested',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->borderRadius='12px';check_case('additional-root',$bad,false,$validator,$schema);
$bad=cloneJson($valid);unset($bad->gradient);check_case('required-root',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->shadow=(object)[];check_case('required-nested',$bad,false,$validator,$schema);
$bad=cloneJson($valid);$bad->animation->enabled='false';check_case('boolean-type',$bad,false,$validator,$schema);
check_case('array-instead-of-object',[],false,$validator,$schema);
try{json_decode('{"fontSize":',false,32,JSON_THROW_ON_ERROR);throw new RuntimeException('malformed json not rejected');}catch(JsonException $e){echo "OPIS_SCHEMA_CASE malformed-json reject\n";}
try{json_decode(str_repeat('[',33).'1'.str_repeat(']',33),false,32,JSON_THROW_ON_ERROR);throw new RuntimeException('deep json not rejected');}catch(JsonException $e){echo "OPIS_SCHEMA_CASE deep-json reject\n";}
$conditional=json_decode('{"$schema":"https://json-schema.org/draft/2020-12/schema","type":"object","properties":{"mode":{"enum":["static","animated"]},"frames":{"type":"array","items":{"type":"integer","minimum":0},"maxItems":3}},"required":["mode"],"if":{"properties":{"mode":{"const":"animated"}}},"then":{"required":["frames"]},"additionalProperties":false}',false,32,JSON_THROW_ON_ERROR);
foreach([['static',true],['animated',false]] as [$mode,$ok]){
 $case=json_decode(json_encode(['mode'=>$mode],JSON_THROW_ON_ERROR),false);
 if($validator->validate($case,$conditional)->isValid()!==$ok)throw new RuntimeException('conditional '.$mode);
}
$animated=json_decode('{"mode":"animated","frames":[0,1,2]}');if(!$validator->validate($animated,$conditional)->isValid())throw new RuntimeException('array+conditional');
$overflow=json_decode('{"mode":"animated","frames":[0,1,2,3]}');if($validator->validate($overflow,$conditional)->isValid())throw new RuntimeException('maxItems');
echo "OPIS_SCHEMA_CONDITIONAL_ARRAY=PASS\n";
echo "STAGE1_OPIS_SCHEMA_PASS=18 primary cases + 4 condition/array checks, pinned Opis 2.6.0, research-only\n";
