<?php
declare(strict_types=1);

namespace Manufact\Stage3;

/** Stable loader kept in the private runtime tree, outside the public document root. */
final class EngineRuntime
{
    public static function boot(string $stableServerRoot): string
    {
        $stableServerRootReal = realpath($stableServerRoot);
        if (!is_string($stableServerRootReal) || $stableServerRootReal !== $stableServerRoot
            || !is_dir($stableServerRootReal) || is_link($stableServerRoot)) {
            throw new \RuntimeException('Stable Stage3 server root is unavailable');
        }
        if (defined('STAGE3_STABLE_SERVER_ROOT')
            && constant('STAGE3_STABLE_SERVER_ROOT') !== $stableServerRootReal) {
            throw new \RuntimeException('Stable Stage3 server root changed during this request');
        }
        if (!defined('STAGE3_STABLE_SERVER_ROOT')) {
            define('STAGE3_STABLE_SERVER_ROOT', $stableServerRootReal);
        }
        require_once $stableServerRootReal . DIRECTORY_SEPARATOR . 'RuntimeConfig.php';
        require_once $stableServerRootReal . DIRECTORY_SEPARATOR . 'EngineReleaseVerifier.php';
        require_once $stableServerRootReal . DIRECTORY_SEPARATOR . 'DatabaseSnapshot.php';
        require_once $stableServerRootReal . DIRECTORY_SEPARATOR . 'EngineLifecycle.php';
        return EngineLifecycle::requestRoot($stableServerRootReal);
    }
}
