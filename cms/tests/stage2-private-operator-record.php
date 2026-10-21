<?php
declare(strict_types=1);

require dirname(__DIR__).'/src/Hosting/Stage2PrivateOperatorRecord.php';

use AiSiteCms\Hosting\Stage2PrivateOperatorRecord as Reader;

$base = sys_get_temp_dir().'/cms-private-record-'.bin2hex(random_bytes(8));
if (!mkdir($base, 0700)) throw new RuntimeException('CI temp directory unavailable');
$private = $base.'/private';
if (!mkdir($private, 0700)) throw new RuntimeException('CI private directory unavailable');
$file = $private.'/once.json';
$record = ['format'=>'stage2-test-only', 'operation'=>'probe', 'scope'=>'local-only'];
$canonical = json_encode($record, JSON_THROW_ON_ERROR);
file_put_contents($file, $canonical);
chmod($file,0600);
$checks = 0;
$ok = static function (bool $pass, string $name) use (&$checks):void {
    ++$checks;
    if (!$pass) throw new RuntimeException('Private record test failed: '.$name);
};
$reject = static function (callable $fn, string $name) use (&$ok):void {
    try {$fn();} catch (Throwable $e) {$ok(true,$name);return;}
    $ok(false, $name.' unexpectedly passed');
};
try {
    $ok(Reader::readBytes($file) === $canonical, 'exact bytes through checked descriptor');
    $ok(Reader::readJsonObject($file) === $record, 'exact object decoded without mutation');
    foreach ([
        $canonical."\n"=>'trailing newline',
        ' '.$canonical=>'leading whitespace',
        str_replace('"format"','"format":"evil","format"',$canonical)=>'duplicate member',
        '[]'=>'JSON array',
        '{}'=>'empty array-shaped object',
        "\xEF\xBB\xBF".$canonical=>'UTF8 BOM',
        $canonical."\0"=>'embedded NUL',
        '{broken'=>'malformed JSON',
    ] as $contents=>$label) {
        file_put_contents($file,$contents);
        $reject(static fn()=>Reader::readJsonObject($file),$label);
    }
    file_put_contents($file,$canonical);
    chmod($file,0644);
    $reject(static fn()=>Reader::readJsonObject($file),'group-readable receipt');
    chmod($file,0600);
    chmod($private,0755);
    $reject(static fn()=>Reader::readJsonObject($file),'group-readable parent directory');
    chmod($private,0700);
    $link=$private.'/symlink.json';
    symlink($file,$link);
    $reject(static fn()=>Reader::readJsonObject($link),'symlink receipt');
    unlink($link);
    $hard=$private.'/hard.json';
    link($file,$hard);
    $reject(static fn()=>Reader::readJsonObject($file),'multi-linked receipt');
    unlink($hard);
    $reject(static fn()=>Reader::readBytes($file,4),'bounded read too short');
    $reject(static fn()=>Reader::readBytes($file,4096,1000),'bounded read below minimum');
    $reject(static fn()=>Reader::readJsonObject('/etc/passwd'),'nonprivate parent');
    $reject(static fn()=>Reader::readJsonObject($private.'/../private/once.json'),
        'path traversal lexical alias');
    $ok(Reader::readJsonObject($file)===$record,'restored private record readable');
    echo "Stage2 private one-shot descriptor and strict JSON PASS: {$checks} assertions; no host or DB\n";
} finally {
    @unlink($file);
    @rmdir($private);
    @rmdir($base);
}
