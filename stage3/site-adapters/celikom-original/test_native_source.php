<?php
declare(strict_types=1);
namespace Manufact\Stage3;

class Conflict extends \RuntimeException {}
class NotFound extends \RuntimeException {}
$classFile=__DIR__ . '/../../server/CelikomSource.php';
if (!is_file($classFile)) $classFile=__DIR__ . '/CelikomSource.php';
require $classFile;

function ensure(bool $condition, string $description): void {
    if (!$condition) throw new \RuntimeException('FAILED: '.$description);
    echo "PASS $description\n";
}
function expectedException(callable $callback, string $expected): void {
    try { $callback(); } catch (\Throwable $error) {
        ensure(str_contains($error->getMessage(), $expected),'rejected '.$expected);return;
    }
    throw new \RuntimeException('Missing exception: '.$expected);
}

$root=sys_get_temp_dir().'/celikom-native-'.bin2hex(random_bytes(7));
mkdir($root);mkdir($root.'/assets');
try {
    $zip='private synthetic CELIKOM source bytes';
    file_put_contents($root.'/source-archive.zip',$zip);
    file_put_contents($root.'/assets/original.css','html {background:#000}');
    file_put_contents($root.'/assets/original.js','document.documentElement.dataset.original="yes";');
    $names=['seo.title'];
    for ($i=1;$i<99;$i++) $names[]='faq.test-'.str_pad((string)$i,2,'0',STR_PAD_LEFT).'.question';
    $template='<!doctype html><html><head><title>{{CELIKOM:seo.title}}</title><link rel="stylesheet" href="/celikom-original-assets/original.css"></head><body><script src="/celikom-original-assets/original.js"></script>';
    $fields=[];$meta=[];
    foreach($names as $name){
        $fields[$name]='Привет & <CELIKOM> "test"';
        $meta[$name]=['max'=>3000];
        if ($name!=='seo.title') $template.='<p>{{CELIKOM:'.$name.'}}</p>';
    }
    $template.='</body></html>';
    file_put_contents($root.'/template.html',$template);
    $format='manufact-celikom-preserved-source-v1';
    $manifest=['format'=>$format,'source_zip_sha256'=>hash('sha256',$zip),
        'template_sha256'=>hash('sha256',$template),'fields'=>$meta,
        'assets'=>['original.css'=>['mime'=>'text/css','sha256'=>hash('sha256','html {background:#000}')],
            'original.js'=>['mime'=>'text/javascript','sha256'=>hash('sha256','document.documentElement.dataset.original="yes";')]]];
    file_put_contents($root.'/manifest.json',json_encode($manifest,JSON_THROW_ON_ERROR));
    file_put_contents($root.'/state.json',json_encode(['format'=>$format,'revision'=>1,
        'revisions'=>['1'=>$fields],'releases'=>[]],JSON_THROW_ON_ERROR));
    $adapter=new CelikomSource($root,hash('sha256',$zip));
    ensure($adapter->snapshot()['revision']===1,'load approved original without changing assets');
    ensure(str_contains($adapter->html(),'&lt;CELIKOM&gt;') && !str_contains($adapter->html(),'<CELIKOM>'),
        'all editable text escaped in immutable HTML');
    ensure(hash('sha256',$adapter->asset('original.js')['bytes'])===$manifest['assets']['original.js']['sha256'],
        'original JavaScript bytes are immutable');
    $next=$fields;$next['seo.title']='Улучшенный CELIKOM';
    $next['faq.test-01.question']='Новый вопрос по CELIKOM';
    ensure($adapter->save($next,1)['revision']===2,'CAS save creates revision 2');
    $reload=new CelikomSource($root,hash('sha256',$zip));
    ensure($reload->snapshot()['fields']['seo.title']==='Улучшенный CELIKOM','reloaded saved heading');
    ensure($reload->snapshot()['fields']['faq.test-01.question']==='Новый вопрос по CELIKOM','reloaded saved FAQ question');
    expectedException(fn()=> $reload->save($next,1),'Stale');
    ensure($reload->publish(2)['version']===1,'separate immutable publication');
    ensure(str_contains($reload->html(null,1),'Улучшенный CELIKOM'),'published output retains saved content');
    ensure($reload->restore(1,2)['revision']===3,'restore creates new draft revision');
    ensure(str_contains($reload->html(null,1),'Улучшенный CELIKOM'),'restore does not change publication');
    ensure($reload->restoreRelease(1,3)['revision']===4,'published release can restore into draft');
    $bad=$next;$bad['seo.title']='<script>alert(1)</script>';
    ensure(str_contains($reload->html($bad),'&lt;script&gt;'),'malicious markup rendered as text');
    unset($bad['seo.title']);
    expectedException(fn()=> $reload->save($bad,4),'Unknown');
    file_put_contents($root.'/assets/original.js','tampered');
    expectedException(fn()=> new CelikomSource($root,hash('sha256',$zip)),'integrity mismatch');
    echo "PASS CELIKOM native source regression\n";
} finally {
    foreach(glob($root.'/assets/*') as $file)unlink($file);
    foreach(glob($root.'/*') as $file)if(is_file($file))unlink($file);
    rmdir($root.'/assets');rmdir($root);
}
