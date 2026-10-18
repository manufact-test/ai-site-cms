<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use RuntimeException;

/**
 * Stage2 OFFLINE deployment-boundary decision record, NOT a web server,
 * virtual-host configuration writer, production installer or site adapter.
 * Declares the website-vs-CMS host/route/ABI separation for an entire fleet,
 * and pins it to a verified read-only fleet plan (including public site bytes).
 *
 * Only fictitious .test DNS names and isolated lab state are accepted. No
 * DNS/TLS, Apache/FPM, reverse proxy, customer server or network probing.
 */
final class LabDeploymentBlueprint
{
    private const FORMAT = 'ai-site-cms-stage2-offline-deployment-blueprint-v1';
    private const MAX_CONFIG_BYTES = 65536;

    private static function exactKeys(array $record, array $expected): bool
    {
        $actual = array_keys($record);
        sort($actual, SORT_STRING);
        sort($expected, SORT_STRING);
        return $actual === $expected;
    }

    private static function labOnly(): void
    {
        if (PHP_SAPI !== 'cli' || getenv('CMS_ENV') !== 'test'
            || getenv('CMS_STAGE2_RUNTIME_GATE') !== 'ci-bound'
            || getenv('CMS_ALLOW_SQLITE_TEST_ONLY') !== '1') {
            throw new RuntimeException('Explicit local Stage2 read-only grant required');
        }
    }

    private static function privateConfig(string $path): void
    {
        if ($path === '' || strlen($path) > 4096
            || !str_starts_with($path, '/') || str_contains($path, "\0")
            || str_contains($path, '\\') || str_contains($path, '?')
            || str_contains($path, '#') || is_link($path)
            || $path !== dirname($path).'/'.basename($path)
            || realpath(dirname($path)) !== dirname($path)
            || dirname($path) === '/'
            || ((@fileperms(dirname($path)) & 0077) !== 0)) {
            throw new RuntimeException('Unsafe private deployment declaration path');
        }
        $stat = @lstat($path);
        if ($stat === false || !is_file($path) || realpath($path) !== $path
            || ($stat['nlink'] ?? 0) !== 1 || ($stat['mode'] & 0077) !== 0
            || $stat['size'] < 60 || $stat['size'] > self::MAX_CONFIG_BYTES) {
            throw new RuntimeException('Unsafe operator deployment config');
        }
    }

    public static function load(string $file): array
    {
        self::privateConfig($file);
        $size = filesize($file);
        $bytes = @file_get_contents($file);
        if (!is_string($bytes) || strlen($bytes) !== $size) {
            throw new RuntimeException('Unreadable deployment declaration');
        }
        $doc = json_decode($bytes, true, 16, JSON_THROW_ON_ERROR);
        if (!is_array($doc)) {
            throw new RuntimeException('Deployment declaration must be object');
        }
        self::shape($doc);
        $fleet = LabInstallationFleet::load($doc['fleetConfig']);
        foreach (LabInstallationFleet::validate($fleet) as $installation) {
            foreach (['cmsRoot','siteRoot'] as $key) {
                foreach ([$file,$doc['fleetConfig']] as $configurationFile) {
                    if (str_starts_with($configurationFile, $installation[$key].'/')) {
                        throw new RuntimeException('Operator declaration embedded in public/code tree');
                    }
                }
            }
        }
        return $doc;
    }

    /** @param array<string,mixed> $doc */
    private static function shape(array $doc): void
    {
        if (!self::exactKeys($doc, ['format','fleetConfig','endpoints'])
            || $doc['format'] !== self::FORMAT
            || !is_string($doc['fleetConfig']) || !is_array($doc['endpoints'])
            || count($doc['endpoints']) < 1 || count($doc['endpoints']) > 12
            || !array_is_list($doc['endpoints'])) {
            throw new RuntimeException('Unsupported deployment blueprint');
        }
        $ids = [];
        $origins = [];
        foreach ($doc['endpoints'] as $entry) {
            if (!is_array($entry) || !self::exactKeys($entry,[
                'siteId','cmsOrigin','siteOrigin','cmsDocroot','siteDocroot',
                'cmsMount','siteMount','phpTarget','phpSapi','siteRuntime'
            ])) {
                throw new RuntimeException('Unexpected deployment fields');
            }
            foreach ($entry as $value) {
                if (!is_string($value)) throw new RuntimeException('Deployment requires explicit strings');
            }
            if (!preg_match('/\A[a-z][a-z0-9-]{2,63}\z/D',$entry['siteId'])
                || isset($ids[$entry['siteId']])
                || $entry['cmsMount'] !== '/' || $entry['siteMount'] !== '/'
                || !in_array($entry['phpTarget'], ['8.1','8.2','8.3','8.4'], true)
                || !in_array($entry['phpSapi'], ['fpm-fcgi','apache2handler'],true)
                || !in_array($entry['siteRuntime'], [
                    'static-files','independent-php','static-spa-assets',
                    'exported-static-files','independent-node-behind-proxy'
                ],true)) {
                throw new RuntimeException('Unsupported blueprint route or ABI');
            }
            $ids[$entry['siteId']] = true;
            foreach (['cmsOrigin','siteOrigin'] as $field) {
                $url = $entry[$field];
                // Real TLS and DNS are NOT checked: prohibit real domain
                // addresses, headers, ports, credentials and subpath illusions.
                if (!preg_match('/\Ahttps:\/\/(?:[a-z0-9-]+\.)+[a-z0-9-]+\.test\z/D',$url)
                    || strlen($url) > 255 || isset($origins[$url])) {
                    throw new RuntimeException('Origin collision or unsafe/non-lab host');
                }
                $origins[$url] = true;
            }
            foreach (['cmsDocroot','siteDocroot'] as $field) {
                $dir=$entry[$field];
                if ($dir === '' || !str_starts_with($dir,'/') || str_contains($dir,"\0")
                    || str_contains($dir,'\\') || is_link($dir)
                    || realpath($dir) !== $dir || !is_dir($dir)) {
                    throw new RuntimeException('Noncanonical or absent public document root');
                }
            }
        }
    }

    /**
     * @param array<string,mixed> $doc
     * @return array<string,mixed>
     */
    public static function inspect(array $doc): array
    {
        self::labOnly();
        self::shape($doc);
        $fleet=LabInstallationFleet::load($doc['fleetConfig']);
        $installations=LabInstallationFleet::validate($fleet);
        $plan=LabInstallationFleet::plan($fleet);
        if (count($installations) !== count($doc['endpoints'])) {
            throw new RuntimeException('Incomplete fleet endpoint inventory');
        }
        $declared=[];
        foreach ($installations as $item) $declared[$item['siteId']]=$item;
        $items=[];
        $canonical=[];
        foreach ($doc['endpoints'] as $entry) {
            $id=$entry['siteId'];
            if (!isset($declared[$id])) throw new RuntimeException('Endpoint identity outside fleet');
            $item=$declared[$id];
            if ($entry['cmsDocroot'] !== $item['cmsRoot'].'/public'
                || $entry['siteDocroot'] !== $item['siteRoot'].'/public'
                || $entry['cmsDocroot'] === $entry['siteDocroot']) {
                throw new RuntimeException('Public vhost document root boundary mismatch');
            }
            $topology=SiteRuntimeTopology::assess(
                $item['cmsRoot'],$item['siteRoot'],$item['family'],$item['capabilities']
            );
            if (!$topology['declarationCompatible']
                || $entry['siteRuntime'] !== $topology['siteDelivery']) {
                throw new RuntimeException('Site delivery mode not compatible with declared runtime');
            }
            $local=RuntimeDoctor::localReport(
                $entry['cmsDocroot'],$item['cmsRoot'].'/public'
            );
            if ($local['document_root'] !== 'verified_public_only') {
                throw new RuntimeException('CMS local document root validation failed');
            }
            $locallyTestable=$local['php_runtime_baseline']==='pass';
            $targetAbiId=((int)$entry['phpTarget'][0])*10000 + ((int)$entry['phpTarget'][2])*100;
            // A locally newer PHP CLI is sufficient to check minimum syntax,
            // but does NOT prove that the future target PHP build can run it.
            $phpMinCompatible=PHP_VERSION_ID >= $targetAbiId;
            $items[]=[
                'siteId'=>$id,'family'=>$item['family'],
                'cmsDocumentRootIsPublic'=>true,
                'siteDocumentRootIsPublic'=>true,
                'separateOrigins'=>true,
                'routeMountsAtRoot'=>true,
                'cmsReadOnlyHealthRoute'=>'/api/health',
                'cmsWriteRoutesAvailable'=>false,
                'siteRuntime'=>$topology['siteDelivery'],
                'requiresNodeProxy'=>$topology['nodeRequired'],
                'targetPhp'=>$entry['phpTarget'],
                'targetPhpSapi'=>$entry['phpSapi'],
                'localCliBaselinePass'=>$locallyTestable,
                'localCliAtLeastDeclaredPhp'=>$phpMinCompatible,
                'targetSapiExecuted'=>false,
                'targetTlsOrDnsVerified'=>false,
                'targetFrameworkExecuted'=>false
            ];
            $canonical[$id]=[$entry,$topology['sitePublicFingerprint']];
        }
        ksort($canonical,SORT_STRING);
        usort($items,static fn(array $a,array $b):int =>
            strcmp($a['siteId'],$b['siteId']));
        $ok=count(array_filter($items,static fn(array $x):bool =>
            !$x['localCliBaselinePass'] || !$x['localCliAtLeastDeclaredPhp']))===0;
        return [
            'format'=>self::FORMAT,
            'sites'=>count($items),
            'items'=>$items,
            'fleetState'=>$plan['allReady']?'ready':'not_yet_ready',
            'localCliCompatible'=>$ok,
            'deploymentIntentSha256'=>hash('sha256',json_encode(
                ['fleetToken'=>$plan['token'],'endpoints'=>$canonical],
                JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            )),
            'readOnly'=>true,
            'placeholderOriginsOnly'=>true,
            'runtimeDeclarationsVerifiedOnTarget'=>false,
            'httpsProven'=>false,
            'actualVirtualHostsProven'=>false,
            'productionReady'=>false
        ];
    }
}
