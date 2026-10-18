<?php
declare(strict_types=1);

// PHP 8.1–8.4 guardrails for absent/foreign CI-only binding declarations.
// Full real package + CLI + two databases + HTTP are tested in editor CI.
require dirname(__DIR__).'/vendor/autoload.php';

use AiSiteCms\Hosting\LabInstanceBinding;

$root=realpath(dirname(__DIR__));
if ($root===false) throw new RuntimeException('Test source root absent');
$checks=0;
$base=[
    'CMS_STAGE2_RUNTIME_GATE'=>'ci-bound',
    'CMS_ENV'=>'test','CMS_ALLOW_SQLITE_TEST_ONLY'=>'1',
    'CMS_SITE_ID'=>'fixture-test',
    'CMS_DB_DSN'=>'sqlite:/never/exists',
    'CMS_STAGE2_BINDING_FILE'=>'/never/exists'
];
$cases=[
    $base,
    array_merge($base,['CMS_ENV'=>'production']),
    array_merge($base,['CMS_STAGE2_RUNTIME_GATE'=>'ci-only']),
    array_merge($base,['CMS_STAGE2_RUNTIME_GATE'=>'']),
    array_merge($base,['CMS_ALLOW_SQLITE_TEST_ONLY'=>'0']),
    array_merge($base,['CMS_SITE_ID'=>'../escape']),
    array_merge($base,['CMS_DB_DSN'=>'mysql:host=external']),
    array_merge($base,['CMS_STAGE2_BINDING_FILE'=>'relative-file']),
    array_merge($base,['CMS_STAGE2_BINDING_FILE'=>'']),
    array_merge($base,['CMS_STAGE2_BINDING_FILE'=>null]),
];
foreach($cases as $test){
    $result=LabInstanceBinding::inspect($root,$test);
    if ($result['ready'] || !$result['ciOnly'] || $result['productionReady']
        || !$result['readOnly'] || array_keys($result)!==[
            'ready','state','readOnly','ciOnly','productionReady'
        ] || str_contains(json_encode($result),'/never/')) {
        throw new RuntimeException('Stage2 instance binding incorrectly accepted malformed lab input');
    }
    ++$checks;
}
echo "Stage2 CI-only instance binding fail-closed PHP matrix PASS: {$checks} assertions\n";
