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
// Before loading any other PHP from the unsigned package, compare the local
// operator's private, out-of-band manifest pin to the exact on-disk manifest.
// The entrypoint itself must still be delivered by a trusted operator; a pin
// is NOT publisher signature authentication or a production activation gate.
try {
    $local = dirname($root).'/cms-stage2-local';
    $dirStat = @lstat($local);
    if ($dirStat === false || !is_dir($local) || is_link($local)
        || realpath($local) !== $local || ($dirStat['mode'] & 0077) !== 0) {
        throw new RuntimeException('PRIVATE_LOCAL_ROOT_REQUIRED');
    }
    $taskFile = $local.'/once.json';
    $taskStat = @lstat($taskFile);
    if ($taskStat === false || !is_file($taskFile) || is_link($taskFile)
        || realpath($taskFile) !== $taskFile || ($taskStat['mode'] & 0077) !== 0
        || ($taskStat['nlink'] ?? 0) !== 1
        || $taskStat['size'] < 50 || $taskStat['size'] > 4096) {
        throw new RuntimeException('PRIVATE_TASK_REQUIRED');
    }
    $task = json_decode((string)file_get_contents($taskFile), true, 8, JSON_THROW_ON_ERROR);
    $pin = is_array($task) ? ($task['package_manifest_sha256'] ?? null) : null;
    if (!is_string($pin) || !preg_match('/\A[a-f0-9]{64}\z/D', $pin)) {
        throw new RuntimeException('EXPLICIT_PACKAGE_PIN_REQUIRED');
    }
    $manifestFile = $root.'/private/package-manifest.json';
    $digest = @hash_file('sha256', $manifestFile);
    if (!is_string($digest) || !hash_equals($pin, $digest)) {
        throw new RuntimeException('PACKAGE_MANIFEST_PIN_MISMATCH');
    }
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
