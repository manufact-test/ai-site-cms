<?php
declare(strict_types=1);

require dirname(__DIR__).'/vendor/autoload.php';
use AiSiteCms\Hosting\LabDeploymentBlueprint as Blueprint;

putenv('CMS_ENV=test');
putenv('CMS_STAGE2_RUNTIME_GATE=ci-bound');
putenv('CMS_ALLOW_SQLITE_TEST_ONLY=1');

$checks=0;
$refuse=static function(callable $call,string $label)use(&$checks):void{
    try {$call();} catch(Throwable $error) {++$checks;return;}
    throw new RuntimeException('Unsafe blueprint accepted: '.$label);
};
$tmp=sys_get_temp_dir().'/cms-blueprint-contract-'.bin2hex(random_bytes(6));
mkdir($tmp,0700);
$sample=[
    'siteId'=>'demo-site','cmsOrigin'=>'https://cms.demo.test',
    'siteOrigin'=>'https://www.demo.test',
    'cmsDocroot'=>$tmp,'siteDocroot'=>$tmp,
    'cmsMount'=>'/','siteMount'=>'/',
    'phpTarget'=>'8.1','phpSapi'=>'fpm-fcgi',
    'siteRuntime'=>'static-files'
];
$doc=['format'=>'ai-site-cms-stage2-offline-deployment-blueprint-v1',
    'fleetConfig'=>$tmp.'/missing-fleet.json','endpoints'=>[$sample]];
try {
    $refuse(static fn()=>Blueprint::inspect($doc),'no independent fleet');
    foreach ([
        'mixed-php-type'=>static function(array &$x):void{$x['endpoints'][0]['phpTarget']=8.1;},
        'unsupported-php'=>static function(array &$x):void{$x['endpoints'][0]['phpTarget']='8.5';},
        'wrong-sapi'=>static function(array &$x):void{$x['endpoints'][0]['phpSapi']='cli';},
        'non-https'=>static function(array &$x):void{$x['endpoints'][0]['cmsOrigin']='http://cms.demo.test';},
        'path-origin'=>static function(array &$x):void{$x['endpoints'][0]['cmsOrigin']='https://cms.demo.test/admin';},
        'real-domain'=>static function(array &$x):void{$x['endpoints'][0]['siteOrigin']='https://real.example.com';},
        'shared-origin'=>static function(array &$x):void{$x['endpoints'][0]['siteOrigin']=$x['endpoints'][0]['cmsOrigin'];},
        'submount'=>static function(array &$x):void{$x['endpoints'][0]['cmsMount']='/cms';},
        'extra-setting'=>static function(array &$x):void{$x['endpoints'][0]['password']='bad';},
        'bad-count'=>static function(array &$x):void{$x['endpoints']=[];},
        'bad-format'=>static function(array &$x):void{$x['format']='future';}
    ] as $name=>$mutate){
        $bad=$doc;$mutate($bad);
        $refuse(static fn()=>Blueprint::inspect($bad),$name);
    }
    $file=$tmp.'/unsafe.json';
    file_put_contents($file,json_encode($doc,JSON_THROW_ON_ERROR));
    chmod($file,0600);
    $refuse(static fn()=>Blueprint::load($file),'fleet missing');
    symlink($file,$tmp.'/linked.json');
    $refuse(static fn()=>Blueprint::load($tmp.'/linked.json'),'symlinked operator file');
    putenv('CMS_ENV=production');
    $refuse(static fn()=>Blueprint::inspect($doc),'no production mode');
    echo "Stage2 PHP 8.1–8.4 offline blueprint schema, host ABI and privilege refusal PASS: {$checks} checks\n";
}finally{
    @unlink($tmp.'/linked.json');
    @unlink($tmp.'/unsafe.json');
    @rmdir($tmp);
}
