<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use RuntimeException;
use Throwable;

/**
 * Stage2 operator-owned, local/disposable FLEET plan and install rehearsal.
 * One immutable declaration describes independent CMS code, website code,
 * SQLite metadata and private binding for EACH site. This is deliberately
 * not a remote orchestration service, production config loader, site adapter,
 * distributed transaction or an authoritative host capability probe.
 *
 * A fleet apply is sequential, not atomic: after interruption the operator
 * MUST obtain and approve a NEW read-only plan. No destructive compensation.
 */
final class LabInstallationFleet
{
    private const FORMAT = 'ai-site-cms-stage2-install-fleet-v1';
    private const MAX_INSTANCES = 12;
    private const MAX_DOCUMENT_BYTES = 65536;

    private static function requireCiOperator(): void
    {
        // Unlike the per-site installer, a fleet derives each site's env
        // from a declarative file. It must STILL require a real externally
        // opted-in laboratory process. Never synthesize this authorization.
        if (getenv('CMS_ENV') !== 'test'
            || getenv('CMS_STAGE2_RUNTIME_GATE') !== 'ci-bound'
            || getenv('CMS_ALLOW_SQLITE_TEST_ONLY') !== '1') {
            throw new RuntimeException('Explicit CI-only fleet operator grant required');
        }
    }

    private static function keys(array $value, array $expected): bool
    {
        $actual = array_keys($value);
        sort($actual, SORT_STRING);
        sort($expected, SORT_STRING);
        return $actual === $expected;
    }

    private static function canonicalRoot(string $root): void
    {
        if ($root === '' || !str_starts_with($root, '/')
            || str_contains($root, "\0") || str_contains($root, '\\')
            || is_link($root) || realpath($root) !== $root || !is_dir($root)) {
            throw new RuntimeException('Fleet requires existing canonical roots');
        }
    }

    private static function separate(string $a, string $b): bool
    {
        return $a !== $b && !str_starts_with($a, $b.'/')
            && !str_starts_with($b, $a.'/');
    }

    private static function privateFile(string $file): string
    {
        if ($file === '' || strlen($file) > 4096
            || !str_starts_with($file, '/') || str_contains($file, "\0")
            || str_contains($file, '\\') || str_contains($file, '?')
            || str_contains($file, '#')
            || $file !== dirname($file).'/'.basename($file)
            || is_link($file)) {
            throw new RuntimeException('Fleet private state file path invalid');
        }
        $parent = dirname($file);
        if ($parent === '/' || realpath($parent) !== $parent
            || is_link($parent) || !is_dir($parent)
            || ((@fileperms($parent) & 0077) !== 0)) {
            throw new RuntimeException('Fleet private state folder invalid');
        }
        if (file_exists($file)) {
            $stat = @lstat($file);
            if ($stat === false || !is_file($file)
                || realpath($file) !== $file
                || ($stat['nlink'] ?? 0) !== 1
                || ($stat['mode'] & 0077) !== 0) {
                throw new RuntimeException('Unsafe existing fleet state file');
            }
        }
        return $parent;
    }

    /**
     * Validates a sealed, operator-supplied declaration, not arbitrary env,
     * external credentials or website code. No filesystem mutations.
     *
     * @param array<string,mixed> $document
     * @return list<array<string,mixed>>
     */
    public static function validate(array $document): array
    {
        if (!self::keys($document, ['format','instances'])
            || $document['format'] !== self::FORMAT
            || !is_array($document['instances'])
            || count($document['instances']) < 1
            || count($document['instances']) > self::MAX_INSTANCES
            || array_keys($document['instances']) !== range(0, count($document['instances']) - 1)) {
            throw new RuntimeException('Invalid fleet document structure');
        }
        $roots = [];
        $privateFiles = [];
        $identities = [];
        $instances = [];
        foreach ($document['instances'] as $item) {
            if (!is_array($item) || !self::keys($item,[
                'siteId','cmsRoot','siteRoot','family','capabilities','dbFile','bindingFile'
            ])) {
                throw new RuntimeException('Unknown fleet configuration fields');
            }
            foreach (['siteId','cmsRoot','siteRoot','family','dbFile','bindingFile'] as $key) {
                if (!is_string($item[$key])) {
                    throw new RuntimeException('Invalid fleet installation value');
                }
            }
            if (!preg_match('/\A[a-z][a-z0-9-]{2,63}\z/D', $item['siteId'])
                || isset($identities[$item['siteId']])
                || !is_array($item['capabilities'])
                || !in_array($item['family'], SiteRuntimeTopology::families(), true)) {
                throw new RuntimeException('Unsupported or duplicate fleet identity');
            }
            self::canonicalRoot($item['cmsRoot']);
            self::canonicalRoot($item['siteRoot']);
            foreach ([$item['cmsRoot'], $item['siteRoot']] as $root) {
                foreach ($roots as $other) {
                    if (!self::separate($root, $other)) {
                        throw new RuntimeException('Fleet CMS/site roots overlap');
                    }
                }
                $roots[] = $root;
            }
            $dbParent = self::privateFile($item['dbFile']);
            $bindingParent = self::privateFile($item['bindingFile']);
            if ($dbParent !== $bindingParent || $item['dbFile'] === $item['bindingFile']) {
                throw new RuntimeException('Fleet state pair must be distinct in one private folder');
            }
            foreach ([$item['dbFile'], $item['bindingFile']] as $file) {
                if (isset($privateFiles[$file])) {
                    throw new RuntimeException('Fleet DB and binding paths must be globally unique');
                }
                $privateFiles[$file] = true;
            }
            $identities[$item['siteId']] = true;
            $instances[] = $item;
        }
        // Cross-site state alias/ancestor paths must not point into ANY site's
        // code/public root, even if the owner declared a different site.
        foreach (array_keys($privateFiles) as $file) {
            $parent = dirname($file);
            foreach ($roots as $root) {
                if (!self::separate($parent, $root)) {
                    throw new RuntimeException('Private DB/binding location intersects fleet code');
                }
            }
        }
        usort($instances, static fn(array $a, array $b):int =>
            strcmp($a['siteId'], $b['siteId']));
        return $instances;
    }

    /** Parse one strictly bounded, private file outside all site/CMS roots. */
    public static function load(string $file): array
    {
        self::privateFile($file);
        $stat = @lstat($file);
        if ($stat === false || $stat['size'] < 30
            || $stat['size'] > self::MAX_DOCUMENT_BYTES || !is_file($file)) {
            throw new RuntimeException('Missing or oversized operator fleet document');
        }
        $json = @file_get_contents($file);
        if (!is_string($json) || strlen($json) !== $stat['size']) {
            throw new RuntimeException('Unreadable fleet document');
        }
        $doc = json_decode($json, true, 16, JSON_THROW_ON_ERROR);
        if (!is_array($doc)) throw new RuntimeException('Fleet must be JSON object');
        $instances = self::validate($doc);
        foreach ($instances as $item) {
            foreach ([$item['cmsRoot'], $item['siteRoot']] as $root) {
                if (!self::separate($file, $root) && str_starts_with($file, $root.'/')) {
                    throw new RuntimeException('Operator configuration must be outside public/code roots');
                }
            }
        }
        return $doc;
    }

    /** @param array<string,mixed> $item */
    private static function environment(array $item): array
    {
        return [
            'CMS_ENV'=>'test', 'CMS_STAGE2_RUNTIME_GATE'=>'ci-bound',
            'CMS_ALLOW_SQLITE_TEST_ONLY'=>'1',
            'CMS_SITE_ID'=>$item['siteId'],
            'CMS_DB_DSN'=>'sqlite:'.$item['dbFile']
        ];
    }

    /**
     * Operator read-only fleet plan: every instance independently verified,
     * plus global resource ownership/alias checks before reporting a token.
     * This cannot authorize production deployment or guarantee host support.
     * @param array<string,mixed> $document
     * @return array<string,mixed>
     */
    public static function plan(array $document): array
    {
        self::requireCiOperator();
        $instances = self::validate($document);
        $items = [];
        $inputs = [];
        $allReady = true;
        foreach ($instances as $item) {
            $p = LabEmptyCmsInstaller::plan(
                $item['cmsRoot'], $item['siteRoot'], $item['family'],
                $item['capabilities'], $item['bindingFile'],
                self::environment($item)
            );
            $items[] = [
                'siteId'=>$item['siteId'], 'family'=>$item['family'],
                'state'=>$p['state'], 'approvedAction'=>$p['approvedAction']
            ];
            $inputs[] = [$item['siteId'], $p['token']];
            $allReady = $allReady && $p['state'] === 'ready';
        }
        return [
            'format'=>self::FORMAT,
            'instances'=>$items, 'allReady'=>$allReady,
            'token'=>hash('sha256', json_encode([
                'format'=>self::FORMAT, 'plans'=>$inputs
            ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)),
            'readOnly'=>true, 'ciOnly'=>true, 'productionReady'=>false,
            'signatureVerified'=>false,
            'atomicAcrossSites'=>false
        ];
    }

    /**
     * Requires a matching CURRENT fleet plan. A crash after any site requires
     * a fresh fleet token; completed sites become safe no-ops on reapproval.
     * @param array<string,mixed> $document
     * @return array<string,mixed>
     */
    public static function apply(array $document, string $approval): array
    {
        self::requireCiOperator();
        if (PHP_SAPI !== 'cli' || !preg_match('/\A[a-f0-9]{64}\z/D', $approval)) {
            throw new RuntimeException('Fleet apply requires explicit 64-hex approval');
        }
        $initial = self::plan($document);
        if (!hash_equals($initial['token'], $approval)) {
            throw new RuntimeException('Fleet plan is stale or unapproved');
        }
        // Fleet-level serialization for equivalent resource sets, in addition
        // to separate per-DB locks. The artificial lock identity cannot collide
        // with any real database path and never creates a database.
        $resources = array_map(static fn(array $x): string =>
            $x['dbFile'], self::validate($document));
        sort($resources, SORT_STRING);
        $anchor = dirname($resources[0]).'/.fleet-group-'.substr(hash(
            'sha256', implode("\n",$resources)
        ),0,32);
        return LabPrivateStateLock::withLocks([$anchor], static function () use (
            $document, $approval, $initial
        ): array {
            $underLock = self::plan($document);
            if (!hash_equals($underLock['token'], $approval)) {
                throw new RuntimeException('Fleet changed while waiting for group lock');
            }
        $expectedSingles = [];
        foreach (self::validate($document) as $item) {
            $single = LabEmptyCmsInstaller::plan(
                $item['cmsRoot'], $item['siteRoot'], $item['family'],
                $item['capabilities'], $item['bindingFile'],
                self::environment($item)
            );
            $expectedSingles[$item['siteId']] = $single['token'];
        }
        $results = [];
        // Individual installers each hold a private per-site flock. Fleet
        // execution is deliberately NOT a distributed/atomic DB transaction.
        foreach (self::validate($document) as $item) {
            // Another process may have changed *any* earlier/later site.
            // Replan the entire fleet before each mutation, using a fresh
            // observed state but never treating unexpected changes as consent.
            $current = self::plan($document);
            // Compare expected state of remaining sites to INITIAL plan; only
            // our already-completed sites are allowed to change to ready.
            foreach ($current['instances'] as $i => $record) {
                $before = $initial['instances'][$i];
                if (!isset($results[$record['siteId']])
                    && $record !== $before) {
                    throw new RuntimeException('Concurrent fleet change requires reapproval');
                }
            }
            $single = LabEmptyCmsInstaller::plan(
                $item['cmsRoot'], $item['siteRoot'], $item['family'],
                $item['capabilities'], $item['bindingFile'],
                self::environment($item)
            );
            if (!hash_equals($expectedSingles[$item['siteId']], $single['token'])) {
                throw new RuntimeException('Concurrent site change requires fresh fleet approval');
            }
            $done = LabEmptyCmsInstaller::apply(
                $item['cmsRoot'], $item['siteRoot'], $item['family'],
                $item['capabilities'], $item['bindingFile'],
                self::environment($item), $single['token']
            );
            $results[$item['siteId']] = $done['changed'];
            // CI-only crash point between two completed site operations. No
            // production operator path can enter this (explicit env CI gate).
            if (getenv('CMS_STAGE2_INJECT_FLEET_CRASH') === '1'
                && getenv('CMS_STAGE2_FAULT_AFTER_SITE') === $item['siteId']) {
                fwrite(STDERR, "CI_FLEET_FAULT_HOOK\n");
                fflush(STDERR);
                sleep(30);
            }
        }
        $final = self::plan($document);
        if (!$final['allReady']) throw new RuntimeException('Fleet did not reach ready');
        return [
            'state'=>'ready', 'instances'=>count($results),
            'changed'=>count(array_filter($results)),
            'ciOnly'=>true, 'productionReady'=>false,
            'atomicAcrossSites'=>false
        ];
        });
    }
}
