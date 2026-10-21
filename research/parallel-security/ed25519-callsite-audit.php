<?php
declare(strict_types=1);
/**
 * Original CMS callsite invariant, source-only and research-only. This is NOT a
 * substitute for native-free PHP 8.3 or independently vetted sodium_compat.
 */
const TARGETS=[
    'OfflineReleaseVerifier.php','TrustedChainVerifier.php',
    'LabPreauthorizedUpgradeGate.php','LabAttestedActivationGate.php',
    'LabSettledUpgradeGate.php',
];
function val(array|string $t):string{return is_array($t)?$t[1]:$t;}
function significant(array $t,int $i):?int{
    for(;$i<count($t);$i++)
        if(!(is_array($t[$i])&&in_array($t[$i][0],
            [T_WHITESPACE,T_COMMENT,T_DOC_COMMENT],true)))return $i;
    return null;
}
function inspect(string $source):array{
    if(!str_starts_with($source,'<?php'))throw new RuntimeException('Not PHP source');
    $tokens=token_get_all($source,TOKEN_PARSE);
    $direct=0;$shared=0;
    foreach($tokens as $i=>$token){
        if(!is_array($token)||!in_array($token[0],[
            T_STRING,T_NAME_FULLY_QUALIFIED,T_NAME_RELATIVE,T_NAME_QUALIFIED],true))continue;
        $short=strtolower($token[1]);
        $last=strrpos($short,'\\');
        if($last!==false)$short=substr($short,$last+1);
        $next=significant($tokens,$i+1);
        if($next===null)continue;
        if($short==='sodium_crypto_sign_verify_detached'&&val($tokens[$next])==='(')$direct++;
        if($short==='ed25519backend'&&val($tokens[$next])==='::'){
            $method=significant($tokens,$next+1);
            $paren=$method===null?null:significant($tokens,$method+1);
            if($paren!==null&&strtolower(val($tokens[$method]))==='verifydetached'
                &&val($tokens[$paren])==='(')$shared++;
        }
    }
    if($direct!==0)throw new RuntimeException('Direct sodium verify call count: '.$direct);
    if($shared<1)throw new RuntimeException('Shared Ed25519Backend verification missing');
    if(!str_contains($source,"require_once __DIR__ . '/Ed25519Backend.php';"))
        throw new RuntimeException('Standalone common backend require missing');
    return ['shared'=>$shared,'direct'=>$direct];
}
function selfTest():void{
    $prefix="<?php\nrequire_once __DIR__ . '/Ed25519Backend.php';\n";
    $call='Ed25519Backend::verifyDetached($s,$m,$k);';
    $good=[
        $prefix.$call,
        $prefix.$call."\n// sodium_crypto_sign_verify_detached(\$s);",
        $prefix.$call."\n/* \\sodium_crypto_sign_verify_detached(\$s); */",
        $prefix.$call."\n\$x='sodium_crypto_sign_verify_detached(\$s)';",
        $prefix.'\AiSiteCms\Release\Ed25519Backend::verifyDetached($s,$m,$k);'
    ];
    $bad=[
        $prefix.$call.'sodium_crypto_sign_verify_detached($s,$m,$k);',
        $prefix.$call.'\sodium_crypto_sign_verify_detached($s,$m,$k);',
        $prefix.$call.'SODIUM_crypto_sign_VERIFY_detached ($s,$m,$k);',
        $prefix.$call.'\AiSiteCms\sodium_crypto_sign_verify_detached($s,$m,$k);',
        $prefix.'sodium_crypto_sign_verify_detached($s,$m,$k);',
        '<?php '.$call,
        $prefix.'Ed25519Backend::available();',
        'not php'
    ];
    $count=0;
    foreach($good as $v){inspect($v);$count++;}
    foreach($bad as $v){
        try{inspect($v);}catch(RuntimeException){$count++;continue;}
        throw new RuntimeException('Adversarial input bypassed source audit');
    }
    if($count!==13)throw new RuntimeException('Incomplete source invariant mutation coverage');
    echo "Stage2 Ed25519 source callsite offline regression PASS 13 assertions; token-only, NOT crypto or native-free proof\n";
}
if(PHP_SAPI!=='cli')exit(3);
if($argc===2&&$argv[1]==='--self-test'){selfTest();exit(0);}
if($argc!==1){fwrite(STDERR,"Usage: php ed25519-callsite-audit.php [--self-test]\n");exit(2);}
$root=dirname(__DIR__,2).'/cms/src/Release';$calls=0;
foreach(TARGETS as $file){
    if(!is_file($root.'/'.$file)||is_link($root.'/'.$file))
        throw new RuntimeException('Original verifier missing: '.$file);
    $r=inspect(file_get_contents($root.'/'.$file));
    $calls+=$r['shared'];
}
echo 'Stage2 shared Ed25519 backend original source PASS '.count(TARGETS)
    .' PHP verifiers; '.$calls.' callsites; no direct global detached calls; source only, NOT Sodium-free'."\n";
