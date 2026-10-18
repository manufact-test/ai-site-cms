<?php
declare(strict_types=1);

// Read-only OFFLINE CI/operator rehearsal. NEVER a production installer or signing authority.
// Pinned fingerprint and PEM must be provided out-of-band; no key is bundled here.
if (PHP_SAPI !== 'cli' || ($argv[1] ?? '') !== '--verify') {
    fwrite(STDERR, "Usage: php bin/verify-lab-release.php --verify --folder=... --trusted-public-key=... --expected-version=... --expected-fingerprint=... [--minimum-version=...] [--revoked-fingerprint=...]\n");
    exit(2);
}
$options = [];
foreach (array_slice($argv, 2) as $arg) {
    if (!preg_match('/^--([a-z-]+)=(.*)$/D', $arg, $match)
        || !in_array($match[1], ['folder','trusted-public-key','expected-version',
            'expected-fingerprint','minimum-version','revoked-fingerprint'], true)
        || isset($options[$match[1]]) || $match[2] === '') {
        fwrite(STDERR, "Invalid offline verifier argument\n");
        exit(2);
    }
    $options[$match[1]] = $match[2];
}
foreach (['folder','trusted-public-key','expected-version','expected-fingerprint'] as $required) {
    if (!isset($options[$required])) {
        fwrite(STDERR, "Explicit offline trust parameters required\n");
        exit(2);
    }
}
require dirname(__DIR__) . '/src/Release/OfflineReleaseVerifier.php';
try {
    $result = \AiSiteCms\Release\OfflineReleaseVerifier::verify(
        $options['folder'], $options['trusted-public-key'], $options['expected-version'],
        $options['expected-fingerprint'], $options['minimum-version'] ?? null,
        isset($options['revoked-fingerprint']) ? [$options['revoked-fingerprint']] : []
    );
    echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), "\n";
} catch (\Throwable $exception) {
    // Never echo exception text: it could contain operator-supplied paths.
    fwrite(STDERR, "Offline release verification refused\n");
    exit(3);
}
