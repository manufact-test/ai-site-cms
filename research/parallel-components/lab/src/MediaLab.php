<?php
declare(strict_types=1);

/** Fixed-fixture responsive-picture experiment. Not a general uploaded-media sanitizer. */
final class MediaLab
{
    private static function asset(string $path): string
    {
        if (preg_match('#^/assets/media/[a-z0-9-]+(?:-320|-640|-960)\.(?:avif|webp)$#D', $path) !== 1) {
            throw new InvalidArgumentException('Unsupported media path');
        }
        return $path;
    }

    private static function srcset(array $variants): string
    {
        if (count($variants) !== 3 || array_keys($variants) !== [320, 640, 960]) {
            // JSON maps have string/integer keys normalized by PHP; require all three widths.
            throw new InvalidArgumentException('Only pinned responsive widths are allowed');
        }
        $output = [];
        foreach ($variants as $width => $url) {
            if (!is_string($url)) throw new InvalidArgumentException('Invalid media URL');
            self::asset($url);
            if (!str_contains($url, '-' . $width . '.')) throw new InvalidArgumentException('Mismatched width label');
            $output[] = self::escape($url) . ' ' . $width . 'w';
        }
        return implode(', ', $output);
    }

    private static function escape(string $text): string
    {
        return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function render(array $asset): string
    {
        $keys = ['alt','caption','role','width','height','avif','webp'];
        if (array_diff(array_keys($asset), $keys) || array_diff($keys, array_keys($asset))) {
            throw new InvalidArgumentException('Unknown/missing media property');
        }
        if (!is_string($asset['alt']) || !is_string($asset['caption'])
            || strlen($asset['alt']) > 250 || strlen($asset['caption']) > 300
            || $asset['width'] !== 960 || $asset['height'] !== 540
            || !in_array($asset['role'], ['lcp','content','decorative'], true)
            || !is_array($asset['avif']) || !is_array($asset['webp'])
            || ($asset['role'] === 'decorative' && $asset['alt'] !== '')
            || ($asset['role'] !== 'decorative' && trim($asset['alt']) === '')) {
            throw new InvalidArgumentException('Invalid accessible media fixture');
        }
        $avif = self::srcset($asset['avif']);
        $webp = self::srcset($asset['webp']);
        $fallback = self::asset($asset['webp'][960]);
        $priority = $asset['role'] === 'lcp';
        $sizes = '(max-width: 720px) 100vw, 960px';
        $html = '<figure class="media-demo"><picture><source type="image/avif" srcset="' . $avif . '" sizes="' . $sizes . '">'
            . '<source type="image/webp" srcset="' . $webp . '" sizes="' . $sizes . '">'
            . '<img src="' . self::escape($fallback) . '" srcset="' . $webp . '" sizes="' . $sizes . '"'
            . ' width="960" height="540" alt="' . self::escape($asset['alt']) . '"'
            . ($priority ? ' loading="eager" fetchpriority="high"' : ' loading="lazy"')
            . ' decoding="async"></picture>';
        if ($asset['caption'] !== '') $html .= '<figcaption>' . self::escape($asset['caption']) . '</figcaption>';
        return $html . '</figure>';
    }
}
