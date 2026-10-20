<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

/**
 * Read-only, offline capability report; never opens DB, writes files,
 * contacts the network or exposes host paths, configuration or credentials.
 * A passing report is NOT proof of PHP-FPM/web routing/Hostinger compatibility.
 */
final class RuntimeDoctor
{
    private const EXTENSIONS = ['json', 'pdo', 'pdo_mysql', 'openssl'];

    /**
     * $extensionStatus is deliberately injectible for deterministic negative tests.
     * $docrootVerified: true only if the caller explicitly supplies a docroot and
     * realpath equals the expected cms/public directory. null means not checked.
     *
     * @param array<string,bool> $extensionStatus
     * @return array<string,mixed>
     */
    public static function assess(int $versionId, array $extensionStatus, ?bool $docrootVerified): array
    {
        $requirements = ['php_8_1_or_newer' => $versionId >= 80100];
        foreach (self::EXTENSIONS as $extension) {
            $requirements['ext_' . $extension] = ($extensionStatus[$extension] ?? false) === true;
        }

        $failed = [];
        foreach ($requirements as $name => $passed) {
            if (!$passed) {
                $failed[] = $name;
            }
        }

        return [
            'format' => 'ai-site-cms-stage2-readonly-doctor-v1',
            'php_runtime_baseline' => $failed === [] ? 'pass' : 'fail',
            'checks' => $requirements,
            'missing' => $failed,
            'document_root' => $docrootVerified === null
                ? 'not_checked'
                : ($docrootVerified ? 'verified_public_only' : 'invalid'),
            // A read-only CLI command cannot prove that the site has HTTPS,
            // working FPM, route rewrites, DB credentials or write permissions.
            'real_host_compatibility_verified' => false,
            'database_connection_attempted' => false,
            'filesystem_modified' => false,
            'network_attempted' => false,
            'safe_to_deploy' => false,
        ];
    }

    public static function checkExplicitDocumentRoot(?string $supplied, string $expected): ?bool
    {
        if ($supplied === null || $supplied === '') {
            return null;
        }
        $actual = realpath($supplied);
        $allowed = realpath($expected);
        return $actual !== false && $allowed !== false
            && is_dir($actual) && hash_equals($allowed, $actual);
    }

    /** @return array<string,mixed> */
    public static function localReport(?string $explicitDocumentRoot, string $expectedPublicDirectory): array
    {
        $extensions = [];
        foreach (self::EXTENSIONS as $extension) {
            $extensions[$extension] = extension_loaded($extension);
        }
        return self::assess(
            PHP_VERSION_ID,
            $extensions,
            self::checkExplicitDocumentRoot($explicitDocumentRoot, $expectedPublicDirectory)
        );
    }
}
