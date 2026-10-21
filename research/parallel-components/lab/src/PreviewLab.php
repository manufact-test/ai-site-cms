<?php
declare(strict_types=1);
require_once __DIR__ . '/RevisionGate.php';
require_once __DIR__ . '/PropertySafety.php';

/** Research-only, fixed-hero typed preview. No auth, persistence, arbitrary HTML or publication. */
final class PreviewLab
{
    private const PATHS = ['content.heading', 'style.foreground', 'layout.paddingPx',
        'layout.responsivePadding', 'media.assetId', 'action.href'];
    private const ASSETS = [
        'asset_abcdefgh' => ['/assets/media/workshop-960.webp', 960, 540, 'Industrial workshop diagram'],
        'asset_z8abcd01' => ['/assets/media/workshop-640.webp', 640, 360, 'Industrial workshop diagram'],
    ];

    /** @return array{code:string,html?:string,revision?:int} */
    public static function render(array $registry, array $patch, string $siteHost): array
    {
        $result = RevisionGate::plan($registry, $patch, $siteHost);
        if (!in_array($result['code'], ['PLAN_ONLY', 'UNCHANGED'], true)) return ['code' => $result['code']];
        $id = $patch['blockId'];
        $block = $result['next'] ?? $registry['blocks'][$id];
        $values = $block['values'] ?? null;
        if ($id !== 'hero-primary' || ($block['kind'] ?? null) !== 'hero'
            || !is_array($values) || array_keys($values) !== self::PATHS
            || !CapabilityGate::accepts(['blocks' => [$id => $block]],
                ['blockId' => $id, 'changes' => $values], $siteHost)) {
            return ['code' => 'PREVIEW_REJECTED'];
        }
        $v = $values;
        // Preview has an independent closed renderer boundary: a compromised or overly
        // permissive editable-rule map must never inject CSS, attributes or DOM.
        if (!self::safeRenderValues($v, $siteHost)) return ['code' => 'PREVIEW_REJECTED'];
        $foreground = $v['style.foreground'];
        if (!self::hasReadableContrast($foreground)) return ['code' => 'PREVIEW_CONTRAST_REJECTED'];
        $asset = $v['media.assetId'];
        if (!is_string($asset) || !isset(self::ASSETS[$asset])) return ['code' => 'PREVIEW_ASSET_MISSING'];
        [$src, $width, $height, $alt] = self::ASSETS[$asset];
        $pad = $v['layout.responsivePadding'];
        $baseline = $v['layout.paddingPx'];
        $html = '<section id="research-hero-preview" aria-label="Hero preview" data-revision="'
            . $block['revision'] . '"><style>'
            . '#research-hero-preview{box-sizing:border-box;color:' . $foreground
            . ';padding:' . $baseline . 'px ' . $pad['mobile'] . 'px;background:#fff;max-width:100%;overflow-wrap:anywhere}'
            . '#research-hero-preview *{box-sizing:border-box}'
            . '#research-hero-preview img{display:block;max-width:100%;height:auto}'
            . '#research-hero-preview .research-preview-action{display:inline-block;text-decoration:underline;cursor:default}'
            . '#research-hero-preview small{display:block;overflow-wrap:anywhere}'
            . '@media(min-width:600px){#research-hero-preview{padding-left:' . $pad['tablet'] . 'px;padding-right:' . $pad['tablet'] . 'px}}'
            . '@media(min-width:1000px){#research-hero-preview{padding-left:' . $pad['desktop'] . 'px;padding-right:' . $pad['desktop'] . 'px}}'
            . '</style><h2>' . self::escape($v['content.heading']) . '</h2>'
            . '<img src="' . self::escape($src) . '" width="' . $width . '" height="' . $height
            . '" alt="' . self::escape($alt) . '">'
            // Display-only action: even a same-origin link can trigger site GET side effects.
            // Rendering never creates navigable/clickable actions in this isolated preview.
            . '<span class="research-preview-action" data-preview-href="'
            . self::escape($v['action.href']) . '" aria-label="Предпросмотр ссылки, переход отключён">Подробнее</span>'
            . '<small>Адрес ссылки: <code>' . self::escape($v['action.href']) . '</code></small></section>';
        return ['code' => 'PREVIEW_ONLY', 'revision' => $block['revision'], 'html' => $html];
    }

    /**
     * Independent output boundary. Renderer consumes only a fixed vocabulary, never
     * schemas or CSS fragments supplied by mutable fixture "editable" metadata.
     */
    private static function safeRenderValues(array $v, string $siteHost): bool
    {
        $heading = $v['content.heading'];
        if (!is_string($heading) || preg_match('//u', $heading) !== 1
            || (($length = preg_match_all('/./us', $heading)) === false)
            || $length < 1 || $length > 180) return false;
        $color = $v['style.foreground'];
        if (!is_string($color) || preg_match('/^#[A-Fa-f0-9]{6}$/D', $color) !== 1) return false;
        $baseline = $v['layout.paddingPx'];
        if (!is_int($baseline) || $baseline < 0 || $baseline > 128) return false;
        $responsive = $v['layout.responsivePadding'];
        if (!is_array($responsive) ||
            array_keys($responsive) !== ['mobile','tablet','desktop']) return false;
        foreach ($responsive as $amount) {
            if (!is_int($amount) || $amount < 0 || $amount > 128) return false;
        }
        $asset = $v['media.assetId'];
        if (!is_string($asset) ||
            preg_match('/^asset_[A-Za-z0-9_-]{8,64}$/D', $asset) !== 1) return false;
        $href = $v['action.href'];
        return is_string($href) && PropertySafety::safeHref($href, $siteHost);
    }

    private static function escape(string $text): string
    {
        return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /** On white (#fff): simple WCAG 2.2 normal text contrast check >= 4.5:1. */
    private static function hasReadableContrast(string $hex): bool
    {
        $rgb = [hexdec(substr($hex, 1, 2)), hexdec(substr($hex, 3, 2)), hexdec(substr($hex, 5, 2))];
        $linear = array_map(static function (int $component): float {
            $c = $component / 255;
            return $c <= .04045 ? $c / 12.92 : (($c + .055) / 1.055) ** 2.4;
        }, $rgb);
        $l = .2126 * $linear[0] + .7152 * $linear[1] + .0722 * $linear[2];
        return 1.05 / ($l + .05) >= 4.5;
    }
}
