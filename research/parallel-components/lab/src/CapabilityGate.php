<?php
declare(strict_types=1);
require_once __DIR__ . '/PropertySafety.php';

/** Example fixed-block capability guard; not an authorization, persistence or Stage3 schema. */
final class CapabilityGate
{
    /** Patches may change ONLY properties of an existing block in a trusted registry. */
    public static function accepts(array $registry, array $patch, string $siteHost): bool
    {
        if (array_keys($patch) !== ['blockId','changes']) return false;
        $id = $patch['blockId'];
        $changes = $patch['changes'];
        if (!is_string($id) || !isset($registry['blocks'][$id]['editable']) || !is_array($changes)
            || array_is_list($changes) || $changes === [] || count($changes) > 20) return false;
        $rules = $registry['blocks'][$id]['editable'];
        foreach ($changes as $path => $value) {
            if (!is_string($path) || !isset($rules[$path]) || !self::typed($rules[$path], $value, $siteHost)) return false;
        }
        return true;
    }

    /** Closed, fixed breakpoint vocabulary: no arbitrary CSS or JavaScript string. */
    private static function responsivePadding(mixed $value, array $rule): bool
    {
        if (!is_array($value) || array_keys($value) !== ['mobile','tablet','desktop']) return false;
        foreach ($value as $px) {
            if (!is_int($px) || $px < ($rule['min'] ?? 0) || $px > ($rule['max'] ?? 128)) return false;
        }
        return true;
    }

    private static function typed(array $rule, mixed $value, string $siteHost): bool
    {
        return match($rule['type'] ?? null) {
            'text' => is_string($value) && preg_match('//u', $value) === 1 &&
                (($length = preg_match_all('/./us', $value)) !== false) &&
                $length >= ($rule['min'] ?? 0) && $length <= ($rule['max'] ?? 200),
            'enum' => is_string($value) && in_array($value, $rule['values'] ?? [], true),
            'boolean' => is_bool($value),
            'integer-px' => is_int($value) && $value >= ($rule['min'] ?? 0)
                && $value <= ($rule['max'] ?? 128),
            'opaque-color' => is_string($value) && preg_match('/^#[0-9A-Fa-f]{6}$/D', $value) === 1,
            'responsive-padding' => self::responsivePadding($value, $rule),
            'asset' => $value === null || (is_string($value) && preg_match('/^asset_[A-Za-z0-9_-]{8,64}$/D', $value) === 1),
            'same-origin-link' => is_string($value) && PropertySafety::safeHref($value, $siteHost),
            default => false
        };
    }
}
