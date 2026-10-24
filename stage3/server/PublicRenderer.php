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
    /** Explicit configuration avoids Host-header poisoning of search-engine URLs. */
    public static function origin(?string $origin): ?string
    {
        if ($origin === null || $origin === '') return null;
        if (preg_match('~^https://[a-z0-9][a-z0-9.-]*(?::[0-9]{2,5})?$~iD',$origin)!==1
            && preg_match('~^http://(?:127\.0\.0\.1|localhost)(?::[0-9]{2,5})?$~iD',$origin)!==1)
            throw new \InvalidArgumentException('Public origin must be an explicit HTTPS host, or loopback for tests');
        return $origin;
    }

    /** Publication barrier: no broken internal links or missing root in a release. */
    public static function assertPublishable(array $site): void
    {
        $pages=[];
        foreach ($site['pages'] as $page) $pages[$page['path']]=$page;
        if (!isset($pages['/']))
            throw new \InvalidArgumentException('Cannot publish without a home page');
        $redirects=[];
        foreach ($site['redirects']??[] as $redirect) $redirects[$redirect['from']]=$redirect['to'];
        foreach ($site['pages'] as $page) foreach ($page['sections'] as $section)
            foreach (array_merge($section['elements'],$section['items']??[]) as $el) {
                $href=$el['values']['behavior.href']??null;
                if (!is_string($href)||!str_starts_with($href,'/')||str_starts_with($href,'//')) continue;
                $parts=explode('#',$href,2);
                $route=explode('?',$parts[0],2)[0];
                if ($route==='') $route=$page['path'];
                if (!isset($pages[$route])&&!isset($redirects[$route]))
                    throw new \InvalidArgumentException('Cannot publish broken internal link: '.$href);
                if (isset($pages[$route])&&isset($parts[1])&&$parts[1]!=='') {
                    $anchor=explode('?',$parts[1],2)[0];
                    $found=false;
                    foreach ($pages[$route]['sections'] as $target) {
                        if ($target['id']===$anchor) {$found=true;break;}
                    }
                    if (!$found)
                        throw new \InvalidArgumentException('Cannot publish broken section anchor: '.$href);
                }
            }
    }

    public static function redirectTarget(array $site, string $path): ?string
    {
        foreach ($site['redirects']??[] as $redirect)
            if ($redirect['from']===$path) return $redirect['to'];
        return null;
    }

    public static function sitemap(array $site, string $mount, string $origin): string
    {
        self::origin($origin);
        $xml='<?xml version="1.0" encoding="UTF-8"?>'."\n"
            .'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
        foreach ($site['pages'] as $page) {
            if (($page['seo']['robots']??'index')==='noindex') continue;
            $url=$origin.$mount.$page['path'];
            $xml.='  <url><loc>'.htmlspecialchars($url,ENT_XML1|ENT_QUOTES,'UTF-8').'</loc></url>'."\n";
        }
        return $xml."</urlset>\n";
    }

    public static function robots(string $mount,string $origin): string
    {
        self::origin($origin);
        // noindex pages must still be crawlable for their robots meta to be seen.
        return "User-agent: *\nAllow: /\nSitemap: ".$origin.$mount."/sitemap.xml\n";
    }

    /** Static-host fallback; actual HTTP 301 is provided by the PHP visitor router. */
    public static function staticRedirect(string $target): string
    {
        $value=self::h($target);
        return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
            .'<meta name="robots" content="noindex,follow">'
            .'<meta http-equiv="refresh" content="0;url='.$value.'">'
            .'<title>Страница перемещена</title></head><body>'
            .'<p>Страница перемещена: <a href="'.$value.'">Перейти</a></p></body></html>';
    }

    public static function html(array $site, string $path, ?string $basePath = null, ?string $collectorBase = null, int $publishedVersion = 0, ?string $publicOrigin = null): ?string
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
            $beforeSkin = strlen($body);
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

            } elseif ($section['component'] === 'service-grid') {
                $cards='';
                foreach ($section['items'] as $item) {
                    $v=$item['values'];$href=$v['behavior.href'];
                    if (str_starts_with($href,'/') && !str_starts_with($href,'//')) $href=$mount.$href;
                    $cards.='<article><h3>'.self::h($v['content.title']).'</h3><p>'.self::h($v['content.text']).
                        '</p><a class="service-link" href="'.self::h($href).'">Подробнее →</a></article>';
                }
                $body.='<section id="'.$id.'" class="repeat-section"><h2>'.self::label($section,'heading').
                    '</h2><div class="repeat-grid">'.$cards.'</div></section>';
            } elseif ($section['component'] === 'faq-accordion') {
                $entries='';
                foreach ($section['items'] as $item) {
                    $v=$item['values'];
                    $entries.='<details><summary>'.self::h($v['content.question']).'</summary><p>'.
                        self::h($v['content.answer']).'</p></details>';
                }
                $body.='<section id="'.$id.'" class="repeat-section faq"><h2>'.
                    self::label($section,'heading').'</h2>'.$entries.'</section>';
            } elseif ($section['component'] === 'testimonials') {
                $entries='';
                foreach ($section['items'] as $item) {
                    $v=$item['values'];
                    $entries.='<figure class="review"><blockquote>'.self::h($v['content.quote']).'</blockquote><figcaption>'.
                        self::h($v['content.author']).($v['content.role']!==''?' · '.self::h($v['content.role']):'').
                        '</figcaption></figure>';
                }
                $body.='<section id="'.$id.'" class="repeat-section"><h2>'.self::label($section,'heading').
                    '</h2><div class="repeat-grid">'.$entries.'</div></section>';
            } elseif ($section['component'] === 'photo-gallery') {
                $images=[];
                foreach ($section['items'] as $item) {
                    $v=$item['values'];$asset=null;
                    foreach ($site['assets'] as $candidate) if ($candidate['id']===$v['content.media']) {$asset=$candidate;break;}
                    if ($asset===null) continue;
                    $images[]='<figure><img loading="lazy" decoding="async" src="'.self::h($mount.$asset['src']).
                        '" alt="'.self::h($asset['alt']).'"><figcaption>'.self::h($v['content.caption']).'</figcaption></figure>';
                }
                $body.='<section id="'.$id.'" class="repeat-section"><h2>'.self::label($section,'heading').
                    '</h2><div class="repeat-grid gallery-grid">'.implode('',$images).'</div></section>';
            } elseif ($section['component'] === 'media-story') {
                $media=(string)(self::element($section,'photo')['content.media']??'');
                $photo='';
                foreach ($site['assets'] as $asset) {
                    if ($asset['id']!==$media) continue;
                    $photo='<img class="story-photo" loading="lazy" decoding="async" src="'.
                        self::h($mount.$asset['src']).'" alt="'.self::h($asset['alt']).'">';
                    break;
                }
                $body.='<section id="'.$id.'" class="media-story"><div class="story-layout"><div class="story-copy">'
                    .'<h2>'.self::label($section,'heading').'</h2><p>'.self::label($section,'copy').'</p>'
                    .self::link($section,'action',$mount).'</div>'
                    .($photo!==''?'<div class="story-media">'.$photo.'</div>':'')
                    .'</div></section>';
            } elseif ($section['component'] === 'partner-logos') {
                $cards='';
                foreach ($section['items'] as $item) {
                    $v=$item['values'];$asset=null;
                    foreach ($site['assets'] as $candidate) if ($candidate['id']===$v['content.media']) {
                        $asset=$candidate;break;
                    }
                    if($asset===null)continue;
                    $href=$v['behavior.href'];
                    if(str_starts_with($href,'/')&&!str_starts_with($href,'//'))$href=$mount.$href;
                    $cards.='<a class="partner-logo" href="'.self::h($href).'"><img loading="lazy" decoding="async" src="'.
                        self::h($mount.$asset['src']).'" alt="'.self::h($asset['alt']?:$v['content.caption']).'">'
                        .'<span>'.self::h($v['content.caption']).'</span></a>';
                }
                $body.='<section id="'.$id.'" class="partner-logos"><h2>'.self::label($section,'heading').
                    '</h2><div class="partner-grid">'.$cards.'</div></section>';
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
            } elseif ($section['component'] === 'cta-banner') {
                $body .= '<section id="' . $id . '" class="cta-banner"><h2>'
                    . self::label($section, 'heading') . '</h2><p>'
                    . self::label($section, 'summary') . '</p><div class="cta-actions">'
                    . self::link($section, 'primary', $mount)
                    . self::link($section, 'secondary', $mount)
                    . '</div></section>';
            } elseif ($section['component'] === 'contact-panel') {
                $body .= '<section id="' . $id . '" class="contact"><h2>'
                    . self::label($section, 'heading') . '</h2>'
                    . self::link($section, 'action', $mount) . '</section>';
            }
            // Wrap only styled sections; unstyled/older sites keep their exact HTML.
            // All class names are closed enums checked by the JS and PHP contracts.
            if (isset($section['appearance'])) {
                $skin = $section['appearance'];
                $skinClass = 'cms-surface-' . $skin['surface'] . ' cms-spacing-' . $skin['spacing']
                    . ' cms-align-' . $skin['align'];
                foreach (['width'=>'cms-width-', 'heading'=>'cms-heading-',
                    'corners'=>'cms-corners-', 'mobileAlign'=>'cms-mobile-align-',
                    'mobileSpacing'=>'cms-mobile-spacing-', 'button'=>'cms-button-'] as $key=>$prefix) {
                    if (isset($skin[$key])) $skinClass .= ' ' . $prefix . $skin[$key];
                }
                $rendered = substr($body, $beforeSkin);
                $body = substr($body, 0, $beforeSkin) . '<div class="cms-section-skin ' .
                    $skinClass . '">' . $rendered . '</div>';
            }
        }
        $publicOrigin = self::origin($publicOrigin);
        $seo = $page['seo'] ?? ['title'=>'','description'=>'','robots'=>'index'];
        $title = self::h($seo['title'] !== '' ? $seo['title'] : $page['title'] . ' | ' . $site['title']);
        $description = $seo['description'] !== '' ? '<meta name="description" content="'.self::h($seo['description']).'">' : '';
        $robots = $seo['robots'] === 'noindex' ? '<meta name="robots" content="noindex,follow">' : '';
        $absolute=$publicOrigin===null?null:$publicOrigin.$mount.$path;
        $canonical=$absolute===null?'':'<link rel="canonical" href="'.self::h($absolute).'">';
        $social='<meta property="og:type" content="website">'
            .'<meta property="og:title" content="'.$title.'">';
        if ($description!=='') $social.='<meta property="og:description" content="'.self::h($seo['description']).'">';
        if ($absolute!==null) $social.='<meta property="og:url" content="'.self::h($absolute).'">';
        if ($absolute!==null) {
            // Use only a page-owned image from the immutable published site,
            // never caller-controlled arbitrary URLs or private editor assets.
            foreach ($page['sections'] as $section) {
                foreach (array_merge($section['elements'],$section['items']??[]) as $element) {
                    $mediaId=$element['values']['content.media']??null;
                    if (!is_string($mediaId)||$mediaId==='') continue;
                    foreach ($site['assets'] as $asset) {
                        if ($asset['id']!==$mediaId) continue;
                        $social.='<meta property="og:image" content="'.
                            self::h($publicOrigin.$mount.$asset['src']).'">';
                        if ($asset['alt']!=='')
                            $social.='<meta property="og:image:alt" content="'.self::h($asset['alt']).'">';
                        break 3;
                    }
                }
            }
        }


        return '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width,initial-scale=1">'
            . '<title>' . $title . '</title>' . $description . $robots . $canonical . $social . '<style>' . self::themeCss($site)
            . '*,*:before,*:after{box-sizing:border-box}body{margin:0;background:var(--cms-bg);color:var(--cms-text);font:16px/1.6 var(--cms-font)}'
            . 'header,main,footer{max-width:var(--cms-width);margin:auto;padding:24px}nav{display:flex;flex-wrap:wrap;gap:18px}a{color:inherit}'
            . 'section{padding:64px 24px;border-bottom:1px solid #e2e8f0}h1{font-size:var(--title-desktop);color:var(--title-color);line-height:1.1;max-width:960px}'
            . 'h2{font-size:clamp(28px,3vw,42px);line-height:1.2}.hero{padding-block:90px}.action{display:inline-block;background:var(--cms-primary);color:white;'
            . 'padding:14px 22px;border-radius:9px;text-decoration:none;font-weight:700}.feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}'
            . 'article{padding:24px;background:var(--cms-surface);border:1px solid #e1e8f1;border-radius:12px}'
            . '.showcase-photo{display:block;width:100%;height:auto;max-height:680px;object-fit:contain;border-radius:16px;background:#e4ebf3}'
            . '.lead-form{display:grid;gap:16px;max-width:700px}.lead-form label{display:grid;gap:6px;font-weight:600}.lead-form input:not([type=checkbox]),.lead-form textarea,.lead-form select{padding:12px;border:1px solid #a5b3c4;border-radius:8px;font:inherit;width:100%}.lead-form button{border:0;cursor:pointer}.lead-consent{display:flex!important;flex-direction:row;align-items:flex-start}.lead-honey{position:absolute!important;left:-10000px!important;width:1px;height:1px;overflow:hidden}'
            . '.repeat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:20px}.repeat-grid article,.repeat-grid .review,.repeat-grid figure{background:var(--cms-surface);border:1px solid #e1e8f1;padding:24px;margin:0;border-radius:12px}.repeat-grid h3{margin:0 0 12px}.repeat-grid .review blockquote{margin:0 0 16px;font-size:19px}.repeat-grid figcaption{font-size:14px;opacity:.75}.repeat-grid img{max-width:100%;height:auto;max-height:420px;object-fit:contain}.faq{max-width:850px}.faq details{border-bottom:1px solid #d0d8e2;padding:18px}.faq summary{cursor:pointer;font-weight:700}.service-link{display:inline-flex;padding-top:14px}'
            . '.story-layout{display:grid;grid-template-columns:1fr 1fr;gap:30px;align-items:center}.story-copy p{max-width:65ch}.story-photo{display:block;width:100%;max-height:620px;object-fit:contain;border-radius:16px}.partner-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(170px,100%),1fr));gap:16px}.partner-logo{border:1px solid #e1e8f1;border-radius:12px;display:grid;justify-items:center;gap:8px;text-align:center;padding:18px;background:var(--cms-surface);text-decoration:none}.partner-logo img{max-width:100%;width:auto;height:80px;object-fit:contain}.partner-logo span{font-weight:700;font-size:14px}'
            . '.cta-banner{background:var(--cms-surface)}.cta-banner p{max-width:650px}.cta-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px}.cta-actions .action{margin:0}.cta-actions .action:last-child{background:transparent;color:var(--cms-primary);box-shadow:inset 0 0 0 2px currentColor}'
            . '.cms-width-narrow>section{max-width:780px;margin-inline:auto}.cms-width-wide>section{max-width:none}.cms-heading-compact>section h2{font-size:clamp(24px,2.5vw,34px)}.cms-heading-expressive>section h2{font-size:clamp(36px,4.5vw,56px)}'
            . '.cms-corners-soft>section :is(article,.review,figure,img,.action,details){border-radius:12px}.cms-corners-round>section :is(article,.review,figure,img,.action,details){border-radius:28px}'
            . '.cms-button-outline>section .action{background:transparent;color:var(--cms-primary);box-shadow:inset 0 0 0 2px currentColor}.cms-button-pill>section .action{border-radius:999px}'
            . '.cms-surface-paper>section{background:var(--cms-surface)}.cms-surface-tint>section{background:#ecf4fc}.cms-surface-dark>section{background:#112536;color:#f5f9fe}.cms-surface-dark>section a:not(.action){color:#cdefff}.cms-spacing-tight>section{padding-top:25px;padding-bottom:25px}.cms-spacing-airy>section{padding-top:110px;padding-bottom:110px}.cms-align-center>section{text-align:center}.cms-align-center>section>p{margin-left:auto;margin-right:auto}'
            . '@media(max-width:900px){h1{font-size:var(--title-tablet)}}'
            . '@media(max-width:600px){.cms-mobile-align-left>section{text-align:left}.cms-mobile-align-center>section{text-align:center}.cms-mobile-spacing-tight>section{padding-top:24px;padding-bottom:24px}.cms-mobile-spacing-normal>section{padding-top:40px;padding-bottom:40px}.cms-mobile-spacing-airy>section{padding-top:72px;padding-bottom:72px}section{padding:40px 8px}.hero{padding-block:48px}.feature-grid{grid-template-columns:1fr}.story-layout{grid-template-columns:1fr}h1{font-size:var(--title-mobile)}}'
            . '</style></head><body><header><nav aria-label="Навигация">' . $navigation
            . '</nav></header><main>' . $body . '</main><footer>'
            . self::h($site['title']) . '</footer></body></html>';
    }
}
