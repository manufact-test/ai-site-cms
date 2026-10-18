<?php
declare(strict_types=1);

require dirname(__DIR__).'/vendor/autoload.php';

use AiSiteCms\Hosting\LabEmptyCmsInstaller as Installer;

$root=realpath(dirname(__DIR__));
if (!is_string($root)) throw new RuntimeException('Missing local CMS');
$flags=[
    'php81'=>true,'pdo'=>true,'https'=>true,'privateStorage'=>true,
    'isolatedRoots'=>true,'rewriteRoutes'=>true,'sitePhp'=>false,
    'nodeRuntime'=>false,'reverseProxy'=>false
];
$valid=[
    'CMS_STAGE2_RUNTIME_GATE'=>'ci-bound',
    'CMS_ENV'=>'test','CMS_ALLOW_SQLITE_TEST_ONLY'=>'1',
    'CMS_SITE_ID'=>'sample-stage2','CMS_DB_DSN'=>'sqlite:/nonexistent/cms-stage2.sqlite'
];
$tests=0;
$refuse=static function (callable $f,string $reason) use (&$tests):void {
    try{$f();}catch(Throwable $error){++$tests;return;}
    throw new RuntimeException('Unsafe Stage2 operator accepted: '.$reason);
};
$refuse(static fn()=>Installer::plan($root,$root,'html',$flags,
    '/nonexistent/config.json',$valid),'same CMS and website');
$refuse(static fn()=>Installer::plan($root,'/nonexistent','html',$flags,
    '/nonexistent/config.json',$valid),'nonexisting site root');
$refuse(static fn()=>Installer::plan($root,$root,'bogus',$flags,
    '/nonexistent/config.json',$valid),'unsupported site renderer');
foreach ([
    ['CMS_ENV'=>'production'],
    ['CMS_STAGE2_RUNTIME_GATE'=>''],
    ['CMS_STAGE2_RUNTIME_GATE'=>'ci-only'],
    ['CMS_ALLOW_SQLITE_TEST_ONLY'=>'0'],
    ['CMS_DB_DSN'=>'mysql:host=remote.example;dbname=unsafe'],
    ['CMS_SITE_ID'=>'../../../escape'],
    ['CMS_SITE_ID'=>''],
] as $case){
    $refuse(static fn()=>Installer::plan($root,'/nonexistent','html',$flags,
        '/nonexistent/config.json',array_merge($valid,$case)),
        'invalid production/host/identity configuration');
}
$refuse(static fn()=>Installer::apply($root,'/nonexistent','html',$flags,
    '/nonexistent/config.json',$valid,'bad-token'),'invalid operator digest');
echo "Stage2 PHP 8.1-8.4 empty-install operator negative contract PASS: {$tests} assertions; no DB or hosting access\n";
