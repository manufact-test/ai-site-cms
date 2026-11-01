<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use RuntimeException;

/**
 * Private runtime configuration for one independently installed CMS instance.
 * The pointer lives beside server code; the credential-bearing JSON lives in a
 * 0700 directory outside the public document root.
 */
final class RuntimeConfig
{
    private const POINTER_FORMAT = 'manufact-stage3-private-config-pointer-v1';
    private const CONFIG_FORMAT = 'manufact-stage3-private-config-v1';
    private const VALUE_KEYS = [
        'STAGE3_DSN',
        'STAGE3_DB_USER',
        'STAGE3_DB_PASSWORD',
        'STAGE3_FORM_SECRET',
        'STAGE3_FORM_ORIGINS',
        'STAGE3_FORM_ENDPOINT',
        'STAGE3_PRIVATE_DIR',
        'STAGE3_PUBLIC_ROOT'
    ];

    public static function load(string $serverRoot): void
    {
        $serverRoot = realpath($serverRoot);
        if (!is_string($serverRoot) || !is_dir($serverRoot) || is_link($serverRoot)) {
            throw new RuntimeException('Stage3 server root is unavailable');
        }
        $pointerPath = $serverRoot . DIRECTORY_SEPARATOR . 'private-config-path.json';
        if (!file_exists($pointerPath) && !is_link($pointerPath)) {
            return;
        }

        $pointer = self::readJson($pointerPath, 8192);
        self::assertKeys($pointer, ['format', 'configPath', 'configSha256']);
        if (($pointer['format'] ?? null) !== self::POINTER_FORMAT
            || !is_string($pointer['configPath'] ?? null)
            || !preg_match('/^[a-f0-9]{64}$/D', is_string($pointer['configSha256'] ?? null) ? $pointer['configSha256'] : '')) {
            throw new RuntimeException('Stage3 private configuration pointer is invalid');
        }
        $configPath = $pointer['configPath'];
        if (basename($configPath) !== 'config.json') {
            throw new RuntimeException('Stage3 private configuration path is invalid');
        }
        $privateDir = dirname($configPath);
        $config = self::readConfig($configPath);
        $publicRoot = $config['STAGE3_PUBLIC_ROOT'];
        $verified = self::inspect($serverRoot, $privateDir, $publicRoot);
        if ($verified === null || !hash_equals($pointer['configSha256'], $verified['configSha256'])) {
            throw new RuntimeException('Stage3 private configuration integrity check failed');
        }

        foreach ($verified['values'] as $key => $value) {
            putenv($key . '=' . $value);
            $_ENV[$key] = $value;
            $_SERVER[$key] = $value;
        }
    }

    /**
     * @return array{configPath:string,configSha256:string,values:array<string,string>}|null
     */
    public static function inspect(string $serverRoot, string $privateDir, string $publicRoot): ?array
    {
        $serverRoot = realpath($serverRoot);
        $privateDir = realpath($privateDir);
        $publicRoot = realpath($publicRoot);
        if (!is_string($serverRoot) || !is_dir($serverRoot)
            || !is_string($privateDir) || !is_dir($privateDir)
            || !is_string($publicRoot) || !is_dir($publicRoot)) {
            throw new RuntimeException('Stage3 private configuration directories are unavailable');
        }
        $privateMode = fileperms($privateDir);
        if ($privateMode === false || (($privateMode & 0077) !== 0)
            || self::isWithin($privateDir, $publicRoot) || self::isWithin($publicRoot, $privateDir)) {
            throw new RuntimeException('Stage3 private configuration directory is not isolated');
        }

        $pointerPath = $serverRoot . DIRECTORY_SEPARATOR . 'private-config-path.json';
        $configPath = $privateDir . DIRECTORY_SEPARATOR . 'config.json';
        $pointerExists = file_exists($pointerPath) || is_link($pointerPath);
        $configExists = file_exists($configPath) || is_link($configPath);
        if (!$pointerExists && !$configExists) {
            return null;
        }
        if (!$pointerExists || !$configExists) {
            throw new RuntimeException('Stage3 private configuration is incomplete');
        }
        if (self::isWithin($pointerPath, $publicRoot)) {
            throw new RuntimeException('Stage3 configuration pointer must remain outside the public document root');
        }

        $pointer = self::readJson($pointerPath, 8192);
        self::assertKeys($pointer, ['format', 'configPath', 'configSha256']);
        if (($pointer['format'] ?? null) !== self::POINTER_FORMAT
            || ($pointer['configPath'] ?? null) !== $configPath
            || !preg_match('/^[a-f0-9]{64}$/D', is_string($pointer['configSha256'] ?? null) ? $pointer['configSha256'] : '')) {
            throw new RuntimeException('Stage3 private configuration pointer does not match this installation');
        }

        $configRaw = self::readRaw($configPath, 16384);
        $configHash = hash('sha256', $configRaw);
        if (!hash_equals($pointer['configSha256'], $configHash)) {
            throw new RuntimeException('Stage3 private configuration checksum mismatch');
        }
        $document = self::decodeCanonical($configRaw);
        self::assertKeys($document, ['format', 'values']);
        if (($document['format'] ?? null) !== self::CONFIG_FORMAT || !is_array($document['values'] ?? null)) {
            throw new RuntimeException('Stage3 private configuration document is invalid');
        }
        $values = $document['values'];
        self::assertKeys($values, self::VALUE_KEYS);
        foreach ($values as $key => $value) {
            if (!is_string($value) || strlen($value) > self::valueLimit($key)
                || str_contains($value, "\0") || str_contains($value, "\r") || str_contains($value, "\n")) {
                throw new RuntimeException('Stage3 private configuration contains an invalid value');
            }
        }
        if ($values['STAGE3_PRIVATE_DIR'] !== $privateDir
            || $values['STAGE3_PUBLIC_ROOT'] !== $publicRoot
            || !preg_match('/^(sqlite:|mysql:)/', $values['STAGE3_DSN'])
            || strlen($values['STAGE3_FORM_SECRET']) < 32
            || self::isWithin($configPath, $publicRoot)) {
            throw new RuntimeException('Stage3 private configuration does not match the isolated installation');
        }
        if (str_starts_with($values['STAGE3_DSN'], 'mysql:') && $values['STAGE3_DB_USER'] === '') {
            throw new RuntimeException('Stage3 MySQL runtime configuration has no database user');
        }

        return [
            'configPath' => $configPath,
            'configSha256' => $configHash,
            'values' => $values
        ];
    }

    /** @return array{configPath:string,configSha256:string,values:array<string,string>} */
    public static function write(string $serverRoot, string $privateDir, string $publicRoot, array $env): array
    {
        $serverRoot = realpath($serverRoot);
        $privateDir = realpath($privateDir);
        $publicRoot = realpath($publicRoot);
        if (!is_string($serverRoot) || !is_dir($serverRoot)
            || !is_string($privateDir) || !is_dir($privateDir)
            || !is_string($publicRoot) || !is_dir($publicRoot)) {
            throw new RuntimeException('Stage3 installation configuration paths are unavailable');
        }
        $privatePermissions = fileperms($privateDir);
        if ($privatePermissions === false || (($privatePermissions & 0077) !== 0)
            || self::isWithin($privateDir, $publicRoot) || self::isWithin($publicRoot, $privateDir)) {
            throw new RuntimeException('Stage3 private configuration directory is not isolated');
        }
        $values = [];
        foreach (self::VALUE_KEYS as $key) {
            $value = $env[$key] ?? '';
            if (!is_string($value)) {
                throw new RuntimeException('Stage3 installation configuration contains an invalid value');
            }
            $value = trim($value);
            if (strlen($value) > self::valueLimit($key)
                || str_contains($value, "\0") || str_contains($value, "\r") || str_contains($value, "\n")) {
                throw new RuntimeException('Stage3 installation configuration contains an invalid value');
            }
            $values[$key] = $value;
        }
        if ($values['STAGE3_PRIVATE_DIR'] !== $privateDir
            || $values['STAGE3_PUBLIC_ROOT'] !== $publicRoot
            || !preg_match('/^(sqlite:|mysql:)/', $values['STAGE3_DSN'])
            || strlen($values['STAGE3_FORM_SECRET']) < 32
            || (str_starts_with($values['STAGE3_DSN'], 'mysql:') && $values['STAGE3_DB_USER'] === '')
            || self::isWithin($privateDir, $publicRoot) || self::isWithin($publicRoot, $privateDir)) {
            throw new RuntimeException('Stage3 installation configuration is not safely isolated');
        }

        $pointerPath = $serverRoot . DIRECTORY_SEPARATOR . 'private-config-path.json';
        $configPath = $privateDir . DIRECTORY_SEPARATOR . 'config.json';
        if (file_exists($pointerPath) || is_link($pointerPath)
            || file_exists($configPath) || is_link($configPath)
            || self::isWithin($pointerPath, $publicRoot)
            || self::isWithin($configPath, $publicRoot)) {
            throw new RuntimeException('Stage3 private configuration already exists or is publicly reachable');
        }

        $configRaw = self::canonicalJson(['format' => self::CONFIG_FORMAT, 'values' => $values]);
        self::writeFresh($configPath, $configRaw);
        $configHash = hash('sha256', $configRaw);
        $pointerRaw = self::canonicalJson([
            'format' => self::POINTER_FORMAT,
            'configPath' => $configPath,
            'configSha256' => $configHash
        ]);
        try {
            self::writeFresh($pointerPath, $pointerRaw);
        } catch (\Throwable $error) {
            if (is_file($configPath) && !is_link($configPath)) {
                unlink($configPath);
            }
            throw $error;
        }

        return ['configPath' => $configPath, 'configSha256' => $configHash, 'values' => $values];
    }

    private static function valueLimit(string $key): int
    {
        return match ($key) {
            'STAGE3_DSN', 'STAGE3_FORM_ENDPOINT' => 2048,
            'STAGE3_DB_USER' => 256,
            'STAGE3_DB_PASSWORD' => 4096,
            'STAGE3_FORM_SECRET' => 1024,
            'STAGE3_FORM_ORIGINS' => 4096,
            'STAGE3_PRIVATE_DIR', 'STAGE3_PUBLIC_ROOT' => 4096,
            default => 0
        };
    }

    private static function readConfig(string $path): array
    {
        $raw = self::readRaw($path, 16384);
        $document = self::decodeCanonical($raw);
        self::assertKeys($document, ['format', 'values']);
        if (($document['format'] ?? null) !== self::CONFIG_FORMAT || !is_array($document['values'] ?? null)) {
            throw new RuntimeException('Stage3 private configuration document is invalid');
        }
        self::assertKeys($document['values'], self::VALUE_KEYS);
        foreach ($document['values'] as $key => $value) {
            if (!is_string($value) || strlen($value) > self::valueLimit($key)
                || str_contains($value, "\0") || str_contains($value, "\r") || str_contains($value, "\n")) {
                throw new RuntimeException('Stage3 private configuration contains an invalid value');
            }
        }
        return $document['values'];
    }

    private static function readJson(string $path, int $limit): array
    {
        $raw = self::readRaw($path, $limit);
        $value = self::decodeCanonical($raw);
        if (!is_array($value)) {
            throw new RuntimeException('Stage3 private configuration JSON is invalid');
        }
        return $value;
    }

    private static function readRaw(string $path, int $limit): string
    {
        $stat = @lstat($path);
        $permissions = is_file($path) ? @fileperms($path) : false;
        if ($stat === false || !is_file($path) || is_link($path)
            || realpath($path) !== $path || ($stat['nlink'] ?? 0) !== 1
            || $stat['size'] < 1 || $stat['size'] > $limit
            || $permissions === false || (($permissions & 0077) !== 0)) {
            throw new RuntimeException('Unsafe Stage3 private configuration file');
        }
        $raw = @file_get_contents($path);
        if (!is_string($raw) || strlen($raw) !== $stat['size']) {
            throw new RuntimeException('Cannot read Stage3 private configuration file');
        }
        return $raw;
    }

    private static function decodeCanonical(string $raw): mixed
    {
        try {
            $value = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        } catch (\JsonException $error) {
            throw new RuntimeException('Stage3 private configuration JSON is malformed', 0, $error);
        }
        if (!hash_equals(self::canonicalJson($value), $raw)) {
            throw new RuntimeException('Stage3 private configuration JSON is not canonical');
        }
        return $value;
    }

    private static function canonicalJson(mixed $value): string
    {
        return json_encode(
            $value,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
        ) . PHP_EOL;
    }

    private static function assertKeys(array $value, array $expected): void
    {
        if (array_keys($value) !== $expected) {
            throw new RuntimeException('Stage3 private configuration fields are not canonical');
        }
    }

    private static function writeFresh(string $path, string $raw): void
    {
        if (file_exists($path) || is_link($path)) {
            throw new RuntimeException('Refusing to overwrite Stage3 private configuration');
        }
        $handle = @fopen($path, 'x');
        if ($handle === false) {
            throw new RuntimeException('Unable to create Stage3 private configuration');
        }
        try {
            if (!chmod($path, 0600)) {
                throw new RuntimeException('Unable to secure Stage3 private configuration permissions');
            }
            if (fwrite($handle, $raw) !== strlen($raw) || !fflush($handle)) {
                throw new RuntimeException('Unable to write Stage3 private configuration');
            }
            if (function_exists('fsync')) {
                fsync($handle);
            }
        } catch (\Throwable $error) {
            fclose($handle);
            if (is_file($path) && !is_link($path)) {
                unlink($path);
            }
            throw $error;
        }
        fclose($handle);
    }

    private static function isWithin(string $path, string $parent): bool
    {
        $parent = rtrim($parent, DIRECTORY_SEPARATOR);
        return $path === $parent || str_starts_with($path, $parent . DIRECTORY_SEPARATOR);
    }
}
