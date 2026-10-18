<?php
declare(strict_types=1);

use AiSiteCms\Hosting\SiteRuntimeTopology as Policy;

require dirname(__DIR__).'/src/Hosting/SiteRuntimeTopology.php';

$checks = 0;
function yes(bool $ok,string $why):void {
    global $checks;
    ++$checks;
    if (!$ok) throw new RuntimeException('Runtime topology: '.$why);
}
function no(callable $do,string $why):void {
    global $checks;
    ++$checks;
    try { $do(); } catch (RuntimeException $e) { return; }
    throw new RuntimeException('Unsafe site runtime topology accepted: '.$why);
}
function makefile(string $path,string $content):void {
    $parent=dirname($path);
    if (!is_dir($parent)) mkdir($parent,0700,true);
    file_put_contents($path,$content);
}
function clean(string $dir):void {
    if (is_link($dir)||is_file($dir)) { unlink($dir);return; }
    foreach(scandir($dir) as $name) {
        if($name!=='.'&&$name!=='..')clean($dir.'/'.$name);
    }
    rmdir($dir);
}
$base=sys_get_temp_dir().'/ai-site-cms-topology-test-'.bin2hex(random_bytes(12));
mkdir($base,0700);
$caps=[
    'php81'=>true,'pdo'=>true,'https'=>true,'privateStorage'=>true,
    'isolatedRoots'=>true,'rewriteRoutes'=>true,'sitePhp'=>false,
    'nodeRuntime'=>false,'reverseProxy'=>false
];
function pair(string $base,string $label,string $family):array {
    $cms=$base.'/cms-'.$label;
    $site=$base.'/site-'.$label;
    makefile($cms.'/public/index.php','<?php echo "ok";');
    makefile($cms.'/vendor/autoload.php','<?php // isolated');
    makefile($cms.'/private/.env','CMS_SECRET_TEST_TOKEN');
    mkdir($site.'/public',0700,true);
    if($family==='php'){
        makefile($site.'/public/index.php','<?php echo "site";');
    }elseif($family==='next-ssr'){
        makefile($site.'/public/favicon.ico','x');
        makefile($site.'/.next/BUILD_ID','build-hash');
        makefile($site.'/package.json','{"dependencies":{"next":"15"}}');
    }else{
        makefile($site.'/public/index.html','<!DOCTYPE html><title>hello</title>');
        if($family==='next-static'){
            makefile($site.'/public/_next/static/asset.js','console.log(1)');
        }
    }
    return [$cms,$site];
}
try {
    yes(Policy::families()===['html','php','next-static','next-ssr'],
        'strict four architecture families');
    $pairs=[];
    foreach(Policy::families() as $family){
        [$cms,$site]=pair($base,$family,$family);
        $pairs[$family]=[$cms,$site];
        $declared=$caps;
        if($family==='php')$declared['sitePhp']=true;
        if($family==='next-ssr'){
            $declared['nodeRuntime']=true;
            $declared['reverseProxy']=true;
        }
        $r=Policy::assess($cms,$site,$family,$declared);
        yes($r['declarationCompatible']&&$r['missingDeclaredCapabilities']===[],
            'declared runtime baseline for '.$family);
        yes($r['cmsRuntime']==='php-slim'&&$r['separateInstallationRoots'],
            'CMS always independent PHP code tree for '.$family);
        yes($r['nodeRequired']===($family==='next-ssr')
            &&!$r['productionReady']&&!$r['actualHostTested']
            &&!$r['declaredCapabilitiesAreVerified'],
            'self-declared compatibility cannot claim real hosting validation');
        yes($r['cmsPublicFiles']===1 && $r['sitePublicFiles']>=1,
            'public inventory only, never private code or secrets');
        foreach(['php81','pdo','https','privateStorage','isolatedRoots','rewriteRoutes'] as $flag){
            $bad=$declared;$bad[$flag]=false;
            $failure=Policy::assess($cms,$site,$family,$bad);
            yes(!$failure['declarationCompatible']
                &&in_array($flag,$failure['missingDeclaredCapabilities'],true),
                'missing shared-host capability '.$flag.' blocks '.$family);
        }
    }
    [$cms,$site]=$pairs['next-ssr'];
    $bad=$caps;
    $result=Policy::assess($cms,$site,'next-ssr',$bad);
    yes(!$result['declarationCompatible']&&$result['missingDeclaredCapabilities']===
        ['nodeRuntime','reverseProxy'],
        'Next SSR explicitly incompatible with PHP-only without Node and proxy');
    $bad['nodeRuntime']=true;
    yes(Policy::assess($cms,$site,'next-ssr',$bad)['missingDeclaredCapabilities']===
        ['reverseProxy'],'SSR without reverse proxy is not ready for split deployment');
    [$cms,$site]=$pairs['php'];
    yes(Policy::assess($cms,$site,'php',$caps)['missingDeclaredCapabilities']===
        ['sitePhp'],'site PHP needs an independent site runtime capability');
    no(fn()=>Policy::assess($cms,$site,'react-ssr',$caps),
        'undeclared or ambiguous application family refused');
    no(fn()=>Policy::assess($cms,$site,'php',array_merge($caps,['trustMe'=>true])),
        'unrecognized capability cannot be smuggled in');
    $bad=$caps;$bad['pdo']='yes';
    no(fn()=>Policy::assess($cms,$site,'php',$bad),
        'string truthy capabilities never accepted');
    $bad=$caps;unset($bad['https']);
    no(fn()=>Policy::assess($cms,$site,'php',$bad),
        'missing declared capability not defaulted silently');
    no(fn()=>Policy::assess($cms,$cms,'html',$caps),
        'website cannot share CMS code/data directory');
    no(fn()=>Policy::assess($cms,$cms.'/public','html',$caps),
        'nested document root forbidden');
    no(fn()=>Policy::assess($site,$cms,'php',$caps),
        'wrong role cannot become a CMS installation');
    no(fn()=>Policy::assess($cms,$site.'/../site-php','php',$caps),
        'noncanonical dot-dot root refused');
    symlink($cms,$base.'/aliased-cms');
    no(fn()=>Policy::assess($base.'/aliased-cms',$site,'php',$caps),
        'aliased CMS installation root refused');
    unlink($base.'/aliased-cms');
    no(fn()=>Policy::assess($base.'/does-not-exist',$site,'php',$caps),
        'missing CMS root refused');
    no(fn()=>Policy::assess($cms,$base.'/does-not-exist','php',$caps),
        'missing website root refused');

    [$htmlCms,$htmlSite]=$pairs['html'];
    $public=$htmlSite.'/public';
    makefile($public.'/private/.env','secret');
    no(fn()=>Policy::assess($htmlCms,$htmlSite,'html',$caps),
        'public .env credential disclosure refused');
    clean($public.'/private');
    makefile($public.'/composer.json','{}');
    no(fn()=>Policy::assess($htmlCms,$htmlSite,'html',$caps),
        'Composer internals cannot appear in public site tree');
    unlink($public.'/composer.json');
    makefile($public.'/bundle.php','<?php echo "unsafe";');
    no(fn()=>Policy::assess($htmlCms,$htmlSite,'html',$caps),
        'static site cannot serve server-executable PHP');
    unlink($public.'/bundle.php');
    makefile($public.'/bundle.js.map','secret source');
    no(fn()=>Policy::assess($htmlCms,$htmlSite,'html',$caps),
        'private source maps are not public distribution artifacts');
    unlink($public.'/bundle.js.map');
    symlink($htmlCms.'/private/.env',$public.'/leak');
    no(fn()=>Policy::assess($htmlCms,$htmlSite,'html',$caps),
        'symlink to CMS secrets refused');
    unlink($public.'/leak');
    symlink($htmlCms.'/private',$public.'/private-link');
    no(fn()=>Policy::assess($htmlCms,$htmlSite,'html',$caps),
        'linked public directory into CMS private state refused');
    unlink($public.'/private-link');
    makefile($public.'/assets/logo.svg','<svg />');
    yes(Policy::assess($htmlCms,$htmlSite,'html',$caps)['sitePublicFiles']===2,
        'ordinary static public assets remain permitted');
    unlink($public.'/assets/logo.svg');
    [$nextCms,$nextSite]=$pairs['next-static'];
    $nextAssets=$nextSite.'/public/_next';
    clean($nextAssets);
    no(fn()=>Policy::assess($nextCms,$nextSite,'next-static',$caps),
        'Next export without static asset directory must be rejected');
    makefile($nextAssets.'/static/app.js','window.exports=true');

    [$ssrCms,$ssrSite]=$pairs['next-ssr'];
    unlink($ssrSite.'/.next/BUILD_ID');
    no(fn()=>Policy::assess($ssrCms,$ssrSite,'next-ssr',$caps),
        'SSR project without private build identity rejected');
    makefile($ssrSite.'/.next/BUILD_ID','newbuild');

    $items=[];
    foreach($pairs as $family=>[$cs,$ss]){
        $cap=$caps;
        if($family==='php')$cap['sitePhp']=true;
        if($family==='next-ssr'){$cap['nodeRuntime']=true;$cap['reverseProxy']=true;}
        $items[]=['siteId'=>'isolate_'.str_replace('-','_',$family),
            'cmsRoot'=>$cs,'siteRoot'=>$ss,'family'=>$family,'capabilities'=>$cap];
    }
    $fleet=Policy::assessFleet($items);
    yes($fleet['sites']===4&&$fleet['allDeclaredCompatible']
        &&$fleet['dataSharingAllowed']===false&&!$fleet['productionReady'],
        'four independent technology-family installations can be checked jointly');
    $bad=$items;$bad[1]['cmsRoot']=$bad[0]['cmsRoot'];
    no(fn()=>Policy::assessFleet($bad),'cross-site CMS installation reuse refused');
    $bad=$items;$bad[1]['siteRoot']=$bad[0]['siteRoot'];
    no(fn()=>Policy::assessFleet($bad),'cross-site published webroot reuse refused');
    $bad=$items;$bad[1]['siteId']=$bad[0]['siteId'];
    no(fn()=>Policy::assessFleet($bad),'duplicate CMS site ID refused');
    $bad=$items;$bad[1]['siteId']='../../admin';
    no(fn()=>Policy::assessFleet($bad),'unsafe site IDs refused');
    $bad=$items;$bad[1]['capabilities']['nodeRuntime']='maybe';
    no(fn()=>Policy::assessFleet($bad),'fleet invalid host declaration refused');
    $bad=$items;$bad[1]['capabilities']['php81']=false;
    $blocked=Policy::assessFleet($bad);
    yes(!$blocked['allDeclaredCompatible']&&$blocked['sites']===4,
        'fleet reports self-declared hosting mismatch without silently overriding');
    $bad=$items;$bad[0]['extra']='trust';
    no(fn()=>Policy::assessFleet($bad),'foreign fleet keys forbidden');
    no(fn()=>Policy::assessFleet([]),'empty fleet must be explicitly rejected');
    no(fn()=>Policy::assessFleet(array_fill(0,13,$items[0])),
        'bounded fleet must not scan arbitrary large site collections');

    echo 'Stage2 isolated runtime topology and 4 family compatibility PASS: '.
        $checks.' checks; no site deploy, DB mutation, Next build execution or host assertion'."\n";
} finally {
    if (dirname($base)===realpath(sys_get_temp_dir())
        && preg_match('/^ai-site-cms-topology-test-[a-f0-9]{24}$/D',basename($base))) {
        clean($base);
    }
}
