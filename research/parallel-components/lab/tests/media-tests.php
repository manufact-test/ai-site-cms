<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/MediaLab.php';
$n=0;
function must(bool $ok, string $text): void {global $n;$n++;if(!$ok)throw new RuntimeException($text);}
$fixture=json_decode(file_get_contents(__DIR__.'/../../fixtures/media-candidates.research.json'),true,512,JSON_THROW_ON_ERROR);
$markup=MediaLab::render($fixture);
must(str_contains($markup,'<picture>'),'picture present');
must(str_contains($markup,'type="image/avif"'),'AVIF preferred');
must(str_contains($markup,'type="image/webp"'),'WebP fallback');
must(str_contains($markup,'320w')&&str_contains($markup,'640w')&&str_contains($markup,'960w'),'responsive descriptors');
must(str_contains($markup,'width="960" height="540"'),'intrinsic ratio prevents shift');
must(str_contains($markup,'loading="eager" fetchpriority="high"'),'LCP not lazy');
must(!str_contains($markup,'loading="lazy"'),'LCP priority only');
$other=$fixture;$other['role']='content';
must(str_contains(MediaLab::render($other),'loading="lazy"'),'below fold lazy');
$other['role']='decorative';$other['alt']='';
must(str_contains(MediaLab::render($other),'alt=""'),'decorative alt empty');
foreach ([['src',"/assets/media/a.svg"],['alt',"\"><script>alert(1)</script>"]] as $t) {
    $bad=$fixture;$bad[$t[0]]=$t[1];
    if($t[0]==='src') {try{MediaLab::render($bad);throw new Exception('accepted unknown src');}catch(InvalidArgumentException){must(true,'strict keys');}}
    else {must(!str_contains(MediaLab::render($bad),'<script>'),'alt escaped');}
}
$bad=$fixture;$bad['webp'][320]='https://evil.test/tracker.webp';
try {MediaLab::render($bad);throw new Exception('external URL accepted');}catch(InvalidArgumentException){must(true,'remote URL refused');}
$bad=$fixture;$bad['avif'][320]='/assets/media/workshop-640.avif';
try {MediaLab::render($bad);throw new Exception('wrong width accepted');}catch(InvalidArgumentException){must(true,'width mismatch refused');}
$bad=$fixture;$bad['avif'][320]='/assets/media/%2e%2e/attack.avif';
try {MediaLab::render($bad);throw new Exception('encoded traversal allowed');}catch(InvalidArgumentException){must(true,'traversal refused');}
$bad=$fixture;$bad['alt']='';
try {MediaLab::render($bad);throw new Exception('missing alt allowed');}catch(InvalidArgumentException){must(true,'nondecorative alt mandatory');}
$bad=$fixture;$bad['width']=123;
try {MediaLab::render($bad);throw new Exception('wrong size accepted');}catch(InvalidArgumentException){must(true,'width pinned');}
foreach(['webp','avif'] as $kind)foreach([320,640,960] as $w) {
    must(is_file(__DIR__.'/../public'.$fixture[$kind][$w]),'file '.$kind.$w);
}
echo "Media fixture PASS: $n assertions (static metadata, not browser image decode)\n";
