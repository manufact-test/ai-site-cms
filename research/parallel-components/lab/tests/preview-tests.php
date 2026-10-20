<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/PreviewLab.php';
$r = ['blocks'=>['hero-primary'=>['kind'=>'hero', 'revision'=>7,
    'values'=>['content.heading'=>'Reliable industry','style.foreground'=>'#15202B','layout.paddingPx'=>24,
    'layout.responsivePadding'=>['mobile'=>12,'tablet'=>20,'desktop'=>32],
    'media.assetId'=>'asset_abcdefgh','action.href'=>'/contact'],
    'editable'=>['content.heading'=>['type'=>'text','max'=>180],
        'style.foreground'=>['type'=>'opaque-color'], 'layout.paddingPx'=>['type'=>'integer-px'],
        'layout.responsivePadding'=>['type'=>'responsive-padding'], 'media.assetId'=>['type'=>'asset'],
        'action.href'=>['type'=>'same-origin-link']]]]];
$count=0;
function checkPreview(bool $condition,string $reason):void{global $count;$count++;if(!$condition)throw new RuntimeException($reason);}
function renderChange(array $changes,array $reg=null):array{global $r;return PreviewLab::render($reg ?? $r,
    ['blockId'=>'hero-primary','expectedRevision'=>7,'changes'=>$changes], 'example.test');}
$p=renderChange(['content.heading'=>'<script>alert("x")</script>']);
checkPreview($p['code']==='PREVIEW_ONLY','preview valid');
checkPreview($p['revision']===8,'revision');
checkPreview(str_contains($p['html'],'&lt;script&gt;'),'text escaped');
checkPreview(!str_contains($p['html'],'<script>'),'no script');
checkPreview(str_contains($p['html'],'href="/contact"'),'safe link');
checkPreview(str_contains($p['html'],'padding-left:20px'),'tablet padding');
checkPreview(str_contains($p['html'],'padding-right:32px'),'desktop padding');
checkPreview(str_contains($p['html'],'width="960" height="540"'),'trusted media dimensions');
checkPreview($r['blocks']['hero-primary']['revision']===7,'no persistence');
checkPreview(renderChange(['style.foreground'=>'#FFFFFF'])['code']==='PREVIEW_CONTRAST_REJECTED','contrast');
checkPreview(renderChange(['style.foreground'=>'#777777'])['code']==='PREVIEW_CONTRAST_REJECTED','borderline contrast');
checkPreview(renderChange(['style.foreground'=>'#000000'])['code']==='PREVIEW_ONLY','black contrast');
checkPreview(renderChange(['media.assetId'=>'asset_z8abcd01'])['code']==='PREVIEW_ONLY','2nd trusted asset');
checkPreview(renderChange(['media.assetId'=>'asset_missing01'])['code']==='PREVIEW_ASSET_MISSING','no raw unknown assets');
checkPreview(renderChange(['action.href'=>'javascript:alert(1)'])['code']==='PATCH_REJECTED','unsafe URL');
checkPreview(renderChange(['layout.paddingPx'=>-100])['code']==='PATCH_REJECTED','negative padding');
checkPreview(renderChange(['style.foreground'=>'#000000;}body{display:none'])['code']==='PATCH_REJECTED','CSS injection');
checkPreview(renderChange(['content.heading'=>['html'=>'x']])['code']==='PATCH_REJECTED','HTML typing');
checkPreview(renderChange(['scripts.js'=>'alert(1)'])['code']==='PATCH_REJECTED','unknown property');
$invalid=$r;$invalid['blocks']['hero-primary']['values']['action.href']='javascript:alert(1)';
checkPreview(renderChange(['layout.paddingPx'=>40],$invalid)['code']==='PREVIEW_REJECTED','validate complete inherited state');
$invalid=$r;$invalid['blocks']['hero-primary']['values']['media.assetId']='asset_notalive01';
checkPreview(renderChange(['layout.paddingPx'=>40],$invalid)['code']==='PREVIEW_ASSET_MISSING','unresolved inherited asset');
$invalid=$r;$invalid['blocks']['hero-primary']['values']['evil']='alert(1)';
checkPreview(renderChange(['layout.paddingPx'=>40],$invalid)['code']==='PREVIEW_REJECTED','unknown inherited path');
$invalid=$r;$invalid['blocks']['hero-primary']['kind']='form';
checkPreview(renderChange(['layout.paddingPx'=>40],$invalid)['code']==='PREVIEW_REJECTED','kind escalation');
checkPreview(PreviewLab::render($r,['blockId'=>'hero-primary','expectedRevision'=>6,'changes'=>['layout.paddingPx'=>40]],'example.test')['code']==='REVISION_CONFLICT','stale revision');
echo "PreviewLab PASS: $count assertions (typed immutable render, media, contrast, CSS, escaping)\n";
