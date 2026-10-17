<?php
/* AI Site CMS STAGE 1 RESEARCH ONLY. Minimal PHP-only typed validation hypothesis, not a CMS API. */
declare(strict_types=1);
function fail_if(bool $condition, string $message): void { if ($condition) throw new InvalidArgumentException($message); }
function exact_keys(array $v, array $keys): void {
  $actual=array_keys($v);sort($actual);sort($keys);
  fail_if($actual!==$keys, 'missing/extra properties');
}
function length_ok(mixed $v): bool {
  return is_string($v) && preg_match('/^(?:0|[1-9][0-9]{0,2})(?:px|rem|%)$/D', $v)===1;
}
function hex_ok(mixed $v): bool {return is_string($v)&&preg_match('/^#[a-fA-F0-9]{6}$/D',$v)===1;}
function integer_ok(mixed $v,int $min,int $max):bool{return is_int($v)&&$v>=$min&&$v<=$max;}
function validate_settings(mixed $v):void {
  fail_if(!is_array($v),'settings must be JSON object');
  exact_keys($v,['fontSize','shadow','gradient','animation']);
  fail_if(!length_ok($v['fontSize']),'font size or unit invalid');
  $s=$v['shadow'];fail_if(!is_array($s),'shadow object missing');
  exact_keys($s,['x','y','blur','color']);
  fail_if(!integer_ok($s['x'],-100,100)||!integer_ok($s['y'],-100,100)||!integer_ok($s['blur'],0,200)||!hex_ok($s['color']),'invalid shadow');
  $g=$v['gradient'];fail_if(!is_array($g),'gradient object missing');
  exact_keys($g,['angle','from','to']);
  fail_if(!integer_ok($g['angle'],0,360)||!hex_ok($g['from'])||!hex_ok($g['to']),'invalid gradient');
  $a=$v['animation'];fail_if(!is_array($a),'animation object missing');
  exact_keys($a,['enabled','duration','easing']);
  fail_if(!is_bool($a['enabled'])||!integer_ok($a['duration'],0,10000)||!in_array($a['easing'],['ease','ease-in','ease-out','linear'],true),'invalid animation');
}
function json_payload(string $json):mixed {return json_decode($json,true,32,JSON_THROW_ON_ERROR);}
function check(string $name,mixed $candidate,bool $expect):void{
  $passed=true;
  try {validate_settings($candidate);}catch(Throwable $e){$passed=false;}
  if($passed!==$expect)throw new RuntimeException('FAIL '.$name.' expected '.($expect?'accept':'reject'));
  echo 'PHP_TYPED_CHECK '. $name .' '.($passed?'accepted':'rejected').PHP_EOL;
}
$valid=json_payload('{"fontSize":"64px","shadow":{"x":0,"y":5,"blur":10,"color":"#112233"},"gradient":{"angle":45,"from":"#112233","to":"#334455"},"animation":{"enabled":true,"duration":400,"easing":"ease"}}');
check('valid', $valid, true);
$changed=$valid;$changed['fontSize']='72rem';$changed['shadow']['blur']=25;$changed['gradient']['angle']=120;$changed['animation']['duration']=850;check('changed-valid',$changed,true);
$bad=$valid;$bad['fontSize']='calc(1px + url(https://attacker.invalid))';check('css-injection',$bad,false);
$bad=$valid;$bad['fontSize']='-2px';check('negative-length',$bad,false);
$bad=$valid;$bad['fontSize']='100vh';check('unsupported-unit',$bad,false);
$bad=$valid;$bad['shadow']['blur']=-1;check('negative-blur',$bad,false);
$bad=$valid;$bad['shadow']['color']='<svg/onload=alert(1)>';check('html-injection',$bad,false);
$bad=$valid;$bad['gradient']['angle']=361;check('gradient-out-of-range',$bad,false);
$bad=$valid;$bad['gradient']['from']='red;url(javascript:alert(1))';check('gradient-malformed-color',$bad,false);
$bad=$valid;$bad['animation']['easing']='steps(999999)';check('animation-unapproved-easing',$bad,false);
$bad=$valid;$bad['animation']['duration']='850';check('numeric-string-mismatch',$bad,false);
$bad=$valid;$bad['unexpected']='borderRadius';check('unregistered-property',$bad,false);
$bad=$valid;$bad['shadow']['__proto__']='malicious';check('nested-unregistered-property',$bad,false);
$bad=$valid;unset($bad['animation']);check('missing-field',$bad,false);
try {json_payload('{"fontSize": ');throw new RuntimeException('malformed JSON accepted');}catch(JsonException $e){echo "PHP_TYPED_CHECK malformed-json rejected\n";}
try {json_payload(str_repeat('[',33).'1'.str_repeat(']',33));throw new RuntimeException('deep JSON accepted');}catch(JsonException $e){echo "PHP_TYPED_CHECK deep-json rejected\n";}
echo 'STAGE1_PHP_TYPED_VALIDATION=PASS (CLI-only; not a complete JSON Schema validator; no production host tested)'.PHP_EOL;
