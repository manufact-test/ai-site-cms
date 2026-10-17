<?php
/* Stage 1 research ONLY. Tiny PHP reader/validator to compare with upstream Opis.
 * No public CMS API, no auth; do not deploy this research harness as-is. */
declare(strict_types=1);

function stage1HeroValid(mixed $data): bool
{
    if (!is_object($data)) return false;
    $keys = array_keys(get_object_vars($data));
    sort($keys);
    if ($keys !== ['accent', 'cta', 'fontSize', 'title']) return false;
    // JSON Schema maxLength counts Unicode code points; PCRE /u avoids ext-mbstring dependency.
    if (!is_string($data->title) || ($n = preg_match_all('/./us', $data->title)) === false || $n > 500) return false;
    if (!is_string($data->cta) || ($n = preg_match_all('/./us', $data->cta)) === false || $n > 200) return false;
    if (!is_string($data->fontSize) || !preg_match('/^[0-9]{1,3}px$/D', $data->fontSize)) return false;
    return is_string($data->accent) && (bool)preg_match('/^#[0-9a-fA-F]{6}$/D', $data->accent);
}
function stage1ReadFile(string $file): ?object
{
    if (!is_file($file) || !is_readable($file)) return null;
    try {
        $bytes = file_get_contents($file);
        if (!is_string($bytes) || strlen($bytes) > 20000) return null;
        $data = json_decode($bytes, false, 16, JSON_THROW_ON_ERROR);
        return stage1HeroValid($data) ? $data : null;
    } catch (Throwable $e) { return null; }
}
function stage1PublicSnapshot(): ?object
{
    $dir = getenv('STAGE1_SNAPSHOT_DIRECTORY');
    if (is_string($dir) && $dir !== '') {
        // Public requests NEVER publish, write, execute a manifest, or fall back to drafts.
        $primary = stage1ReadFile($dir . '/current.json');
        if ($primary !== null) return $primary;
        return stage1ReadFile($dir . '/last-good.json');
    }
    $legacy = getenv('STAGE1_PUBLISHED_FIXTURE');
    return is_string($legacy) ? stage1ReadFile($legacy) : null;
}
