<?php
declare(strict_types=1);

use Manufact\Stage3\DatabaseSnapshot;
use Manufact\Stage3\EngineLifecycle;
use Manufact\Stage3\RuntimeConfig;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$serverRoot = dirname(__DIR__);
require_once $serverRoot . '/RuntimeConfig.php';
require_once $serverRoot . '/EngineReleaseVerifier.php';
require_once $serverRoot . '/DatabaseSnapshot.php';
require_once $serverRoot . '/EngineLifecycle.php';
try {
    RuntimeConfig::load($serverRoot);
    $privateDir = (string)getenv('STAGE3_PRIVATE_DIR');
    $command = $argv[1] ?? '';
    $args = array_slice($argv, 2);
    $write = static function (): void {
        if (PHP_SAPI !== 'cli' || getenv('STAGE3_ALLOW_ENGINE_UPDATE') !== 'YES') {
            throw new RuntimeException('CMS engine changes require STAGE3_ALLOW_ENGINE_UPDATE=YES in an isolated CLI session');
        }
    };
    if ($command === 'trust' && count($args) === 1) {
        if (getenv('STAGE3_ALLOW_ENGINE_TRUST_SETUP') !== 'YES') {
            throw new RuntimeException('Trust setup requires STAGE3_ALLOW_ENGINE_TRUST_SETUP=YES');
        }
        $result = EngineLifecycle::trustAnchor($privateDir, $args[0]);
    } elseif ($command === 'inspect' && count($args) === 0) {
        $result = EngineLifecycle::status($privateDir, $serverRoot);
    } elseif ($command === 'review' && count($args) === 1) {
        $write();
        $result = EngineLifecycle::review($privateDir, $serverRoot, $args[0], EngineLifecycle::databaseFromEnvironment());
    } elseif ($command === 'apply' && count($args) === 2) {
        $write();
        $result = EngineLifecycle::apply($privateDir, $serverRoot, $args[0], $args[1], EngineLifecycle::databaseFromEnvironment());
    } elseif ($command === 'rollback-plan' && count($args) === 0) {
        $result = EngineLifecycle::rollbackPlan($privateDir, $serverRoot, EngineLifecycle::databaseFromEnvironment());
    } elseif ($command === 'rollback' && count($args) === 2) {
        $write();
        $result = EngineLifecycle::rollback($privateDir, $serverRoot, $args[0], $args[1], EngineLifecycle::databaseFromEnvironment());
    } elseif ($command === 'recover' && count($args) === 1) {
        $write();
        $result = EngineLifecycle::recover($privateDir, $serverRoot, $args[0]);
    } elseif ($command === 'verify-snapshot' && count($args) === 1) {
        if (!preg_match('/^snapshot-[0-9]{14}-[a-f0-9]{16}$/D', $args[0])) {
            throw new RuntimeException('Invalid snapshot identifier');
        }
        $result = DatabaseSnapshot::verify($privateDir . '/engine/snapshots/' . $args[0]);
    } elseif ($command === 'restore-snapshot' && count($args) === 2) {
        if (!preg_match('/^snapshot-[0-9]{14}-[a-f0-9]{16}$/D', $args[0])
            || getenv('STAGE3_ALLOW_SNAPSHOT_RESTORE') !== 'YES') {
            throw new RuntimeException('Snapshot restore requires a valid ID and STAGE3_ALLOW_SNAPSHOT_RESTORE=YES');
        }
        $targetDsn = $args[1];
        if (!preg_match('/^(mysql:|sqlite:)/', $targetDsn)) throw new RuntimeException('Invalid disposable restore target DSN');
        $target = new PDO($targetDsn, getenv('STAGE3_SNAPSHOT_TARGET_USER') ?: null,
            getenv('STAGE3_SNAPSHOT_TARGET_PASSWORD') ?: null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $result = DatabaseSnapshot::restoreToEmpty($target, $privateDir . '/engine/snapshots/' . $args[0]);
    } else {
        throw new RuntimeException('Usage: engine.php trust|inspect|review|apply|rollback-plan|rollback|recover|verify-snapshot|restore-snapshot');
    }
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, 'CMS engine operation refused: ' . $error->getMessage() . PHP_EOL);
    exit(1);
}
