<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use AiSiteCms\Storage\FoundationSnapshot;
use PDO;
use RuntimeException;

/**
 * Offline Stage2 portability rehearsal: copy only EMPTY foundation metadata
 * between two independently staged code/site roots, using a portable
 * SHA-consistency snapshot and explicitly approved target binding.
 *
 * Never moves, modifies or deletes the source. No content, media, revision,
 * user/account or production DB migration. Both code packages must match.
 */
final class LabFoundationTransfer
{
    private const FORMAT = 'ai-site-cms-stage2-foundation-transfer-v1';

    private static function ci(): void
    {
        if (PHP_SAPI !== 'cli' || getenv('CMS_ENV') !== 'test'
            || getenv('CMS_STAGE2_RUNTIME_GATE') !== 'ci-bound'
            || getenv('CMS_ALLOW_SQLITE_TEST_ONLY') !== '1') {
            throw new RuntimeException('Local disposable transfer operator grant required');
        }
    }

    private static function sameKeys(array $v, array $keys): bool
    {
        $found = array_keys($v);
        sort($found, SORT_STRING);
        sort($keys, SORT_STRING);
        return $found === $keys;
    }

    /** @return array<string,mixed> */
    public static function load(string $file): array
    {
        if ($file === '' || !str_starts_with($file, '/') || str_contains($file, "\0")
            || str_contains($file, '\\') || is_link($file)
            || $file !== dirname($file).'/'.basename($file)
            || realpath(dirname($file)) !== dirname($file)
            || dirname($file) === '/' || (@fileperms(dirname($file)) & 0077) !== 0) {
            throw new RuntimeException('Private canonical transfer plan file required');
        }
        $stat = @lstat($file);
        if ($stat === false || !is_file($file) || realpath($file) !== $file
            || ($stat['nlink'] ?? 0) !== 1 || ($stat['mode'] & 0077) !== 0
            || $stat['size'] < 100 || $stat['size'] > 32768) {
            throw new RuntimeException('Unsafe transfer declaration');
        }
        $raw = @file_get_contents($file);
        if (!is_string($raw) || strlen($raw) !== $stat['size']) {
            throw new RuntimeException('Unreadable transfer declaration');
        }
        $doc = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        self::validate($doc);
        foreach ([$doc['source'],$doc['target']] as $item) {
            foreach (['cmsRoot','siteRoot'] as $key) {
                $root=$item[$key];
                if (str_starts_with($file, $root.'/')) {
                    throw new RuntimeException('Transfer declaration may not live under code root');
                }
            }
        }
        return $doc;
    }

    private static function apart(string $a, string $b): bool
    {
        return $a !== $b && !str_starts_with($a,$b.'/') && !str_starts_with($b,$a.'/');
    }

    /** @param mixed $doc */
    private static function validate(mixed $doc): void
    {
        if (!is_array($doc) || !self::sameKeys($doc,['format','source','target'])
            || $doc['format'] !== self::FORMAT) {
            throw new RuntimeException('Unsupported foundation transfer document');
        }
        $roots=[]; $files=[];
        foreach ([$doc['source']??null,$doc['target']??null] as $item) {
            if (!is_array($item) || !self::sameKeys($item,[
                'siteId','cmsRoot','siteRoot','family','capabilities','dbFile','bindingFile'
            ])) throw new RuntimeException('Unknown or absent transfer fields');
            foreach (['siteId','cmsRoot','siteRoot','family','dbFile','bindingFile'] as $key) {
                if (!is_string($item[$key])) throw new RuntimeException('Invalid transfer value type');
            }
            if (!is_array($item['capabilities'])) throw new RuntimeException('Bad capabilities declaration');
            foreach (['cmsRoot','siteRoot'] as $key) {
                $root=$item[$key];
                if ($root === '' || !str_starts_with($root, '/') || is_link($root)
                    || realpath($root) !== $root || !is_dir($root)) {
                    throw new RuntimeException('Transfer roots must be canonical existing directories');
                }
                foreach ($roots as $prev) {
                    if (!self::apart($root,$prev)) throw new RuntimeException('Transfer roots overlap');
                }
                $roots[]=$root;
            }
            foreach (['dbFile','bindingFile'] as $key) {
                $file=$item[$key];
                if (!str_starts_with($file, '/') || is_link($file)
                    || str_contains($file, "\0") || str_contains($file, '\\')
                    || str_contains($file, '?') || str_contains($file, '#')
                    || $file !== dirname($file).'/'.basename($file)
                    || isset($files[$file])) throw new RuntimeException('Unsafe or reused private state');
                $parent=dirname($file);
                if ($parent==='/' || realpath($parent)!==$parent || is_link($parent)
                    || !is_dir($parent) || (@fileperms($parent)&0077)!==0) {
                    throw new RuntimeException('Unsafe transfer private directory');
                }
                $files[$file]=true;
            }
            if (dirname($item['dbFile'])!==dirname($item['bindingFile'])) {
                throw new RuntimeException('Database/binding must share private parent');
            }
        }
        foreach (array_keys($files) as $file) {
            $parent=dirname($file);
            foreach ($roots as $root) {
                if (!self::apart($parent,$root)) throw new RuntimeException('Private state overlaps code');
            }
        }
        if ($doc['source']['siteId'] !== $doc['target']['siteId']
            || $doc['source']['family'] !== $doc['target']['family']) {
            throw new RuntimeException('Transfer requires same logical site and delivery family');
        }
    }

    /** @param array<string,mixed> $item */
    private static function env(array $item): array
    {
        return [
            'CMS_ENV'=>'test','CMS_STAGE2_RUNTIME_GATE'=>'ci-bound',
            'CMS_ALLOW_SQLITE_TEST_ONLY'=>'1',
            'CMS_SITE_ID'=>$item['siteId'],
            'CMS_DB_DSN'=>'sqlite:'.$item['dbFile']
        ];
    }

    /** @param array<string,mixed> $item */
    private static function installerPlan(array $item): array
    {
        return LabEmptyCmsInstaller::plan(
            $item['cmsRoot'],$item['siteRoot'],$item['family'],
            $item['capabilities'],$item['bindingFile'],self::env($item)
        );
    }

    /** @param array<string,mixed> $item */
    private static function snapshot(array $item): string
    {
        // Existing, already validated source SQLite file only.
        $pdo = new PDO('sqlite:'.$item['dbFile'],null,null,[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_TIMEOUT=>3
        ]);
        $pdo->exec('PRAGMA query_only = ON');
        return (new FoundationSnapshot($pdo,true))->export($item['siteId']);
    }

    /** @param array<string,mixed> $doc */
    public static function plan(array $doc): array
    {
        self::ci();
        self::validate($doc);
        $source=$doc['source'];$target=$doc['target'];
        $before=self::installerPlan($source);
        if ($before['state'] !== 'ready') {
            throw new RuntimeException('Only healthy sealed source instances can be transferred');
        }
        $targetPlan=self::installerPlan($target);
        if (!hash_equals(
            (string)hash_file('sha256',$source['cmsRoot'].'/private/package-manifest.json'),
            (string)hash_file('sha256',$target['cmsRoot'].'/private/package-manifest.json')
        )) throw new RuntimeException('Transfer requires matching complete code package');
        $portable=self::snapshot($source);
        FoundationSnapshot::verify($portable,$source['siteId']);
        if ($targetPlan['state'] !== 'install_required') {
            // Existing target must represent EXACTLY the source generation.
            if (!hash_equals($portable,self::snapshot($target))) {
                throw new RuntimeException('Destination foundation metadata differs');
            }
        }
        $intent = hash('sha256',json_encode([
            'format'=>self::FORMAT,
            'source'=>[$source['cmsRoot'],$source['siteRoot'],$source['dbFile'],$source['bindingFile'],$before['token']],
            'target'=>[$target['cmsRoot'],$target['siteRoot'],$target['dbFile'],$target['bindingFile'],$targetPlan['token']],
            'sourceSnapshotSha256'=>hash('sha256',$portable)
        ],JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
        return [
            'format'=>self::FORMAT,'state'=>$targetPlan['state'],
            'action'=>match ($targetPlan['state']) {
                'install_required'=>'restore_empty_metadata_then_bind',
                'binding_required'=>'bind_verified_restored_metadata',
                default=>'no_op'
            },
            'token'=>$intent,
            'readOnly'=>true,'sourceUnchanged'=>true,'productionReady'=>false,
            'dataOrMediaTransferred'=>false,'signatureVerified'=>false
        ];
    }

    /** @param array<string,mixed> $doc */
    public static function apply(array $doc, string $approval): array
    {
        self::ci();
        if (!preg_match('/\A[a-f0-9]{64}\z/D',$approval)) {
            throw new RuntimeException('Explicit current operator approval required');
        }
        $initial=self::plan($doc);
        if (!hash_equals($initial['token'],$approval)) {
            throw new RuntimeException('Transfer plan changed; obtain fresh approval');
        }
        $source=$doc['source'];$target=$doc['target'];
        return LabPrivateStateLock::withLocks(
            [$source['dbFile'],$target['dbFile']],
            static function () use ($doc,$source,$target,$approval):array {
                $current=self::plan($doc);
                if (!hash_equals($current['token'],$approval)) {
                    throw new RuntimeException('Transfer state changed under lock');
                }
                if ($current['state']==='ready') {
                    return ['state'=>'ready','changed'=>false,
                        'sourceUnchanged'=>true,'ciOnly'=>true,'productionReady'=>false];
                }
                if ($current['state']==='install_required') {
                    $portable=self::snapshot($source);
                    $old=umask(0077);
                    try {
                        $pdo=new PDO('sqlite:'.$target['dbFile'],null,null,[
                            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
                            PDO::ATTR_TIMEOUT=>5
                        ]);
                        (new FoundationSnapshot($pdo,true))->restoreToFreshCiDatabase(
                            $portable,$target['siteId']
                        );
                        unset($pdo);
                    } finally { umask($old); }
                    // If killed here: re-plan -> binding_required, no deletion,
                    // verify metadata checksum and separately approve again.
                }
                LabInstanceBinding::create($target['cmsRoot'],$target['siteRoot'],
                    $target['family'],$target['capabilities'],$target['bindingFile'],
                    self::env($target));
                $after=self::plan($doc);
                if ($after['state'] !== 'ready') {
                    throw new RuntimeException('Transferred foundation is not ready');
                }
                return ['state'=>'ready','changed'=>true,
                    'sourceUnchanged'=>true,'ciOnly'=>true,'productionReady'=>false];
            }
        );
    }
}
