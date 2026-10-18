<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use RuntimeException;
use Throwable;

/**
 * Offline Stage2 disposable-instance binding. NOT a trusted production
 * signature or public installer. The binding prevents accidentally mixing
 * site code, CMS code, and foundation DB in independently staged fixtures.
 * Its SHA256 manifest hash detects changes but provides NO authenticity.
 */
final class LabInstanceBinding
{
    private const FORMAT = 'ai-site-cms-stage2-ci-instance-binding-v1';
    private const MAX_BYTES = 4096;

    /** @return array{ready:bool,state:string,readOnly:bool,ciOnly:bool,productionReady:bool} */
    private static function result(bool $ok, string $state): array
    {
        return ['ready'=>$ok,'state'=>$state,'readOnly'=>true,
            'ciOnly'=>true,'productionReady'=>false];
    }

    /** @param array<string,mixed> $env */
    public static function inspect(string $cmsRoot, array $env): array
    {
        if (($env['CMS_STAGE2_RUNTIME_GATE'] ?? null) !== 'ci-bound'
            || ($env['CMS_ENV'] ?? null) !== 'test'
            || ($env['CMS_ALLOW_SQLITE_TEST_ONLY'] ?? null) !== '1') {
            return self::result(false, 'binding_gate_required');
        }
        $file = $env['CMS_STAGE2_BINDING_FILE'] ?? null;
        $dsn = $env['CMS_DB_DSN'] ?? null;
        $siteId = $env['CMS_SITE_ID'] ?? null;
        if (!is_string($file) || !is_string($dsn) || !is_string($siteId)
            || $file === '' || !str_starts_with($file,'/')
            || str_contains($file,"\0") || str_contains($file,'\\')
            || !preg_match('/\A[a-z][a-z0-9-]{2,63}\z/D',$siteId)) {
            return self::result(false, 'binding_configuration_invalid');
        }
        try {
            $real = realpath($file);
            $root = realpath($cmsRoot);
            if ($real === false || $real !== $file || $root !== $cmsRoot
                || is_link($file) || !is_file($file) || $root === false) {
                return self::result(false, 'binding_invalid');
            }
            $stat = @lstat($file);
            if ($stat === false || $stat['size'] < 30
                || $stat['size'] > self::MAX_BYTES || ($stat['nlink'] ?? 0) !== 1
                || ($stat['mode'] & 0077) !== 0
                || str_starts_with($file, $root.'/')) {
                return self::result(false, 'binding_invalid');
            }
            $raw = @file_get_contents($file);
            if (!is_string($raw) || strlen($raw) !== $stat['size']) {
                return self::result(false, 'binding_invalid');
            }
            $doc = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
            if (!is_array($doc)) return self::result(false, 'binding_invalid');
            $keys=array_keys($doc);
            sort($keys,SORT_STRING);
            $known=['cmsRoot','dbFile','family','format','manifestSha256','siteId','siteRoot'];
            sort($known,SORT_STRING);
            if ($keys !== $known
                || $doc['format'] !== self::FORMAT
                || !is_string($doc['cmsRoot'])
                || !is_string($doc['siteRoot'])
                || !is_string($doc['dbFile'])
                || !is_string($doc['family'])
                || !is_string($doc['siteId'])
                || !is_string($doc['manifestSha256'])
                || !preg_match('/^[a-f0-9]{64}$/D',$doc['manifestSha256'])) {
                return self::result(false, 'binding_invalid');
            }
            $siteRoot = realpath($doc['siteRoot']);
            if ($doc['cmsRoot'] !== $root
                || $siteRoot === false || $siteRoot !== $doc['siteRoot']
                || is_link($siteRoot) || !is_dir($siteRoot)
                || str_starts_with($siteRoot,$root.'/')
                || str_starts_with($root,$siteRoot.'/')
                || $doc['siteId'] !== $siteId
                || $doc['dbFile'] !== substr($dsn,7)
                || !in_array($doc['family'], SiteRuntimeTopology::families(),true)
                || $file === $doc['dbFile']
                || str_starts_with($file,$siteRoot.'/')) {
                return self::result(false, 'binding_mismatch');
            }
            $manifest = $root.'/private/package-manifest.json';
            if (is_link($manifest) || !is_file($manifest)
                || !hash_equals($doc['manifestSha256'],
                    (string) @hash_file('sha256',$manifest))) {
                return self::result(false, 'package_mismatch');
            }
            $schema = EmptyCmsStartupReadiness::inspect($root, $env);
            if (!$schema['ready']) return self::result(false,'schema_not_ready');
            return self::result(true,'ready');
        } catch (Throwable $e) {
            return self::result(false,'binding_invalid');
        }
    }

    /** @return array{ready:bool,state:string,readOnly:bool,ciOnly:bool,productionReady:bool} */
    public static function fromProcess(string $cmsRoot): array
    {
        $env=[];
        foreach (['CMS_STAGE2_RUNTIME_GATE','CMS_ENV','CMS_ALLOW_SQLITE_TEST_ONLY',
            'CMS_DB_DSN','CMS_SITE_ID','CMS_STAGE2_BINDING_FILE'] as $name) {
            $value=getenv($name);
            $env[$name]=$value===false?null:$value;
        }
        return self::inspect($cmsRoot,$env);
    }

    /**
     * Explicit local CLI-only write to a NEW private file, following full
     * read-only package, topology and empty SQLite schema verification.
     * Never creates directories, connections to remote hosts, or keys.
     * @param array<string,mixed> $env
     * @param array<string,mixed> $capabilities
     * @return array{bound:bool,productionReady:bool,signatureVerified:bool}
     */
    public static function create(
        string $cmsRoot,string $siteRoot,string $family,
        array $capabilities,string $bindingFile,array $env
    ): array {
        if (PHP_SAPI !== 'cli' || ($env['CMS_STAGE2_RUNTIME_GATE'] ?? null) !== 'ci-bound') {
            throw new RuntimeException('CI-only explicit binding required');
        }
        $cms=realpath($cmsRoot);
        $site=realpath($siteRoot);
        $parent=dirname($bindingFile);
        $realParent=realpath($parent);
        if ($cms===false || $site===false || $cms!==$cmsRoot || $site!==$siteRoot
            || is_link($cmsRoot) || is_link($siteRoot)
            || $realParent===false || $realParent!==$parent
            || is_link($parent) || ($realParent==='/')
            || !is_dir($parent) || ($cms === $site)
            || str_starts_with($realParent,$cms.'/')
            || str_starts_with($realParent,$site.'/')
            || str_starts_with($cms,$realParent.'/')
            || str_starts_with($site,$realParent.'/')
            || !str_starts_with($bindingFile,'/')
            || str_contains($bindingFile,"\0")
            || str_contains($bindingFile,'\\')
            || ($bindingFile !== $parent.'/'.basename($bindingFile))
            || file_exists($bindingFile) || is_link($bindingFile)
            || ((@fileperms($parent) & 0077) !== 0)) {
            throw new RuntimeException('Binding output must be a new private canonical external file');
        }
        $topology=SiteRuntimeTopology::assess($cms,$site,$family,$capabilities);
        if (!$topology['declarationCompatible']) {
            throw new RuntimeException('Site hosting declaration not compatible');
        }
        PackageArtifactVerifier::verify($cms);
        $schema=EmptyCmsStartupReadiness::inspect($cms,$env);
        if (!$schema['ready']) {
            throw new RuntimeException('Empty schema not initialized or mismatched');
        }
        $dbFile=substr((string)$env['CMS_DB_DSN'],7);
        $document=[
            'format'=>self::FORMAT,'siteId'=>$env['CMS_SITE_ID'],
            'cmsRoot'=>$cms,'siteRoot'=>$site,'family'=>$family,
            'dbFile'=>$dbFile,
            'manifestSha256'=>hash_file('sha256',$cms.'/private/package-manifest.json')
        ];
        $json=json_encode($document,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
        if (strlen($json)>self::MAX_BYTES) throw new RuntimeException('Binding exceeds size budget');
        $old=umask(0077);
        try {
            $handle=@fopen($bindingFile,'x');
            if ($handle === false) throw new RuntimeException('Cannot exclusively create new binding');
            try {
                if (!chmod($bindingFile,0600) || fwrite($handle,$json)!==strlen($json)
                    || !fflush($handle)) {
                    throw new RuntimeException('Could not persist entire binding');
                }
            } catch (Throwable $e) {
                fclose($handle);
                @unlink($bindingFile);
                throw $e;
            }
            fclose($handle);
        } finally {
            umask($old);
        }
        $check=self::inspect($cms,array_merge($env,['CMS_STAGE2_BINDING_FILE'=>$bindingFile]));
        if (!$check['ready']) {
            @unlink($bindingFile);
            throw new RuntimeException('Persisted instance binding verification failed');
        }
        return ['bound'=>true,'productionReady'=>false,'signatureVerified'=>false];
    }
}
