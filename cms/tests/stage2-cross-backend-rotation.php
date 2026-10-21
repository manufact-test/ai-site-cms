<?php
declare(strict_types=1);

// Read-only original Stage2 trust rotation verifier, driven by ephemeral
// Node-signed evidence. The PHP subprocess never receives a private key.
// This tests no native Sodium, optional pinned pure PHP and fail-closed cases.
if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1' || $argc !== 4
    || !in_array($argv[1], ['native','compat','absent'], true)) {
    fwrite(STDERR, "STAGE2_ROTATION_INVALID_INVOCATION\n");
    exit(7);
}
try {
    $mode = $argv[1];
    $native = extension_loaded('sodium');
    if (($mode === 'native' && !$native) || ($mode !== 'native' && $native)) {
        throw new LogicException('Incorrect physical Sodium runtime');
    }
    if ($mode === 'compat') {
        $loader = getenv('SODIUM_COMPAT_AUTOLOAD');
        if (!$loader || !is_file($loader)) {
            throw new LogicException('Vetted isolated compat autoloader missing');
        }
        require_once $loader;
        if (!class_exists('ParagonIE_Sodium_Compat', false)) {
            throw new LogicException('Pinned Ed25519 backend unavailable');
        }
    }
    if ($mode === 'absent'
        && (function_exists('sodium_crypto_sign_verify_detached')
            || class_exists('ParagonIE_Sodium_Compat', false))) {
        throw new LogicException('Absent crypto mode still has a backend');
    }
    $json = file_get_contents($argv[2]);
    if ($json === false) throw new LogicException('No independent operator input');
    $v = json_decode($json, true, 12, JSON_THROW_ON_ERROR);
    if (!is_array($v) || array_keys($v) !==
        ['chain','rootPem','rootPin','minEpoch','operation']) {
        throw new LogicException('Unsupported isolated input shape');
    }
    if (!is_int($v['minEpoch']) || !is_string($v['chain'])
        || !is_string($v['rootPem']) || !is_string($v['rootPin'])
        || !in_array($v['operation'], ['inspect','release'], true)) {
        throw new LogicException('Bad independent operator inputs');
    }
    require_once dirname(__DIR__) . '/src/Release/TrustedChainVerifier.php';
    try {
        if ($v['operation'] === 'release') {
            // Test only the unresolved-journal guard, before any offline
            // archive or signer reads. Never supply an actual release here.
            \AiSiteCms\Release\TrustedChainVerifier::verifyRelease(
                $v['chain'], $v['rootPem'], $v['rootPin'],
                $v['minEpoch'], $v['rootPem'],
                dirname($v['chain']) . '/no-release', '0.2.0-stage2.1'
            );
            throw new LogicException('Unexpectedly authorized unsigned release');
        }
        $r = \AiSiteCms\Release\TrustedChainVerifier::inspect(
            $v['chain'], $v['rootPem'], $v['rootPin'], $v['minEpoch']
        );
        echo json_encode([
            'status'=>'ACCEPTED', 'epoch'=>$r['epoch'],
            'active'=>$r['active_key_fingerprint'],
            'floor'=>$r['minimum_release_version'],
            'journal'=>$r['status'], 'productionReady'=>$r['production_ready'],
            'nativeExtension'=>$native
        ], JSON_THROW_ON_ERROR) . "\n";
    } catch (\RuntimeException $e) {
        echo json_encode(['status'=>'REJECTED',
            'nativeExtension'=>$native], JSON_THROW_ON_ERROR) . "\n";
    }
} catch (\Throwable $e) {
    fwrite(STDERR, 'STAGE2_ROTATION_INFRASTRUCTURE_FAILURE ' .
        get_class($e) . ' ' . $e->getMessage() . "\n");
    exit(5);
}
