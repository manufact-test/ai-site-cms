<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

/**
 * Offline and deliberately read-only shared-host boundary assessment.
 * This does NOT execute on a target server or establish Apache/FPM/TLS compatibility.
 * A separate authenticated deployment and web-SAPI check will be required later.
 */
final class SharedHostPreflight
{
    private const PRIVATE_DIRS = ['src', 'vendor'];
    private const FORBIDDEN = ['.git', '.env', '.user.ini', '.htpasswd', 'composer.lock', 'package.json', 'package-lock.json'];
    private const EXECUTABLE = ['php', 'phtml', 'phar', 'php5', 'php7', 'php8', 'cgi', 'pl'];

    /** @return array<string,mixed> */
    public static function inspect(string $appRoot, ?string $documentRoot): array
    {
        $root = realpath($appRoot);
        $public = $root === false ? false : realpath($root . '/public');
        $entry = $public === false ? false : $public . '/index.php';
        $structure = $root !== false && is_dir($root) && !is_link($appRoot)
            && $public !== false && is_dir($public) && !is_link($root . '/public');
        $private = $structure;
        if ($private) {
            foreach (self::PRIVATE_DIRS as $name) {
                $dir = $root . '/' . $name;
                $resolved = realpath($dir);
                if ($resolved === false || !is_dir($resolved) || is_link($dir)
                    || !self::within($resolved, $root) || self::within($resolved, $public)) {
                    $private = false;
                    break;
                }
            }
        }
        $entrySafe = $structure && $entry !== false && is_file($entry)
            && !is_link($entry) && realpath($entry) === $entry;
        $treeSafe = $structure && self::safePublicTree($public);
        $docroot = $documentRoot === null || $documentRoot === ''
            ? 'not_checked'
            : (($structure && !is_link($documentRoot) && realpath($documentRoot) === $public)
                ? 'exact_public' : 'invalid');
        $checks = [
            'isolated_public_directory' => $structure,
            'private_code_outside_public' => $private,
            'single_php_front_controller' => $entrySafe,
            'public_asset_tree_restricted' => $treeSafe,
            'explicit_document_root' => $docroot === 'exact_public',
        ];
        return [
            'format' => 'ai-site-cms-stage2-shared-host-offline-preflight-v1',
            'result' => !in_array(false, $checks, true) ? 'offline_structure_pass' : 'blocked',
            'checks' => $checks,
            'document_root' => $docroot,
            'web_sapi' => 'not_tested',
            'apache_rewrite' => 'not_tested',
            'tls_termination' => 'not_tested',
            'php_fpm_permissions' => 'not_tested',
            'db_access' => 'not_tested',
            'filesystem_modified' => false,
            'network_attempted' => false,
            'database_connection_attempted' => false,
            'real_host_compatibility_verified' => false,
            'safe_to_deploy' => false,
        ];
    }

    /**
     * Pure synthetic/web-server fact validator: callers supply $_SERVER only in
     * a controlled test. Never exposed as a public endpoint at Stage 2.
     * Forwarded headers are untrusted; real TLS/rewrites cannot be proved here.
     * @param array<string,mixed> $server
     * @return array<string,mixed>
     */
    public static function inspectWebMapping(array $server, string $expectedPublic, string $sapi): array
    {
        $public = realpath($expectedPublic);
        $rawRoot = $server['DOCUMENT_ROOT'] ?? null;
        $rawScript = $server['SCRIPT_FILENAME'] ?? null;
        $rootMatches = $public !== false && is_string($rawRoot) && !is_link($rawRoot)
            && realpath($rawRoot) === $public;
        $entryMatches = $public !== false && is_string($rawScript) && !is_link($rawScript)
            && realpath($rawScript) === $public . '/index.php';
        // LiteSpeed's real PHP_SAPI is 'litespeed' (LSAPI), not FPM.
        // Recognition here only records a candidate filesystem mapping,
        // never PHP-pool isolation or production suitability.
        $sapiKnown = in_array($sapi, ['fpm-fcgi', 'apache2handler', 'cgi-fcgi', 'litespeed'], true);
        // Aliased paths can resolve to the same inode while routing the wrong
        // site. Match the *observed* webserver values to exact canonical bytes.
        $canonical = $public !== false
            && $rawRoot === $public
            && $rawScript === $public . '/index.php';
        $rootMatches = $rootMatches && $canonical;
        $entryMatches = $entryMatches && $canonical;
        $tlsObserved = ($server['HTTPS'] ?? null) === 'on' || ($server['HTTPS'] ?? null) === '1';
        return [
            'format' => 'ai-site-cms-stage2-synthetic-web-mapping-v1',
            'result' => $rootMatches && $entryMatches && $sapiKnown ? 'mapping_plausible' : 'blocked',
            'checks' => [
                'document_root_maps_only_public' => $rootMatches,
                'script_maps_front_controller' => $entryMatches,
                'recognized_shared_host_sapi' => $sapiKnown,
            ],
            'sapi_profile' => $sapi === 'litespeed'
                ? 'lsapi_mapping_candidate_only'
                : ($sapiKnown ? 'known_non_lsapi_mapping_candidate' : 'unsupported'),
            'lsapi_isolation_verified' => false,
            'https_server_variable_observed' => $tlsObserved,
            'proxy_headers_trusted' => false,
            'actual_request_executed' => false,
            'rewrite_proven' => false,
            'real_host_compatibility_verified' => false,
            'safe_to_deploy' => false,
        ];
    }

    private static function within(string $child, string $parent): bool
    {
        return str_starts_with($child, rtrim($parent, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR);
    }

    private static function safePublicTree(string $public): bool
    {
        $seen = 0;
        $stack = [[$public, 0]];
        while ($stack !== []) {
            [$dir, $depth] = array_pop($stack);
            if ($depth > 8 || is_link($dir)) {
                return false;
            }
            $names = @scandir($dir);
            if ($names === false) {
                return false;
            }
            foreach ($names as $name) {
                if ($name === '.' || $name === '..') {
                    continue;
                }
                if (++$seen > 256 || in_array(strtolower($name), self::FORBIDDEN, true)) {
                    return false;
                }
                $file = $dir . '/' . $name;
                if (is_link($file)) {
                    return false;
                }
                if (is_dir($file)) {
                    $stack[] = [$file, $depth + 1];
                } elseif (!is_file($file)) {
                    return false;
                } else {
                    $extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
                    if (in_array($extension, self::EXECUTABLE, true)
                        && !($file === $public . '/index.php' && $extension === 'php')) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
