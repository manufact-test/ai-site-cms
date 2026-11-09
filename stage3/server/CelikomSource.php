<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use InvalidArgumentException;
use RuntimeException;

/** Owner-controlled, source-preserving CELIKOM pilot. No arbitrary HTML upload. */
final class CelikomSource
{
    public const SOURCE_SHA256 = 'f998e96ccc9393dfe958a51d144be10d5fb1f1d068721d163ff40048077104aa';
    // Second genuine owner-uploaded CELIKOM capture (2026-11-08); original ZIP bytes remain unchanged.
    public const SOURCE_SHA256_OWNER_V2 = 'f3ed9d1bdfeb4ddce1a94370b6f0f3675de2a505e527aa991cfa0a04e0f25001';
    private const FORMAT = 'manufact-celikom-preserved-source-v1';
    private string $root;
    private array $manifest;
    private string $template;

    public static function configured(): ?self
    {
        $path = getenv('STAGE3_CELIKOM_SOURCE_DIR');
        if (!is_string($path) || $path === '') return null;
        return new self($path);
    }

    /** $expectedHash is injectable only by local CLI tests, never through HTTP. */
    public function __construct(string $path, string $expectedHash = self::SOURCE_SHA256)
    {
        $root = realpath($path);
        if (!is_string($root) || !is_dir($root) || is_link($path)
            || !str_starts_with($root, DIRECTORY_SEPARATOR)) {
            throw new RuntimeException('CELIKOM source is not a real private directory');
        }
        $docroot = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
        if ($docroot !== false && ($root === $docroot || str_starts_with($root, $docroot . DIRECTORY_SEPARATOR))) {
            throw new RuntimeException('CELIKOM source must not be inside the public document root');
        }
        $this->root = $root;
        $raw = $this->read('manifest.json', 500000);
        $manifest = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($manifest) || ($manifest['format'] ?? null) !== self::FORMAT
            || !in_array((string)($manifest['source_zip_sha256'] ?? ''),
                $expectedHash === self::SOURCE_SHA256
                    ? [self::SOURCE_SHA256, self::SOURCE_SHA256_OWNER_V2]
                    : [$expectedHash], true)
            || !preg_match('/^[a-f0-9]{64}$/D', (string)($manifest['template_sha256'] ?? ''))
            || !is_array($manifest['fields'] ?? null) || count($manifest['fields']) !== 99
            || !is_array($manifest['assets'] ?? null) || count($manifest['assets']) > 100) {
            throw new InvalidArgumentException('Invalid approved CELIKOM source manifest');
        }
        if (!hash_equals((string)$manifest['source_zip_sha256'],
                hash('sha256', $this->read('source-archive.zip', 41943040)))) {
            throw new RuntimeException('Original CELIKOM ZIP does not match owner-approved SHA-256');
        }
        $this->template = $this->read('template.html', 1000000);
        if (!hash_equals($manifest['template_sha256'], hash('sha256', $this->template))) {
            throw new RuntimeException('CELIKOM template integrity mismatch');
        }
        foreach ($manifest['fields'] as $key => $meta) {
            if (!is_string($key) || !preg_match('/^[a-z0-9][a-z0-9.\-]{2,120}$/D', $key)
                || !is_array($meta) || !is_int($meta['max'] ?? null)
                || $meta['max'] < 1 || $meta['max'] > 3000) {
                throw new InvalidArgumentException('Invalid CELIKOM editable field');
            }
            $marker = '{{CELIKOM:' . $key . '}}';
            if (substr_count($this->template, $marker) !== 1) {
                throw new RuntimeException('Missing or repeated CELIKOM content marker ' . $key);
            }
        }
        foreach ($manifest['assets'] as $asset => $meta) {
            if (!is_string($asset) || !preg_match('~^[a-zA-Z0-9._/-]{1,180}$~D', $asset)
                || str_contains($asset, '..') || str_starts_with($asset, '/')
                || !is_array($meta) || !preg_match('/^[a-f0-9]{64}$/D', (string)($meta['sha256'] ?? ''))
                || !in_array(($meta['mime'] ?? null), self::mimeTypes(), true)) {
                throw new InvalidArgumentException('Invalid CELIKOM static asset');
            }
            // Verify all immutable byte hashes, not simply the HTML manifest.
            $bytes = $this->read('assets/' . $asset, 10000000);
            if (!hash_equals($meta['sha256'], hash('sha256', $bytes))) {
                throw new RuntimeException('CELIKOM asset integrity mismatch: ' . $asset);
            }
        }
        // Original Manrope is included only in the private derivative, together
        // with its complete OFL notice. Old owner ZIPs with no fonts still load.
        $expectedFonts = [
            'fonts/manrope-cyrillic-ext-wght-normal.woff2',
            'fonts/manrope-cyrillic-wght-normal.woff2',
            'fonts/manrope-latin-ext-wght-normal.woff2',
            'fonts/manrope-latin-wght-normal.woff2',
        ];
        $foundFonts = array_values(array_filter(
            array_keys($manifest['assets']),
            static fn(string $name): bool => str_starts_with($name, 'fonts/manrope-')
        ));
        if ($foundFonts !== [] || !empty($manifest['manrope_license_sha256'])) {
            sort($foundFonts);
            sort($expectedFonts);
            if ($foundFonts !== $expectedFonts
                || !preg_match('/^[a-f0-9]{64}$/D', (string)($manifest['manrope_license_sha256'] ?? ''))
                || !hash_equals((string)$manifest['manrope_license_sha256'],
                    hash('sha256', $this->read('licenses/OFL-Manrope.txt', 100000)))) {
                throw new RuntimeException('CELIKOM Manrope license or font subset integrity mismatch');
            }
        }
        $this->manifest = $manifest;
        $this->validateState($this->loadState());
    }

    private static function mimeTypes(): array
    {
        return ['text/css', 'text/javascript', 'image/svg+xml', 'image/png',
            'image/jpeg', 'image/webp', 'font/woff2', 'audio/mpeg', 'audio/ogg', 'audio/wav'];
    }

    private function read(string $rel, int $maxBytes): string
    {
        $path = $this->root . '/' . $rel;
        $resolved = realpath($path);
        if (!is_string($resolved) || !str_starts_with($resolved, $this->root . DIRECTORY_SEPARATOR)
            || !is_file($resolved) || is_link($path) || filesize($resolved) > $maxBytes) {
            throw new RuntimeException('Unsafe or missing CELIKOM private file');
        }
        $bytes = file_get_contents($resolved);
        if (!is_string($bytes)) throw new RuntimeException('CELIKOM file unavailable');
        return $bytes;
    }

    private function loadState(): array
    {
        $decoded = json_decode($this->read('state.json', 1200000), true, 64, JSON_THROW_ON_ERROR);
        if (!is_array($decoded)) throw new RuntimeException('Invalid CELIKOM state');
        return $decoded;
    }

    private function validateFields(mixed $fields): array
    {
        if (!is_array($fields) || count($fields) !== 99
            || array_diff_key($fields, $this->manifest['fields'])
            || array_diff_key($this->manifest['fields'], $fields)) {
            throw new InvalidArgumentException('Unknown, missing or duplicate CELIKOM field');
        }
        foreach ($this->manifest['fields'] as $key => $meta) {
            $value = $fields[$key];
            if (!is_string($value) || trim($value) === '' || str_contains($value, "\0")
                || preg_match('//u',$value)!==1 || preg_match_all('/./us', $value) > $meta['max']) {
                throw new InvalidArgumentException('Invalid CELIKOM field: ' . $key);
            }
        }
        return $fields;
    }

    private function validateState(array $state): void
    {
        if (($state['format'] ?? null) !== self::FORMAT || !is_int($state['revision'] ?? null)
            || $state['revision'] < 1 || !is_array($state['revisions'] ?? null)
            || !is_array($state['releases'] ?? null)) {
            throw new RuntimeException('Invalid CELIKOM revision state');
        }
        if (!isset($state['revisions'][(string)$state['revision']])) {
            throw new RuntimeException('Current CELIKOM revision missing');
        }
        foreach ($state['revisions'] as $fields) $this->validateFields($fields);
        foreach ($state['releases'] as $release) {
            if (!is_array($release) || !is_int($release['sourceRevision'] ?? null))
                throw new RuntimeException('Invalid CELIKOM release');
            $this->validateFields($release['fields'] ?? null);
        }
    }

    public function snapshot(): array
    {
        $s = $this->loadState();
        $this->validateState($s);
        return [
            'format' => self::FORMAT, 'revision' => $s['revision'],
            'fields' => $s['revisions'][(string)$s['revision']],
            'keys' => $this->manifest['fields'],
            'revisions' => array_map('intval', array_keys($s['revisions'])),
            'releases' => array_map(static fn($v, $k): array => [
                'version' => (int)$k, 'sourceRevision' => $v['sourceRevision']
            ], $s['releases'], array_keys($s['releases'])),
            'sourceSha256' => $this->manifest['source_zip_sha256'],
            'publicConfigured' => self::publicHostConfigured(),
            'incompleteAssets' => $this->manifest['missing_assets'] ?? []
        ];
    }

    public function html(?array $fields = null, ?int $release = null): string
    {
        $state = $this->loadState();
        $this->validateState($state);
        if ($release !== null) {
            $record = $state['releases'][(string)$release] ?? null;
            if ($record === null) throw new NotFound('Unknown CELIKOM release');
            $fields = $record['fields'];
        }
        $fields ??= $state['revisions'][(string)$state['revision']];
        $fields = $this->validateFields($fields);
        $map = [];
        foreach ($fields as $key => $value) {
            $map['{{CELIKOM:' . $key . '}}'] = htmlspecialchars($value,
                ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
        }
        return strtr($this->template, $map);
    }

    public function asset(string $name): array
    {
        $meta = $this->manifest['assets'][$name] ?? null;
        if (!is_array($meta)) throw new NotFound('Unknown CELIKOM asset');
        return ['mime' => $meta['mime'], 'bytes' => $this->read('assets/' . $name, 10000000),
            'sha256' => $meta['sha256']];
    }

    private function modify(callable $operation): array
    {
        $lock = fopen($this->root . '/state.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX)) throw new RuntimeException('CELIKOM state lock unavailable');
        try {
            $s = $this->loadState();
            $this->validateState($s);
            $result = $operation($s);
            $this->validateState($s);
            $data = json_encode($s, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
            if (strlen($data) > 1200000) throw new RuntimeException('CELIKOM state limit exceeded');
            $tmp = tempnam($this->root, '.state-');
            if ($tmp === false) throw new RuntimeException('Cannot write CELIKOM state');
            try {
                if (file_put_contents($tmp, $data, LOCK_EX) !== strlen($data)
                    || !chmod($tmp, 0600) || !rename($tmp, $this->root . '/state.json')) {
                    throw new RuntimeException('Cannot atomically replace CELIKOM state');
                }
            } finally { if (is_file($tmp)) unlink($tmp); }
            return $result;
        } finally {
            flock($lock, LOCK_UN); fclose($lock);
        }
    }

    public function save(array $fields, int $expected): array
    {
        $fields = $this->validateFields($fields);
        return $this->modify(function (array &$s) use ($fields, $expected): array {
            if ($expected !== $s['revision']) throw new Conflict('Stale CELIKOM draft');
            $s['revision']++;
            $s['revisions'][(string)$s['revision']] = $fields;
            return ['revision' => $s['revision'], 'fields' => $fields];
        });
    }

    public function restore(int $target, int $expected): array
    {
        return $this->modify(function (array &$s) use ($target, $expected): array {
            if ($expected !== $s['revision']) throw new Conflict('Stale CELIKOM draft');
            if (!isset($s['revisions'][(string)$target])) throw new NotFound('Unknown CELIKOM revision');
            $s['revision']++;
            $s['revisions'][(string)$s['revision']] = $s['revisions'][(string)$target];
            return ['revision' => $s['revision'], 'restoredRevision' => $target];
        });
    }

    public function restoreRelease(int $target, int $expected): array
    {
        return $this->modify(function (array &$s) use ($target, $expected): array {
            if ($expected !== $s['revision']) throw new Conflict('Stale CELIKOM draft');
            if (!isset($s['releases'][(string)$target])) throw new NotFound('Unknown CELIKOM release');
            $s['revision']++;
            $s['revisions'][(string)$s['revision']] = $s['releases'][(string)$target]['fields'];
            return ['revision' => $s['revision'], 'restoredRelease' => $target];
        });
    }

    public function publish(int $expected): array
    {
        return $this->modify(function (array &$s) use ($expected): array {
            if ($expected !== $s['revision']) throw new Conflict('Stale CELIKOM draft');
            $version = count($s['releases']) + 1;
            $s['releases'][(string)$version] = [
                'sourceRevision' => $expected,
                'fields' => $s['revisions'][(string)$expected]
            ];
            return ['version' => $version, 'sourceRevision' => $expected,
                'publicConfigured' => self::publicHostConfigured()];
        });
    }

    public function currentReleaseVersion(): ?int
    {
        $state = $this->loadState();
        return $state['releases'] === [] ? null : (int)array_key_last($state['releases']);
    }

    /** JS may not share a CMS session origin. Public host must be independently configured. */
    public static function publicHostConfigured(): bool
    {
        $public = strtolower(trim((string)(getenv('STAGE3_CELIKOM_PUBLIC_HOST') ?: '')));
        $studio = strtolower(trim((string)(getenv('STAGE3_CMS_HOST') ?: '')));
        return $public !== '' && $studio !== '' && $public !== $studio;
    }

    public static function publicHostAllowed(): bool
    {
        $current = strtolower(trim((string)($_SERVER['HTTP_HOST'] ?? '')));
        return self::publicHostConfigured() && $current === strtolower((string)getenv('STAGE3_CELIKOM_PUBLIC_HOST'));
    }
}