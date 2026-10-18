<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use AiSiteCms\Storage\SchemaManager;
use PDO;
use RuntimeException;
use Throwable;

/**
 * Stage2 reproducible EMPTY-CMS installer rehearsal for a disposable SQLite DB.
 * No MySQL or production installation, release-signature authentication,
 * website adapters, data/content restore or HTTP writes are implemented.
 *
 * The plan is read-only and does not create even an empty SQLite file.
 * apply() requires the operator to supply an exact, freshly obtained plan
 * digest and holds a per-instance filesystem lock before any writes.
 * Recover after interruption via another explicit plan and approval:
 * NEVER delete or silently repair a partially initialized database.
 */
final class LabEmptyCmsInstaller
{
    private const PLAN_FORMAT = 'ai-site-cms-stage2-install-plan-v1';

    /** @param array<string,mixed> $env */
    private static function paths(string $cms, string $site, string $binding, array $env): array
    {
        if (($env['CMS_ENV'] ?? null) !== 'test'
            || ($env['CMS_STAGE2_RUNTIME_GATE'] ?? null) !== 'ci-bound'
            || ($env['CMS_ALLOW_SQLITE_TEST_ONLY'] ?? null) !== '1') {
            throw new RuntimeException('Stage2 CI-only operator grant is required');
        }
        $dsn = $env['CMS_DB_DSN'] ?? null;
        $siteId = $env['CMS_SITE_ID'] ?? null;
        if (!is_string($dsn) || !str_starts_with($dsn, 'sqlite:')
            || !is_string($siteId) || !preg_match('/\A[a-z][a-z0-9-]{2,63}\z/D', $siteId)) {
            throw new RuntimeException('Explicit test-only SQLite DB and valid installation ID required');
        }
        $db = substr($dsn, 7);
        if (!self::externalFile($db, $cms, $site)
            || !self::externalFile($binding, $cms, $site)
            || dirname($db) !== dirname($binding) || $binding === $db
            || str_contains($db, '?') || str_contains($db, '#')) {
            throw new RuntimeException('Private external installation paths must be canonical');
        }
        return [$db, $siteId];
    }

    private static function externalFile(string $file, string $cms, string $site): bool
    {
        if ($file === '' || !str_starts_with($file, '/')
            || str_contains($file, "\0") || str_contains($file, '\\')
            || $file !== dirname($file).'/'.basename($file)
            || is_link($file)) return false;
        $parent = dirname($file);
        if (realpath($parent) !== $parent || is_link($parent)
            || !is_dir($parent) || $parent === '/'
            || (@fileperms($parent) & 0077) !== 0) return false;
        foreach ([$cms,$site] as $root) {
            if (realpath($root) !== $root || is_link($root)
                || $parent === $root || str_starts_with($parent, $root.'/')
                || str_starts_with($root,$parent.'/')) return false;
        }
        if (file_exists($file)) {
            $stat = @lstat($file);
            if ($stat === false || !is_file($file)
                || realpath($file) !== $file || ($stat['nlink'] ?? 0) !== 1
                || (($stat['mode'] ?? 0) & 0077) !== 0) return false;
        }
        return true;
    }

    /** @param array<string,mixed> $capabilities
     *  @param array<string,mixed> $env
     *  @return array{format:string,state:string,approvedAction:string,token:string,readOnly:bool,productionReady:bool,signatureVerified:bool}
     */
    public static function plan(
        string $cms, string $site, string $family, array $capabilities,
        string $binding, array $env
    ): array {
        [$db,$siteId] = self::paths($cms,$site,$binding,$env);
        $topology = SiteRuntimeTopology::assess($cms,$site,$family,$capabilities);
        if (!$topology['declarationCompatible']) {
            throw new RuntimeException('Declared host capabilities do not satisfy chosen site runtime');
        }
        // Full pinned runtime payload hash/inventory and private/public placement.
        PackageArtifactVerifier::verify($cms);
        if (is_link($db) || is_link($binding)) {
            throw new RuntimeException('Links are not permitted in installation state');
        }
        $dbExists = file_exists($db);
        $bindingExists = file_exists($binding);
        $state = 'install_required';
        $action = 'initialize_empty_db_then_bind';
        if ($dbExists) {
            // Read-only schema inspector; refuses foreign/partially migrated DB.
            $check = EmptyCmsStartupReadiness::inspect($cms, array_merge($env,
                ['CMS_STAGE2_RUNTIME_GATE'=>'ci-bound']));
            if (!$check['ready']) {
                throw new RuntimeException('Database is not ready; stop for explicit recovery');
            }
            $state = 'binding_required';
            $action = 'bind_existing_empty_db';
        } elseif ($bindingExists) {
            throw new RuntimeException('Binding exists without a database');
        }
        if ($bindingExists) {
            $readiness = LabInstanceBinding::inspect($cms,
                array_merge($env, ['CMS_STAGE2_BINDING_FILE'=>$binding]));
            if (!$readiness['ready']) {
                throw new RuntimeException('Binding mismatched existing installation');
            }
            // The existing binding must match THIS requested site/family,
            // not merely be a valid binding for some other independent site.
            $bound=json_decode((string)file_get_contents($binding),true,8,JSON_THROW_ON_ERROR);
            if (!is_array($bound) || ($bound['siteRoot'] ?? null) !== $site
                || ($bound['family'] ?? null) !== $family
                || ($bound['cmsRoot'] ?? null) !== $cms) {
                throw new RuntimeException('Operator requested a different site or renderer');
            }
            $state = 'ready';
            $action = 'no_op';
        }

        $digestInput = [
            'format'=>self::PLAN_FORMAT,
            'cms'=>$cms,'site'=>$site,'family'=>$family,
            'siteId'=>$siteId,'db'=>$db,'binding'=>$binding,
            'capabilities'=>$capabilities,
            'sitePublicFingerprint'=>$topology['sitePublicFingerprint'],
            'cmsPublicFingerprint'=>$topology['cmsPublicFingerprint'],
            'packageManifestHash'=>hash_file('sha256',$cms.'/private/package-manifest.json'),
            'state'=>$state
        ];
        $token = hash('sha256', json_encode($digestInput,
            JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        return [
            'format'=>self::PLAN_FORMAT,
            'state'=>$state,'approvedAction'=>$action,'token'=>$token,
            'readOnly'=>true,'productionReady'=>false,'signatureVerified'=>false
        ];
    }

    /**
     * Explicit write-side phase. No rollback/delete when a DB is nonempty,
     * compromised or a process is killed. Plan again after interruption.
     * @param array<string,mixed> $capabilities
     * @param array<string,mixed> $env
     * @return array{state:string,changed:bool,ciOnly:bool,productionReady:bool}
     */
    public static function apply(
        string $cms, string $site, string $family, array $capabilities,
        string $binding, array $env, string $approval
    ): array {
        if (PHP_SAPI !== 'cli' || !preg_match('/^[a-f0-9]{64}$/D',$approval)) {
            throw new RuntimeException('Explicit operator digest required');
        }
        [$db,$siteId] = self::paths($cms,$site,$binding,$env);
        // Reject unauthorised or stale requests before creating even a lock
        // file; repeat this exact check UNDER flock to close operator races.
        $initial=self::plan($cms,$site,$family,$capabilities,$binding,$env);
        if (!hash_equals($initial['token'],$approval)) {
            throw new RuntimeException('Stale or mismatched operator approval');
        }
        return LabPrivateStateLock::withLocks([$db], static function () use (
            $cms,$site,$family,$capabilities,$binding,$env,$approval,$db,$siteId
        ): array {
            // Re-evaluate all policy and DB state after obtaining the lock.
            $plan = self::plan($cms,$site,$family,$capabilities,$binding,$env);
            if (!hash_equals($plan['token'],$approval)) {
                throw new RuntimeException('Stale or mismatched operator approval');
            }
            if ($plan['state'] === 'ready') {
                return ['state'=>'ready','changed'=>false,
                    'ciOnly'=>true,'productionReady'=>false];
            }
            if ($plan['state'] === 'install_required') {
                // SQLite only, disposable CI path validated and private. A crash
                // may leave a nonempty DB: the next plan refuses partial state.
                $previousUmask = umask(0077);
                try {
                    $pdo = new PDO('sqlite:'.$db,null,null,[
                        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_TIMEOUT=>5
                    ]);
                    (new SchemaManager($pdo,true))->installSite($siteId);
                    unset($pdo);
                } finally {
                    umask($previousUmask);
                }
            }
            // The issuer separately rechecks code inventory, host topology and
            // the fully journaled site DB before creating the private binding.
            LabInstanceBinding::create($cms,$site,$family,$capabilities,$binding,$env);
            $readiness = LabInstanceBinding::inspect($cms,
                array_merge($env,['CMS_STAGE2_BINDING_FILE'=>$binding]));
            if (!$readiness['ready']) {
                throw new RuntimeException('Post-install startup binding not ready');
            }
            return ['state'=>'ready','changed'=>true,
                'ciOnly'=>true,'productionReady'=>false];

        });
    }
}
