<?php
declare(strict_types=1);

/**
 * Read-only credential-free CLI preflight for exactly the Stage2 CMS test.
 * Cron points to this absolute offweb PHP file, never a URL.
 * It never reads once.json, connects to a DB, writes a file or activates CMS.
 *
 * An unsigned package self-check is NOT a publisher signature.
 */
if (PHP_SAPI !== 'cli' || $argc !== 1 || PHP_VERSION_ID < 80100) {
    if (PHP_SAPI === 'cli') fwrite(STDERR, "STAGE2_PREFLIGHT_CLI_ONLY\n");
    exit(3);
}
$root = realpath(dirname(__DIR__));
$parent = $root === false ? false : dirname($root);
$public = $parent === false ? '' : $parent.'/public_html';
if ($root === false || basename($root) !== 'cms-stage2-offweb-runtime'
    || $parent === false || is_link($root)
    || !is_dir($public) || is_link($public)
    || realpath($public) !== $public
    || str_starts_with($root, $public.'/')) {
    fwrite(STDERR, "STAGE2_PREFLIGHT_OFFWEB_REQUIRED\n");
    exit(3);
}
$local = $parent.'/cms-stage2-local';
$privateState = 'absent';
if (file_exists($local) || is_link($local)) {
    $stat = @lstat($local);
    $privateState = $stat !== false
        && is_dir($local) && !is_link($local)
        && realpath($local) === $local
        && ($stat['mode'] & 0077) === 0
        ? 'private_directory_ready' : 'private_directory_refused';
}
try {
    require_once $root.'/src/Hosting/PackageArtifactVerifier.php';
    $evidence = \AiSiteCms\Hosting\PackageArtifactVerifier::verify($root);
    $digest = hash_file('sha256', $root.'/private/package-manifest.json');
    if (!is_string($digest)) throw new RuntimeException('UNAVAILABLE_DIGEST');
    $report = [
        'format' => 'ai-site-cms-stage2-hostinger-cli-preflight-v1',
        'targetSite' => 'hostinger-stage2-test',
        'sapi' => 'cli',
        'phpVersionMajorMinor' => PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION,
        'pdoMysqlAvailable' => class_exists(PDO::class)
            && in_array('mysql', PDO::getAvailableDrivers(), true),
        'privateLocalState' => $privateState,
        'packageManifestSha256' => $digest,
        'unsignedInventoryFilesVerified' => $evidence['filesVerified'],
        'unsignedInventoryPassed' => true,
        'databaseConnectionAttempted' => false,
        'credentialsRead' => false,
        'filesWritten' => false,
        'cmsPublicActivated' => false,
        'stage2Accepted' => false,
        'productionReady' => false,
        'publisherSignatureVerified' => false
    ];
    echo json_encode($report, JSON_THROW_ON_ERROR|JSON_UNESCAPED_SLASHES)."\n";
    exit(0);
} catch (Throwable $ignored) {
    fwrite(STDERR, "STAGE2_PREFLIGHT_REFUSED\n");
    exit(3);
}
