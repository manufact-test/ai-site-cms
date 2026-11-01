<?php
declare(strict_types=1);

namespace Manufact\Stage3;

/** Stable loader kept beside the configured public document root. */
final class EngineRuntime
{
    public static function boot(string $stableServerRoot): string
    {
        require_once $stableServerRoot . DIRECTORY_SEPARATOR . 'RuntimeConfig.php';
        require_once $stableServerRoot . DIRECTORY_SEPARATOR . 'EngineReleaseVerifier.php';
        require_once $stableServerRoot . DIRECTORY_SEPARATOR . 'DatabaseSnapshot.php';
        require_once $stableServerRoot . DIRECTORY_SEPARATOR . 'EngineLifecycle.php';
        return EngineLifecycle::requestRoot($stableServerRoot);
    }
}
