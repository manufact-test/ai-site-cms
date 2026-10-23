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

    private static function extraFields(array $section): string
    {
        $html = '';
        foreach (FlexForm::definitions($section) as $field) {
            $name = self::h($field['name']);
            $required = $field['required'] ? ' required' : '';
            $label = self::h($field['label']);
            $control = '';
            if ($field['kind'] === 'textarea') {
                $control = '<textarea name="' . $name . '" maxlength="1000" rows="3"' . $required . '></textarea>';
            } elseif ($field['kind'] === 'select') {
                $control = '<select name="' . $name . '"' . $required . '>'
                    . '<option value="">Выберите вариант</option>';
                foreach ($field['options'] as $option) {
                    $escaped = self::h($option);
                    $control .= '<option value="' . $escaped . '">' . $escaped . '</option>';
                }
                $control .= '</select>';
            } else {
                $type = $field['kind'] === 'tel' ? 'tel' : 'text';
                $max = $type === 'tel' ? 32 : 180;
                $control = '<input type="' . $type . '" name="' . $name . '" maxlength="' . $max . '"'
                    . ($type === 'tel' ? ' autocomplete="tel"' : '') . $required . '>';
            }
            $html .= '<label>' . $label . $control . '</label>';
        }
        return $html;
    }


    private static function themeCss(array $site): string
    {
        $t = $site['theme'] ?? ['background'=>'#f7f9fc','surface'=>'#ffffff','text'=>'#172a43',
            'primary'=>'#0a5bff','font'=>'system','maxWidth'=>1140];
        $fonts=['system'=>'system-ui,Arial,sans-serif','arial'=>'Arial,sans-serif','georgia'=>'Georgia,serif'];
        return ':root{--cms-bg:'.$t['background'].';--cms-surface:'.$t['surface'].';--cms-text:'.$t['text'].
            ';--cms-primary:'.$t['primary'].';--cms-width:'.$t['maxWidth'].'px;--cms-font:'.$fonts[$t['font']].'}';
    }
    public static function html(array $site, string $path, ?string $basePath = null, ?string $collectorBase = null, int $publishedVersion = 0): ?string
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
            if (($candidate['navigation']['hidden'] ?? false) === true) continue;
            $label = $candidate['navigation']['label'] ?? '';
            $navigation .= '<a href="' . self::h($mount) . self::h($candidate['path']) . '"'
                . ($candidate['path'] === $path ? ' aria-current="page"' : '')
                . '>' . self::h($label === '' ? $candidate['title'] : $label) . '</a>';
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
            } elseif ($section['component'] === 'image-showcase') {
                $media = (string)(self::element($section, 'photo')['content.media'] ?? '');
                $picture = '';
                foreach ($site['assets'] as $asset) {
                    if ($asset['id'] === $media) {
                        $picture = '<img class="showcase-photo" loading="lazy" decoding="async" src="'
                            . self::h($mount . $asset['src']) . '" alt="' . self::h($asset['alt']) . '">';
                        break;
                    }
                }
                $body .= '<section id="' . $id . '" class="showcase"><h2>'
                    . self::label($section, 'heading') . '</h2>'
                    . $picture . '<p>' . self::label($section, 'caption') . '</p></section>';
            } elseif (in_array($section['component'], ['lead-form','lead-form-flex'], true)) {
                if ($publishedVersion < 1) {
                    throw new \RuntimeException('Forms require an explicit immutable published version');
                }
                $action = FormGateway::endpoint($collectorBase ?? '', $siteId, $section['id']);
                $token = FormGateway::token($siteId, $section['id'], $publishedVersion);
                $body .= '<section id="' . $id . '" class="lead-section">'
                    . '<h2>' . self::label($section, 'heading') . '</h2>'
                    . '<form class="lead-form" method="post" accept-charset="utf-8" action="' . self::h($action) . '">'
                    . '<input type="hidden" name="_release" value="' . $publishedVersion . '">'
                    . '<input type="hidden" name="_token" value="' . self::h($token) . '">'
                    . '<div class="lead-honey" aria-hidden="true"><label>Website <input tabindex="-1" autocomplete="off" type="text" name="website" value=""></label></div>'
                    . '<label>' . self::label($section, 'name-label') . '<input name="name" type="text" minlength="2" maxlength="120" required autocomplete="name"></label>'
                    . '<label>' . self::label($section, 'email-label') . '<input name="email" type="email" maxlength="254" required autocomplete="email"></label>'
                    . '<label>' . self::label($section, 'message-label') . '<textarea name="message" minlength="10" maxlength="4000" required rows="5"></textarea></label>'
                    . self::extraFields($section)
                    . '<label class="lead-consent"><input type="checkbox" name="consent" value="yes" required> '
                    . self::label($section, 'consent-label') . '</label>'
                    . '<button class="action" type="submit">' . self::label($section, 'submit-label') . '</button>'
                    . '</form></section>';
            } elseif ($section['component'] === 'contact-panel') {
                $body .= '<section id="' . $id . '" class="contact"><h2>'
                    . self::label($section, 'heading') . '</h2>'
                    . self::link($section, 'action', $mount) . '</section>';
            }
        }
        $seo = $page['seo'] ?? ['title'=>'','description'=>'','robots'=>'index'];
        $title = self::h($seo['title'] !== '' ? $seo['title'] : $page['title'] . ' | ' . $site['title']);
        $description = $seo['description'] !== '' ? '<meta name="description" content="'.self::h($seo['description']).'">' : '';
        $robots = $seo['robots'] === 'noindex' ? '<meta name="robots" content="noindex,follow">' : '';
        return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<title>' . $title . '</title>' . $description . $robots . '<style>' . self::themeCss($site)
            . '*,*:before,*:after{box-sizing:border-box}body{margin:0;background:var(--cms-bg);color:var(--cms-text);font:16px/1.6 var(--cms-font)}'
            . 'header,main,footer{max-width:var(--cms-width);margin:auto;padding:24px}nav{display:flex;flex-wrap:wrap;gap:18px}a{color:inherit}'
            . 'section{padding:64px 24px;border-bottom:1px solid #e2e8f0}h1{font-size:var(--title-desktop);color:var(--title-color);line-height:1.1;max-width:960px}'
            . 'h2{font-size:clamp(28px,3vw,42px);line-height:1.2}.hero{padding-block:90px}.action{display:inline-block;background:var(--cms-primary);color:white;'
            . 'padding:14px 22px;border-radius:9px;text-decoration:none;font-weight:700}.feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}'
            . 'article{padding:24px;background:var(--cms-surface);border:1px solid #e1e8f1;border-radius:12px}'
            . '.showcase-photo{display:block;width:100%;height:auto;max-height:680px;object-fit:contain;border-radius:16px;background:#e4ebf3}'
            . '.lead-form{display:grid;gap:16px;max-width:700px}.lead-form label{display:grid;gap:6px;font-weight:600}.lead-form input:not([type=checkbox]),.lead-form textarea,.lead-form select{padding:12px;border:1px solid #a5b3c4;border-radius:8px;font:inherit;width:100%}.lead-form button{border:0;cursor:pointer}.lead-consent{display:flex!important;flex-direction:row;align-items:flex-start}.lead-honey{position:absolute!important;left:-10000px!important;width:1px;height:1px;overflow:hidden}'
            . '@media(max-width:900px){h1{font-size:var(--title-tablet)}}'
            . '@media(max-width:600px){section{padding:40px 8px}.hero{padding-block:48px}.feature-grid{grid-template-columns:1fr}h1{font-size:var(--title-mobile)}}'
            . '</style></head><body><header><nav aria-label="Навигация">' . $navigation
            . '</nav></header><main>' . $body . '</main><footer>'
            . self::h($site['title']) . '</footer></body></html>';
    }
}
