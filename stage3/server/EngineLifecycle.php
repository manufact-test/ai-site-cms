<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use PDO;
use RuntimeException;
use Throwable;

/**
 * Stage3 CMS-engine lifecycle. All state, staging, slots and snapshots are
 * private to one installed instance. Visitor-site D2/D3 releases are unrelated.
 */
final class EngineLifecycle
{
    private const STATE_FORMAT = 'manufact-stage3-engine-state-v1';
    private const PLAN_FORMAT = 'manufact-stage3-engine-plan-v1';
    private const INTENT_FORMAT = 'manufact-stage3-engine-intent-v1';
    private const RECEIPT_FORMAT = 'manufact-stage3-engine-activation-v1';
    private static $requestLease = null;

    public static function trustAnchor(string $privateDir, string $publicKeySource): array
    {
        if (PHP_SAPI !== 'cli' || getenv('STAGE3_ALLOW_ENGINE_TRUST_SETUP') !== 'YES') {
            throw new RuntimeException('Publisher trust setup requires explicit isolated CLI authorization');
        }
        $layout = self::layout($privateDir);
        $source = self::readSourceFile($publicKeySource, 32768);
        if (!str_contains($source, '-----BEGIN PUBLIC KEY-----') || str_contains($source, 'PRIVATE KEY')) {
            throw new RuntimeException('Publisher trust setup accepts only a standalone public PEM key');
        }
        $key = @openssl_pkey_get_public($source);
        $details = $key === false ? false : openssl_pkey_get_details($key);
        if (!is_array($details) || ($details['type'] ?? null) !== OPENSSL_KEYTYPE_RSA
            || (int)($details['bits'] ?? 0) < 3072) {
            throw new RuntimeException('Publisher trust anchor must be RSA with at least 3072 bits');
        }
        $destination = $layout['trust'] . DIRECTORY_SEPARATOR . 'publisher.pem';
        if (file_exists($destination) || is_link($destination)) {
            throw new RuntimeException('Publisher trust anchor already exists; key rotation is a separate operation');
        }
        self::writeFresh($destination, $source);
        return ['trusted' => true, 'fingerprint' => hash('sha256', $source), 'algorithm' => 'rsa-3072-sha256'];
    }

    public static function status(string $privateDir, string $serverRoot): array
    {
        $layout = self::layout($privateDir);
        $pending = file_exists($layout['intent']) || is_link($layout['intent']);
        if (!file_exists($layout['state']) && !$pending) {
            $lock = self::exclusiveLock($layout);
            try {
                if (!file_exists($layout['state']) && !file_exists($layout['intent'])) self::ensureState($layout, $serverRoot);
            } finally { self::releaseLock($lock); }
        }
        $state = self::readStateOrNull($layout);
        $activeHealthy = false;
        if (is_array($state['active'] ?? null)) {
            try { self::validatePointer($state['active'], $layout, $serverRoot, true); $activeHealthy = true; }
            catch (Throwable) { $activeHealthy = false; }
        }
        $incoming = [];
        $installedIds = array_filter([
            is_array($state['active'] ?? null) ? ($state['active']['releaseId'] ?? null) : null,
            is_array($state['previous'] ?? null) ? ($state['previous']['releaseId'] ?? null) : null
        ], 'is_string');
        foreach (scandir($layout['slots']) ?: [] as $slotName) {
            if ($slotName !== '.' && $slotName !== '..' && preg_match('/^[0-9]+\\.[0-9]+\\.[0-9]+-[a-f0-9]{16}$/D', $slotName)) {
                $installedIds[] = $slotName;
            }
        }
        foreach (scandir($layout['incoming']) ?: [] as $name) {
            if ($name === '.' || $name === '..' || !preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/D', $name)) continue;
            $path = $layout['incoming'] . DIRECTORY_SEPARATOR . $name;
            if (!is_dir($path) || is_link($path)) continue;
            $manifestPath = $path . DIRECTORY_SEPARATOR . 'cms-release.json';
            if (is_file($manifestPath) && !is_link($manifestPath)) {
                try {
                    $manifest = json_decode(self::readSourceFile($manifestPath, 262144), true, 32, JSON_THROW_ON_ERROR);
                    if (is_array($manifest) && is_string($manifest['releaseVersion'] ?? null)
                        && is_string($manifest['fingerprint'] ?? null)
                        && preg_match('/^[a-f0-9]{64}$/D', $manifest['fingerprint'])) {
                        $candidateId = $manifest['releaseVersion'] . '-' . substr($manifest['fingerprint'], 0, 16);
                        if (in_array($candidateId, $installedIds, true)) continue;
                    }
                } catch (Throwable) {
                    // Invalid packages remain visible for explicit review, which will reject them.
                }
            }
            $incoming[] = $name;
        }
        return [
            'available' => true,
            'trustConfigured' => is_file($layout['trust'] . DIRECTORY_SEPARATOR . 'publisher.pem')
                && !is_link($layout['trust'] . DIRECTORY_SEPARATOR . 'publisher.pem'),
            'status' => $pending ? 'recovery_required' : ($activeHealthy ? 'ready' : 'active_integrity_failure'),
            'activeIntegrityHealthy' => $activeHealthy,
            'sequence' => $state['sequence'] ?? 0,
            'current' => is_array($state['active'] ?? null) ? self::publicPointer($state['active']) : null,
            'previous' => is_array($state['previous'] ?? null) ? self::publicPointer($state['previous']) : null,
            'incomingPackages' => $incoming,
            'snapshotCount' => count(array_filter(scandir($layout['snapshots']) ?: [],
                static fn(string $name): bool => str_starts_with($name, 'snapshot-'))),
            'deploymentPerformed' => false
        ];
    }

    /** Review copies and verifies a signed package into private staging and issues a one-time plan. */
    public static function review(string $privateDir, string $serverRoot, string $packageId, PDO $db): array
    {
        if (!preg_match('/^[a-z0-9][a-z0-9-]{0,79}$/D', $packageId)) {
            throw new RuntimeException('Invalid engine package identifier');
        }
        $layout = self::layout($privateDir);
        $state = self::lockedState($layout, $serverRoot);
        if (file_exists($layout['intent']) || is_link($layout['intent'])) {
            throw new RuntimeException('Engine recovery is required before another update');
        }
        $trust = $layout['trust'] . DIRECTORY_SEPARATOR . 'publisher.pem';
        $source = $layout['incoming'] . DIRECTORY_SEPARATOR . $packageId;
        $verified = EngineReleaseVerifier::verify($source, $trust, true);
        self::assertDatabaseIdentity($db, $privateDir);
        $manifest = $verified['manifest'];
        if ($manifest['schema']['minimum'] > 1 || $manifest['schema']['maximum'] < 1
            || $manifest['schema']['target'] !== 1 || $manifest['migrations'] !== []) {
            throw new RuntimeException('This engine can accept only schema-preserving releases');
        }
        if ($state['active']['managed'] === true
            && version_compare($manifest['releaseVersion'], $state['active']['releaseVersion'], '<=')) {
            throw new RuntimeException('A normal CMS engine update must move strictly forward; use the explicit previous-version rollback instead');
        }
        $releaseId = $manifest['releaseVersion'] . '-' . substr($verified['fingerprint'], 0, 16);
        if (!preg_match('/^[a-zA-Z0-9.-]{1,100}$/D', $releaseId)) {
            throw new RuntimeException('Release identifier is invalid');
        }
        $staging = $layout['staging'] . DIRECTORY_SEPARATOR . $releaseId;
        $slot = $layout['slots'] . DIRECTORY_SEPARATOR . $releaseId;
        $planPath = $layout['plans'] . DIRECTORY_SEPARATOR . $releaseId . '.json';
        if (file_exists($slot) || is_link($slot)) {
            throw new RuntimeException('This immutable engine release is already installed');
        }
        if (file_exists($planPath) || is_link($planPath)) {
            $oldPlan = self::readPlan($planPath);
            if (($oldPlan['expiresAt'] ?? PHP_INT_MAX) >= time()) {
                throw new RuntimeException('A current review plan already exists for this signed release');
            }
            if (!unlink($planPath)) throw new RuntimeException('Unable to clear an expired engine review plan');
            self::removeTree($staging);
        } elseif (file_exists($staging) || is_link($staging)) {
            throw new RuntimeException('An orphaned private staging directory requires operator review');
        }
        self::copyTree($source, $staging);
        try {
            $copied = EngineReleaseVerifier::verify($staging, $trust, true);
            if (!hash_equals($verified['fingerprint'], $copied['fingerprint'])) {
                throw new RuntimeException('Staged engine package changed while copying');
            }
            $token = bin2hex(random_bytes(32));
            $plan = [
                'action' => 'apply',
                'createdAt' => time(),
                'databaseFingerprint' => self::databaseFingerprintFromEnvironment(),
                'expiresAt' => time() + 600,
                'fingerprint' => $verified['fingerprint'],
                'format' => self::PLAN_FORMAT,
                'releaseId' => $releaseId,
                'releaseVersion' => $manifest['releaseVersion'],
                'schemaVersion' => 1,
                'stateHash' => self::stateHash($state),
                'tokenSha256' => hash('sha256', $token)
            ];
            self::writeFresh($layout['plans'] . DIRECTORY_SEPARATOR . $releaseId . '.json',
                self::canonicalJson($plan) . "\n");
            return [
                'releaseId' => $releaseId,
                'releaseVersion' => $manifest['releaseVersion'],
                'profile' => $manifest['profile'],
                'fingerprint' => $verified['fingerprint'],
                'currentVersion' => $state['active']['releaseVersion'],
                'schemaVersion' => 1,
                'planToken' => $token,
                'expiresInSeconds' => 600,
                'snapshotRequired' => true,
                'deploymentPerformed' => false
            ];
        } catch (Throwable $error) {
            self::removeTree($staging);
            throw $error;
        }
    }

    public static function apply(string $privateDir, string $serverRoot, string $releaseId, string $token, PDO $db): array
    {
        if (!preg_match('/^[a-zA-Z0-9.-]{1,100}$/D', $releaseId) || !preg_match('/^[a-f0-9]{64}$/D', $token)) {
            throw new RuntimeException('Invalid engine update approval');
        }
        $layout = self::layout($privateDir);
        $planPath = $layout['plans'] . DIRECTORY_SEPARATOR . $releaseId . '.json';
        $plan = self::readPlan($planPath);
        self::assertPlan($plan, $token, 'apply');
        self::assertDatabaseIdentity($db, $privateDir);
        $state = self::readState($layout);
        if (!hash_equals($plan['stateHash'], self::stateHash($state))
            || !hash_equals($plan['databaseFingerprint'], self::databaseFingerprintFromEnvironment())) {
            throw new RuntimeException('Engine update plan is stale; review the package again');
        }
        $staging = $layout['staging'] . DIRECTORY_SEPARATOR . $releaseId;
        $verified = EngineReleaseVerifier::verify($staging, $layout['trust'] . DIRECTORY_SEPARATOR . 'publisher.pem', true);
        if (!hash_equals($plan['fingerprint'], $verified['fingerprint'])
            || $verified['releaseVersion'] !== $plan['releaseVersion']) {
            throw new RuntimeException('Staged engine package no longer matches the reviewed plan');
        }
        $snapshot = DatabaseSnapshot::create($db, $privateDir, $plan['databaseFingerprint'],
            self::installationReceipt($privateDir)['instanceId'], 1);

        $lock = self::exclusiveLock($layout);
        try {
            if (file_exists($layout['intent']) || is_link($layout['intent'])) {
                throw new RuntimeException('An unfinished engine activation requires explicit recovery');
            }
            $current = self::readState($layout);
            if (!hash_equals($plan['stateHash'], self::stateHash($current))) {
                throw new RuntimeException('Engine changed after review; create a new update plan');
            }
            $slotRoot = $layout['slots'] . DIRECTORY_SEPARATOR . $releaseId;
            if (file_exists($slotRoot) || is_link($slotRoot)) {
                throw new RuntimeException('Immutable engine slot already exists');
            }
            if (!rename($staging, $slotRoot)) {
                throw new RuntimeException('Unable to atomically promote the staged engine slot');
            }
            self::sealTree($slotRoot);
            $slotVerified = EngineReleaseVerifier::verify($slotRoot,
                $layout['trust'] . DIRECTORY_SEPARATOR . 'publisher.pem', true);
            if (!hash_equals($plan['fingerprint'], $slotVerified['fingerprint'])) {
                throw new RuntimeException('Installed engine slot failed post-copy verification');
            }
            $active = [
                'fingerprint' => $verified['fingerprint'],
                'loaderAbi' => 1,
                'managed' => true,
                'profile' => 'php-host',
                'releaseId' => $releaseId,
                'releaseVersion' => $verified['releaseVersion'],
                'schemaVersion' => 1,
                'slotPath' => $slotRoot . DIRECTORY_SEPARATOR . 'stage3'
            ];
            $next = self::nextState($current, $active, $snapshot['snapshotId']);
            self::commitTransition($layout, $current, $next, $snapshot['snapshotId']);
            self::pruneSnapshotsSafely($privateDir, $snapshot['snapshotId']);
            @unlink($planPath);
            return [
                'state' => 'updated',
                'currentVersion' => $active['releaseVersion'],
                'previousVersion' => $current['active']['releaseVersion'],
                'sequence' => $next['sequence'],
                'snapshotId' => $snapshot['snapshotId'],
                'databasePreserved' => true,
                'deploymentPerformed' => false
            ];
        } finally {
            self::releaseLock($lock);
        }
    }

    public static function rollbackPlan(string $privateDir, string $serverRoot, PDO $db): array
    {
        $layout = self::layout($privateDir);
        $state = self::lockedState($layout, $serverRoot);
        if ($state['previous'] === null) throw new RuntimeException('There is no previous CMS engine version to roll back to');
        self::assertDatabaseIdentity($db, $privateDir);
        self::validatePointer($state['previous'], $layout, $serverRoot, true);
        $planId = 'rollback-' . bin2hex(random_bytes(12));
        $token = bin2hex(random_bytes(32));
        $plan = [
            'action' => 'rollback',
            'createdAt' => time(),
            'databaseFingerprint' => self::databaseFingerprintFromEnvironment(),
            'expiresAt' => time() + 600,
            'fingerprint' => $state['previous']['fingerprint'],
            'format' => self::PLAN_FORMAT,
            'releaseId' => $planId,
            'releaseVersion' => $state['previous']['releaseVersion'],
            'schemaVersion' => 1,
            'stateHash' => self::stateHash($state),
            'tokenSha256' => hash('sha256', $token)
        ];
        self::writeFresh($layout['plans'] . DIRECTORY_SEPARATOR . $planId . '.json',
            self::canonicalJson($plan) . "\n");
        return [
            'planId' => $planId,
            'targetVersion' => $state['previous']['releaseVersion'],
            'currentVersion' => $state['active']['releaseVersion'],
            'planToken' => $token,
            'expiresInSeconds' => 600,
            'snapshotRequired' => true
        ];
    }

    public static function rollback(string $privateDir, string $serverRoot, string $planId, string $token, PDO $db): array
    {
        if (!preg_match('/^rollback-[a-f0-9]{24}$/D', $planId) || !preg_match('/^[a-f0-9]{64}$/D', $token)) {
            throw new RuntimeException('Invalid engine rollback approval');
        }
        $layout = self::layout($privateDir);
        $planPath = $layout['plans'] . DIRECTORY_SEPARATOR . $planId . '.json';
        $plan = self::readPlan($planPath);
        self::assertPlan($plan, $token, 'rollback');
        self::assertDatabaseIdentity($db, $privateDir);
        $state = self::readState($layout);
        if (!hash_equals($plan['stateHash'], self::stateHash($state))
            || !hash_equals($plan['databaseFingerprint'], self::databaseFingerprintFromEnvironment())
            || $state['previous'] === null
            || !hash_equals($plan['fingerprint'], $state['previous']['fingerprint'])) {
            throw new RuntimeException('Rollback plan is stale; review rollback again');
        }
        self::validatePointer($state['previous'], $layout, $serverRoot, true);
        $snapshot = DatabaseSnapshot::create($db, $privateDir, $plan['databaseFingerprint'],
            self::installationReceipt($privateDir)['instanceId'], 1);
        $lock = self::exclusiveLock($layout);
        try {
            if (file_exists($layout['intent']) || is_link($layout['intent'])) {
                throw new RuntimeException('An unfinished engine activation requires explicit recovery');
            }
            $current = self::readState($layout);
            if (!hash_equals($plan['stateHash'], self::stateHash($current)) || $current['previous'] === null
                || !hash_equals($plan['fingerprint'], $current['previous']['fingerprint'])) {
                throw new RuntimeException('Engine changed after rollback review');
            }
            $target = $current['previous'];
            self::validatePointer($target, $layout, $serverRoot, true);
            $next = self::nextState($current, $target, $snapshot['snapshotId']);
            self::commitTransition($layout, $current, $next, $snapshot['snapshotId']);
            self::pruneSnapshotsSafely($privateDir, $snapshot['snapshotId']);
            @unlink($planPath);
            return [
                'state' => 'rolled_back',
                'currentVersion' => $target['releaseVersion'],
                'previousVersion' => $current['active']['releaseVersion'],
                'sequence' => $next['sequence'],
                'snapshotId' => $snapshot['snapshotId'],
                'databasePreserved' => true,
                'deploymentPerformed' => false
            ];
        } finally {
            self::releaseLock($lock);
        }
    }

    public static function recover(string $privateDir, string $serverRoot, string $direction): array
    {
        if (!in_array($direction, ['finalize','abort'], true)) throw new RuntimeException('Recovery direction must be finalize or abort');
        $layout = self::layout($privateDir);
        $lock = self::exclusiveLock($layout);
        try {
            if (!file_exists($layout['intent']) || is_link($layout['intent'])) {
                throw new RuntimeException('No valid pending engine activation exists');
            }
            $intent = self::readCanonicalFile($layout['intent'], 65536);
            $expected = ['createdAt','direction','format','newState','oldState','snapshotId'];
            if (array_keys($intent) !== $expected || $intent['format'] !== self::INTENT_FORMAT
                || !is_array($intent['oldState']) || !is_array($intent['newState'])
                || !is_string($intent['snapshotId'])
                || !preg_match('/^snapshot-[0-9]{14}-[a-f0-9]{16}$/D', $intent['snapshotId'])) {
                throw new RuntimeException('Engine activation journal is invalid');
            }
            if ($direction === 'finalize') {
                self::validateStateDocument($intent['newState'], $layout, $serverRoot, true);
            } else {
                self::validateStateDocument($intent['oldState'], $layout, $serverRoot, true);
            }
            $snapshotCheck = DatabaseSnapshot::verify($layout['snapshots'] . DIRECTORY_SEPARATOR . $intent['snapshotId']);
            $receiptCheck = self::installationReceipt($privateDir);
            if (!hash_equals($receiptCheck['databaseFingerprint'], $snapshotCheck['manifest']['databaseFingerprint'])
                || !hash_equals($receiptCheck['instanceId'], $snapshotCheck['manifest']['instanceId'])) {
                throw new RuntimeException('Recovery snapshot belongs to a different CMS installation or database');
            }
            $current = self::readStateOrNull($layout);
            $oldHash = self::stateHash($intent['oldState']);
            $newHash = self::stateHash($intent['newState']);
            $currentHash = $current === null ? '' : self::stateHash($current);
            if ($currentHash !== $oldHash && $currentHash !== $newHash) {
                throw new RuntimeException('Engine state diverged from its activation journal; manual review required');
            }
            if ($direction === 'finalize') {
                if ($currentHash === $oldHash) self::writeAtomic($layout['state'], self::canonicalJson($intent['newState']) . "\n");
                self::writeActivationReceipt($layout, $intent['newState'], $intent['snapshotId']);
            } elseif ($currentHash === $newHash) {
                self::writeAtomic($layout['state'], self::canonicalJson($intent['oldState']) . "\n");
            }
            if (!unlink($layout['intent'])) throw new RuntimeException('Unable to clear the recovered engine activation journal');
            $recoveredState = $direction === 'finalize' ? $intent['newState'] : $intent['oldState'];
            self::pruneSnapshotsSafely($privateDir, $recoveredState['lastSnapshotId'] ?? null);
            return ['state' => $direction === 'finalize' ? 'finalized' : 'aborted',
                'currentVersion' => ($direction === 'finalize' ? $intent['newState'] : $intent['oldState'])['active']['releaseVersion']];
        } finally {
            self::releaseLock($lock);
        }
    }

    private static function pruneSnapshotsSafely(string $privateDir, ?string $pinnedSnapshotId): void
    {
        try {
            DatabaseSnapshot::prune($privateDir, $pinnedSnapshotId === null ? [] : [$pinnedSnapshotId], 10);
        } catch (Throwable $error) {
            error_log('Stage3 snapshot retention cleanup deferred: ' . get_class($error));
        }
    }

    /** Stable public front controller calls this on every request and holds a shared lease until shutdown. */
    public static function requestRoot(string $serverRoot): string
    {
        require_once $serverRoot . DIRECTORY_SEPARATOR . 'RuntimeConfig.php';
        require_once $serverRoot . DIRECTORY_SEPARATOR . 'EngineReleaseVerifier.php';
        require_once $serverRoot . DIRECTORY_SEPARATOR . 'DatabaseSnapshot.php';
        RuntimeConfig::load($serverRoot);
        $requestPath = parse_url((string)($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
        $requestPath = is_string($requestPath) ? $requestPath : null;
        $requestMethod = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $engineControlRequest = $requestPath !== null
            && ($requestPath === '/api/engine' || str_starts_with($requestPath, '/api/engine/'));
        $recoveryShellRequest = self::isRecoveryShellRequest($requestPath, $requestMethod);
        $stableControlRequest = $engineControlRequest || $recoveryShellRequest;
        $privateDir = (string)getenv('STAGE3_PRIVATE_DIR');
        $layout = self::layout($privateDir);
        $lock = self::openLock($layout);
        if (!flock($lock, LOCK_SH | LOCK_NB)) {
            fclose($lock);
            throw new RuntimeException('CMS engine is switching; retry the request shortly');
        }
        try {
            if (file_exists($layout['intent']) || is_link($layout['intent'])) {
                if (!$stableControlRequest) throw new RuntimeException('CMS engine activation requires explicit recovery');
                flock($lock, LOCK_UN); fclose($lock);
                return dirname($serverRoot);
            }
            $state = self::readStateOrNull($layout);
            if ($state === null) {
                flock($lock, LOCK_UN);
                fclose($lock);
                $lock = null;
                $exclusive = self::exclusiveLock($layout);
                try { self::ensureState($layout, $serverRoot); }
                finally { self::releaseLock($exclusive); }
                $lock = self::openLock($layout);
                if (!flock($lock, LOCK_SH | LOCK_NB)) {
                    fclose($lock);
                    throw new RuntimeException('CMS engine is switching; retry the request shortly');
                }
                if (file_exists($layout['intent']) || is_link($layout['intent'])) {
                    if (!$stableControlRequest) throw new RuntimeException('CMS engine activation requires explicit recovery');
                    flock($lock, LOCK_UN); fclose($lock);
                    return dirname($serverRoot);
                }
                $state = self::readState($layout);
            }
            if ($engineControlRequest) {
                // Keep the engine control plane on the stable loader generation.
                // It needs no active-slot code and must remain reachable during recovery.
                flock($lock, LOCK_UN); fclose($lock);
                return dirname($serverRoot);
            }
            try {
                self::validatePointer($state['active'], $layout, $serverRoot, true);
            } catch (Throwable $error) {
                if (!$recoveryShellRequest) throw $error;
                // Serve only the stable recovery shell when the active slot is
                // damaged. Site editing/publication routes remain fail-closed.
                flock($lock, LOCK_UN); fclose($lock);
                return dirname($serverRoot);
            }
            $selectedRoot = $state['active']['slotPath'];
            self::$requestLease = $lock;
            register_shutdown_function(static function (): void {
                if (is_resource(self::$requestLease)) {
                    @flock(self::$requestLease, LOCK_UN);
                    @fclose(self::$requestLease);
                    self::$requestLease = null;
                }
            });
            return $selectedRoot;
        } catch (Throwable $error) {
            if (is_resource($lock)) {
                @flock($lock, LOCK_UN);
                @fclose($lock);
            }
            throw $error;
        }
    }

    private static function isRecoveryShellRequest(?string $path, string $method): bool
    {
        if ($method === 'GET' && in_array($path, [
            '/studio','/studio.css','/bundle.js','/hosted.js','/access.js','/hosted.css',
            '/media-processing.js','/media-motion-contract.js','/media-motion-sha256.js',
            '/media-motion-engine.js','/api/session','/api/sites'
        ], true)) {
            return true;
        }
        return $method === 'POST' && in_array($path, ['/api/login','/api/logout'], true);
    }

    public static function databaseFromEnvironment(): PDO
    {
        $dsn = getenv('STAGE3_DSN');
        if (!is_string($dsn) || !preg_match('/^(mysql:|sqlite:)/', $dsn)) {
            throw new RuntimeException('Installed Stage3 database configuration is unavailable');
        }
        return new PDO($dsn, getenv('STAGE3_DB_USER') ?: null, getenv('STAGE3_DB_PASSWORD') ?: null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false
        ]);
    }

    private static function assertDatabaseIdentity(PDO $db, string $privateDir): void
    {
        $receipt = self::installationReceipt($privateDir);
        $fingerprint = self::databaseFingerprintFromEnvironment();
        if (!hash_equals($receipt['databaseFingerprint'], $fingerprint) || $receipt['schemaVersion'] !== 1) {
            throw new RuntimeException('Engine update is bound to a different database or schema version');
        }
        $q = $db->query('SELECT instance_id,mode FROM stage3_instance WHERE singleton_id=1');
        $row = $q->fetch(PDO::FETCH_ASSOC);
        if (!is_array($row) || $row['instance_id'] !== $receipt['instanceId'] || $row['mode'] !== 'single-site') {
            throw new RuntimeException('Engine update database identity does not match the installation receipt');
        }
    }

    private static function installationReceipt(string $privateDir): array
    {
        $path = rtrim($privateDir,DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'installation.json';
        $stat=@lstat($path);$mode=is_file($path)?@fileperms($path):false;
        if($stat===false||!is_file($path)||is_link($path)||realpath($path)!==$path
            ||($stat['nlink']??0)!==1||$stat['size']<1||$stat['size']>8192
            ||$mode===false||(($mode&0077)!==0))throw new RuntimeException('Private Stage3 installation receipt is unsafe');
        $raw=file_get_contents($path);
        if(!is_string($raw)||strlen($raw)!==(int)$stat['size'])throw new RuntimeException('Unable to read private Stage3 installation receipt');
        try{$receipt=json_decode($raw,true,16,JSON_THROW_ON_ERROR);}catch(Throwable $error){throw new RuntimeException('Private Stage3 installation receipt is malformed',0,$error);}
        $canonical=json_encode($receipt,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
        if(!is_array($receipt)||!hash_equals($canonical,$raw))throw new RuntimeException('Private Stage3 installation receipt is not canonical');
        $keys = ['format','instanceId','instanceMode','dbDriver','schemaVersion','databaseFingerprint',
            'configPath','configSha256','ownerUsername','installedAt'];
        if (array_keys($receipt) !== $keys || ($receipt['format'] ?? null) !== 'manufact-stage3-install-receipt-v1'
            || ($receipt['instanceMode'] ?? null) !== 'single-site' || ($receipt['schemaVersion'] ?? null) !== 1
            || !is_string($receipt['instanceId'] ?? null) || !preg_match('/^[a-f0-9]{32}$/D',$receipt['instanceId'])
            || !is_string($receipt['databaseFingerprint'] ?? null) || !preg_match('/^[a-f0-9]{64}$/D',$receipt['databaseFingerprint'])) {
            throw new RuntimeException('Private Stage3 installation receipt is invalid');
        }
        return $receipt;
    }

    private static function databaseFingerprintFromEnvironment(): string
    {
        $dsn = (string)getenv('STAGE3_DSN');
        $user = (string)getenv('STAGE3_DB_USER');
        $safe = preg_replace('/(password|pwd)=([^;]*)/i','$1=[redacted]',$dsn) ?? $dsn;
        return hash('sha256',$safe."\n".$user);
    }

    private static function layout(string $privateDir): array
    {
        $private = realpath($privateDir);
        $mode = is_dir($privateDir) ? @fileperms($privateDir) : false;
        if (!is_string($private) || $private !== $privateDir || !is_dir($private) || is_link($privateDir)
            || $mode === false || (($mode & 0077) !== 0)) {
            throw new RuntimeException('STAGE3_PRIVATE_DIR must be canonical and private');
        }
        $engine = self::ensureDirectory($private . DIRECTORY_SEPARATOR . 'engine');
        $dirs = [];
        foreach (['trust','incoming','staging','slots','plans','snapshots','receipts'] as $name) {
            $dirs[$name] = self::ensureDirectory($engine . DIRECTORY_SEPARATOR . $name);
        }
        $lockPath = $engine . DIRECTORY_SEPARATOR . 'request.lock';
        if (is_link($lockPath)) throw new RuntimeException('CMS engine request lock must not be a symlink');
        if (!file_exists($lockPath)) self::writeFresh($lockPath,'');
        $stat = @lstat($lockPath);
        if ($stat === false || !is_file($lockPath) || is_link($lockPath) || ($stat['nlink'] ?? 0) !== 1) {
            throw new RuntimeException('CMS engine request lock is unsafe');
        }
        chmod($lockPath,0600);
        return [
            'root'=>$engine,'trust'=>$dirs['trust'],'incoming'=>$dirs['incoming'],'staging'=>$dirs['staging'],
            'slots'=>$dirs['slots'],'plans'=>$dirs['plans'],'snapshots'=>$dirs['snapshots'],'receipts'=>$dirs['receipts'],
            'lock'=>$lockPath,'state'=>$engine.DIRECTORY_SEPARATOR.'state.json',
            'intent'=>$engine.DIRECTORY_SEPARATOR.'activation-intent.json'
        ];
    }

    private static function lockedState(array $layout,string $serverRoot): array
    {
        $lock=self::exclusiveLock($layout);
        try {
            if(file_exists($layout['intent'])||is_link($layout['intent']))throw new RuntimeException('Engine recovery is required');
            self::ensureState($layout,$serverRoot);
            return self::readState($layout);
        } finally { self::releaseLock($lock); }
    }

    private static function ensureState(array $layout,string $serverRoot): void
    {
        if(file_exists($layout['state'])||is_link($layout['state'])){self::readState($layout);return;}
        $stage3Root=realpath(dirname($serverRoot));
        if(!is_string($stage3Root)||!is_dir($stage3Root)||is_link(dirname($serverRoot)))throw new RuntimeException('Installed Stage3 engine root is unavailable');
        $active=[
            'fingerprint'=>EngineReleaseVerifier::fingerprintStage3Root($stage3Root),
            'loaderAbi'=>1,'managed'=>false,'profile'=>'php-host','releaseId'=>'legacy',
            'releaseVersion'=>'legacy-installed','schemaVersion'=>1,'slotPath'=>$stage3Root
        ];
        $state=['active'=>$active,'format'=>self::STATE_FORMAT,'lastSnapshotId'=>null,'previous'=>null,'sequence'=>0];
        self::writeFresh($layout['state'],self::canonicalJson($state)."\n");
    }

    private static function readState(array $layout): array
    {
        $state=self::readStateOrNull($layout);
        if($state===null)throw new RuntimeException('CMS engine state is not initialized');
        return $state;
    }

    private static function readStateOrNull(array $layout): ?array
    {
        if(!file_exists($layout['state'])&&!is_link($layout['state']))return null;
        $state=self::readCanonicalFile($layout['state'],65536);
        if(array_keys($state)!==['active','format','lastSnapshotId','previous','sequence']
            ||$state['format']!==self::STATE_FORMAT||!is_int($state['sequence'])||$state['sequence']<0
            ||!is_array($state['active'])||($state['previous']!==null&&!is_array($state['previous']))
            ||($state['lastSnapshotId']!==null&&!is_string($state['lastSnapshotId']))) {
            throw new RuntimeException('CMS engine state is invalid');
        }
        return $state;
    }

    private static function validateStateDocument(array $state, array $layout, string $serverRoot, bool $verifyFiles): void
    {
        if (array_keys($state) !== ['active','format','lastSnapshotId','previous','sequence']
            || $state['format'] !== self::STATE_FORMAT || !is_int($state['sequence']) || $state['sequence'] < 0
            || !is_array($state['active']) || ($state['previous'] !== null && !is_array($state['previous']))
            || ($state['lastSnapshotId'] !== null && !is_string($state['lastSnapshotId']))) {
            throw new RuntimeException('CMS engine recovery state document is invalid');
        }
        // Only the selected generation must be healthy for recovery. The retained
        // previous pointer is validated immediately before a rollback uses it.
        self::validatePointer($state['active'], $layout, $serverRoot, $verifyFiles);
    }

    private static function nextState(array $current,array $active,string $snapshotId): array
    {
        return [
            'active'=>$active,
            'format'=>self::STATE_FORMAT,
            'lastSnapshotId'=>$snapshotId,
            'previous'=>$current['active'],
            'sequence'=>$current['sequence']+1
        ];
    }

    private static function validatePointer(array $pointer,array $layout,string $serverRoot,bool $verifyFiles): void
    {
        if(array_keys($pointer)!==['fingerprint','loaderAbi','managed','profile','releaseId','releaseVersion','schemaVersion','slotPath']
            ||!is_string($pointer['fingerprint'])||!preg_match('/^[a-f0-9]{64}$/D',$pointer['fingerprint'])
            ||$pointer['loaderAbi']!==1||$pointer['profile']!=='php-host'||$pointer['schemaVersion']!==1
            ||!is_string($pointer['releaseId'])||!is_string($pointer['releaseVersion'])||!is_string($pointer['slotPath'])) {
            throw new RuntimeException('CMS engine generation pointer is invalid');
        }
        $slot=realpath($pointer['slotPath']);
        if(!is_string($slot)||$slot!==$pointer['slotPath']||!is_dir($slot)||is_link($pointer['slotPath'])) {
            throw new RuntimeException('CMS engine generation directory is unavailable');
        }
        if($pointer['managed']===false) {
            $legacy=realpath(dirname($serverRoot));
            if($pointer['releaseId']!=='legacy'||$pointer['releaseVersion']!=='legacy-installed'||$slot!==$legacy) {
                throw new RuntimeException('Legacy engine pointer does not match the installed runtime');
            }
            if($verifyFiles&&!hash_equals($pointer['fingerprint'],EngineReleaseVerifier::fingerprintStage3Root($slot))) {
                throw new RuntimeException('Legacy engine files changed after the rollback baseline was captured');
            }
            return;
        }
        if($pointer['managed']!==true||!preg_match('/^[a-zA-Z0-9.-]{1,100}$/D',$pointer['releaseId'])) {
            throw new RuntimeException('CMS engine slot identity is invalid');
        }
        $slotRoot=$layout['slots'].DIRECTORY_SEPARATOR.$pointer['releaseId'];
        $expected=$slotRoot.DIRECTORY_SEPARATOR.'stage3';
        if($slot!==$expected||realpath($slotRoot)!==$slotRoot||is_link($slotRoot)) {
            throw new RuntimeException('CMS engine slot escaped its private generation directory');
        }
        $verified=EngineReleaseVerifier::verify($slotRoot,
            $layout['trust'].DIRECTORY_SEPARATOR.'publisher.pem',$verifyFiles);
        if(!hash_equals($pointer['fingerprint'],$verified['fingerprint'])
            ||$pointer['releaseVersion']!==$verified['releaseVersion']) {
            throw new RuntimeException('CMS engine slot does not match its signed release identity');
        }
        if(!$verifyFiles){
            $manifest=$verified['manifest'];
            $bootstrapPath=$slot.DIRECTORY_SEPARATOR.'server'.DIRECTORY_SEPARATOR.'bootstrap.php';
            $expectedHash=null;
            foreach($manifest['files'] as $file)if($file['path']==='stage3/server/bootstrap.php'){$expectedHash=$file['sha256'];break;}
            if(!is_string($expectedHash)||!is_file($bootstrapPath)||is_link($bootstrapPath)
                ||!hash_equals($expectedHash,(string)hash_file('sha256',$bootstrapPath))) {
                throw new RuntimeException('CMS engine startup file failed its signed integrity check');
            }
        }
    }

    private static function commitTransition(array $layout,array $oldState,array $newState,string $snapshotId): void
    {
        $intent=[
            'createdAt'=>gmdate('Y-m-d\TH:i:s\Z'),
            'direction'=>'forward',
            'format'=>self::INTENT_FORMAT,
            'newState'=>$newState,
            'oldState'=>$oldState,
            'snapshotId'=>$snapshotId
        ];
        self::writeFresh($layout['intent'],self::canonicalJson($intent)."\n");
        self::writeAtomic($layout['state'],self::canonicalJson($newState)."\n");
        self::writeActivationReceipt($layout,$newState,$snapshotId);
        if(!unlink($layout['intent']))throw new RuntimeException('Unable to finalize CMS engine activation journal');
    }

    private static function writeActivationReceipt(array $layout,array $state,string $snapshotId): void
    {
        $receipt=[
            'createdAt'=>gmdate('Y-m-d\TH:i:s\Z'),
            'fingerprint'=>$state['active']['fingerprint'],
            'format'=>self::RECEIPT_FORMAT,
            'sequence'=>$state['sequence'],
            'snapshotId'=>$snapshotId,
            'stateHash'=>self::stateHash($state),
            'version'=>$state['active']['releaseVersion']
        ];
        $path=$layout['receipts'].DIRECTORY_SEPARATOR.'activation-'.$state['sequence'].'.json';
        if(file_exists($path)||is_link($path)){
            $existing=self::readCanonicalFile($path,16384);
            if(($existing['stateHash']??null)===self::stateHash($state)
                &&($existing['snapshotId']??null)===$snapshotId
                &&($existing['fingerprint']??null)===$state['active']['fingerprint'])return;
            throw new RuntimeException('CMS engine activation receipt conflicts with the pending transition');
        }
        self::writeFresh($path,self::canonicalJson($receipt)."\n");
    }

    private static function assertPlan(array $plan,string $token,string $action): void
    {
        $keys=['action','createdAt','databaseFingerprint','expiresAt','fingerprint','format','releaseId',
            'releaseVersion','schemaVersion','stateHash','tokenSha256'];
        if(array_keys($plan)!==$keys||$plan['format']!==self::PLAN_FORMAT||$plan['action']!==$action
            ||!is_int($plan['expiresAt'])||$plan['expiresAt']<time()
            ||!is_string($plan['tokenSha256'])||!hash_equals($plan['tokenSha256'],hash('sha256',$token))) {
            throw new RuntimeException('Engine approval token is invalid or expired');
        }
    }

    private static function readPlan(string $path): array
    {
        return self::readCanonicalFile($path,16384);
    }

    private static function stateHash(array $state): string
    {
        return hash('sha256',self::canonicalJson($state));
    }

    private static function readCanonicalFile(string $path,int $limit,bool $private=true): array
    {
        $stat=@lstat($path);$mode=is_file($path)?@fileperms($path):false;
        if($stat===false||!is_file($path)||is_link($path)||realpath($path)!==$path||($stat['nlink']??0)!==1
            ||$stat['size']<1||$stat['size']>$limit||$mode===false||($private&&(($mode&0077)!==0))) {
            throw new RuntimeException('Unsafe private CMS engine metadata');
        }
        $raw=file_get_contents($path);
        if(!is_string($raw)||strlen($raw)!==(int)$stat['size'])throw new RuntimeException('Unable to read private CMS engine metadata');
        try{$value=json_decode($raw,true,64,JSON_THROW_ON_ERROR);}catch(Throwable $error){throw new RuntimeException('Private CMS engine metadata is malformed',0,$error);}
        if(!is_array($value)||array_is_list($value)||!hash_equals(self::canonicalJson($value)."\n",$raw))
            throw new RuntimeException('Private CMS engine metadata is not canonical');
        return $value;
    }

    private static function copyTree(string $source,string $destination): void
    {
        $source=realpath($source);
        if(!is_string($source)||!is_dir($source)||is_link($source)||!mkdir($destination,0700))
            throw new RuntimeException('Unable to create private engine staging directory');
        try{
            $iterator=new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($source,\FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST
            );
            foreach($iterator as $item){
                $from=$item->getPathname();
                $relative=substr($from,strlen($source)+1);
                $to=$destination.DIRECTORY_SEPARATOR.$relative;
                if($item->isLink())throw new RuntimeException('Engine release package contains a symbolic link');
                if($item->isDir()){
                    if(!is_dir($to)&&!mkdir($to,0700,true))throw new RuntimeException('Unable to create private engine directory');
                    chmod($to,0700);
                }elseif($item->isFile()){
                    $stat=@lstat($from);
                    if($stat===false||($stat['nlink']??0)!==1||realpath($from)!==$from)
                        throw new RuntimeException('Engine release package contains an unsafe file');
                    if(!is_dir(dirname($to))&&!mkdir(dirname($to),0700,true))throw new RuntimeException('Unable to create private engine directory');
                    if(!copy($from,$to))throw new RuntimeException('Unable to copy engine release into private staging');
                    chmod($to,0600);
                }else throw new RuntimeException('Engine release package contains a special file');
            }
        }catch(Throwable $error){self::removeTree($destination);throw $error;}
    }

    private static function sealTree(string $root): void
    {
        $iterator=new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($root,\FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach($iterator as $item){
            if($item->isLink())throw new RuntimeException('Refusing to seal a linked engine slot');
            if($item->isDir())chmod($item->getPathname(),0500);
            elseif($item->isFile())chmod($item->getPathname(),0400);
            else throw new RuntimeException('Refusing to seal a special engine slot entry');
        }
        chmod($root,0500);
    }

    private static function ensureDirectory(string $path): string
    {
        if(!file_exists($path)&&!is_link($path)&&!mkdir($path,0700))throw new RuntimeException('Unable to create private engine directory');
        if(is_link($path)||!is_dir($path)||realpath($path)!==$path)throw new RuntimeException('Unsafe private engine directory');
        chmod($path,0700);return $path;
    }

    private static function exclusiveLock(array $layout)
    {
        $handle=self::openLock($layout);
        if(!flock($handle,LOCK_EX|LOCK_NB)){fclose($handle);throw new RuntimeException('CMS engine is in use by an active PHP request');}
        return $handle;
    }

    private static function openLock(array $layout)
    {
        if(is_link($layout['lock']))throw new RuntimeException('CMS engine lock is a symlink');
        $handle=@fopen($layout['lock'],'c+');
        if($handle===false)throw new RuntimeException('Unable to open private CMS engine lock');
        chmod($layout['lock'],0600);return $handle;
    }

    private static function releaseLock($handle): void
    {
        if(is_resource($handle)){@flock($handle,LOCK_UN);@fclose($handle);}
    }

    private static function writeFresh(string $path,string $bytes): void
    {
        if(file_exists($path)||is_link($path))throw new RuntimeException('Refusing to overwrite private CMS engine metadata');
        $handle=@fopen($path,'x');if($handle===false)throw new RuntimeException('Unable to create private CMS engine metadata');
        try{chmod($path,0600);if(fwrite($handle,$bytes)!==strlen($bytes)||!fflush($handle))throw new RuntimeException('Unable to write private CMS engine metadata');if(function_exists('fsync'))fsync($handle);}
        catch(Throwable $error){fclose($handle);if(is_file($path)&&!is_link($path))unlink($path);throw $error;}fclose($handle);
    }

    private static function writeAtomic(string $path,string $bytes): void
    {
        if(is_link($path))throw new RuntimeException('Refusing to replace a linked CMS engine state file');
        $temporary=dirname($path).DIRECTORY_SEPARATOR.'.'.basename($path).'.'.bin2hex(random_bytes(8)).'.tmp';
        self::writeFresh($temporary,$bytes);
        if(!rename($temporary,$path)){@unlink($temporary);throw new RuntimeException('Unable to atomically switch CMS engine state');}
        chmod($path,0600);
    }

    private static function readSourceFile(string $path,int $limit): string
    {
        $stat=@lstat($path);
        if($stat===false||!is_file($path)||is_link($path)||realpath($path)!==$path||($stat['nlink']??0)!==1
            ||$stat['size']<1||$stat['size']>$limit)throw new RuntimeException('Publisher public key file is unsafe');
        $raw=file_get_contents($path);if(!is_string($raw)||strlen($raw)!==(int)$stat['size'])throw new RuntimeException('Unable to read publisher public key');
        return $raw;
    }

    private static function publicPointer(array $pointer): array
    {
        return [
            'releaseVersion'=>$pointer['releaseVersion'],
            'profile'=>$pointer['profile'],
            'fingerprint'=>$pointer['fingerprint'],
            'schemaVersion'=>$pointer['schemaVersion'],
            'managed'=>$pointer['managed']
        ];
    }

    private static function canonicalJson(mixed $value): string
    {
        $normalize=static function(mixed $v)use(&$normalize):mixed{
            if(!is_array($v))return $v;
            if(array_is_list($v))return array_map($normalize,$v);
            ksort($v,SORT_STRING);foreach($v as $k=>$child)$v[$k]=$normalize($child);return $v;
        };
        return json_encode($normalize($value),JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    }

    private static function removeTree(string $path): void
    {
        if(!file_exists($path)&&!is_link($path))return;
        if(is_link($path)||!is_dir($path)){if(!is_link($path))unlink($path);return;}
        foreach(scandir($path)?:[] as $name)if($name!=='.'&&$name!=='..')self::removeTree($path.DIRECTORY_SEPARATOR.$name);
        @rmdir($path);
    }
}
