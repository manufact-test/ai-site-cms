<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

use RuntimeException;

/**
 * Stage2 code-only INSTALLATION REHEARSAL in a new OS-temp directory.
 * No production root selection, hosting access, DB, rollback of site data or HTTP.
 * The expected manifest digest MUST originate from separately verified signed metadata.
 */
final class LabPackageStager
{
    private const PREFIX = 'ai-site-cms-php-install-lab-';
    private const FORMAT = 'ai-site-cms-php-install-lab-v1';
    private const MANIFEST = 'private/package-manifest.json';
    private string $root;

    private function __construct(string $root)
    {
        $this->root = $root;
        $this->assertLab();
    }

    public static function create(): self
    {
        self::requireLab();
        $tmp = realpath(sys_get_temp_dir());
        if ($tmp === false) throw new RuntimeException('Temporary directory unavailable');
        $root = $tmp . '/' . self::PREFIX . bin2hex(random_bytes(16));
        if (!mkdir($root, 0700)) throw new RuntimeException('Cannot create fresh CI lab');
        return new self($root);
    }

    public static function reopen(string $root): self
    {
        return new self($root);
    }

    public function root(): string { return $this->root; }

    private static function requireLab(bool $readOnly = false): void
    {
        $readOnlyHttp = $readOnly && PHP_SAPI === 'cli-server'
            && getenv('CMS_PHP_LAB_HTTP_ONLY') === '1';
        if (!(PHP_SAPI === 'cli' || $readOnlyHttp) || getenv('CI') !== 'true'
            || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
            throw new RuntimeException('Only explicit disposable CI installation rehearsal allowed');
        }
    }

    private function assertLab(): void
    {
        self::requireLab(true);
        $tmp = realpath(sys_get_temp_dir());
        if ($tmp === false || dirname($this->root) !== $tmp
            || !preg_match('/^' . preg_quote(self::PREFIX, '/') . '[a-f0-9]{32}$/D', basename($this->root))
            || is_link($this->root) || !is_dir($this->root)
            || realpath($this->root) !== $this->root) {
            throw new RuntimeException('Refusing non-disposable target or symlink');
        }
    }

    private function file(string $name): string { return $this->root . '/' . $name; }

    /**
     * Check every byte of an already EXTRACTED internal package against the caller's
     * independently authenticated manifest SHA-256. Read-only, no extraction.
     * @return array{manifestSha256:string,version:string,files:int,bytes:int}
     */
    public static function verifyPackage(string $source, string $expectedManifestSha256): array
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $expectedManifestSha256)) {
            throw new RuntimeException('Externally verified manifest digest required');
        }
        $src = realpath($source);
        if ($src === false || $src !== $source || is_link($src) || !is_dir($src)) {
            throw new RuntimeException('Unsafe package root');
        }
        $raw = self::strictFile($src . '/' . self::MANIFEST, 4 * 1024 * 1024);
        if (!hash_equals($expectedManifestSha256, hash('sha256', $raw))) {
            throw new RuntimeException('Package is not bound to expected signed digest');
        }
        try { $manifest = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
        catch (\JsonException $e) { throw new RuntimeException('Malformed release manifest', 0, $e); }
        if (!is_array($manifest) || ($manifest['format'] ?? null) !== 'ai-site-cms-internal-stage2-v2'
            || ($manifest['stage'] ?? null) !== 2 || ($manifest['productionReady'] ?? null) !== false
            || ($manifest['isSigned'] ?? null) !== false
            || ($manifest['writeEndpointsAvailable'] ?? null) !== false
            || ($manifest['documentRoot'] ?? null) !== 'public'
            || !is_string($manifest['releaseVersion'] ?? null)
            || !preg_match('/^0\.[0-9]{1,9}\.[0-9]{1,9}-stage2\.[0-9]{1,9}$/D', $manifest['releaseVersion'])
            || !is_array($manifest['files'] ?? null) || !array_is_list($manifest['files'])
            || count($manifest['files']) < 4 || count($manifest['files']) > 1000) {
            throw new RuntimeException('Internal-only release policy invalid');
        }
        $declared = [self::MANIFEST => true];
        foreach ($manifest['files'] as $record) {
            if (!is_array($record) || !is_string($record['path'] ?? null)) {
                throw new RuntimeException('Malformed inventory record');
            }
            self::relative($record['path']);
            $declared[$record['path']] = true;
        }
        // Validate the tree before reading listed payloads, and again afterward.
        self::scan($src, $declared);
        $listed = [self::MANIFEST => true];
        $folded = [strtolower(self::MANIFEST) => true];
        $bytes = 0;
        foreach ($manifest['files'] as $record) {
            if (array_keys($record) !== ['path', 'bytes', 'sha256']
                || !is_int($record['bytes']) || $record['bytes'] < 1
                || $record['bytes'] > 8 * 1024 * 1024
                || !is_string($record['sha256'])
                || !preg_match('/^[a-f0-9]{64}$/D', $record['sha256'])) {
                throw new RuntimeException('Invalid inventory fields');
            }
            $name = $record['path'];
            if (isset($listed[$name]) || isset($folded[strtolower($name)])) {
                throw new RuntimeException('Duplicate or case-colliding path');
            }
            $listed[$name] = true;
            $folded[strtolower($name)] = true;
            $payload = self::strictFile($src . '/' . $name, 8 * 1024 * 1024);
            if (strlen($payload) !== $record['bytes']
                || !hash_equals($record['sha256'], hash('sha256', $payload))) {
                throw new RuntimeException('Package integrity failed');
            }
            $bytes += strlen($payload);
            if ($bytes > 32 * 1024 * 1024) throw new RuntimeException('Oversized package');
        }
        foreach (['public/index.php', 'public/.htaccess', 'vendor/autoload.php', 'private/editor/editor.js'] as $required) {
            if (!isset($listed[$required])) throw new RuntimeException('Essential internal component missing');
        }
        self::scan($src, $listed);
        return ['manifestSha256'=>$expectedManifestSha256, 'version'=>$manifest['releaseVersion'],
            'files'=>count($manifest['files']), 'bytes'=>$bytes];
    }

    private static function relative(string $relative): void
    {
        if ($relative === '' || strlen($relative) > 240 || str_contains($relative, '\\')
            || str_contains($relative, "\0")) throw new RuntimeException('Unsafe relative path');
        foreach (explode('/', $relative) as $part) {
            if ($part === '' || $part === '.' || $part === '..'
                || !preg_match('/^[a-zA-Z0-9._-]+$/D', $part)
                || (preg_match('/^(?:\.env(?:\..*)?|\.git|\.ssh|\.htaccess|\.user\.ini)$/iD', $part)
                    && $relative !== 'public/.htaccess')) {
                throw new RuntimeException('Unsafe path component');
            }
        }
        if (str_starts_with($relative, 'public/')) {
            $ext = strtolower(pathinfo($relative, PATHINFO_EXTENSION));
            if (in_array($ext, ['php','phtml','phar','php5','php7','php8','cgi','pl'], true)
                && $relative !== 'public/index.php') {
                throw new RuntimeException('Unexpected public executable');
            }
        }
    }

    private static function strictFile(string $file, int $limit): string
    {
        $s = @lstat($file);
        if ($s === false || is_link($file) || !is_file($file) || ($s['nlink'] ?? 0) !== 1
            || $s['size'] < 1 || $s['size'] > $limit) {
            throw new RuntimeException('Unsafe package/journal file');
        }
        $bytes = @file_get_contents($file);
        if ($bytes === false || strlen($bytes) !== $s['size']) {
            throw new RuntimeException('Changed package during read');
        }
        return $bytes;
    }

    /** @param array<string,bool> $expected */
    private static function scan(string $root, array $expected): void
    {
        $stack = [[$root, '', 0]];
        $discovered = [];
        $count = 0;
        while ($stack) {
            [$dir, $prefix, $depth] = array_pop($stack);
            if ($depth > 14 || is_link($dir) || !is_dir($dir)) {
                throw new RuntimeException('Unsafe package directory');
            }
            $names = @scandir($dir);
            if ($names === false) throw new RuntimeException('Unreadable package tree');
            foreach ($names as $name) {
                if ($name === '.' || $name === '..') continue;
                if (++$count > 1800) throw new RuntimeException('Too many package nodes');
                $rel = $prefix . $name;
                self::relative($rel);
                $file = $dir . '/' . $name;
                if (is_link($file)) throw new RuntimeException('Symlink in package');
                if (is_dir($file)) $stack[] = [$file, $rel . '/', $depth + 1];
                elseif (is_file($file)) {
                    if (!isset($expected[$rel])) throw new RuntimeException('Unlisted package payload');
                    $discovered[$rel] = true;
                } else throw new RuntimeException('Nonregular package node');
            }
        }
        if (count($discovered) !== count($expected)) {
            throw new RuntimeException('Missing package inventory entry');
        }
    }

    /** @return array<string,mixed> */
    public function inspect(): array
    {
        $this->assertLab();
        $names = @scandir($this->root);
        if ($names === false) throw new RuntimeException('Unreadable operator root');
        $allowed = ['.', '..', 'install-intent.json', 'staging', 'code',
            'install-receipt.json', 'install-receipt.json.tmp'];
        foreach ($names as $name) {
            if (!in_array($name, $allowed, true)) throw new RuntimeException('Foreign operator state');
        }
        if (file_exists($this->file('install-receipt.json.tmp'))
            || is_link($this->file('install-receipt.json.tmp'))) {
            throw new RuntimeException('Interrupted receipt write');
        }
        $intent = $this->jsonOrNull('install-intent.json');
        $receipt = $this->jsonOrNull('install-receipt.json');
        $code = $this->file('code');
        $staging = $this->file('staging');
        foreach ([$code, $staging] as $dir) {
            if (is_link($dir) || (file_exists($dir) && !is_dir($dir))) {
                throw new RuntimeException('Unsafe installation node');
            }
        }
        if ($intent !== null) {
            self::exact($intent);
            if ($intent['format'] !== self::FORMAT
                || !is_string($intent['manifestSha256'])
                || !preg_match('/^[a-f0-9]{64}$/D', $intent['manifestSha256'])
                || !is_string($intent['version'])) throw new RuntimeException('Invalid install intent');
            if (is_dir($code)) {
                $verified = self::verifyPackage($code, $intent['manifestSha256']);
                if ($verified['version'] !== $intent['version'] || is_dir($staging)) {
                    throw new RuntimeException('Committed code/journal mismatch');
                }
                if ($receipt !== null) {
                    $this->receiptMatches($receipt, $verified);
                    return $this->status('committed-needs-cleanup');
                }
                return $this->status('pending-after-rename');
            }
            if ($receipt !== null) throw new RuntimeException('Receipt without installed code');
            return $this->status('pending-before-rename');
        }
        if (is_dir($staging)) throw new RuntimeException('Orphan staging directory');
        if (is_dir($code) || $receipt !== null) {
            if (!is_dir($code) || $receipt === null) throw new RuntimeException('Orphan code/receipt');
            self::exact($receipt);
            $verified = self::verifyPackage($code, $receipt['manifestSha256']);
            $this->receiptMatches($receipt, $verified);
            return $this->status('installed');
        }
        return $this->status('empty');
    }

    /** @return array<string,mixed>|null */
    private function jsonOrNull(string $name): ?array
    {
        $file = $this->file($name);
        if (!file_exists($file) && !is_link($file)) return null;
        try { $obj = json_decode(self::strictFile($file, 4096), true, 16, JSON_THROW_ON_ERROR); }
        catch (\JsonException $e) { throw new RuntimeException('Bad operator JSON', 0, $e); }
        if (!is_array($obj)) throw new RuntimeException('Operator state must be an object');
        return $obj;
    }

    private static function exact(array $record): void
    {
        if (array_keys($record) !== ['format', 'manifestSha256', 'version']) {
            throw new RuntimeException('Noncanonical operator record');
        }
    }

    private function receiptMatches(array $receipt, array $verified): void
    {
        self::exact($receipt);
        if ($receipt['format'] !== self::FORMAT
            || $receipt['manifestSha256'] !== $verified['manifestSha256']
            || $receipt['version'] !== $verified['version']) {
            throw new RuntimeException('Invalid release receipt');
        }
    }

    /** @return array<string,bool|string> */
    private function status(string $status): array
    {
        return ['format'=>self::FORMAT, 'status'=>$status, 'ready'=>$status==='installed',
            'productionReady'=>false, 'hostTested'=>false, 'databaseChanged'=>false,
            'publicHttpServed'=>false];
    }

    public function stage(string $source, string $trustedManifestSha256, ?string $failAt = null): array
    {
        self::requireLab();
        if ($this->inspect()['status'] !== 'empty') {
            throw new RuntimeException('Existing/unresolved installation cannot be overwritten');
        }
        $verified = self::verifyPackage($source, $trustedManifestSha256);
        $intent = ['format'=>self::FORMAT,
            'manifestSha256'=>$trustedManifestSha256, 'version'=>$verified['version']];
        $this->writeNew('install-intent.json', $intent);
        if ($failAt === 'after-intent') throw new RuntimeException('Injected interruption after intent');
        $this->copyTree($source, $this->file('staging'));
        if ($failAt === 'after-copy') throw new RuntimeException('Injected interruption after copy');
        self::verifyPackage($this->file('staging'), $trustedManifestSha256);
        rename($this->file('staging'), $this->file('code'));
        if ($failAt === 'after-rename') throw new RuntimeException('Injected interruption after rename');
        $this->receiptWrite($intent);
        if ($failAt === 'after-receipt') throw new RuntimeException('Injected interruption after receipt');
        unlink($this->file('install-intent.json'));
        return $this->inspect();
    }

    public function recover(string $mode): array
    {
        self::requireLab();
        $status = $this->inspect()['status'];
        if ($status === 'pending-before-rename' && $mode === 'abort') {
            if (is_dir($this->file('staging'))) {
                $this->removeStage($this->file('staging'), 0);
            }
            unlink($this->file('install-intent.json'));
        } elseif (in_array($status, ['pending-after-rename', 'committed-needs-cleanup'], true)
            && $mode === 'finalize') {
            $intent = $this->jsonOrNull('install-intent.json');
            if ($intent === null) throw new RuntimeException('Installation intent missing');
            $verified = self::verifyPackage($this->file('code'), $intent['manifestSha256']);
            if ($verified['version'] !== $intent['version']) throw new RuntimeException('Wrong committed code');
            if ($status === 'pending-after-rename') $this->receiptWrite($intent);
            unlink($this->file('install-intent.json'));
        } else throw new RuntimeException('Wrong recovery mode; no automatic rollback');
        return $this->inspect();
    }

    private function writeNew(string $name, array $data): void
    {
        $fh = @fopen($this->file($name), 'x');
        if ($fh === false) throw new RuntimeException('Operator file must not exist already');
        try {
            fwrite($fh, json_encode($data, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n");
            fflush($fh);
        } finally { fclose($fh); }
    }

    private function receiptWrite(array $receipt): void
    {
        $this->writeNew('install-receipt.json.tmp', $receipt);
        rename($this->file('install-receipt.json.tmp'), $this->file('install-receipt.json'));
    }

    private function copyTree(string $source, string $target): void
    {
        if (!mkdir($target, 0700)) throw new RuntimeException('Cannot create private stage');
        $stack = [[$source, $target, 0]];
        while ($stack) {
            [$src, $dest, $depth] = array_pop($stack);
            if ($depth > 14 || is_link($src)) throw new RuntimeException('Unsafe source during copy');
            $names = scandir($src);
            if ($names === false) throw new RuntimeException('Source directory unavailable');
            foreach ($names as $name) {
                if ($name === '.' || $name === '..') continue;
                $from = $src . '/' . $name;
                $to = $dest . '/' . $name;
                if (is_link($from)) throw new RuntimeException('Source changed during copy');
                if (is_dir($from)) {
                    if (!mkdir($to, 0700)) throw new RuntimeException('Stage directory creation failed');
                    $stack[] = [$from, $to, $depth + 1];
                } elseif (is_file($from)) {
                    $payload = self::strictFile($from, 8 * 1024 * 1024);
                    $fd = @fopen($to, 'x');
                    if ($fd === false) throw new RuntimeException('Refusing stage overwrite');
                    try { fwrite($fd, $payload); fflush($fd); }
                    finally { fclose($fd); }
                    chmod($to, 0600);
                } else throw new RuntimeException('Special source node');
            }
        }
    }

    private function removeStage(string $dir, int $depth): void
    {
        $this->assertLab();
        if ($depth === 0 && $dir !== $this->file('staging')) {
            throw new RuntimeException('Refusing deletion outside disposable staging');
        }
        if ($depth > 14 || is_link($dir) || !is_dir($dir)) {
            throw new RuntimeException('Cannot remove hostile staging tree');
        }
        $names = scandir($dir);
        if ($names === false) throw new RuntimeException('Cannot list stage for abort');
        foreach ($names as $name) {
            if ($name === '.' || $name === '..') continue;
            $item = $dir . '/' . $name;
            if (is_link($item)) throw new RuntimeException('Hostile stage symlink');
            if (is_dir($item)) $this->removeStage($item, $depth + 1);
            elseif (is_file($item) && (lstat($item)['nlink'] ?? 0) === 1) unlink($item);
            else throw new RuntimeException('Unexpected node during abort');
        }
        rmdir($dir);
    }
}
