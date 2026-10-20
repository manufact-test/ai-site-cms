<?php
declare(strict_types=1);

// Stage2 local-only installer orchestration: PLAN is read-only,
// APPLY needs operator review and matching 64-char plan token.
// Explicitly CI/disposable SQLite only, never a hosted installer.
if (PHP_SAPI !== 'cli' || $argc !== 8
    || !in_array(($argv[1] ?? ''),['--plan','--apply'],true)) {
    fwrite(STDERR,"EMPTY_INSTALL_OPERATOR_REFUSED\n");
    exit(3);
}
require dirname(__DIR__).'/vendor/autoload.php';

try {
    $values=[];
    foreach (array_slice($argv,2) as $option) {
        if (!preg_match('/^--(cms-root|site-root|family|capabilities-file|binding-file|approval)=(.+)$/D',
            $option,$match) || isset($values[$match[1]])) {
            throw new RuntimeException('Unexpected or duplicate option');
        }
        $values[$match[1]]=$match[2];
    }
    $expected=['cms-root','site-root','family','capabilities-file','binding-file','approval'];
    $names=array_keys($values);sort($names,SORT_STRING);
    sort($expected,SORT_STRING);
    if ($names!==$expected) throw new RuntimeException('Missing operator option');
    $capFile=$values['capabilities-file'];
    $stat=@lstat($capFile);
    if ($stat===false || is_link($capFile) || !is_file($capFile)
        || ($stat['nlink']??0)!==1 || $stat['size']<2 || $stat['size']>4096
        || realpath($capFile)!==$capFile) {
        throw new RuntimeException('Unsafe declared capability file');
    }
    $flags=json_decode((string)file_get_contents($capFile),true,8,JSON_THROW_ON_ERROR);
    if (!is_array($flags)) throw new RuntimeException('Capabilities must be an object');
    $env=[];
    foreach (['CMS_STAGE2_RUNTIME_GATE','CMS_ENV','CMS_ALLOW_SQLITE_TEST_ONLY',
        'CMS_DB_DSN','CMS_SITE_ID'] as $key) {
        $value=getenv($key);
        $env[$key]=$value===false?null:$value;
    }
    if ($argv[1]==='--plan') {
        if ($values['approval']!=='none') {
            throw new RuntimeException('Plan must not take an approval token');
        }
        $result=\AiSiteCms\Hosting\LabEmptyCmsInstaller::plan(
            $values['cms-root'],$values['site-root'],$values['family'],$flags,
            $values['binding-file'],$env
        );
    } else {
        $result=\AiSiteCms\Hosting\LabEmptyCmsInstaller::apply(
            $values['cms-root'],$values['site-root'],$values['family'],$flags,
            $values['binding-file'],$env,$values['approval']
        );
    }
    echo json_encode($result,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),"\n";
    exit(0);
} catch (Throwable $error) {
    // Avoid accidental paths, DSN, credentials or private configuration disclosure.
    fwrite(STDERR,"EMPTY_INSTALL_OPERATOR_REFUSED\n");
    exit(3);
}
