<?php
declare(strict_types=1);

// Original Stage2 signed settlement verifier exercised in a separate PHP CLI.
// The Node test owns ephemeral keys and immutable external expected heads;
// no PHP signing keys, application code writes, host or database connections.
if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1'
    || $argc !== 3 || !in_array($argv[1], ['native','compat','absent'], true)) {
    fwrite(STDERR, "STAGE2_CROSS_BACKEND_INVALID_INVOCATION\n");
    exit(7);
}
try {
    $mode = $argv[1];
    $native = extension_loaded('sodium');
    if (($mode === 'native' && !$native) || ($mode !== 'native' && $native)) {
        throw new LogicException('Wrong physical native Sodium runtime');
    }
    if ($mode === 'compat') {
        $loader = getenv('SODIUM_COMPAT_AUTOLOAD');
        if (!$loader || !is_file($loader)) {
            throw new LogicException('Pinned candidate autoload unavailable');
        }
        require_once $loader;
        if (!class_exists('ParagonIE_Sodium_Compat', false)) {
            throw new LogicException('Loaded candidate class unavailable');
        }
    }
    if ($mode === 'absent' && (function_exists('sodium_crypto_sign_verify_detached')
        || class_exists('ParagonIE_Sodium_Compat', false))) {
        throw new LogicException('Missing-backend test has an Ed25519 backend');
    }
    $json = file_get_contents($argv[2]);
    if ($json === false) throw new LogicException('Missing test input');
    $v = json_decode($json, true, 12, JSON_THROW_ON_ERROR);
    if (!is_array($v) || array_keys($v) !== [
        'settlements','receipts','permits','publicPem','operatorPin',
        'publisherPin','receiptHead','settlementHead','siteId'
    ]) throw new LogicException('Wrong isolated test input');
    require_once dirname(__DIR__).'/src/Release/LabSettledUpgradeGate.php';
    try {
        $r = \AiSiteCms\Release\LabSettledUpgradeGate::verify(
            $v['settlements'], $v['receipts'], $v['permits'],
            $v['publicPem'], $v['operatorPin'], $v['publisherPin'],
            $v['receiptHead'], $v['settlementHead'], $v['siteId']
        );
        echo json_encode([
            'status'=>'ACCEPTED','count'=>$r['count'],
            'head'=>$r['headSha256'],'version'=>$r['receipt']['version'],
            'productionReady'=>$r['settlement']['productionReady'],
            'nativeExtension'=>$native
        ], JSON_THROW_ON_ERROR)."\n";
    } catch (\RuntimeException $e) {
        echo json_encode(['status'=>'REJECTED','nativeExtension'=>$native],
            JSON_THROW_ON_ERROR)."\n";
    }
} catch (\Throwable $e) {
    fwrite(STDERR, 'STAGE2_CROSS_BACKEND_INFRASTRUCTURE_FAILURE '.
        get_class($e).' '.$e->getMessage()."\n");
    exit(5);
}
