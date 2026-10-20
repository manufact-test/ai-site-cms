<?php
declare(strict_types=1);
$auto = getenv('SODIUM_COMPAT_AUTOLOAD');
if ($auto !== false && $auto !== '') {
    if (!is_file($auto)) { fwrite(STDERR, "Untrusted/unavailable compat loader\n"); exit(2); }
    require_once $auto;
}
$mode=getenv('ED25519_LAB_MODE');
$native=function_exists('sodium_crypto_sign_verify_detached');
if (($mode==='native' && !$native) || (($mode==='compat' || $mode==='absent') && $native)) {
    fwrite(STDERR,"INVALID LAB RUNTIME: native/compat presence mismatch\n"); exit(2);
}
if ($mode==='compat' && !class_exists('ParagonIE_Sodium_Compat', false)) {
    fwrite(STDERR,"INVALID LAB RUNTIME: missing actual compat class\n"); exit(2);
}
require_once __DIR__.'/../../cms/src/Release/OfflineReleaseVerifier.php';
try {
    $r = \AiSiteCms\Release\OfflineReleaseVerifier::verify(
        $argv[1]??'', $argv[2]??'', $argv[3]??'', $argv[4]??'', $argv[5]??''
    );
    echo json_encode($r,JSON_THROW_ON_ERROR)."\n";
} catch (\Throwable $e) {
    fwrite(STDERR,get_class($e).': '.$e->getMessage()."\n");
    exit(1);
}