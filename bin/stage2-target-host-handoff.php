<?php
declare(strict_types=1);

// DELIBERATELY DORMANT on any real target unless an operator separately
// records the owner's read-only permission. This program DOES NOT verify that
// permission and its presence is NEVER consent to access a server.
// In CI it runs only with the existing disposable Stage2 runtime grant.
// The optional HTTP file contains EXTERNAL CLAIMS, not a live network probe.
if (PHP_SAPI !== 'cli' || !in_array($argc,[6,7],true)
    || ($argv[1] ?? '') !== '--check') {
    fwrite(STDERR, "TARGET_HOST_HANDOFF_REFUSED\n");
    exit(3);
}
$keys=['--cms-root=','--cms-public=','--site-root=','--family='];
foreach ($keys as $i=>$key) {
    if (!str_starts_with($argv[$i+2] ?? '', $key)
        || strlen($argv[$i+2]) === strlen($key)) {
        fwrite(STDERR,"TARGET_HOST_HANDOFF_REFUSED\n");
        exit(3);
    }
}
if ($argc===7 && !str_starts_with($argv[6],'--http-observations=')) {
    fwrite(STDERR,"TARGET_HOST_HANDOFF_REFUSED\n");exit(3);
}
$ci=getenv('CMS_ENV')==='test'
    && getenv('CMS_STAGE2_RUNTIME_GATE')==='ci-bound'
    && getenv('CMS_ALLOW_SQLITE_TEST_ONLY')==='1';
$operator=getenv('CMS_ENV')!=='test'
    && getenv('CMS_STAGE2_OWNER_READONLY_PERMISSION')==='owner-grant-recorded-read-only';
if (!$ci && !$operator) {
    fwrite(STDERR,"TARGET_HOST_HANDOFF_REFUSED\n");exit(3);
}
try {
    require dirname(__DIR__).'/vendor/autoload.php';
    $root=substr($argv[2],strlen($keys[0]));
    $public=substr($argv[3],strlen($keys[1]));
    $site=substr($argv[4],strlen($keys[2]));
    $family=substr($argv[5],strlen($keys[3]));
    $http=null;
    if ($argc===7) {
        $file=substr($argv[6],strlen('--http-observations='));
        $parent=dirname($file);
        $stat=@lstat($file);
        if ($file==='' || !str_starts_with($file,'/')
            || str_contains($file,"\0") || is_link($file)
            || realpath($file)!==$file || $parent==='/' || is_link($parent)
            || realpath($parent)!==$parent || (@fileperms($parent) & 0077)!==0
            || str_starts_with($file,$root.'/')
            || str_starts_with($file,$site.'/')
            || $stat===false || !is_file($file)
            || ($stat['nlink'] ?? 0)!==1 || ($stat['mode'] & 0077)!==0
            || $stat['size']<20 || $stat['size']>4096) {
            throw new RuntimeException('Unsafe external observation file');
        }
        $bytes=@file_get_contents($file);
        if (!is_string($bytes) || strlen($bytes)!==$stat['size']) {
            throw new RuntimeException('Unreadable external observation file');
        }
        $http=json_decode($bytes,true,16,JSON_THROW_ON_ERROR);
        if (!is_array($http)) throw new RuntimeException('Invalid observation shape');
    }
    $report=\AiSiteCms\Hosting\Stage2TargetHostHandoff::inspect(
        $root,$public,$site,$family,$http
    );
    echo json_encode($report,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),"\n";
    // 0 proves only that LOCAL read-only CLI and filesystem checks succeeded.
    // It never authorizes Stage2 acceptance or any production deployment.
    exit($report['localFilesystemAndPackageCompatible'] ? 0 : 4);
} catch (Throwable $e) {
    // No path, DSN, credential, site origin or internal exception disclosed.
    fwrite(STDERR,"TARGET_HOST_HANDOFF_REFUSED\n");exit(3);
}
