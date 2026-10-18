<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use RuntimeException;

/**
 * Stage2 architecture boundary rehearsal: read-only CMS/site topology check.
 *
 * No site adapter, deploy operation, credential read, build execution, DNS
 * probing, symlink following or production approval. The capabilities are
 * independent OPERATOR DECLARATIONS, not discovered facts about a real host.
 * Runtime adapters for HTML, PHP and Next.js belong to later stages.
 */
final class SiteRuntimeTopology
{
    private const CAPABILITIES = [
        'php81','pdo','https','privateStorage','isolatedRoots','rewriteRoutes',
        'sitePhp','nodeRuntime','reverseProxy'
    ];
    private const FAMILIES = ['html','php','react-spa','next-static','next-ssr'];
    private const MAX_NODES = 1024;
    private const MAX_FILE_BYTES = 33554432;
    private const MAX_TREE_BYTES = 67108864;

    /** @return list<string> */
    public static function families(): array
    {
        return self::FAMILIES;
    }

    /** @param array<string,mixed> $capabilities */
    private static function validCapabilities(array $capabilities): void
    {
        $names = array_keys($capabilities);
        sort($names, SORT_STRING);
        $expected = self::CAPABILITIES;
        sort($expected, SORT_STRING);
        if ($names !== $expected) {
            throw new RuntimeException('Host capability declaration requires exact known boolean keys');
        }
        foreach ($capabilities as $flag) {
            if (!is_bool($flag)) {
                throw new RuntimeException('Host capability declarations must be boolean');
            }
        }
    }

    private static function root(string $root): string
    {
        if ($root === '' || str_contains($root, "\0") || is_link($root)) {
            throw new RuntimeException('Explicit canonical non-symlink installation root required');
        }
        $actual = realpath($root);
        if ($actual === false || $actual !== $root || !is_dir($actual)) {
            throw new RuntimeException('Installation root must exist and be an explicit canonical directory');
        }
        return $actual;
    }

    private static function child(string $parent, string $suffix, bool $directory): string
    {
        $path = $parent.'/'.$suffix;
        if (is_link($path)) {
            throw new RuntimeException('Symbolic links forbidden in runtime installation boundary');
        }
        $real = realpath($path);
        if ($real === false || $real !== $path
            || !str_starts_with($real, $parent.'/')
            || ($directory ? !is_dir($real) : !is_file($real))) {
            throw new RuntimeException('Missing or unsafe required runtime artifact');
        }
        return $real;
    }

    private static function nonOverlapping(string $a, string $b): bool
    {
        return $a !== $b
            && !str_starts_with($a, $b.'/')
            && !str_starts_with($b, $a.'/');
    }

    /**
     * Fail closed for private code, secrets, symlinks, unexpected PHP in static
     * exports, oversized files or huge public trees. This is a sample packaging
     * policy, not a malware scanner, content auditor or real-host access test.
     *
     * @return array{files:int,bytes:int}
     */
    private static function inspectPublic(string $public, bool $static): array
    {
        $stack = [$public];
        $seen = 0;
        $files = 0;
        $bytes = 0;
        while ($stack !== []) {
            $dir = array_pop($stack);
            $names = @scandir($dir);
            if ($names === false) {
                throw new RuntimeException('Unreadable public website tree');
            }
            foreach ($names as $name) {
                if ($name === '.' || $name === '..') continue;
                ++$seen;
                if ($seen > self::MAX_NODES) {
                    throw new RuntimeException('Public tree requires bounded inventory');
                }
                if ($name === '' || str_contains($name, "\0")
                    || preg_match('/^(?:\.git|\.env(?:\..*)?|vendor|node_modules|private|secrets|composer\.json|composer\.lock|package\.json|package-lock\.json|\.next)$/iD', $name)
                    || preg_match('/\.(?:pem|key|sqlite|db|sql|map|log|bak|env)$/iD', $name)
                    || ($static && preg_match('/\.(?:php|phtml|phar)$/iD', $name))) {
                    throw new RuntimeException('Private, executable or sensitive artifact exposed in public tree');
                }
                $entry = $dir.'/'.$name;
                $stat = @lstat($entry);
                if ($stat === false || is_link($entry)) {
                    throw new RuntimeException('Unsafe linked or unreadable public tree node');
                }
                if (is_dir($entry)) {
                    $stack[] = $entry;
                    continue;
                }
                if (!is_file($entry) || ($stat['nlink'] ?? 0) !== 1
                    || $stat['size'] < 0 || $stat['size'] > self::MAX_FILE_BYTES) {
                    throw new RuntimeException('Unsafe or oversized public tree file');
                }
                ++$files;
                $bytes += $stat['size'];
                if ($bytes > self::MAX_TREE_BYTES) {
                    throw new RuntimeException('Public asset inventory over bounded limit');
                }
            }
        }
        return ['files'=>$files,'bytes'=>$bytes];
    }

    /**
     * @param array<string,mixed> $capabilities
     * @return array<string,mixed>
     */
    public static function assess(
        string $cmsRoot, string $siteRoot, string $family, array $capabilities
    ): array {
        if (!in_array($family, self::FAMILIES, true)) {
            throw new RuntimeException('Unsupported explicit site runtime family');
        }
        self::validCapabilities($capabilities);
        $cms = self::root($cmsRoot);
        $site = self::root($siteRoot);
        if (!self::nonOverlapping($cms,$site)) {
            throw new RuntimeException('CMS runtime and site project must not share or nest installation roots');
        }
        $cmsPublic = self::child($cms,'public',true);
        self::child($cmsPublic,'index.php',false);
        self::child($cms,'vendor',true);
        self::child($cms.'/vendor','autoload.php',false);
        $sitePublic = self::child($site,'public',true);
        if (!self::nonOverlapping($cmsPublic,$sitePublic)) {
            throw new RuntimeException('CMS and site document roots overlap');
        }
        $required = [
            'php81','pdo','https','privateStorage','isolatedRoots','rewriteRoutes'
        ];
        $static = in_array($family, ['html','react-spa','next-static'], true);
        if ($static) {
            self::child($sitePublic,'index.html',false);
        } elseif ($family === 'php') {
            self::child($sitePublic,'index.php',false);
            $required[] = 'sitePhp';
        } else {
            // SSR is a separate Node process, not a PHP-only shared-host mode.
            self::child($site,'.next',true);
            self::child($site.'/.next','BUILD_ID',false);
            self::child($site,'package.json',false);
            $required[] = 'nodeRuntime';
            $required[] = 'reverseProxy';
        }
        if ($family === 'next-static') {
            self::child($sitePublic,'_next',true);
        }
        $cmsInventory = self::inspectPublic($cmsPublic,false);
        $siteInventory = self::inspectPublic($sitePublic,$static);
        $missing = [];
        foreach ($required as $flag) {
            if ($capabilities[$flag] !== true) $missing[] = $flag;
        }
        return [
            'format'=>'ai-site-cms-stage2-runtime-topology-v1',
            'family'=>$family,
            'cmsRuntime'=>'php-slim',
            'siteDelivery'=>match ($family) {
                'html'=>'static-files',
                'php'=>'independent-php',
                'react-spa'=>'static-spa-assets',
                'next-static'=>'exported-static-files',
                'next-ssr'=>'independent-node-behind-proxy'
            },
            'requiredCapabilities'=>$required,
            'missingDeclaredCapabilities'=>$missing,
            'declarationCompatible'=>$missing === [],
            'separateInstallationRoots'=>true,
            'cmsPublicFiles'=>$cmsInventory['files'],
            'sitePublicFiles'=>$siteInventory['files'],
            'nodeRequired'=>$family === 'next-ssr',
            'websiteDependsOnCmsRequest'=>false,
            'declaredCapabilitiesAreVerified'=>false,
            'actualHostTested'=>false,
            'actualFrameworkBuildVerified'=>false,
            'productionReady'=>false
        ];
    }

    /**
     * Checks independent CMS + site roots for an entire fleet. No scanning
     * content beyond public assets. Never opens DB or runs the supplied code.
     *
     * @param list<array{siteId:string,cmsRoot:string,siteRoot:string,family:string,capabilities:array<string,mixed>}> $installations
     * @return array<string,mixed>
     */
    public static function assessFleet(array $installations): array
    {
        if (count($installations) < 1 || count($installations) > 12
            || array_keys($installations) !== range(0,count($installations)-1)) {
            throw new RuntimeException('Fleet needs 1..12 explicit site installations');
        }
        $claimedIds = [];
        $claimedRoots = [];
        $items = [];
        foreach ($installations as $item) {
            if (!is_array($item) || array_keys($item) !== [
                'siteId','cmsRoot','siteRoot','family','capabilities'
            ] || !is_string($item['siteId'])
                || !preg_match('/^[A-Za-z0-9_-]{1,80}$/D', $item['siteId'])
                || !is_string($item['cmsRoot']) || !is_string($item['siteRoot'])
                || !is_string($item['family'])
                || isset($claimedIds[$item['siteId']])) {
                throw new RuntimeException('Invalid or duplicate independent CMS installation identity');
            }
            $cms = self::root($item['cmsRoot']);
            $site = self::root($item['siteRoot']);
            foreach ([$cms,$site] as $root) {
                foreach ($claimedRoots as $claimed) {
                    if (!self::nonOverlapping($root,$claimed)) {
                        throw new RuntimeException('Two supposedly separate sites share code/data installation roots');
                    }
                }
                $claimedRoots[] = $root;
            }
            $claimedIds[$item['siteId']] = true;
            $report = self::assess($cms,$site,$item['family'],$item['capabilities']);
            $items[] = [
                'siteId'=>$item['siteId'],'family'=>$report['family'],
                'declarationCompatible'=>$report['declarationCompatible'],
                'missingDeclaredCapabilities'=>$report['missingDeclaredCapabilities']
            ];
        }
        return [
            'format'=>'ai-site-cms-stage2-runtime-topology-fleet-v1',
            'sites'=>count($items),'items'=>$items,
            'allDeclaredCompatible'=>count(array_filter($items,static fn(array $x):bool =>
                !$x['declarationCompatible'])) === 0,
            'dataSharingAllowed'=>false,'productionReady'=>false
        ];
    }
}
