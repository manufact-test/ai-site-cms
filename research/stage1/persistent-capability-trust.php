<?php
/* AI Site CMS — Stage 1 only. CLI trusted-capability file journal.
 * Ephemeral public key/HMAC environment, not production auth or anti-rollback.
 */
declare(strict_types=1);
function deny(string $s): never {throw new RuntimeException($s);}
function fields(object $x,array $want): bool {$a=array_keys(get_object_vars($x));sort($a);sort($want);return $a===$want;}
function keyenv(string $n,int $len): string {$k=base64_decode(getenv($n)?:'',true);if($k===false||strlen($k)!==$len)deny('missing-key-'.$n);return $k;}
function encode(mixed $v): string {return json_encode($v,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);}
function decode(string $str): object {$x=json_decode($str,false,20,JSON_THROW_ON_ERROR);if(!is_object($x))deny('not-object');return $x;}
function approved(): array {return [
 'gradientFrom'=>['kind'=>'hex','target'=>'visual.background.gradient.start'],
 'motionDuration'=>['kind'=>'integer','target'=>'visual.animation.durationMs'],
 'imageAlt'=>['kind'=>'text','target'=>'visual.media.alt']];}
function checkValue(string $n,mixed $v): bool {return match($n){
 'gradientFrom'=>is_string($v)&&(bool)preg_match('/^#[a-fA-F0-9]{6}$/D',$v),
 'motionDuration'=>is_int($v)&&$v>=100&&$v<=10000,
 'imageAlt'=>is_string($v)&&strlen($v)<=160,
 default=>false};}
function version(string $v): void {if(!preg_match('/^[1-9][0-9]*\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/D',$v))deny('invalid-version');
 foreach(explode('.',$v) as $part)if(strlen($part)>9)deny('version-overflow');}
function macEnvelope(object $p,string $secret): string {
 return encode((object)['payload'=>$p,'mac'=>hash_hmac('sha256',encode($p),$secret)]);
}
function readMac(string $path,string $secret): object {
 if(!is_file($path)||filesize($path)>12000||filesize($path)<8)deny('missing-state');
 $raw=file_get_contents($path);if($raw===false)deny('unreadable-state');
 $e=decode($raw);
 if(!fields($e,['payload','mac'])||!is_object($e->payload)||!is_string($e->mac)||
    !hash_equals(hash_hmac('sha256',encode($e->payload),$secret),$e->mac))deny('state-mac-rejected');
 return $e->payload;
}
function validState(object $s): void {
 if(!fields($s,['generation','version','digest','fields','owner','revoked'])||
 !is_int($s->generation)||$s->generation<1||!is_string($s->version)||!is_string($s->digest)||
 !is_bool($s->revoked)||!is_array($s->fields)||!array_is_list($s->fields)||count($s->fields)>3||
 !is_object($s->owner))deny('invalid-state');
 if($s->version!=='none')version($s->version);
 if($s->digest!=='none'&&!preg_match('/^[a-f0-9]{64}$/D',$s->digest))deny('invalid-digest');
 if(count(array_unique($s->fields))!==count($s->fields))deny('duplicate-fields');
 foreach($s->fields as $n)if(!is_string($n)||!array_key_exists($n,approved()))deny('unknown-stored-field');
 if(count(get_object_vars($s->owner))>3)deny('too-many-owner-values');
 foreach(get_object_vars($s->owner) as $n=>$v)if(!in_array($n,$s->fields,true)||!checkValue((string)$n,$v))deny('stored-owner-invalid');
}
function atomic(string $file,string $str): void {
 $tmp=tempnam(dirname($file),'.trust-');if(!$tmp)deny('temp-file');
 try{if(file_put_contents($tmp,$str,LOCK_EX)!==strlen($str))deny('short-write');
  if(!rename($tmp,$file))deny('rename-failed');}
 finally{if(is_file($tmp))unlink($tmp);}
}
function load(string $d,string $secret): object {
 $s=readMac("$d/state.json",$secret);validState($s);
 $a=readMac("$d/anchor.json",$secret);
 if(!fields($a,['generation','digest'])||!is_int($a->generation)||!is_string($a->digest)||
 $a->generation!==$s->generation||$a->digest!==$s->digest)deny('monotonic-anchor-mismatch');
 return $s;
}
function writeState(string $d,object $s,string $secret): void {
 validState($s);
 atomic("$d/state.json",macEnvelope($s,$secret));
 if(getenv('STAGE1_TRUST_FAILPOINT')==='after-state-before-anchor')deny('injected-failure-after-state-before-anchor');
 atomic("$d/anchor.json",macEnvelope((object)['generation'=>$s->generation,'digest'=>$s->digest],$secret));
}
function verifyPack(mixed $e,string $pub): object {
 if(!is_object($e)||!fields($e,['base64Payload','signature'])||
 !is_string($e->base64Payload)||!is_string($e->signature)||strlen($e->base64Payload)>9000)deny('signed-envelope');
 $raw=base64_decode($e->base64Payload,true);$sig=base64_decode($e->signature,true);
 if($raw===false||strlen($raw)>6000||$sig===false||strlen($sig)!==64||
 !sodium_crypto_sign_verify_detached($sig,$raw,$pub))deny('invalid-publisher-signature');
 $p=decode($raw);
 if(!fields($p,['publisher','packId','version','reviewTicket','fields'])||
 $p->publisher!=='example-vendor'||$p->packId!=='reviewed-site-visual'||
 $p->reviewTicket!=='SEC-RESEARCH-ONLY'||!is_string($p->version)||!is_object($p->fields))deny('unreviewed-pack');
 version($p->version);
 $allowed=approved();
 if(count(get_object_vars($p->fields))<1||count(get_object_vars($p->fields))>3)deny('pack-field-count');
 foreach(get_object_vars($p->fields) as $n=>$d)
 if(!array_key_exists($n,$allowed)||!is_object($d)||!fields($d,['kind','target','default'])||
 $d->kind!==$allowed[$n]['kind']||$d->target!==$allowed[$n]['target']||
 !checkValue((string)$n,$d->default))deny('unapproved-operation');
 return (object)['data'=>$p,'digest'=>hash('sha256',$raw)];
}
function main(array $argv): array {
 if(PHP_SAPI!=='cli'||count($argv)!==3)deny('CLI-only');
 $d=$argv[1];$op=$argv[2];
 if(!is_dir($d)||is_link($d))deny('not-a-private-directory');
 $pub=keyenv('STAGE1_TRUST_ED25519_PUBLIC',32);$secret=keyenv('STAGE1_TRUST_HMAC',32);
 $lock=fopen("$d/trust.lock",'c+');if(!$lock||!flock($lock,LOCK_EX))deny('lock-failed');
 try{
  $raw=stream_get_contents(STDIN,12001);if($raw===false||strlen($raw)>12000)deny('input-too-long');
  $input=decode($raw?:'{}');
  if($op==='init'){
   if(is_file("$d/state.json")||is_file("$d/anchor.json"))deny('already-initialized');
   $s=(object)['generation'=>1,'version'=>'none','digest'=>'none','fields'=>[],
     'owner'=>(object)[],'revoked'=>false];
   writeState($d,$s,$secret);return ['status'=>'initialized','generation'=>1];
  }
  $s=load($d,$secret);
  if($op==='read')return ['status'=>'read','state'=>$s];
  if($op==='install'){
   if($s->revoked)deny('publisher-revoked');
   $pkg=verifyPack($input,$pub);$p=$pkg->data;
   if($s->version!=='none'&&version_compare($p->version,$s->version,'<='))deny('downgrade-or-replay');
   foreach(get_object_vars($s->owner) as $n=>$v)
    if(!property_exists($p->fields,$n)||!checkValue((string)$n,$v))deny('owner-migration-quarantine');
   $s->version=$p->version;$s->digest=$pkg->digest;$s->fields=array_keys(get_object_vars($p->fields));
  }elseif($op==='owner'){
   if(!fields($input,['field','value'])||!is_string($input->field)||$s->version==='none'||
   !in_array($input->field,$s->fields,true)||!checkValue($input->field,$input->value))deny('invalid-owner-edit');
   $s->owner->{$input->field}=$input->value;
  }elseif($op==='revoke'){
   if(!fields($input,['approved'])||$input->approved!==true||getenv('STAGE1_TRUST_TEST_ADMIN')!=='1')deny('admin-required');
   $s->revoked=true;
  }else deny('unknown-operation');
  $s->generation++;writeState($d,$s,$secret);
  return ['status'=>$op,'generation'=>$s->generation,'version'=>$s->version,'ownerCount'=>count(get_object_vars($s->owner))];
 }finally{flock($lock,LOCK_UN);fclose($lock);}
}
try{echo 'STAGE1_TRUST_PHP='.encode(main($argv)).PHP_EOL;}
catch(Throwable $e){fwrite(STDERR,'STAGE1_TRUST_REJECTED='.$e->getMessage().PHP_EOL);exit(1);}
