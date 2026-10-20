<?php
declare(strict_types=1);
// Run from any location: php ed25519-lab.php native|absent|compat
// On PHP without ext-sodium, provide SODIUM_COMPAT_AUTOLOAD pointing to an
// independently obtained, exact-pinned v2.5.2 autoload.php outside this repo.
$mode = $argv[1] ?? '';
if (!in_array($mode, ['native','absent','compat'], true)) {
    fwrite(STDERR, "Usage: php [ -n ] ed25519-lab.php native|absent|compat\n");
    exit(2);
}
$autoload = getenv('SODIUM_COMPAT_AUTOLOAD');
if ($mode === 'compat') {
    if (extension_loaded('sodium')) {
        fwrite(STDERR, "INVALID TEST: compat mode must run without native ext-sodium (try php -n)\n");
        exit(2);
    }
    if (!$autoload || !is_file($autoload)) {
        fwrite(STDERR, "BLOCKED: provide trusted pinned sodium_compat 2.5.2 autoload.php\n");
        exit(2);
    }
    require_once $autoload;
    if (!class_exists('ParagonIE_Sodium_Compat', false)) {
        fwrite(STDERR, "BLOCKED: compat loader did not expose class\n");
        exit(2);
    }
}
if ($mode === 'native' && !extension_loaded('sodium')) {
    fwrite(STDERR, "BLOCKED: native ext-sodium not present\n");
    exit(2);
}
if ($mode === 'absent' && (extension_loaded('sodium')
    || class_exists('ParagonIE_Sodium_Compat', false))) {
    fwrite(STDERR, "INVALID TEST: absent mode has a verifier; use php -n\n");
    exit(2);
}
require_once __DIR__ . '/../../cms/src/Release/Ed25519Backend.php';
use AiSiteCms\Release\Ed25519Backend as Backend;
function check(bool $ok, string $name): void {
    if (!$ok) throw new RuntimeException('FAIL: '.$name);
    echo "PASS ".$name."\n";
}
check(Backend::available() === ($mode !== 'absent'), 'strict backend availability');
$pub=hex2bin('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a');
$sig=hex2bin('e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155'
    .'5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b');
check($pub !== false && $sig !== false, 'RFC 8032 test vector decoded');
if ($mode === 'absent') {
    check(!Backend::verifyDetached($sig, '', $pub), 'missing backend fails closed');
    echo "NO_CRYPTO_TEST: absent mode correctly rejects all signatures\n";
    exit(0);
}
check(Backend::verifyDetached($sig, '', $pub), 'RFC 8032 Ed25519 valid detached');
check(!Backend::verifyDetached($sig, 'tampered', $pub), 'message tamper rejected');
check(!Backend::verifyDetached(substr_replace($sig, chr(ord($sig[0])^1), 0, 1), '', $pub), 'signature tamper rejected');
check(!Backend::verifyDetached($sig, '', str_repeat("\0", 32)), 'wrong public key rejected');
check(!Backend::verifyDetached(substr($sig, 1), '', $pub), 'short signature rejected');
check(!Backend::verifyDetached($sig, '', substr($pub, 1)), 'short public key rejected');
check(!Backend::verifyDetached($sig, "AI-SITE-CMS-STAGE2-LAB-ENVELOPE-V1\0", $pub), 'domain mismatch rejected');
$loops = $mode==='compat' ? 8 : 250;
$start=hrtime(true);
for ($i=0;$i<$loops;$i++) {
    if (!Backend::verifyDetached($sig, '', $pub)) throw new RuntimeException('Benchmark wrong answer');
}
$elapsed=(hrtime(true)-$start)/1e6;
echo json_encode(['backend'=>$mode,'testVector'=>'RFC8032/test1','checks'=>'passed',
    'verifications'=>$loops,'totalMs'=>round($elapsed,3),
    'meanMs'=>round($elapsed/$loops,3),'performance'=>'local-not-target-host',
    'productionApproved'=>false],JSON_UNESCAPED_SLASHES)."\n";