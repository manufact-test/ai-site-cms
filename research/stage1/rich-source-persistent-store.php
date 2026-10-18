<?php
/* AI Site CMS Stage 1 ONLY. Research PHP 8.3 CLI persistence of ORIGINAL
 * rich HTML source + approved owner overrides, not generic CMS/auth/sanitizer.
 * SHA256 here only checks accidental corruption; NOT attacker authenticity.
 */
declare(strict_types=1);
function stop(string $message): never {throw new RuntimeException($message);}
function json(mixed $v): string {return json_encode($v,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);}
function decode(string $s): object {$v=json_decode($s,false,50,JSON_THROW_ON_ERROR);if(!is_object($v))stop('not-object');return $v;}
function exact(object $v,array $keys): bool {$a=array_keys(get_object_vars($v));sort($a);sort($keys);return $a===$keys;}
function semver(string $v): bool {return (bool)preg_match('/^[1-9][0-9]{0,7}\.(0|[1-9][0-9]{0,7})\.(0|[1-9][0-9]{0,7})$/D',$v);}
function validateValues(object $v): void {
 if(count(get_object_vars($v))>4)stop('too-many-fields');
 foreach(get_object_vars($v) as $field=>$value) {
  $valid=match($field) {
   'hero-title/content.text'=>is_string($value)&&strlen($value)<=180&&!preg_match('/[\x00-\x08]/',$value),
   'hero-cta/behavior.href'=>is_string($value)&&(bool)preg_match('/^#[a-z][a-z0-9-]{0,42}$/D',$value),
   'hero-image/media.alt'=>is_string($value)&&strlen($value)>0&&strlen($value)<=160,
   'document/style.gutter'=>is_int($value)&&$value>=8&&$value<=80,
   default=>false
  };
  if(!$valid)stop('unapproved-field-'.$field);
 }
}
function htmlContract(string $source,object $values): void {
 if(strlen($source)<200||strlen($source)>85000||!str_contains($source,'<!doctype html>'))stop('source-size-or-doctype');
 // Constrained research contract: HTML source known to use exact stable IDs.
 // Regular expressions are NOT a complete HTML parser/security sanitizer.
 foreach(['hero-title'=>'h1','hero-cta'=>'a','hero-image'=>'img','hero'=>'section','field-notes'=>'section','faq-first'=>'details'] as $id=>$tag) {
  if(!preg_match('/<'.preg_quote($tag,'/').'\b[^>]*\bid="'.preg_quote($id,'/').'"/',$source))stop('missing-or-changed-target-'.$id);
 }
 preg_match_all('/\bid="([a-z][a-z0-9-]{0,60})"/',$source,$ids);
 if(count($ids[1])!==count(array_unique($ids[1])))stop('duplicate-ids');
 if(property_exists($values,'hero-image/media.alt')&&!preg_match('/<img\b[^>]*\bid="hero-image"[^>]*\balt="/',$source))stop('owner-alt-removed');
 if(property_exists($values,'document/style.gutter')&&
  preg_match_all('/--gutter\s*:\s*[0-9]{1,3}px/',$source)!==1)stop('owner-css-variable-removed');
 if(property_exists($values,'hero-cta/behavior.href')) {
  $dest=substr($values->{'hero-cta/behavior.href'},1);
  if(!in_array($dest,$ids[1],true))stop('dangling-reviewed-fragment');
 }
}
function published(object $p): void {
 if(!exact($p,['revision','source','version','values'])||
  !is_int($p->revision)||$p->revision<1||!is_string($p->source)||!is_string($p->version)||!semver($p->version)||
  !is_object($p->values))stop('invalid-published');
 validateValues($p->values);htmlContract($p->source,$p->values);
}
function state(object $s): void {
 if(!exact($s,['generation','revision','source','version','saved','draft','published','history'])||
 !is_int($s->generation)||$s->generation<1||
 !is_int($s->revision)||$s->revision<1||!is_string($s->source)||!is_string($s->version)||!semver($s->version)||
 !is_object($s->saved)||!is_object($s->draft)||!is_object($s->published)||
 !is_array($s->history)||!array_is_list($s->history)||
 count($s->history)<1||count($s->history)>40)stop('invalid-state');
 validateValues($s->saved);validateValues($s->draft);
 htmlContract($s->source,$s->saved);htmlContract($s->source,$s->draft);
 published($s->published);
 foreach($s->history as $entry) {
  if(!is_object($entry))stop('history-entry');
  published($entry);
 }
 $last=$s->history[count($s->history)-1];
 if(json($last)!==json($s->published))stop('history-tail-not-published');
}
function same(object $a,object $b): bool {return json($a)===json($b);}
function validTransition(object $old,object $next): void {
 if($next->generation!==$old->generation+1||$next->revision<$old->revision)stop('generation-or-revision');
 if(version_compare($next->version,$old->version,'<'))stop('downgrade-current-source');
 $n=count($old->history);$m=count($next->history);
 if($m!==$n&&$m!==$n+1)stop('history-count');
 for($i=0;$i<$n;$i++)if(!same($old->history[$i],$next->history[$i]))stop('history-rewrite');
 if($m===$n&&!same($next->published,$old->published))stop('published-without-explicit-append');
 if($m===$n+1) {
  if($next->published->revision<=$old->published->revision||$next->revision<$next->published->revision)stop('publication-revision');
  if($next->published->version!==$next->version||$next->published->source!==$next->source||
     !same($next->published->values,$next->saved)) {
   $found=false;
   // One explicit rollback must copy a *prior* publication, allowing only a new revision number.
   for($i=0;$i<$n;$i++){
    $p=$old->history[$i];
    if($next->published->source===$p->source&&$next->published->version===$p->version&&
       same($next->published->values,$p->values)){$found=true;break;}
   }
   if(!$found)stop('unreviewed-publication');
  }
 }
 // Never silently lose a saved owner edit during AI-generated source changes.
 if($next->source!==$old->source||$next->version!==$old->version){
  foreach(get_object_vars($old->saved) as $k=>$v)
   if(!property_exists($next->saved,$k)||json($next->saved->$k)!==json($v))stop('owner-override-lost');
 }
}
function receipt(object $s): string {return json((object)['payload'=>$s,'sha256'=>hash('sha256',json($s))]);}
function readReceipt(string $file): ?object {
 if(!is_file($file)||filesize($file)>600000||filesize($file)<10)return null;
 try{$v=decode(file_get_contents($file));
  if(!exact($v,['payload','sha256'])||!is_object($v->payload)||!is_string($v->sha256)||
    !hash_equals(hash('sha256',json($v->payload)),$v->sha256))return null;
  state($v->payload);return $v->payload;
 }catch(Throwable){return null;}
}
function atom(string $file,string $content): void {
 $tmp=tempnam(dirname($file),'.rich-');if($tmp===false)stop('temp');
 try{if(file_put_contents($tmp,$content,LOCK_EX)!==strlen($content))stop('write');
 if(!rename($tmp,$file))stop('rename');}finally{if(is_file($tmp))unlink($tmp);}
}
function input(string $p): object {
 if(!is_file($p)||filesize($p)>400000||filesize($p)<100)stop('input-size');
 $x=decode(file_get_contents($p));state($x);return $x;
}
function handle(array $args): array {
 if(PHP_SAPI!=='cli'||!in_array($args[1]??'', ['init','read','commit','restore'],true))stop('CLI-operation');
 $dir=getenv('STAGE1_RICH_SOURCE_STORE_DIR');
 if(!$dir||!is_dir($dir)||!is_writable($dir)||is_link($dir))stop('private-store-directory');
 $cur=$dir.'/current.json';$backup=$dir.'/last-good.json';
 $lock=fopen($dir.'/.write.lock','c+');if(!$lock||!flock($lock,LOCK_EX))stop('exclusive-lock');
 try{
  $now=readReceipt($cur);$last=readReceipt($backup);
  if($args[1]==='read') {
   $v=$now??$last;if(!$v)stop('no-valid-snapshot');
   return ['status'=>$now?'current':'fallback-last-good','state'=>$v];
  }
  if($args[1]==='init'){
   if(is_file($cur)||is_file($backup))stop('already-initialized');
   $s=input($args[2]??'');
   if($s->generation!==1||$s->revision!==1||count($s->history)!==1||
      $s->published->revision!==1||$s->published->source!==$s->source||
      $s->published->version!==$s->version)stop('invalid-genesis');
   atom($backup,receipt($s));atom($cur,receipt($s));
   return ['status'=>'initialized','generation'=>1];
  }
  if($args[1]==='restore'){
   if($now)stop('cannot-restore-healthy-current');
   if(!$last)stop('no-last-good');
   $last->generation++;atom($cur,receipt($last));
   return ['status'=>'restored','generation'=>$last->generation];
  }
  if(!$now)stop('damaged-current-requires-restore');
  $expected=$args[3]??'';
  if(!preg_match('/^(0|[1-9][0-9]*)$/D',$expected)||$now->generation!==(int)$expected)stop('cas-stale');
  $candidate=input($args[2]??'');
  validTransition($now,$candidate);
  atom($backup,receipt($now));
  if(getenv('STAGE1_RICH_SOURCE_FAILPOINT')==='after-backup')stop('injected-crash-after-backup');
  atom($cur,receipt($candidate));
  return ['status'=>'committed','generation'=>$candidate->generation,'revision'=>$candidate->revision];
 }finally{flock($lock,LOCK_UN);fclose($lock);}
}
try{echo "STAGE1_RICH_PHP=".json(handle($argv)).PHP_EOL;}
catch(Throwable $e){fwrite(STDERR,"STAGE1_RICH_PHP_REJECTED=".json(['reason'=>$e->getMessage()]).PHP_EOL);exit(1);}
