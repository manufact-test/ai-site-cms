<?php
declare(strict_types=1);
/**
 * Independent visitor router: the whole CMS, credentials and database are absent.
 * Set web document root to this public/ directory. This is NOT a CMS admin endpoint.
 */
$release = dirname(__DIR__) . '/data';
$manifest = json_decode((string)file_get_contents($release.'/release-manifest.json'), true, 512, JSON_THROW_ON_ERROR);
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: strict-origin-when-cross-origin');
header('Cache-Control: public, max-age=60');
if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET','HEAD'], true)) {
    http_response_code(405);
    header('Allow: GET, HEAD');
    exit;
}
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH);
if (!is_string($path) || preg_match('/%(?:2e|2f|5c|00)/i', $path)
    || str_contains($path, '\\') || str_contains($path, "\0")) {
    http_response_code(400);
    exit;
}
/*
 * Independent PHP visitor sends a real, representation-specific body and
 * strong validator. ETags are checked BEFORE reading the HTML/CSS bytes.
 * Compressed HTML/CSS can be shared among visitors via the public cache,
 * and HEAD exposes the exact chosen Content-Length without a response body.
 * No Node, extension installation or dynamic cache directory required.
 */
$serveText=static function(string $file,string $mime,string $sha,bool $immutable): never {
    if(!is_file($file)||is_link($file)){http_response_code(503);exit;}
    $size=filesize($file);
    if(!is_int($size)||$size<0){http_response_code(503);exit;}
    $encoding=(string)($_SERVER['HTTP_ACCEPT_ENCODING']??'');
    $gzip=$size>1024&&extension_loaded('zlib')
        &&!filter_var((string)ini_get('zlib.output_compression'),FILTER_VALIDATE_BOOLEAN)
        &&preg_match('/(?:^|,)\\s*gzip(?:\\s*;\\s*q=([01](?:\\.\\d+)?))?(?=,|$)/i',$encoding,$m)===1
        &&(!isset($m[1])||(float)$m[1]>0);
    $etag='"'.$sha.($gzip?'-gz':'').'"';
    header('Content-Type: '.$mime);
    header('Cache-Control: '.($immutable?'public, max-age=31536000, immutable':'public, no-cache, must-revalidate'));
    header('Vary: Accept-Encoding');
    header('ETag: '.$etag);
    if($gzip)header('Content-Encoding: gzip');
    if(trim((string)($_SERVER['HTTP_IF_NONE_MATCH']??''))===$etag){
        http_response_code(304);exit;
    }
    $plain=file_get_contents($file);
    if(!is_string($plain)){http_response_code(503);exit;}
    $body=$gzip?gzencode($plain,6):$plain;
    if(!is_string($body)){
        header_remove('Content-Encoding');
        header('ETag: "'.$sha.'"');
        $body=$plain;
    }
    header('Content-Length: '.strlen($body));
    if(($_SERVER['REQUEST_METHOD']??'GET')!=='HEAD')echo $body;
    exit;
};

// Diagnostic-only release identity for offline/remote manual verification.
// This does not imply that an external deployment is connected or healthy.
if ($path === '/_cms-connect.json') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
    if (($_SERVER['REQUEST_METHOD']??'GET') !== 'HEAD') {
        echo json_encode(['format'=>'manufact-ai-site-connection-v1',
            'siteId'=>$manifest['siteId'],'publishedVersion'=>$manifest['publishedVersion'],
            'sourceRevision'=>$manifest['sourceRevision'],
            'releaseManifestSha256'=>hash_file('sha256',$release.'/release-manifest.json')],
            JSON_THROW_ON_ERROR);
    }
    exit;
}
// Public immutable CSS route; source bytes stay in private data/ on PHP hosting.
if(preg_match('~^/styles/(site-[a-f0-9]{64}\.css)$~D',$path,$styleMatch)){
    $relative='styles/'.$styleMatch[1];$listed=null;
    foreach($manifest['stylesheets']??[] as $style)
        if(($style['file']??null)===$relative){$listed=$style;break;}
    if($listed===null){http_response_code(404);exit;}
    $file=$release.'/'.$relative;
    if(!is_file($file)||is_link($file)){http_response_code(503);exit;}
    $serveText($file,'text/css; charset=utf-8',$listed['sha256'],true);
}
if ($path === '/robots.txt' || $path === '/sitemap.xml') {
    $name = ltrim($path, '/');
    if (!isset($manifest['searchFiles'][$name])) { http_response_code(404); exit; }
    header('Content-Type: '.($name === 'robots.txt' ? 'text/plain' : 'application/xml').'; charset=utf-8');
    header('Cache-Control: public, no-cache, must-revalidate');
    $etag='"'.$manifest['searchFiles'][$name].'"';
    header('ETag: '.$etag);
    if(trim((string)($_SERVER['HTTP_IF_NONE_MATCH']??''))===$etag){http_response_code(304);exit;}
    header('Content-Length: '.filesize($release.'/'.$name));
    if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') readfile($release.'/'.$name);
    exit;
}
if (preg_match('~^/assets/([a-z][a-z0-9-]{2,79}\.(png|jpg|webp|mp4|woff2))$~D',$path,$match)) {
    $asset=null;
    foreach($manifest['assets'] as $candidate) {
        if($candidate['file']==='assets/'.$match[1]){$asset=$candidate;break;}
    }
    if($asset===null){http_response_code(404);exit;}
    $file=$release.'/assets/'.$match[1];
    if(!is_file($file)||is_link($file)){http_response_code(503);exit;}
    $size=filesize($file);
    if(!is_int($size)||$size<1){http_response_code(503);exit;}
    $mime=['png'=>'image/png','jpg'=>'image/jpeg','webp'=>'image/webp','mp4'=>'video/mp4','woff2'=>'font/woff2'][$match[2]];
    $etag='"'.$asset['sha256'].'"';
    header('Content-Type: '.$mime);
    header('Cache-Control: public, max-age=31536000, immutable');
    header('ETag: '.$etag);
    header("Content-Security-Policy: default-src 'none'; sandbox");
    if(trim((string)($_SERVER['HTTP_IF_NONE_MATCH']??''))===$etag) {
        http_response_code(304);
        exit;
    }
    $start=0;$end=$size-1;
    if($match[2]==='mp4') {
        header('Accept-Ranges: bytes');
        $range=trim((string)($_SERVER['HTTP_RANGE']??''));
        $ifRange=trim((string)($_SERVER['HTTP_IF_RANGE']??''));
        // If-Range mismatch means the client receives the full new resource.
        if($ifRange!==''&&$ifRange!==$etag)$range='';
        if($range!=='') {
            if(!preg_match('/^bytes=(\d*)-(\d*)$/D',$range,$m)
                ||($m[1]===''&&$m[2]==='')) {
                header('Content-Range: bytes */'.$size);
                http_response_code(416);
                exit;
            }
            if($m[1]==='') {
                $suffix=(int)$m[2];
                if($suffix<1){header('Content-Range: bytes */'.$size);http_response_code(416);exit;}
                $start=max(0,$size-$suffix);
            } else {
                $start=(int)$m[1];
            }
            if($m[2]!==''&&$m[1]!=='')$end=min($size-1,(int)$m[2]);
            if($start>=$size||$end<$start){
                header('Content-Range: bytes */'.$size);
                http_response_code(416);
                exit;
            }
            http_response_code(206);
            header('Content-Range: bytes '.$start.'-'.$end.'/'.$size);
        }
    }
    $remaining=$end-$start+1;
    header('Content-Length: '.$remaining);
    if(($_SERVER['REQUEST_METHOD']??'GET')==='HEAD')exit;
    $stream=fopen($file,'rb');
    if($stream===false){http_response_code(503);exit;}
    try {
        if($start>0&&fseek($stream,$start)!==0){http_response_code(503);exit;}
        while($remaining>0&&!feof($stream)) {
            $part=fread($stream,min(65536,$remaining));
            if(!is_string($part)||$part==='')break;
            echo $part;
            $remaining-=strlen($part);
        }
    } finally {fclose($stream);}
    exit;
}

if ($path !== '/' && !preg_match('~^/(?:[a-z0-9-]+/)+$~D', $path)) {
    http_response_code(404);
    exit;
}
foreach ($manifest['redirects'] as $redirect) {
    if ($path === $redirect['from']) {
        // Targets were restricted to same-site paths by the bundle verifier.
        header('Location: '.$redirect['to'], true, 301);
        exit;
    }
}
foreach ($manifest['pages'] as $page) {
    if ($path === $page['path']) {
        $serveText($release.'/'.$page['file'],'text/html; charset=utf-8',$page['sha256'],false);
    }
}
http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'HEAD') echo "Page not found\n";
