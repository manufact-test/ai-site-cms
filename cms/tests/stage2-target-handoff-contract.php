<?php
declare(strict_types=1);

require dirname(__DIR__).'/vendor/autoload.php';
use AiSiteCms\Hosting\Stage2TargetHostHandoff as Handoff;

$count=0;
function hostCheck(bool $condition,string $label):void {
    global $count; ++$count;
    if (!$condition) throw new RuntimeException('Target handoff: '.$label);
}
function hostReject(callable $check,string $label):void {
    global $count; ++$count;
    try { $check(); } catch (Throwable $e) { return; }
    throw new RuntimeException('Invalid host evidence accepted: '.$label);
}
$good=[
    'format'=>'ai-site-cms-stage2-operator-http-observations-v1',
    'siteFamily'=>'html','cmsHealth'=>200,'cmsWrite'=>404,
    'cmsPrivate'=>403,'visitorHome'=>200,'httpsPeerChecked'=>true,
    'webSapiReported'=>'fpm-fcgi',
    'independentSiteWhenCmsUnavailable'=>true,'dbConnectivityReported'=>true
];
$review=Handoff::inspectOperatorHttp($good,'html');
hostCheck($review['allClaimsPresentAndPositive'],'positive observations can be recorded');
hostCheck(!$review['trustedIndependentEvidence']&&!$review['realTargetHostProven']
    &&!$review['productionReady']&&!$review['stage2Accepted'],
    'even complete externally supplied claims do not authorize Stage2');
foreach(['html','php','react-spa','next-static','next-ssr'] as $family) {
    $variant=$good;$variant['siteFamily']=$family;
    hostCheck(Handoff::inspectOperatorHttp($variant,$family)['reportedFamily']===$family,
        'explicit five-family schema: '.$family);
}
foreach(['cmsHealth'=>500,'cmsWrite'=>200,'cmsPrivate'=>200,
    'visitorHome'=>302,'httpsPeerChecked'=>false,
    'webSapiReported'=>'apache2handler',
    'independentSiteWhenCmsUnavailable'=>false,
    'dbConnectivityReported'=>false] as $key=>$bad) {
    $variant=$good;$variant[$key]=$bad;
    $result=Handoff::inspectOperatorHttp($variant,'html');
    hostCheck(!$result['allClaimsPresentAndPositive']
        &&count($result['unmetClaimedChecks'])===1,
        'unverified HTTP or host prerequisite remains unmet: '.$key);
}
foreach(['cmsHealth'=>true,'cmsWrite'=>'404','cmsPrivate'=>600,
    'visitorHome'=>0,'httpsPeerChecked'=>'true','webSapiReported'=>'cli',
    'independentSiteWhenCmsUnavailable'=>1,
    'dbConnectivityReported'=>null] as $key=>$bad) {
    $variant=$good;$variant[$key]=$bad;
    hostReject(static fn()=>Handoff::inspectOperatorHttp($variant,'html'),
        'strictly typed observation: '.$key);
}
$lsapi=$good;
$lsapi['webSapiReported']='litespeed';
$lsapiCheck=Handoff::inspectOperatorHttp($lsapi,'html');
hostCheck($lsapiCheck['reportedWebSapi']==='litespeed'
    &&$lsapiCheck['litespeedLsapiReportedNotVerified']===true
    &&$lsapiCheck['claimedChecks']['separate_fpm_reported']===false
    &&!$lsapiCheck['allClaimsPresentAndPositive']
    &&!$lsapiCheck['realTargetHostProven'],
    'a real LiteSpeed SAPI report never masquerades as verified PHP-FPM');
$variant=$good;$variant['unexpected']='credential';
hostReject(static fn()=>Handoff::inspectOperatorHttp($variant,'html'),
    'unexpected metadata rejected');
$variant=$good;unset($variant['cmsWrite']);
hostReject(static fn()=>Handoff::inspectOperatorHttp($variant,'html'),
    'incomplete observation rejected');
hostReject(static fn()=>Handoff::inspectOperatorHttp($good,'next-ssr'),
    'cannot transplant observation between site families');
hostReject(static fn()=>Handoff::inspectOperatorHttp($good,'unknown'),
    'unknown site family refused');
echo "Stage2 target host handoff offline observation contract PASS: {$count} checks; no host contacted\n";
