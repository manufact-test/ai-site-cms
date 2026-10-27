<?php
declare(strict_types=1);
/**
 * D3 local rehearsal only, never a hosting router. Start explicitly with:
 * php -S 127.0.0.1:PORT -t /ABS/registry/public /ABS/registry/public/router.php
 *
 * Only the immutable published HTML/media snapshot is rendered, even for a
 * staged Next adapter: this is NOT a Next build/SSR parity proof.
 */
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; media-src 'self'; form-action 'none'; connect-src 'none'; frame-ancestors 'none'");
$ip=(string)($_SERVER['REMOTE_ADDR']??'');
$host=(string)($_SERVER['HTTP_HOST']??'');
if (!in_array($ip,['127.0.0.1','::1'],true)
    || !preg_match('~^(?:127\.0\.0\.1|localhost|\[::1\])(?::[0-9]{1,5})?$~D', $host)) {
    http_response_code(403);exit('Loopback only');
}
if (!in_array($_SERVER['REQUEST_METHOD']??'', ['GET','HEAD'],true)) {
    header('Allow: GET, HEAD');http_response_code(405);exit;
}
$path=parse_url((string)($_SERVER['REQUEST_URI']??'/'),PHP_URL_PATH);
if (!is_string($path)||strlen($path)>240||str_contains($path,'\\')
    ||preg_match('~%(?:2e|2f|5c|00)~i',$path)) {
    http_response_code(400);exit;
}
$root=dirname(__DIR__);
try {
    $registry=json_decode((string)file_get_contents($root.'/registry.json'),true,512,JSON_THROW_ON_ERROR);
    if (($registry['format']??null)!=='manufact-local-cutover-v1') throw new RuntimeException('Invalid registry');
    $active=$registry['active']??null;
    if($path==='/__lab/status') {
        header('Content-Type: application/json; charset=utf-8');
        if ($_SERVER['REQUEST_METHOD']!=='HEAD') echo json_encode([
            'scope'=>'LOCAL_LAB_ONLY','active'=>$active,'previous'=>$registry['previous']??null,
            'generation'=>$registry['generation']??null,'siteId'=>$registry['siteId']??null
        ],JSON_THROW_ON_ERROR);
        exit;
    }
    if (!is_string($active)||!preg_match('~^[a-z][a-z0-9-]{1,49}$~D',$active)
        ||!isset($registry['slots'][$active])) {
        http_response_code(503);exit('No active local release');
    }
    $technology=$registry['slots'][$active]['technology']??null;
    $dir=$root.'/slots/'.$active.'/site'.($technology==='html'?'':'/data');
    if(!in_array($technology,['html','php','next-static','next-ssr'],true))
        throw new RuntimeException('Unexpected technology');
    $manifest=json_decode((string)file_get_contents($dir.'/release-manifest.json'),true,512,JSON_THROW_ON_ERROR);
    if(($manifest['siteId']??null)!==($registry['siteId']??null))
        throw new RuntimeException('Site identity mismatch');
    if ($path==='/robots.txt') {
        header('Content-Type: text/plain; charset=utf-8');
        if($_SERVER['REQUEST_METHOD']!=='HEAD')echo "User-agent: *\nDisallow: /\n";
        exit;
    }
    if($path==='/sitemap.xml'){http_response_code(404);exit;}
    if(preg_match('~^/assets/[a-z][a-z0-9-]{2,79}\.(?:png|jpg|webp|mp4)$~D',$path)) {
        $assetName=ltrim($path,'/');$asset=null;
        foreach($manifest['assets']??[] as $item)if(($item['file']??null)===$assetName){$asset=$item;break;}
        if(!$asset){http_response_code(404);exit;}
        header('Content-Type: '.($asset['mime']??'application/octet-stream'));
        if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($dir.'/'.$assetName);
        exit;
    }
    if(!preg_match('~^/(?:[a-z0-9-]+/)*$~D',$path)) {http_response_code(404);exit;}
    foreach($manifest['redirects']??[] as $r) {
        if(($r['from']??null)===$path) {
            header('Location: '.$r['to'],true,301);
            exit;
        }
    }
    foreach($manifest['pages']??[] as $page) {
        if(($page['path']??null)===$path) {
            header('Content-Type: text/html; charset=utf-8');
            if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($dir.'/'.$page['file']);
            exit;
        }
    }
    http_response_code(404);header('Content-Type: text/plain; charset=utf-8');
    if($_SERVER['REQUEST_METHOD']!=='HEAD')echo 'No such local release page';
} catch(Throwable $e) {
    error_log('Stage3 local cutover preview: '.get_class($e));
    http_response_code(503);
    if($_SERVER['REQUEST_METHOD']!=='HEAD')echo 'Local release unavailable';
}
