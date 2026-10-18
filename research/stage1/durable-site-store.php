<?php
/* AI Site CMS — Stage 1 research ONLY.
 * Real PHP 8 CLI-file persistent snapshots of typed AI-site drafts/publications:
 * flock CAS, bounded read/write, JSON digest, atomic rename, explicit recovery.
 * SHA-256 detects accidental corruption, NOT a cryptographic signature against
 * anyone able to edit store files. No production auth, DB, fsync or network API.
 */
declare(strict_types=1);
const RESEARCH_FORMAT = 1;
const MAX_BYTES = 250000;
function deny(string $reason): never { throw new RuntimeException($reason); }
function keys(object $o, array $expected): bool {
    $left=array_keys(get_object_vars($o)); sort($left); sort($expected);
    return $left===$expected;
}
function validatedValue(string $type, mixed $v): bool {
    return match($type) {
      'text'=>is_string($v)&&preg_match_all('/./us',$v)<=(400)&&preg_match_all('/./us',$v)!==false,
      'hex'=>is_string($v)&&(bool)preg_match('/^#[a-fA-F0-9]{6}$/D',$v),
      'duration'=>is_int($v)&&$v>=100&&$v<=10000,
      'link'=>is_string($v)&&(bool)preg_match('/^#[a-z][a-z0-9-]{0,40}$/D',$v),
      'boolean'=>is_bool($v),
      'asset'=>is_string($v)&&in_array($v,['orb','reef'],true),
      default=>false
    };
}
function declared(): array {
    return [
      'hero'=>['headline'=>'text','gradientFrom'=>'hex','gradientTo'=>'hex','durationMs'=>'duration','ctaHref'=>'link','featureAsset'=>'asset'],
      'accordion'=>['title'=>'text','open'=>'boolean'],
      'form'=>['placeholder'=>'text','enabled'=>'boolean'],
      'media'=>['asset'=>'asset','alt'=>'text'],
      'copy'=>['body'=>'text']
    ];
}
function checkManifest(mixed $m): void {
    if(!is_object($m)||!keys($m,['siteId','version','components'])||$m->siteId!=='tide-atlas'||
       !is_string($m->version)||!preg_match('/^[1-9][0-9]*\.[0-9]+\.[0-9]+$/D',$m->version)||
       !is_array($m->components)||count($m->components)<2||count($m->components)>12)deny('manifest-shape');
    $seen=[];$types=declared();
    foreach($m->components as $c){
      if(!is_object($c)||!keys($c,['id','kind','defaults'])||!is_string($c->id)||!preg_match('/^[a-z][a-z0-9-]{2,50}$/D',$c->id)||
         isset($seen[$c->id])||!is_string($c->kind)||!isset($types[$c->kind])||!is_object($c->defaults))deny('component-shape-or-id');
      $seen[$c->id]=true;
      if(!keys($c->defaults,array_keys($types[$c->kind])))deny('unknown-component-field');
      foreach($types[$c->kind] as $field=>$type)if(!validatedValue($type,$c->defaults->$field))deny('invalid-default-'.$field);
    }
}
function effectiveValues(object $m, object $overrides): array {
    checkManifest($m);$declared=declared();$all=[];
    foreach($m->components as $c) {
      $values=new stdClass();
      foreach($declared[$c->kind] as $field=>$type) {
        $path=$c->id.'/'.$field;
        $values->$field=property_exists($overrides,$path)?$overrides->$path:$c->defaults->$field;
      }
      $all[]=['id'=>$c->id,'kind'=>$c->kind,'values'=>$values];
    }
    return $all;
}
function checkOwner(object $manifest, mixed $values): void {
    if(!is_object($values))deny('owner-map');
    $fields=[];$typed=declared();
    foreach($manifest->components as $c)foreach($typed[$c->kind] as $field=>$type)$fields[$c->id.'/'.$field]=$type;
    if(count(get_object_vars($values))>80)deny('too-many-overrides');
    foreach(get_object_vars($values) as $path=>$val)
      if(!array_key_exists($path,$fields)||!validatedValue($fields[$path],$val))deny('invalid-owner-'.$path);
}
function same(mixed $a,mixed $b): bool { return serialize($a)===serialize($b); }
function validatePublished(mixed $published): void {
    if(!is_object($published)||!keys($published,['revision','sourceRevision','manifest','overrides','shape'])||
       !is_int($published->revision)||$published->revision<1||
       ($published->sourceRevision!==null&&(!is_int($published->sourceRevision)||$published->sourceRevision<1||$published->sourceRevision>=$published->revision)))deny('publication-shape');
    checkManifest($published->manifest);checkOwner($published->manifest,$published->overrides);
    if(!is_array($published->shape)||!same($published->shape,json_decode(json_encode(effectiveValues($published->manifest,$published->overrides),JSON_THROW_ON_ERROR),false,32,JSON_THROW_ON_ERROR)))deny('publication-shape-mismatch');
}
function validateSnapshot(mixed $s): void {
    if(!is_object($s)||!keys($s,['generation','manifest','draft','saved','draftSaved','published','history'])||
       !is_int($s->generation)||$s->generation<1||!is_bool($s->draftSaved)||
       !is_array($s->history)||count($s->history)<1||count($s->history)>80)deny('snapshot-envelope');
    checkManifest($s->manifest);checkOwner($s->manifest,$s->draft);checkOwner($s->manifest,$s->saved);
    if($s->draftSaved&&!same($s->draft,$s->saved))deny('dirty-draft-flag');
    $revision=0;
    foreach($s->history as $pub){validatePublished($pub);if($pub->revision!==++$revision)deny('revision-gap');}
    validatePublished($s->published);
    if(!same($s->published,$s->history[array_key_last($s->history)]))deny('latest-published-differs-history');
}
function encode(mixed $v): string {
    return json_encode($v,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
}
function envelope(object $payload): object {
    validateSnapshot($payload);
    return (object)['format'=>RESEARCH_FORMAT,'generation'=>$payload->generation,'digest'=>hash('sha256',encode($payload)),'payload'=>$payload];
}
function checkedEnvelope(string $path): ?object {
    if(!is_file($path)||!is_readable($path))return null;
    $n=filesize($path);if($n===false||$n>MAX_BYTES||$n===0)return null;
    try{
      $bytes=file_get_contents($path);
      if(!is_string($bytes)||strlen($bytes)>MAX_BYTES)return null;
      $e=json_decode($bytes,false,64,JSON_THROW_ON_ERROR);
      if(!is_object($e)||!keys($e,['format','generation','digest','payload'])||$e->format!==RESEARCH_FORMAT||
          !is_int($e->generation)||!is_string($e->digest)||!preg_match('/^[0-9a-f]{64}$/D',$e->digest)||
          !is_object($e->payload)||$e->generation!==($e->payload->generation??null))return null;
      if(!hash_equals($e->digest,hash('sha256',encode($e->payload))))return null;
      validateSnapshot($e->payload);return $e;
    }catch(Throwable $ex){return null;}
}
function writeAtomic(string $path, object $value): void {
    $bytes=encode($value);if(strlen($bytes)>MAX_BYTES)deny('over-limit');
    $temp=tempnam(dirname($path),'.stage1-persist-');
    if($temp===false)deny('temp-failed');
    try {
      if(file_put_contents($temp,$bytes,LOCK_EX)!==strlen($bytes))deny('short-write');
      if(!chmod($temp,0600))deny('temp-chmod');
      if(!rename($temp,$path))deny('rename-failed');
    }finally{if(is_file($temp))@unlink($temp);}
}
function inputSnapshot(string $path): object {
    if(!is_file($path)||($n=filesize($path))===false||$n>MAX_BYTES||$n<1)deny('input-size');
    $bytes=file_get_contents($path);if(!is_string($bytes))deny('input-read');
    $snapshot=json_decode($bytes,false,64,JSON_THROW_ON_ERROR);
    validateSnapshot($snapshot);return $snapshot;
}
function compareForCommit(object $old,object $candidate,mixed $aliases): void {
    if($candidate->generation<=$old->generation)deny('generation-not-increasing');
    if(!is_object($aliases)||count(get_object_vars($aliases))>12)deny('alias-object');
    $previousHistory=$old->history;$nextHistory=$candidate->history;
    if(count($nextHistory)<count($previousHistory)||count($nextHistory)>count($previousHistory)+1)deny('history-loss-or-skip');
    for($i=0;$i<count($previousHistory);$i++)
      if(!same($previousHistory[$i],$nextHistory[$i]))deny('history-tamper');
    if(count($nextHistory)===count($previousHistory)&&!same($old->published,$candidate->published))deny('silent-publish-mutation');
    $previousComponents=[];$nextComponents=[];
    foreach($old->manifest->components as $c)$previousComponents[$c->id]=$c;
    foreach($candidate->manifest->components as $c)$nextComponents[$c->id]=$c;
    $targets=[];foreach(get_object_vars($aliases) as $src=>$dst){
      if(!is_string($dst)||!isset($previousComponents[$src])||!isset($nextComponents[$dst])||
         $previousComponents[$src]->kind!==$nextComponents[$dst]->kind||
         isset($nextComponents[$src])||isset($targets[$dst]))deny('unreviewed-or-ambiguous-alias');
      $targets[$dst]=true;
    }
    foreach(get_object_vars($old->saved) as $path=>$value){
      [$src,$field]=explode('/',$path,2);
      $target=property_exists($aliases,$src)?$aliases->$src:$src;
      $newPath=$target.'/'.$field;
      if(!property_exists($candidate->saved,$newPath))deny('owner-override-lost-'.$path);
      // A reviewed stable ID rename must preserve the original owner value.
      if($target!==$src&&!same($candidate->saved->$newPath,$value))deny('renamed-owner-edits-mutated');
    }
}
function handle(array $args): array {
    $action=$args[1]??'';
    if(!in_array($action,['init','commit','read','restore'],true))deny('command');
    $dir=getenv('STAGE1_DURABLE_DIRECTORY');
    if(!is_string($dir)||$dir===''||!is_dir($dir)||!is_writable($dir))deny('directory');
    $dir=realpath($dir);if($dir===false)deny('realpath');
    $file=$dir.'/current.json';$backup=$dir.'/last-good.json';
    $lock=fopen($dir.'/.durable.lock','c+');if(!$lock)deny('lock-open');
    try{
      if(!flock($lock,LOCK_EX))deny('lock-acquire');
      $main=checkedEnvelope($file);$last=checkedEnvelope($backup);
      if($action==='read'){
        $found=$main??$last;
        if($found===null)deny('no-usable-snapshot');
        return ['ok'=>true,'status'=>$main!==null?'current':'fallback-last-good','generation'=>$found->generation,'payload'=>$found->payload];
      }
      if($action==='init'){
        if(is_file($file)||is_file($backup))deny('store-already-initialized');
        $candidate=inputSnapshot($args[2]??'');if($candidate->generation!==1||$candidate->published->revision!==1)deny('initial-generation');
        $created=envelope($candidate);writeAtomic($backup,$created);writeAtomic($file,$created);
        return ['ok'=>true,'status'=>'initialized','generation'=>1];
      }
      if($action==='restore'){
        if($main!==null)deny('healthy-current-no-restore');
        if($last===null)deny('no-good-backup');
        // Restore is explicit, does not overwrite last good. The revision
        // history remains unchanged; only storage generation is advanced.
        $snapshot=unserialize(serialize($last->payload));
        $snapshot->generation=$last->generation+1;
        writeAtomic($file,envelope($snapshot));
        return ['ok'=>true,'status'=>'restored-from-last-good','generation'=>$snapshot->generation];
      }
      if($main===null)deny('corrupt-or-missing-current-explicit-recovery-required');
      $expected=$args[3]??'';
      if(!preg_match('/^(0|[1-9][0-9]*)$/D',$expected)||$main->generation!==(int)$expected)deny('cas-stale');
      $candidate=inputSnapshot($args[2]??'');
      $aliases=(object)[];
      if(isset($args[4])) {
        $aliasPath=$args[4];if(!is_file($aliasPath)||filesize($aliasPath)>5000)deny('bad-alias-file');
        $aliases=json_decode(file_get_contents($aliasPath),false,16,JSON_THROW_ON_ERROR);
      }
      compareForCommit($main->payload,$candidate,$aliases);
      $new=envelope($candidate);
      // A valid older generation survives a simulated crash before pointer swap.
      writeAtomic($backup,$main);
      if(getenv('STAGE1_DURABLE_FAILPOINT')==='after-backup-before-current')deny('injected-crash-before-current-rename');
      writeAtomic($file,$new);
      return ['ok'=>true,'status'=>'committed','generation'=>$new->generation,'publishedRevision'=>$candidate->published->revision];
    }finally{flock($lock,LOCK_UN);fclose($lock);}
}
try {
    if(PHP_SAPI!=='cli')deny('CLI-only');
    echo 'STAGE1_DURABLE='.encode(handle($argv)).PHP_EOL;
}catch(Throwable $e){
    fwrite(STDERR,'STAGE1_DURABLE_REJECTED='.encode(['ok'=>false,'reason'=>$e->getMessage()]).PHP_EOL);
    exit(1);
}
