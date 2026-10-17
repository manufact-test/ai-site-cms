<?php
/* Stage 1: same JSON fixture cases as RJSF AJV8 through real Opis. Research only. */
declare(strict_types=1);
require __DIR__.'/vendor/autoload.php';
$schema=json_decode(file_get_contents(__DIR__.'/typed-manifest.schema.json'),false,32,JSON_THROW_ON_ERROR);
$fixtures=json_decode(file_get_contents(__DIR__.'/schema-parity-fixtures.json'),false,32,JSON_THROW_ON_ERROR);
$validator=new \Opis\JsonSchema\CompliantValidator();
$pass=0;
foreach($fixtures->cases as $case){
  $actual=$validator->validate($case->instance,$schema)->isValid();
  echo 'OPIS_SCHEMA_PARITY '.json_encode(['name'=>$case->name,'expected'=>$case->valid,'actual'=>$actual],JSON_THROW_ON_ERROR).PHP_EOL;
  if($actual!==$case->valid)throw new RuntimeException('Opis parity mismatch '.$case->name);
  $pass++;
}
echo 'STAGE1_OPIS_SCHEMA_PARITY=PASS '.$pass.' cases, Opis 2.6.0'.PHP_EOL;
