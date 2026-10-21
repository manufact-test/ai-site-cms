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
        if (!is_string($id) || !is_array($registry['blocks'] ?? null)
            || !is_array($registry['blocks'][$id] ?? null)
            || !is_array($registry['blocks'][$id]['editable'] ?? null)
            || !is_array($changes) || array_is_list($changes)
            || $changes === [] || count($changes) > 20) return false;
        $rules = $registry['blocks'][$id]['editable'];
        if ($rules === [] || array_is_list($rules)) return false;
        foreach ($changes as $path => $value) {
            if (!is_string($path) || !array_key_exists($path, $rules)
                || !is_array($rules[$path]) || !self::typed($rules[$path], $value, $siteHost)) return false;
        }
        return true;
    }

    /**
     * A rule is itself untrusted input to the validator when read from corrupted
     * manifests or a future adapter. Reject invalid limits/vocabulary instead
     * of allowing PHP comparisons or in_array() to coerce/throw.
     * This is a laboratory shape guard, not a global Stage3 schema.
     */
    private static function validRule(array $rule): bool
    {
        $type = $rule['type'] ?? null;
        if (!is_string($type)) return false;
        $allowed = match ($type) {
            'text','integer-px','responsive-padding' => ['type','min','max'],
            'enum' => ['type','values'],
            'boolean','opaque-color','asset','same-origin-link' => ['type'],
            default => null
        };
        if ($allowed === null || array_diff(array_keys($rule), $allowed) !== []) return false;
        if (in_array($type, ['text','integer-px','responsive-padding'], true)) {
            $min = array_key_exists('min', $rule) ? $rule['min'] : 0;
            $max = array_key_exists('max', $rule) ? $rule['max'] : ($type === 'text' ? 200 : 128);
            if (!is_int($min) || !is_int($max) || $min < 0 || $max < $min) return false;
        }
        if ($type === 'enum') {
            $values = $rule['values'] ?? null;
            if (!is_array($values) || !array_is_list($values) ||
                $values === [] || count($values) > 50) return false;
            foreach ($values as $item) {
                if (!is_string($item) || $item === '' || strlen($item) > 256
                    || preg_match('//u', $item) !== 1) return false;
            }
            if (count(array_unique($values)) !== count($values)) return false;
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
        if (!self::validRule($rule)) return false;
        return match($rule['type']) {
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
