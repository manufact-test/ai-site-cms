<?php
declare(strict_types=1);

// Disposable cross-runtime CI-only: a Node Ed25519 owner signature must be
// understood by exactly the real PHP Hostinger installer verifier.
// No DB, HTTP, credentials output, operator side effects or host access.
if (PHP_SAPI !== 'cli' || $argc !== 4
    || getenv('CI') !== 'true' || getenv('GITHUB_ACTIONS') !== 'true') {
    fwrite(STDERR,"STAGE2_OWNER_WRITE_CROSS_RUNTIME_CI_ONLY\n");
    exit(3);
}
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $local = $argv[1];
    $task = \AiSiteCms\Hosting\Stage2PrivateOperatorRecord::readJsonObject(
        $argv[2], 4096
    );
    $manifest = $argv[3];
    if (!is_string($manifest) || !preg_match('/\A[a-f0-9]{64}\z/D', $manifest)) {
        throw new RuntimeException('BAD_DIGEST');
    }
    \AiSiteCms\Hosting\Stage2OwnerWriteConsent::verify($local,$task,$manifest);
    echo "STAGE2_NODE_TO_PHP_WRITE_SIGNATURE_VERIFIED_NO_DB\n";
} catch (Throwable $ignored) {
    fwrite(STDERR,"STAGE2_NODE_TO_PHP_WRITE_SIGNATURE_REFUSED\n");
    exit(3);
}
