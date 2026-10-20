<?php
declare(strict_types=1);
require_once __DIR__ . '/CapabilityGate.php';

/** Educational optimistic-concurrency and typed-property PLAN, not editor persistence. */
final class RevisionGate
{
    /** @return array{code:string,next?:array} Returns a COPY; never writes a live site. */
    public static function plan(array $registry, array $request, string $siteHost): array
    {
        if (array_keys($request) !== ['blockId', 'expectedRevision', 'changes']
            || !is_string($request['blockId']) || !is_int($request['expectedRevision'])
            || $request['expectedRevision'] < 1 || $request['expectedRevision'] >= 2147483647) {
            return ['code' => 'PATCH_REJECTED'];
        }
        $id = $request['blockId'];
        if (!isset($registry['blocks'][$id]) || !is_array($registry['blocks'][$id])) {
            // Do not leak block existence to untrusted callers; separate ACL required.
            return ['code' => 'PATCH_REJECTED'];
        }
        $block = $registry['blocks'][$id];
        if (!is_int($block['revision'] ?? null) || !is_array($block['values'] ?? null)
            || !is_array($block['editable'] ?? null)) return ['code' => 'PATCH_REJECTED'];
        if ($block['revision'] !== $request['expectedRevision']) return ['code' => 'REVISION_CONFLICT'];
        if (!CapabilityGate::accepts($registry,
            ['blockId' => $id, 'changes' => $request['changes']], $siteHost)) {
            return ['code' => 'PATCH_REJECTED'];
        }
        foreach ($request['changes'] as $path => $value) {
            if (!array_key_exists($path, $block['values'])) return ['code' => 'PATCH_REJECTED'];
            if ($block['values'][$path] === $value) return ['code' => 'UNCHANGED'];
        }
        $next = $block;
        foreach ($request['changes'] as $path => $value) $next['values'][$path] = $value;
        $next['revision']++;
        return ['code' => 'PLAN_ONLY', 'next' => $next];
    }
}
