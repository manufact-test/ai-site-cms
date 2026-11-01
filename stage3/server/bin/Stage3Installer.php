<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use PDO;
use RuntimeException;
use Throwable;

final class Stage3Installer
{
    private const RECEIPT_FORMAT = 'manufact-stage3-install-receipt-v1';
    private const PLAN_FORMAT = 'manufact-stage3-install-plan-v1';
    private const SCHEMA_VERSION = 1;

    public static function plan(PDO $db, array $env): array
    {
        $driver = (string)$db->getAttribute(PDO::ATTR_DRIVER_NAME);
        $dsn = self::value($env, 'STAGE3_DSN');
        $dbUser = self::value($env, 'STAGE3_DB_USER');
        $ownerUser = self::value($env, 'STAGE3_OWNER_USER');
        $ownerPassword = self::value($env, 'STAGE3_OWNER_PASSWORD');
        $formSecret = self::value($env, 'STAGE3_FORM_SECRET');
        $formOrigins = self::value($env, 'STAGE3_FORM_ORIGINS');
        $formEndpoint = self::value($env, 'STAGE3_FORM_ENDPOINT');
        $privateInput = self::value($env, 'STAGE3_PRIVATE_DIR');
        $publicInput = self::value($env, 'STAGE3_PUBLIC_ROOT');

        $errors = [];
        $warnings = [];
        $checks = [];

        $checks['php'] = ['ok' => PHP_VERSION_ID >= 80100, 'version' => PHP_VERSION];
        if (!$checks['php']['ok']) {
            $errors[] = 'PHP 8.1 or newer is required';
        }

        $driverExtension = $driver === 'mysql' ? 'pdo_mysql' : ($driver === 'sqlite' ? 'pdo_sqlite' : '');
        $extensions = ['pdo', 'json', 'openssl', 'mbstring'];
        if ($driverExtension !== '') {
            $extensions[] = $driverExtension;
        }
        $missingExtensions = array_values(array_filter($extensions, static fn(string $name): bool => !extension_loaded($name)));
        $checks['extensions'] = ['ok' => count($missingExtensions) === 0, 'required' => $extensions, 'missing' => $missingExtensions];
        if ($missingExtensions !== []) {
            $errors[] = 'Required PHP extensions are missing: ' . implode(', ', $missingExtensions);
        }

        $checks['databaseDriver'] = ['ok' => in_array($driver, ['mysql', 'sqlite'], true), 'driver' => $driver];
        if (!in_array($driver, ['mysql', 'sqlite'], true)) {
            $errors[] = 'Only MySQL and SQLite database drivers are supported';
        }
        if ($driver === 'sqlite' && ($env['CI'] ?? '') !== 'true' && ($env['STAGE3_ALLOW_SQLITE_INSTALL'] ?? '') !== '1') {
            $errors[] = 'SQLite installation is lab-only; use a dedicated MySQL database for a hosted CMS instance';
        }
        if ($driver === 'mysql' && $dbUser === '') {
            $errors[] = 'STAGE3_DB_USER is required for MySQL';
        }
        if ($dsn === '') {
            $errors[] = 'STAGE3_DSN is required';
        }

        $ownerValid = preg_match('/^[a-z][a-z0-9_-]{2,39}$/D', $ownerUser) === 1
            && strlen($ownerPassword) >= 14 && strlen($ownerPassword) <= 1024;

        $secretValid = strlen($formSecret) >= 32 && strlen($formSecret) <= 1024
            && !str_contains($formSecret, "\r") && !str_contains($formSecret, "\n");
        $checks['formSecret'] = ['ok' => $secretValid, 'configured' => $formSecret !== '', 'minimumLength' => 32];
        if (!$secretValid) {
            $errors[] = 'STAGE3_FORM_SECRET must be a private value of 32–1024 characters without line breaks';
        }

        $privateDir = $privateInput !== '' ? realpath($privateInput) : false;
        $privateOk = is_string($privateDir) && is_dir($privateDir) && !is_link($privateInput)
            && $privateDir === $privateInput && is_writable($privateDir);
        $privatePermissions = $privateOk ? fileperms($privateDir) : false;
        $privateMode = $privatePermissions !== false ? ($privatePermissions & 0777) : null;
        if ($privateOk && ($privateMode === null || ($privateMode & 0077) !== 0)) {
            $privateOk = false;
        }
        $checks['privateDirectory'] = [
            'ok' => $privateOk,
            'path' => is_string($privateDir) ? $privateDir : null,
            'permissions' => $privateMode === null ? null : sprintf('%04o', $privateMode)
        ];
        if (!$privateOk) {
            $errors[] = 'STAGE3_PRIVATE_DIR must be an existing canonical writable directory with permissions 0700, outside the public document root';
        }

        $serverRoot = realpath(dirname(__DIR__));
        $expectedPublicRoot = is_string($serverRoot) ? realpath($serverRoot . DIRECTORY_SEPARATOR . 'public') : false;
        $publicPath = is_string($serverRoot) ? $serverRoot . DIRECTORY_SEPARATOR . 'public' : '';
        $publicRoot = $publicInput !== '' ? realpath($publicInput) : false;
        $publicOk = is_string($serverRoot) && is_dir($serverRoot)
            && is_string($expectedPublicRoot) && !is_link($publicPath)
            && is_string($publicRoot) && is_dir($publicRoot) && !is_link($publicInput)
            && $publicRoot === $publicInput && $publicRoot === $expectedPublicRoot;
        $checks['publicDocumentRoot'] = ['ok' => $publicOk, 'path' => is_string($publicRoot) ? $publicRoot : null];
        if (!$publicOk) {
            $errors[] = 'STAGE3_PUBLIC_ROOT must be the canonical server/public directory used as this CMS installation document root';
        }
        if ($privateOk && $publicOk && (self::isWithin($privateDir, $publicRoot) || self::isWithin($publicRoot, $privateDir))) {
            $errors[] = 'The private installation directory and public document root must be separate, non-nested directories';
            $checks['privateDirectory']['ok'] = false;
            $checks['publicDocumentRoot']['ok'] = false;
        }

        $privateConfig = null;
        $privateConfigOk = is_string($serverRoot) && is_dir($serverRoot);
        if ($privateConfigOk && $privateOk && $publicOk) {
            try {
                $privateConfig = RuntimeConfig::inspect($serverRoot, $privateDir, $publicRoot);
                if ($privateConfig !== null) {
                    foreach (['STAGE3_DSN','STAGE3_DB_USER','STAGE3_DB_PASSWORD','STAGE3_FORM_SECRET',
                        'STAGE3_FORM_ORIGINS','STAGE3_FORM_ENDPOINT','STAGE3_PRIVATE_DIR','STAGE3_PUBLIC_ROOT'] as $key) {
                        if (($privateConfig['values'][$key] ?? null) !== self::value($env, $key)) {
                            $privateConfigOk = false;
                            break;
                        }
                    }
                }
            } catch (Throwable) {
                $privateConfigOk = false;
            }
        } else {
            $privateConfigOk = false;
        }
        if (!$privateConfigOk) {
            $errors[] = 'Private runtime configuration is invalid, incomplete or mismatched';
        }
        $checks['privateRuntimeConfig'] = [
            'ok' => $privateConfigOk,
            'configured' => $privateConfig !== null
        ];

        if ($driver === 'mysql') {
            try {
                $databaseName = $db->query('SELECT DATABASE()')->fetchColumn();
                $checks['databaseTarget'] = ['ok' => is_string($databaseName) && $databaseName !== '', 'driver' => 'mysql'];
                if (!is_string($databaseName) || $databaseName === '') {
                    $errors[] = 'Select a dedicated MySQL database in STAGE3_DSN before installation';
                }
            } catch (Throwable) {
                $checks['databaseTarget'] = ['ok' => false, 'driver' => 'mysql'];
                $errors[] = 'Unable to identify the selected MySQL database';
            }
        } elseif ($driver === 'sqlite') {
            $sqlitePath = str_starts_with($dsn, 'sqlite:') ? substr($dsn, 7) : '';
            $sqliteReal = $sqlitePath !== '' ? realpath($sqlitePath) : false;
            $sqliteParent = is_string($sqliteReal) ? realpath(dirname($sqliteReal)) : false;
            $sqlitePermissions = is_string($sqliteReal) ? fileperms($sqliteReal) : false;
            $parentPermissions = is_string($sqliteParent) ? fileperms($sqliteParent) : false;
            $sqliteSafe = is_string($sqliteReal) && $sqliteReal === $sqlitePath
                && is_file($sqliteReal) && !is_link($sqlitePath)
                && $sqlitePermissions !== false && (($sqlitePermissions & 0077) === 0) && is_writable($sqliteReal)
                && is_string($sqliteParent) && $sqliteParent === dirname($sqliteReal)
                && $parentPermissions !== false && (($parentPermissions & 0077) === 0)
                && is_writable($sqliteParent)
                && is_string($publicRoot) && !self::isWithin($sqliteReal, $publicRoot);
            $checks['databaseFile'] = [
                'ok' => $sqliteSafe,
                'privatePermissions' => $sqlitePermissions === false ? null : sprintf('%04o', $sqlitePermissions & 0777),
                'directoryPermissions' => $parentPermissions === false ? null : sprintf('%04o', $parentPermissions & 0777)
            ];
            if (!$sqliteSafe) {
                $errors[] = 'SQLite lab database must be a canonical regular file in a private 0700 directory, outside the public document root';
            }
        }

        $receiptPath = $privateOk ? $privateDir . DIRECTORY_SEPARATOR . 'installation.json' : null;
        $lockPath = $privateOk ? $privateDir . DIRECTORY_SEPARATOR . 'installation.lock' : null;
        if ($receiptPath !== null && is_link($receiptPath)) {
            $errors[] = 'Installation receipt path must not be a symlink';
        }
        if ($lockPath !== null && is_link($lockPath)) {
            $errors[] = 'Installation lock path must not be a symlink';
        }

        $originCount = 0;
        $originsValid = true;
        if ($formOrigins !== '') {
            foreach (array_filter(array_map('trim', explode(',', $formOrigins))) as $origin) {
                $parts = parse_url($origin);
                $localHttp = ($env['CI'] ?? '') === 'true' && is_array($parts)
                    && in_array(strtolower((string)($parts['host'] ?? '')), ['localhost', '127.0.0.1'], true);
                if (!is_array($parts) || !isset($parts['scheme'], $parts['host'])
                    || (strtolower($parts['scheme']) !== 'https' && !($localHttp && strtolower($parts['scheme']) === 'http'))
                    || isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])
                    || (isset($parts['path']) && !in_array($parts['path'], ['', '/'], true))) {
                    $errors[] = 'STAGE3_FORM_ORIGINS must contain exact HTTPS origins without paths, credentials or query strings';
                    $originsValid = false;
                    break;
                }
                $originCount++;
            }
        }
        if ($originCount === 0) {
            $warnings[] = 'Form origins are not configured yet; add exact HTTPS site origins before publishing forms';
        }
        $endpointValid = true;
        if ($formEndpoint !== '') {
            $parts = parse_url($formEndpoint);
            $localHttp = ($env['CI'] ?? '') === 'true' && is_array($parts)
                && in_array(strtolower((string)($parts['host'] ?? '')), ['localhost', '127.0.0.1'], true);
            $endpointValid = is_array($parts) && isset($parts['scheme'], $parts['host'])
                && (strtolower($parts['scheme']) === 'https' || ($localHttp && strtolower($parts['scheme']) === 'http'))
                && !isset($parts['user']) && !isset($parts['pass']) && !isset($parts['query']) && !isset($parts['fragment'])
                && (!isset($parts['path']) || in_array($parts['path'], ['', '/'], true));
            if (!$endpointValid) {
                $errors[] = 'STAGE3_FORM_ENDPOINT must be an exact HTTPS collector origin without a path or credentials';
            }
        } else {
            $warnings[] = 'STAGE3_FORM_ENDPOINT is not configured yet; configure the collector HTTPS origin before publishing forms';
        }
        $checks['formOrigins'] = ['ok' => $originsValid, 'configured' => $originCount > 0, 'count' => $originCount];
        $checks['formEndpoint'] = ['ok' => $endpointValid, 'configured' => $formEndpoint !== ''];

        $databaseFingerprintInput = preg_replace('/(password|pwd)=([^;]*)/i', '$1=[redacted]', $dsn) ?? $dsn;
        $databaseFingerprint = hash('sha256', $databaseFingerprintInput . "\n" . $dbUser);
        $tables = [];
        try {
            if ($driver === 'sqlite') {
                $tables = $db->query("SELECT name FROM sqlite_master WHERE type IN ('table','view','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
            } elseif ($driver === 'mysql') {
                $tables = array_map(static fn(array $row): string => (string)$row[0], $db->query('SHOW FULL TABLES')->fetchAll(PDO::FETCH_NUM));
            }
        } catch (Throwable $error) {
            $errors[] = 'Unable to inspect the selected database: ' . $error->getMessage();
        }

        $checks['databaseEmpty'] = ['ok' => count($tables) === 0, 'tableCount' => count($tables)];
        $state = 'install_required';
        $instanceId = null;
        $receipt = null;
        $receiptExists = $receiptPath !== null && file_exists($receiptPath);
        if ($receiptExists) {
            $receipt = self::readReceipt($receiptPath);
            if ($receipt === null) {
                $errors[] = 'An invalid private installation receipt already exists; refusing to overwrite it';
            }
        }
        if (count($tables) > 0) {
            if ($receipt === null) {
                $errors[] = 'The selected database is not empty and has no matching private installation receipt; refusing to reuse it';
            } else {
                try {
                    $row = $db->query('SELECT instance_id, mode, site_id FROM stage3_instance WHERE singleton_id = 1')->fetch(PDO::FETCH_ASSOC);
                    if (!is_array($row) || ($row['instance_id'] ?? null) !== ($receipt['instanceId'] ?? null)
                        || ($row['mode'] ?? null) !== 'single-site'
                        || ($receipt['instanceMode'] ?? null) !== 'single-site'
                        || ($receipt['schemaVersion'] ?? null) !== self::SCHEMA_VERSION
                        || ($receipt['dbDriver'] ?? null) !== $driver
                        || ($receipt['databaseFingerprint'] ?? null) !== $databaseFingerprint) {
                        $errors[] = 'Private installation receipt does not match the selected database instance';
                    } elseif ($privateConfig === null
                        || ($receipt['configPath'] ?? null) !== $privateConfig['configPath']
                        || ($receipt['configSha256'] ?? null) !== $privateConfig['configSha256']) {
                        $errors[] = 'Private runtime configuration does not match the installation receipt';
                    } else {
                        $state = 'already_installed';
                        $instanceId = (string)$row['instance_id'];
                    }
                } catch (Throwable) {
                    $errors[] = 'The database has tables but no valid Stage3 installation identity';
                }
            }
        } elseif ($receipt !== null) {
            $errors[] = 'A private installation receipt exists but the selected database is empty; refusing to overwrite either side';
        }
        if (count($tables) === 0 && $privateConfig !== null) {
            $errors[] = 'A private runtime configuration exists but the selected database is empty; refusing to overwrite either side';
        }
        $ownerRequired = count($tables) === 0 && $receipt === null && $privateConfig === null;
        $checks['ownerCredentials'] = [
            'ok' => !$ownerRequired || $ownerValid,
            'required' => $ownerRequired,
            'username' => $ownerUser,
            'passwordPresent' => $ownerPassword !== ''
        ];
        if ($ownerRequired && !$ownerValid) {
            $errors[] = 'Set a valid STAGE3_OWNER_USER and a private STAGE3_OWNER_PASSWORD of at least 14 characters';
        }

        if ($errors !== []) {
            $state = 'blocked';
        }
        $token = null;
        if ($state === 'install_required') {
            $approvalData = [
                'format' => self::PLAN_FORMAT,
                'schemaVersion' => self::SCHEMA_VERSION,
                'instanceMode' => 'single-site',
                'driver' => $driver,
                'databaseFingerprint' => $databaseFingerprint,
                'serverRoot' => $serverRoot,
                'ownerUsername' => $ownerUser,
                'ownerPasswordHash' => hash('sha256', $ownerPassword),
                'formSecretHash' => hash('sha256', $formSecret),
                'privateDirectory' => $privateDir,
                'publicRoot' => $publicRoot,
                'phpVersionId' => PHP_VERSION_ID,
                'extensions' => $extensions,
                'formOriginsHash' => hash('sha256', $formOrigins),
                'formEndpointHash' => hash('sha256', $formEndpoint)
            ];
            $token = hash('sha256', json_encode($approvalData, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        }

        return [
            'format' => self::PLAN_FORMAT,
            'state' => $state,
            'applyAllowed' => $state === 'install_required',
            'instanceMode' => 'single-site',
            'instanceId' => $instanceId,
            'dbDriver' => $driver,
            'dbFingerprint' => $databaseFingerprint,
            'privateDirectory' => is_string($privateDir) ? $privateDir : null,
            'publicDocumentRoot' => is_string($publicRoot) ? $publicRoot : null,
            'checks' => $checks,
            'warnings' => $warnings,
            'errors' => $errors,
            'token' => $token
        ];
    }

    public static function apply(PDO $db, SiteRepository $repository, array $env, string $approvalToken): array
    {
        $initialPlan = self::plan($db, $env);
        if (($initialPlan['state'] ?? null) !== 'install_required' || !is_string($initialPlan['token'] ?? null)
            || !hash_equals($initialPlan['token'], $approvalToken)) {
            throw new RuntimeException('Installation plan is stale, blocked or has an invalid approval token; run --plan again');
        }
        $privateDir = (string)$initialPlan['privateDirectory'];
        $lockPath = $privateDir . DIRECTORY_SEPARATOR . 'installation.lock';
        if (is_link($lockPath)) {
            throw new RuntimeException('Installation lock path must not be a symlink');
        }
        $lock = @fopen($lockPath, 'c+');
        if ($lock === false) {
            throw new RuntimeException('Unable to create private installation lock');
        }
        if (!chmod($lockPath, 0600)) {
            fclose($lock);
            throw new RuntimeException('Unable to secure private installation lock');
        }
        if (!flock($lock, LOCK_EX | LOCK_NB)) {
            fclose($lock);
            throw new RuntimeException('Another installation process is active');
        }
        $databaseLock = null;
        try {
            $databaseLock = self::acquireDatabaseLock($db, $env);
            $plan = self::plan($db, $env);
            if (($plan['state'] ?? null) !== 'install_required' || !is_string($plan['token'] ?? null)
                || !hash_equals($plan['token'], $approvalToken)) {
                throw new RuntimeException('Installation plan is stale, blocked or has an invalid approval token; run --plan again');
            }
            $ownerUser = self::value($env, 'STAGE3_OWNER_USER');
            $ownerPassword = self::value($env, 'STAGE3_OWNER_PASSWORD');
            $instanceId = $repository->initializeEmptyDatabase('single-site');
            $repository->createOwner($ownerUser, $ownerPassword);
            $runtimeConfig = RuntimeConfig::write(dirname(__DIR__), $privateDir, (string)$plan['publicDocumentRoot'], $env);
            $databaseFingerprint = (string)$plan['dbFingerprint'];
            $receipt = [
                'format' => self::RECEIPT_FORMAT,
                'instanceId' => $instanceId,
                'instanceMode' => 'single-site',
                'dbDriver' => $plan['dbDriver'],
                'schemaVersion' => self::SCHEMA_VERSION,
                'databaseFingerprint' => $databaseFingerprint,
                'configPath' => $runtimeConfig['configPath'],
                'configSha256' => $runtimeConfig['configSha256'],
                'ownerUsername' => $ownerUser,
                'installedAt' => gmdate('Y-m-d\TH:i:s\Z')
            ];
            self::writeReceipt($privateDir . DIRECTORY_SEPARATOR . 'installation.json', $receipt);
            $verified = self::plan($db, $env);
            if (($verified['state'] ?? null) !== 'already_installed' || ($verified['instanceId'] ?? null) !== $instanceId) {
                throw new RuntimeException('Installation completed but its private receipt could not be verified');
            }
            return [
                'state' => 'installed',
                'instanceId' => $instanceId,
                'instanceMode' => 'single-site',
                'dbDriver' => $plan['dbDriver'],
                'receiptPath' => $privateDir . DIRECTORY_SEPARATOR . 'installation.json',
                'runtimeConfigReady' => true,
                'deploymentPerformed' => false
            ];
        } finally {
            if ($databaseLock !== null) {
                self::releaseDatabaseLock($db, $databaseLock);
            }
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /** Serialize installations by the actual database identity, not only by private receipt path. */
    private static function acquireDatabaseLock(PDO $db, array $env): array
    {
        $driver = (string)$db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $database = $db->query('SELECT DATABASE()')->fetchColumn();
            $host = $db->query('SELECT @@hostname')->fetchColumn();
            if (!is_string($database) || $database === '' || !is_string($host) || $host === '') {
                throw new RuntimeException('Cannot identify the dedicated MySQL database for installation locking');
            }
            $name = 'stage3-install-' . substr(hash('sha256', $host . "\n" . $database), 0, 48);
            $stmt = $db->prepare('SELECT GET_LOCK(?, 0)');
            $stmt->execute([$name]);
            if ((int)$stmt->fetchColumn() !== 1) {
                throw new RuntimeException('Another installer is already operating on this MySQL database');
            }
            return ['kind' => 'mysql', 'name' => $name];
        }
        if ($driver === 'sqlite') {
            $dsn = self::value($env, 'STAGE3_DSN');
            $path = str_starts_with($dsn, 'sqlite:') ? realpath(substr($dsn, 7)) : false;
            if (!is_string($path) || !is_file($path) || is_link($path)) {
                throw new RuntimeException('Cannot establish the private SQLite installation lock');
            }
            $lockPath = dirname($path) . DIRECTORY_SEPARATOR . '.stage3-install-' . substr(hash('sha256', $path), 0, 32) . '.lock';
            if (is_link($lockPath)) {
                throw new RuntimeException('SQLite installation lock must not be a symlink');
            }
            $handle = @fopen($lockPath, 'c+');
            if ($handle === false) {
                throw new RuntimeException('Unable to create the private SQLite installation lock');
            }
            if (!chmod($lockPath, 0600) || !flock($handle, LOCK_EX | LOCK_NB)) {
                fclose($handle);
                throw new RuntimeException('Another installer is already operating on this SQLite database');
            }
            return ['kind' => 'sqlite', 'handle' => $handle];
        }
        throw new RuntimeException('Unsupported database driver for installation lock');
    }

    private static function releaseDatabaseLock(PDO $db, array $lock): void
    {
        if (($lock['kind'] ?? null) === 'mysql') {
            try {
                $stmt = $db->prepare('SELECT RELEASE_LOCK(?)');
                $stmt->execute([$lock['name']]);
            } catch (Throwable) {
                // Preserve the original installation result; the connection close also releases GET_LOCK.
            }
            return;
        }
        if (($lock['kind'] ?? null) === 'sqlite' && is_resource($lock['handle'] ?? null)) {
            flock($lock['handle'], LOCK_UN);
            fclose($lock['handle']);
        }
    }

    private static function value(array $env, string $key): string
    {
        $value = $env[$key] ?? '';
        return is_string($value) ? trim($value) : '';
    }

    private static function isWithin(string $path, string $parent): bool
    {
        $parent = rtrim($parent, DIRECTORY_SEPARATOR);
        return $path === $parent || str_starts_with($path, $parent . DIRECTORY_SEPARATOR);
    }

    private static function readReceipt(string $path): ?array
    {
        if (is_link($path) || !is_file($path) || realpath($path) !== $path) {
            return null;
        }
        $permissions = fileperms($path);
        if ($permissions === false || (($permissions & 0077) !== 0)) {
            return null;
        }
        $value = json_decode((string)file_get_contents($path), true);
        if (!is_array($value) || ($value['format'] ?? null) !== self::RECEIPT_FORMAT
            || !is_string($value['instanceId'] ?? null) || strlen($value['instanceId']) !== 32) {
            return null;
        }
        return $value;
    }

    private static function writeReceipt(string $path, array $receipt): void
    {
        if (file_exists($path) || is_link($path)) {
            throw new RuntimeException('Installation receipt already exists; refusing to overwrite');
        }
        // Exclusive creation is atomic and does not depend on hard-link support on shared hosting.
        $handle = @fopen($path, 'x');
        if ($handle === false) {
            throw new RuntimeException('Unable to create private installation receipt without overwriting');
        }
        try {
            if (!chmod($path, 0600)) {
                throw new RuntimeException('Unable to secure private installation receipt permissions');
            }
            $json = json_encode($receipt, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL;
            if (fwrite($handle, $json) !== strlen($json) || !fflush($handle)) {
                throw new RuntimeException('Unable to write private installation receipt');
            }
            if (function_exists('fsync')) {
                fsync($handle);
            }
        } catch (Throwable $error) {
            fclose($handle);
            if (is_file($path)) {
                unlink($path);
            }
            throw $error;
        }
        fclose($handle);
    }
}
