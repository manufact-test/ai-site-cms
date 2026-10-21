<?php
declare(strict_types=1);
// Subprocess-only, read-only verifier for Node-signed disposable research docs.
// Never signs or installs anything; distinguish deliberate policy rejection from
// runtime fatal / missing global Ed25519 support.
if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1' || $argc !== 3) {
    fwrite(STDERR, "INFRASTRUCTURE_FAILURE: unauthorized invocation\n");
    exit(7);
}
try {
    $o = json_decode($argv[1], true, 20, JSON_THROW_ON_ERROR);
    if (!is_array($o) || !in_array($o['backend'] ?? null, ['native', 'compat'], true)) {
        throw new LogicException('Invalid backend selection');
    }
    if ($o['backend'] === 'native' && !extension_loaded('sodium')) {
        throw new LogicException('Native Sodium extension missing');
    }
    if ($o['backend'] === 'compat') {
        if (extension_loaded('sodium')) {
            throw new LogicException('Native Sodium extension still loaded');
        }
        $autoload = getenv('SODIUM_COMPAT_AUTOLOAD');
        if (!$autoload || !is_file($autoload)) {
            throw new LogicException('Missing independently attested compat autoloader');
        }
        require_once $autoload;
        if (!class_exists('ParagonIE_Sodium_Compat')) {
            throw new LogicException('Pinned compat verifier class missing');
        }
    }
    require_once $argv[2];
    try {
        $r = \AiSiteCms\Release\LabSettledUpgradeGate::verify(
            $o['settlements'], $o['receipts'], $o['archive'], $o['keyfile'],
            $o['pin'], $o['publisher'], $o['receiptHead'],
            $o['settlementHead'], $o['site']
        );
        echo json_encode([
            'status'=>'ACCEPTED', 'count'=>$r['count'],
            'head'=>$r['headSha256'],
            'receiptVersion'=>$r['receipt']['version'],
            'productionReady'=>$r['settlement']['productionReady'],
            'nativeExt'=>extension_loaded('sodium'),
            'globalVerifier'=>function_exists('sodium_crypto_sign_verify_detached')
        ], JSON_THROW_ON_ERROR);
    } catch (\RuntimeException $e) {
        echo json_encode([
            'status'=>'REJECTED',
            'nativeExt'=>extension_loaded('sodium'),
            'globalVerifier'=>function_exists('sodium_crypto_sign_verify_detached')
        ], JSON_THROW_ON_ERROR);
    }
} catch (\Throwable $e) {
    fwrite(STDERR, 'INFRASTRUCTURE_FAILURE '.get_class($e).' '.$e->getMessage()."\n");
    exit(5);
}
