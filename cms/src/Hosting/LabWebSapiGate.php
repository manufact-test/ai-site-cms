<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

/**
 * Stage2 test-gated web-SAPI entrypoint mapping enforcement.
 * Unlike a CLI topology declaration, this executes on the actual FPM request
 * only when CMS_STAGE2_REQUIRE_FPM_MAPPING=1 is explicitly enabled.
 *
 * No host secrets, URL/origin authority, TLS or proxy headers are trusted.
 * Never a production host/installer acceptance certificate.
 */
final class LabWebSapiGate
{
    /**
     * @param array<string,mixed> $server
     * @param array<string,mixed> $env
     */
    public static function allows(
        string $cmsRoot, array $server, string $sapi, array $env
    ): bool {
        $sqliteCi = ($env['CMS_STAGE2_RUNTIME_GATE'] ?? null) === 'ci-bound'
            && ($env['CMS_ALLOW_SQLITE_TEST_ONLY'] ?? null) === '1';
        // The MySQL path uses a *different* isolated, dedicated CI service.
        // Never equate this with generic PHP-FPM/production compatibility.
        $mysqlCi = ($env['CMS_STAGE2_RUNTIME_GATE'] ?? null) === 'mysql-ci-bound'
            && ($env['CMS_ALLOW_STAGE2_MYSQL_HTTP_CI'] ?? null) === '1'
            && ($env['CI'] ?? null) === 'true'
            && ($env['GITHUB_ACTIONS'] ?? null) === 'true';
        if (($env['CMS_STAGE2_REQUIRE_FPM_MAPPING'] ?? null) !== '1'
            || ($env['CMS_ENV'] ?? null) !== 'test'
            || (!$sqliteCi && !$mysqlCi)) {
            return false;
        }
        if ($cmsRoot === '' || realpath($cmsRoot) !== $cmsRoot
            || !is_dir($cmsRoot) || is_link($cmsRoot)) {
            return false;
        }
        $mapping = SharedHostPreflight::inspectWebMapping(
            $server, $cmsRoot.'/public', $sapi
        );
        // An FPM-enforced lab must actually run FPM. 'apache2handler' and
        // 'cgi-fcgi' are valid for synthetic architecture research elsewhere,
        // but cannot substitute for this explicitly requested real FPM gate.
        // Reject noncanonical spellings and alias/ancestor substitutions even
        // when realpath happens to land at the same inode. The FastCGI
        // responder must be exactly the staged front controller.
        return $sapi === 'fpm-fcgi'
            && ($server['DOCUMENT_ROOT'] ?? null) === $cmsRoot.'/public'
            && ($server['SCRIPT_FILENAME'] ?? null) === $cmsRoot.'/public/index.php'
            && ($mapping['result'] ?? null) === 'mapping_plausible'
            && ($mapping['checks']['document_root_maps_only_public'] ?? false) === true
            && ($mapping['checks']['script_maps_front_controller'] ?? false) === true;
    }

    public static function fromProcess(string $cmsRoot): bool
    {
        $env=[];
        foreach (['CMS_STAGE2_REQUIRE_FPM_MAPPING','CMS_STAGE2_RUNTIME_GATE',
            'CMS_ENV','CMS_ALLOW_SQLITE_TEST_ONLY',
            'CMS_ALLOW_STAGE2_MYSQL_HTTP_CI','CI','GITHUB_ACTIONS'] as $name) {
            $v=getenv($name);
            $env[$name]=$v===false?null:$v;
        }
        return self::allows($cmsRoot,$_SERVER,PHP_SAPI,$env);
    }
}
