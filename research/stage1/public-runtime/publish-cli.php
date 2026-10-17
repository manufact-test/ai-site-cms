<?php
/* Research only: PHP CLI + real Opis server-side schema; NOT a production CMS publisher.
 * Only execute off-webroot under an authorized deployment account. */
declare(strict_types=1);
require __DIR__.'/snapshot-store.php';
require __DIR__.'/../vendor/autoload.php';

use Opis\JsonSchema\CompliantValidator;

function atomicStore(string $file, object $data): void
{
    if (!stage1HeroValid($data)) throw new RuntimeException('Refuse invalid snapshot');
    $bytes = json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    if (strlen($bytes) > 20000) throw new RuntimeException('Snapshot too large');
    $temp = tempnam(dirname($file), '.stage1-');
    if ($temp === false) throw new RuntimeException('Cannot create temp file');
    try {
        if (file_put_contents($temp, $bytes, LOCK_EX) !== strlen($bytes)) throw new RuntimeException('Short write');
        if (!chmod($temp, 0600)) throw new RuntimeException('Cannot restrict permissions');
        if (!rename($temp, $file)) throw new RuntimeException('Atomic replacement failed');
    } finally {
        if (is_file($temp)) @unlink($temp);
    }
}
function requireValidOpis(object $data, object $schema, CompliantValidator $validator): void
{
    if (!$validator->validate($data, $schema)->isValid() || !stage1HeroValid($data)) {
        throw new RuntimeException('Snapshot rejected by Opis/schema or runtime validation');
    }
}
function main(array $argv): array
{
    if (PHP_SAPI !== 'cli') throw new RuntimeException('Command-line operation only');
    $command = $argv[1] ?? '';
    $arg = $argv[2] ?? '';
    if (!in_array($command, ['publish','rollback'], true)) throw new RuntimeException('Command must be publish or rollback');
    $dir = getenv('STAGE1_SNAPSHOT_DIRECTORY');
    if (!is_string($dir) || $dir === '' || !is_dir($dir)) throw new RuntimeException('Configured snapshot directory must already exist');
    $directory = realpath($dir);
    if ($directory === false) throw new RuntimeException('Snapshot directory unavailable');
    $history = $directory . '/revisions';
    if (!is_dir($history) && !mkdir($history,0700) && !is_dir($history)) throw new RuntimeException('Cannot create revisions directory');
    $lock = fopen($directory.'/.publish.lock', 'c+');
    if ($lock === false) throw new RuntimeException('Cannot open publication lock');
    if (!flock($lock,LOCK_EX)) throw new RuntimeException('Cannot lock publisher');
    try {
        $schema = json_decode(file_get_contents(__DIR__.'/published-hero.schema.json'),false,32,JSON_THROW_ON_ERROR);
        $validator = new CompliantValidator();
        $currentPath = $directory.'/current.json';
        $lastGoodPath = $directory.'/last-good.json';
        $current = stage1ReadFile($currentPath);
        $lastGood = stage1ReadFile($lastGoodPath);
        if (is_file($currentPath) && $current === null) {
            throw new RuntimeException('Current snapshot is corrupt: rollback explicitly before publishing again');
        }
        if ($current === null && $lastGood !== null) {
            throw new RuntimeException('Current snapshot is missing: rollback explicitly before publishing again');
        }
        if ($command === 'publish') {
            if (!is_file($arg)) throw new RuntimeException('Publish input JSON file missing');
            $bytes = file_get_contents($arg);
            if (!is_string($bytes) || strlen($bytes) > 20000) throw new RuntimeException('Invalid input size');
            $candidate = json_decode($bytes,false,16,JSON_THROW_ON_ERROR);
        } else {
            if (!preg_match('/^rev-[a-f0-9]{24}$/D',$arg)) throw new RuntimeException('Invalid revision identifier');
            $candidate = stage1ReadFile($history.'/'.$arg.'.json');
            if ($candidate === null) throw new RuntimeException('Revision not found or corrupted');
        }
        if (!is_object($candidate)) throw new RuntimeException('Expected a JSON object');
        requireValidOpis($candidate,$schema,$validator);
        // Maintain a valid previous generation BEFORE replacing the public pointer.
        if ($current !== null) {
            requireValidOpis($current,$schema,$validator);
            atomicStore($lastGoodPath, $current);
        } elseif ($lastGood === null) {
            atomicStore($lastGoodPath, $candidate);
        }
        $revision = 'rev-'.bin2hex(random_bytes(12));
        $target = $history.'/'.$revision.'.json';
        if (file_exists($target)) throw new RuntimeException('Revision id collision');
        atomicStore($target,$candidate);
        $check = stage1ReadFile($target);
        if ($check === null) throw new RuntimeException('Cannot reread staged revision');
        atomicStore($currentPath, $check);
        $live = stage1ReadFile($currentPath);
        if ($live === null) throw new RuntimeException('Published artifact failed post-write check');
        return ['ok'=>true,'operation'=>$command,'revision'=>$revision,'basedOn'=>$command==='rollback'?$arg:null,'title'=>$live->title];
    } finally {
        flock($lock,LOCK_UN); fclose($lock);
    }
}
try {
    echo 'STAGE1_PUBLISH='.json_encode(main($argv),JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE).PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR,'STAGE1_PUBLISH_REJECTED='.json_encode(['ok'=>false,'reason'=>$e->getMessage()],JSON_THROW_ON_ERROR).PHP_EOL);
    exit(1);
}
