<?php
declare(strict_types=1);
// Pure read-only measurement of a real Ed25519 verifier on ephemeral signed
// vectors provided via stdin. Includes validation, NOT a Hostinger benchmark.
// Usage: php sodium-ed25519-cli-load-profile.php native|compat < signed.json
$mode=$argv[1]??'';
if (PHP_SAPI!=='cli'||getenv('CI')!=='true'||$argc!==2||
  !in_array($mode,['native','compat'],true)||PHP_INT_SIZE!==8||
  PHP_VERSION_ID<80300||PHP_VERSION_ID>=80400) {
  fwrite(STDERR,"PROFILE_PREREQUISITES_REFUSED\n");exit(3);
}
$isNative=extension_loaded('sodium') &&
    function_exists('sodium_crypto_sign_verify_detached');
if ($isNative!==($mode==='native')) {
  fwrite(STDERR,"PROFILE_MODE_NOT_PHYSICAL\n");exit(3);
}
if ($mode==='compat') {
  $file=getenv('SODIUM_COMPAT_AUTOLOAD');
  if (!$file||!is_file($file)||!str_ends_with($file,'/autoload.php')) {
    fwrite(STDERR,"PROFILE_AUTHENTIC_SOURCE_REQUIRED\n");exit(3);
  }
  require_once $file;
  if (!class_exists('ParagonIE_Sodium_Compat',false)) {
    fwrite(STDERR,"PROFILE_AUTHENTIC_COMPAT_UNAVAILABLE\n");exit(3);
  }
}
function requireEvidence(bool $ok,string $why):void {
  if (!$ok)throw new RuntimeException('PROFILE_EVIDENCE_INVALID '.$why);
}
function verifier(string $sig,string $message,string $pk,string $mode):bool {
  try {
    if ($mode==='native')return sodium_crypto_sign_verify_detached($sig,$message,$pk);
    return ParagonIE_Sodium_Compat::crypto_sign_verify_detached($sig,$message,$pk);
  }catch (SodiumException $ex) {
    return false; // invalid curves/scalars must be closed, not accepted
  }
}
function percentile(array $s,float $fraction):float {
  sort($s,SORT_NUMERIC);
  $index=(int)ceil(count($s)*$fraction)-1;
  return $s[max(0,$index)];
}
try {
  $raw=file_get_contents('php://stdin');
  requireEvidence(is_string($raw)&&strlen($raw)>100&&strlen($raw)<400000,
    'bounded signed vector JSON');
  $data=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
  requireEvidence(($data['schema']??null)==='research-ephemeral-signed-load-v1',
    'input schema');
  $plan=[
    'valid-small'=>[true,9,64],
    'valid-large-65536'=>[true,3,65536],
    'tampered-small'=>[false,9,64],
    'tampered-large-65536'=>[false,3,65536],
    'tampered-signature'=>[false,9,64],
    'identity-forgery'=>[false,9,8],
    'noncanonical-scalar'=>[false,9,64]
  ];
  requireEvidence(is_array($data['cases']??null)&&count($data['cases'])===count($plan),
    'exact case coverage');
  $measured=[];
  foreach ($plan as $name=>[$expected,$count,$length]) {
    $v=$data['cases'][$name]??null;
    requireEvidence(is_array($v)&&is_string($v['signature']??null)&&
      is_string($v['message']??null)&&is_string($v['publicKey']??null),
      'case '.$name);
    $signature=base64_decode($v['signature'],true);
    $message=base64_decode($v['message'],true);
    $publicKey=base64_decode($v['publicKey'],true);
    requireEvidence(is_string($signature)&&strlen($signature)===64&&
      is_string($message)&&strlen($message)===$length&&
      is_string($publicKey)&&strlen($publicKey)===32,'case lengths '.$name);
    $warm=verifier($signature,$message,$publicKey,$mode);
    requireEvidence($warm===$expected,'warmup result '.$name);
    $durations=[];
    for($i=0;$i<$count;$i++){
      $beg=hrtime(true);
      $got=verifier($signature,$message,$publicKey,$mode);
      $duration=(hrtime(true)-$beg)/1e6;
      requireEvidence($got===$expected&&is_finite($duration)&&$duration>=0,
        'real timed answer '.$name);
      $durations[]=$duration;
    }
    $sorted=$durations;
    sort($sorted,SORT_NUMERIC);
    $measured[$name]=[
      'expectedValid'=>$expected,'answerMatched'=>true,
      'messageBytes'=>$length,'samples'=>$count,
      'medianMs'=>round(percentile($sorted,0.5),5),
      'p95Ms'=>round(percentile($sorted,0.95),5),
      'maxMs'=>round(max($sorted),5),
      'meanMs'=>round(array_sum($sorted)/count($sorted),5)
    ];
  }
  $out=[
    'schema'=>'research-original-ed25519-real-cli-timing-v1',
    'mode'=>$mode,'phpVersion'=>PHP_VERSION,'phpIntBytes'=>PHP_INT_SIZE,
    'nativeSodiumPresent'=>$isNative,
    'sha256Input'=>hash('sha256',$raw),
    'peakProcessBytes'=>memory_get_peak_usage(true),
    'caseCount'=>count($measured),'cases'=>$measured,
    'targetHostMeasured'=>false,'productionApproved'=>false
  ];
  echo 'REAL_ED25519_CLI_PROFILE_7_CASES '.json_encode($out,JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES)."\n";
}catch(Throwable $ex){
  fwrite(STDERR,'PROFILE_REAL_VERIFICATION_FAILED '.get_class($ex).' '.$ex->getMessage()."\n");exit(1);
}
