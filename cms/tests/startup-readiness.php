<?php
declare(strict_types=1);

// Stage2 test-only readiness across PHP 8.1–8.4. No network or hosting.
require dirname(__DIR__).'/vendor/autoload.php';

use AiSiteCms\Hosting\EmptyCmsStartupReadiness as Gate;
use AiSiteCms\Storage\SchemaManager;

$base=sys_get_temp_dir().'/ai-site-stage2-boot-'.bin2hex(random_bytes(12));
if (!mkdir($base,0700)) throw new RuntimeException('Unable to create isolated test root');
$cms=dirname(__DIR__);
$db=$base.'/site.sqlite';
$env=[
    'CMS_STAGE2_RUNTIME_GATE'=>'ci-only',
    'CMS_ENV'=>'test',
    'CMS_ALLOW_SQLITE_TEST_ONLY'=>'1',
    'CMS_SITE_ID'=>'fixture-one',
    'CMS_DB_DSN'=>'sqlite:'.$db,
];
$checks=0;
$yes=static function (bool $condition,string $reason) use (&$checks): void {
    ++$checks;
    if (!$condition) throw new RuntimeException('Readiness gate: '.$reason);
};
try {
    $absent=Gate::inspect($cms,$env);
    $yes(!$absent['ready'] && $absent['state']==='database_boundary_invalid',
        'missing DB must not be created by readiness');
    $yes(!file_exists($db),'no accidental SQLite file creation');
    $pdo=new PDO('sqlite:'.$db);
    (new SchemaManager($pdo,true))->installSite('fixture-one');
    unset($pdo);
    $bytes=file_get_contents($db);
    $ready=Gate::inspect($cms,$env);
    $yes($ready['ready'] && $ready['state']==='ready' && !$ready['productionReady']
        && $ready['readOnly'] && $ready['ciOnly'],'initialized empty schema accepted as laboratory only');
    $yes(file_get_contents($db)===$bytes,'readiness performs no DML');
    foreach ([
        ['CMS_SITE_ID'=>'fixture-other'],
        ['CMS_SITE_ID'=>'../../../private'],
        ['CMS_ENV'=>'production'],
        ['CMS_STAGE2_RUNTIME_GATE'=>''],
        ['CMS_STAGE2_RUNTIME_GATE'=>'production'],
        ['CMS_ALLOW_SQLITE_TEST_ONLY'=>'0'],
        ['CMS_DB_DSN'=>'mysql:host=127.0.0.1;dbname=secret'],
        ['CMS_DB_DSN'=>'sqlite:'.$base.'/missing.sqlite'],
        ['CMS_DB_DSN'=>'sqlite::memory:'],
        ['CMS_DB_DSN'=>'sqlite:relative.sqlite'],
        ['CMS_DB_DSN'=>'sqlite:'.$db.'?mode=ro'],
    ] as $case) {
        $bad=Gate::inspect($cms,array_merge($env,$case));
        $yes(!$bad['ready'] && !str_contains(json_encode($bad),$base),
            'wrong site, backend or lab mode refused without disclosure');
    }
    $link=$base.'/sym.sqlite';
    symlink($db,$link);
    $yes(!Gate::inspect($cms,array_merge($env,['CMS_DB_DSN'=>'sqlite:'.$link]))['ready'],
        'symbolic-link DB rejected');
    unlink($link);
    $hard=$base.'/hard.sqlite';
    link($db,$hard);
    $yes(!Gate::inspect($cms,$env)['ready'],'hard-linked database refused');
    unlink($hard);
    $yes(Gate::inspect($cms,$env)['ready'],'original DB usable after removing hardlink');
    $pdo=new PDO('sqlite:'.$db);
    $checksum=$pdo->query('SELECT checksum FROM cms_schema_migrations WHERE version=1')->fetchColumn();
    $pdo->exec("UPDATE cms_schema_migrations SET checksum='malicious' WHERE version=1");
    $yes(!Gate::inspect($cms,$env)['ready'],'tampered schema journal blocks readiness');
    $stmt=$pdo->prepare('UPDATE cms_schema_migrations SET checksum=? WHERE version=1');
    $stmt->execute([$checksum]);
    unset($pdo);
    $yes(Gate::inspect($cms,$env)['ready'],'manual restoration of journal allows startup');
    echo "Stage2 empty-CMS opt-in startup readiness PHP compatibility PASS: {$checks} checks; no host or production gate\n";
}finally{
    if(is_file($db))unlink($db);
    if(is_dir($base))rmdir($base);
}
