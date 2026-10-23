<?php
declare(strict_types=1);

namespace Manufact\Stage3;

final class PublicRenderer
{
    private static function h(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE | ENT_HTML5, 'UTF-8');
    }

    private static function element(array $section, string $slot): array
    {
        foreach ($section['elements'] as $element) {
            if ($element['slot'] === $slot) {
                return $element['values'];
            }
        }
        return [];
    }

    private static function label(array $section, string $slot): string
    {
        return self::h((string)(self::element($section, $slot)['content.text'] ?? ''));
    }

    private static function link(array $section, string $slot, string $mount): string
    {
        $values = self::element($section, $slot);
        $href = (string)($values['behavior.href'] ?? '/');
        // Internal links remain inside the standalone visitor mount, never CMS routes.
        if (str_starts_with($href, '/') && !str_starts_with($href, '//')) {
            $href = $mount . $href;
        }
        return '<a class="action" href="' . self::h($href) . '">' . self::label($section, $slot) . '</a>';
    }

    public static function html(array $site, string $path, ?string $basePath = null): ?string
    {
        $page = null;
        foreach ($site['pages'] as $candidate) {
            if ($candidate['path'] === $path) {
                $page = $candidate;
                break;
            }
        }
        if ($page === null) {
            return null;
        }
        $siteId = $site['siteId'];
        $mount = $basePath ?? '/published/' . rawurlencode($siteId);
        $navigation = '';
        foreach ($site['pages'] as $candidate) {
            $navigation .= '<a href="' . self::h($mount) . self::h($candidate['path'])
                . '">' . self::h($candidate['title']) . '</a>';
        }
        $body = '';
        foreach ($page['sections'] as $section) {
            $id = self::h($section['id']);
            if ($section['component'] === 'company-hero') {
                $values = self::element($section, 'heading');
                $color = (string)$values['style.color'];
                $sizes = $values['style.fontSize'];
                // Values came from the closed manifest validator, no freeform CSS.
                $body .= '<section id="' . $id . '" class="hero">'
                    . '<h1 style="--title-color:' . self::h($color)
                    . ';--title-desktop:' . self::h($sizes['desktop'])
                    . ';--title-tablet:' . self::h($sizes['tablet'] ?? $sizes['desktop'])
                    . ';--title-mobile:' . self::h($sizes['mobile'] ?? $sizes['tablet'] ?? $sizes['desktop'])
                    . '">' . self::label($section, 'heading') . '</h1>'
                    . '<p>' . self::label($section, 'summary') . '</p>'
                    . self::link($section, 'action', $mount) . '</section>';
            } elseif ($section['component'] === 'feature-highlights') {
                $first = self::element($section, 'first');
                $body .= '<section id="' . $id . '" class="features">'
                    . '<h2>' . self::label($section, 'heading') . '</h2>'
                    . '<div class="feature-grid"><article style="color:' . self::h($first['style.color']) . '">'
                    . self::label($section, 'first') . '</article><article>'
                    . self::label($section, 'second') . '</article></div></section>';
            } elseif ($section['component'] === 'contact-panel') {
                $body .= '<section id="' . $id . '" class="contact"><h2>'
                    . self::label($section, 'heading') . '</h2>'
                    . self::link($section, 'action', $mount) . '</section>';
            }
        }
        $title = self::h($page['title'] . ' | ' . $site['title']);
        return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<title>' . $title . '</title><style>'
            . '*,*:before,*:after{box-sizing:border-box}body{margin:0;background:#f7f9fc;color:#172a43;font:16px/1.6 system-ui,Arial,sans-serif}'
            . 'header,main,footer{max-width:1140px;margin:auto;padding:24px}nav{display:flex;flex-wrap:wrap;gap:18px}a{color:inherit}'
            . 'section{padding:64px 24px;border-bottom:1px solid #e2e8f0}h1{font-size:var(--title-desktop);color:var(--title-color);line-height:1.1;max-width:960px}'
            . 'h2{font-size:clamp(28px,3vw,42px);line-height:1.2}.hero{padding-block:90px}.action{display:inline-block;background:#0a5bff;color:white;'
            . 'padding:14px 22px;border-radius:9px;text-decoration:none;font-weight:700}.feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}'
            . 'article{padding:24px;background:white;border:1px solid #e1e8f1;border-radius:12px}'
            . '@media(max-width:900px){h1{font-size:var(--title-tablet)}}'
            . '@media(max-width:600px){section{padding:40px 8px}.hero{padding-block:48px}.feature-grid{grid-template-columns:1fr}h1{font-size:var(--title-mobile)}}'
            . '</style></head><body><header><nav aria-label="Навигация">' . $navigation
            . '</nav></header><main>' . $body . '</main><footer>'
            . self::h($site['title']) . '</footer></body></html>';
    }
}
