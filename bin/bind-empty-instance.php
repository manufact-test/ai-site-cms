<?php
declare(strict_types=1);

// Stage2 disposable CLI-only binding issuer; never a production installer.
// Only new private files outside CMS/site directories, no overwrite.
if (PHP_SAPI !== 'cli' || ($argv[1] ?? null) !== '--create'
    || $argc !== 7) {
    fwrite(STDERR,"INSTANCE_BINDING_REFUSED\n");
    exit(3);
}
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $options=[];
    foreach (array_slice($argv,2) as $arg) {
        if (!preg_match('/^--(cms-root|site-root|family|capabilities-file|binding-file)=(.+)$/D',$arg,$match)
            || isset($options[$match[1]])) {
            throw new RuntimeException('Unexpected binding option');
        }
        $options[$match[1]]=$match[2];
    }
    if (count($options)!==5) throw new RuntimeException('Missing binding option');
    $file=$options['capabilities-file'];
    $stat=@lstat($file);
    if ($stat===false || is_link($file) || !is_file($file)
        || ($stat['nlink']??0)!==1 || $stat['size']<2 || $stat['size']>4096
        || realpath($file)!==$file) {
        throw new RuntimeException('Unsafe host capability file');
    }
    $flags=json_decode((string)file_get_contents($file),true,8,JSON_THROW_ON_ERROR);
    if (!is_array($flags)) throw new RuntimeException('Invalid host capability object');
    $env=[];
    foreach (['CMS_STAGE2_RUNTIME_GATE','CMS_ENV','CMS_ALLOW_SQLITE_TEST_ONLY',
        'CMS_DB_DSN','CMS_SITE_ID'] as $key) {
        $v=getenv($key);
        $env[$key]=$v===false?null:$v;
    }
    $result=\AiSiteCms\Hosting\LabInstanceBinding::create(
        $options['cms-root'],$options['site-root'],$options['family'],
        $flags,$options['binding-file'],$env
    );
    echo json_encode($result,JSON_THROW_ON_ERROR),"\n";
} catch (Throwable $e) {
    fwrite(STDERR,"INSTANCE_BINDING_REFUSED\n");
    exit(3);
}
