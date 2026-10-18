<?php
declare(strict_types=1);

// Stage 2: explicit read-only architecture inspector, not a site installer.
// No network, database connection, deployment, credentials or framework boot.
require dirname(__DIR__).'/src/Hosting/SiteRuntimeTopology.php';

use AiSiteCms\Hosting\SiteRuntimeTopology;

try {
    if (PHP_SAPI !== 'cli') {
        throw new RuntimeException('Architecture inspection is CLI-only');
    }
    $args = array_slice($argv,1);
    if ($args === ['--help']) {
        echo "Usage: php bin/site-runtime-topology.php --check",
            " --cms-root=/canonical/path --site-root=/canonical/path",
            " --family=html|php|next-static|next-ssr",
            " --capabilities-file=/private/capabilities.json\n";
        exit(0);
    }
    if (count($args) !== 5 || $args[0] !== '--check') {
        throw new RuntimeException('All explicit read-only topology options are required');
    }
    $options = [];
    foreach (array_slice($args,1) as $arg) {
        if (!preg_match('/^--(cms-root|site-root|family|capabilities-file)=(.+)$/D', $arg, $m)
            || isset($options[$m[1]])) {
            throw new RuntimeException('Unexpected, empty or duplicate CLI option');
        }
        $options[$m[1]] = $m[2];
    }
    if (count($options) !== 4) {
        throw new RuntimeException('Missing explicit architecture options');
    }
    $file = $options['capabilities-file'];
    $stat = @lstat($file);
    if ($stat === false || is_link($file) || !is_file($file)
        || ($stat['nlink'] ?? 0) !== 1 || $stat['size'] < 2
        || $stat['size'] > 4096 || realpath($file) !== $file) {
        throw new RuntimeException('Unsafe host declaration file');
    }
    $bytes = @file_get_contents($file);
    if ($bytes === false || strlen($bytes) !== $stat['size']) {
        throw new RuntimeException('Invalid capability declaration bytes');
    }
    $declared = json_decode($bytes,true,8,JSON_THROW_ON_ERROR);
    if (!is_array($declared)) {
        throw new RuntimeException('Host declaration must be a JSON object');
    }
    $report = SiteRuntimeTopology::assess(
        $options['cms-root'],$options['site-root'],$options['family'],$declared
    );
    // The result contains ONLY abstract capability and inventory counts.
    // In particular: never emit local paths, environment or credentials.
    echo json_encode($report,JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),"\n";
    exit($report['declarationCompatible'] ? 0 : 4);
} catch (Throwable $error) {
    fwrite(STDERR,"RUNTIME_TOPOLOGY_REFUSED\n");
    exit(3);
}
