<?php
declare(strict_types=1);

require dirname(__DIR__).'/vendor/autoload.php';

use AiSiteCms\Hosting\LabHostRequirementProfiles as Host;
use AiSiteCms\Hosting\LabStage2ExitReview as Review;

$checks=0;
function ok(bool $value,string $label):void{
    global $checks; ++$checks;
    if (!$value) throw new RuntimeException('Stage2 exit profile: '.$label);
}
function refused(callable $call,string $label):void{
    global $checks; ++$checks;
    try{$call();}catch(Throwable $e){return;}
    throw new RuntimeException('Unsafe host profile: '.$label);
}
$families=['html','php','react-spa','next-static','next-ssr'];
foreach($families as $family){
    foreach(['apache-2.4','nginx','litespeed'] as $web){
        $p=Host::describe($family,$web);
        ok($p['family']===$family&&$p['webServer']===$web
            &&$p['cms']['documentRoot']==='cms/public'
            &&$p['cms']['privateCodeAndStateOutsideWebroot']
            &&$p['cms']['readOnlyHealthRoute']==='/api/health'
            &&$p['cms']['publicAdminRoutesAvailable']===false,
            'independent CMS boundary in '.$family.' '.$web);
        ok($p['visitor']['independentPhpWorkerRequired']===($family==='php')
            &&$p['visitor']['nodeServerAndReverseProxyRequired']===($family==='next-ssr')
            &&$p['visitor']['historyFallbackRequired']===($family==='react-spa')
            &&$p['visitor']['frameworkSSRVerified']===false,
            'visitor runtime family constraints '.$family.' '.$web);
        ok(!$p['productionReady']&&!$p['targetDnsTlsTested']
            &&!$p['targetWebServerTested'],
            'declarative profile cannot claim real host evidence');
        ok($web==='nginx'
            ? in_array('deny-dotfiles',$p['webServerPrerequisites'],true)
            : ($web==='litespeed'
                ? in_array('php-lsapi',$p['webServerPrerequisites'],true)
                  &&$p['cms']['phpRuntime']==='independent-lsapi-pool-requires-target-proof'
                : in_array('FallbackResource /index.php',$p['webServerPrerequisites'],true)),
            'host prerequisites specific to web server');
    }
}
refused(static fn()=>Host::describe('wordpress','nginx'),'unknown family');
refused(static fn()=>Host::describe('next-ssr','php-only'),'SSR cannot pass as PHP-only');
refused(static fn()=>Host::describe('html','apache-2.2'),'unsupported Apache');
putenv('CMS_ENV=production');
refused(static fn()=>Review::inspect(['fake'=>'fleet']),
    'a target production operator never runs acceptance report');
putenv('CMS_ENV=test');putenv('CMS_STAGE2_RUNTIME_GATE=');
refused(static fn()=>Review::inspect(['fake'=>'fleet']),
    'missing explicit CI gate blocked');
echo "Stage2 offline host requirement profiles and exit-review privilege contract PASS: {$checks} checks\n";
