<?php
declare(strict_types=1);

// Only called in GitHub's temporary polyfill sandbox. This intentionally runs
// with php -n, where the native Sodium extension MUST be unavailable.
if ($argc !== 3 || function_exists('sodium_crypto_sign_verify_detached')) {
    fwrite(STDERR, "SODIUM_POLYFILL_FIXTURE_INVALID_CONTEXT\n");
    exit(3);
}
require $argv[2] . '/vendor/autoload.php';
require dirname(__DIR__) . '/src/Release/Ed25519Backend.php';
use AiSiteCms\Release\Ed25519Backend;
// Runner PHP may compile ext-sodium as built-in even with php -n.
 // Force ParagonIE's documented pure-PHP test path; production never sets this.
\ParagonIE_Sodium_Compat::$disableFallbackForUnitTests = true;
if (!class_exists('ParagonIE_Sodium_Compat') || !Ed25519Backend::available()) {
    fwrite(STDERR, "PINNED_POLYFILL_NOT_AVAILABLE\n");
    exit(4);
}
$v=json_decode((string)file_get_contents($argv[1]),true,8,JSON_THROW_ON_ERROR);
$decode=static function(string $key) use($v): string {
    $r=base64_decode($v[$key],true);
    if($r===false)throw new RuntimeException("Invalid fixture");
    return $r;
};
$m=$decode('message'); $sig=$decode('signature'); $pub=$decode('publicKey');
$wrong=$decode('wrongPublicKey');
$checks=[
    Ed25519Backend::verifyDetached($sig,$m,$pub),
    !Ed25519Backend::verifyDetached($sig,$m.'tampered',$pub),
    !Ed25519Backend::verifyDetached($sig,$m,$wrong),
    !Ed25519Backend::verifyDetached(str_repeat("\0",64),$m,$pub),
    !Ed25519Backend::verifyDetached(substr($sig,0,63),$m,$pub),
    !Ed25519Backend::verifyDetached($sig,$m,substr($pub,0,31))
];
if(in_array(false,$checks,true)) {
    fwrite(STDERR, "ED25519_CROSS_RUNTIME_VERIFICATION_FAILED\n");exit(5);
}
echo "Stage2 exact Composer-pinned sodium_compat 2.5.2, native ext absent: Ed25519 valid/tamper/key/length checks PASS; not a production acceptance.\n";
