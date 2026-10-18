<?php
declare(strict_types=1);

// Lab-only read-only PHP verifier: no signing keys, filesystem mutation or deploy.
// Trust root, current signer PEM and external minimum epoch are operator inputs.
$help = "Usage: php bin/verify-lab-trust.php --inspect|--verify-release --chain=... --root-pem=... --root-pin=... --min-epoch=... [--signer-pem=... --folder=... --version=...]\n";
$mode = $argv[1] ?? '';
if (PHP_SAPI !== 'cli' || !in_array($mode, ['--inspect','--verify-release'], true)) {
    fwrite(STDERR, $help);
    exit(2);
}
$options = [];
foreach (array_slice($argv, 2) as $arg) {
    if (!preg_match('/^--([a-z-]+)=(.*)$/D', $arg, $m)
        || !in_array($m[1], ['chain','root-pem','root-pin','min-epoch',
            'signer-pem','folder','version'], true)
        || isset($options[$m[1]]) || $m[2] === '') {
        fwrite(STDERR, 'Invalid trust verifier arguments' . "\n");
        exit(2);
    }
    $options[$m[1]] = $m[2];
}
foreach (['chain','root-pem','root-pin','min-epoch'] as $key) {
    if (!isset($options[$key])) {
        fwrite(STDERR, 'Missing external trust parameter' . "\n");
        exit(2);
    }
}
if (!preg_match('/^(0|[1-9][0-9]?)$/D', $options['min-epoch'])
    || (int)$options['min-epoch'] > 16
    || ($mode === '--verify-release'
        && (!isset($options['signer-pem'],$options['folder'],$options['version'])))
    || ($mode === '--inspect'
        && (isset($options['signer-pem']) || isset($options['folder']) || isset($options['version'])))) {
    fwrite(STDERR, 'Invalid trust verification mode/epoch' . "\n");
    exit(2);
}
require dirname(__DIR__) . '/src/Release/TrustedChainVerifier.php';
try {
    if ($mode === '--inspect') {
        $result = \AiSiteCms\Release\TrustedChainVerifier::inspect(
            $options['chain'], $options['root-pem'], $options['root-pin'], (int)$options['min-epoch']
        );
    } else {
        $result = \AiSiteCms\Release\TrustedChainVerifier::verifyRelease(
            $options['chain'], $options['root-pem'], $options['root-pin'], (int)$options['min-epoch'],
            $options['signer-pem'], $options['folder'], $options['version']
        );
    }
    echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
} catch (\Throwable $exception) {
    fwrite(STDERR, "Offline trust verification refused\n");
    exit(3);
}
