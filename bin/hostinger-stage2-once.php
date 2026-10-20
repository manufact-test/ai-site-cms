<?php
declare(strict_types=1);

/**
 * Hostinger hPanel PHP Cron Jobs: supply this absolute FILE PATH (not a URL).
 * Intended location: .../public_html/../cms-stage2-offweb-runtime/bin/hostinger-stage2-once.php
 * hPanel PHP cron's CLI version must be PHP >= 8.1.
 * Do NOT schedule until a private, mode-0600 sibling once.json was created
 * under ../cms-stage2-local/ and its scope inspected by the operator.
 *
 * No HTTP installation, no SSH, no secrets in GitHub or URL query strings.
 * A local receipt consumes the authorization, including failed attempts.
 */
if (PHP_SAPI !== 'cli' || $argc !== 1 || PHP_VERSION_ID < 80100) {
    if (PHP_SAPI === 'cli') fwrite(STDERR, "STAGE2_CLI_ONLY\n");
    exit(3);
}
$root = realpath(dirname(__DIR__));
if ($root === false || basename($root) !== 'cms-stage2-offweb-runtime') {
    fwrite(STDERR, "STAGE2_OFFWEB_REQUIRED\n");
    exit(3);
}
// Verify *all* unsigned package bytes before executing Composer/vendor PHP.
// This is an integrity boundary only, NOT publisher-signature authentication.
try {
    require_once $root.'/src/Hosting/PackageArtifactVerifier.php';
    \AiSiteCms\Hosting\PackageArtifactVerifier::verify($root);
} catch (Throwable $ignored) {
    fwrite(STDERR, "STAGE2_PACKAGE_REFUSED\n");
    exit(3);
}
require $root.'/vendor/autoload.php';
try {
    $result = \AiSiteCms\Hosting\HostingerStage2OneShot::run(
        $root, dirname($root).'/cms-stage2-local'
    );
    $success = $result['status'] !== 'refused';
    // No DB identity/credentials, full errors or private paths to cron logs.
    fwrite($success ? STDOUT : STDERR,
        "STAGE2_ONCE_".($success ? 'RECORDED' : 'REFUSED')."\n");
    exit($success ? 0 : 3);
} catch (Throwable $ignored) {
    fwrite(STDERR, "STAGE2_ONCE_REFUSED\n");
    exit(3);
}
