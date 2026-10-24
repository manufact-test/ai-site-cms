<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use InvalidArgumentException;

/**
 * Server-side validation of the SAME closed Stage3 document/manifest vocabulary
 * as stage3/sdk/contract.cjs. No JavaScript process required on shared hosting.
 * Only bundled, first-party manifest files may define editable properties.
 */
final class ContractValidator
{
    private array $registry = [];
    private const ID = '/^[a-z][a-z0-9-]{2,79}$/D';
    private const PATH = '~^/(?:[a-z0-9-]+/)*$~D';

    public function __construct(string $manifestDirectory)
    {
        foreach (glob(rtrim($manifestDirectory, '/'). '/*.json') ?: [] as $file) {
            $m = json_decode((string) file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
            self::keys($m, ['format', 'id', 'version', 'label', 'elements','repeat']);
            if (isset($m['repeat'])) {
                self::keys($m['repeat'], ['label','min','max','fields']);
                self::must(is_string($m['repeat']['label']) && is_int($m['repeat']['min'])
                    && is_int($m['repeat']['max']) && $m['repeat']['min']>=1
                    && $m['repeat']['max']<25 && $m['repeat']['min']<=$m['repeat']['max']
                    && is_array($m['repeat']['fields']) && array_is_list($m['repeat']['fields'])
                    && count($m['repeat']['fields'])>0 && count($m['repeat']['fields'])<=12,'Invalid repeater manifest');
            }
            self::must($m['format'] === 'manufact-ai-component-v1'
                && preg_match(self::ID, $m['id']) === 1
                && preg_match('/^\d+\.\d+\.\d+$/D', $m['version']) === 1, 'Invalid bundled manifest');
            self::must(is_array($m['elements']) && count($m['elements']) > 0, 'Empty manifest');
            self::must(!isset($this->registry[$m['id']]), 'Duplicate manifest');
            $this->registry[$m['id']] = $m;
        }
        self::must(count($this->registry) > 0, 'No registered components');
    }

    private static function must(bool $ok, string $message): void
    {
        if (!$ok) {
            throw new InvalidArgumentException($message);
        }
    }

    private static function keys(mixed $value, array $allowed): void
    {
        self::must(is_array($value) && !array_diff(array_keys($value), $allowed), 'Unexpected document keys');
    }

    private static function id(mixed $value): void
    {
        self::must(is_string($value) && preg_match(self::ID, $value) === 1, 'Invalid stable ID');
    }

    private static function label(mixed $value, int $max): void
    {
        self::must(is_string($value) && $value !== '' && preg_match_all('/./us', $value) !== false
            && preg_match_all('/./us', $value) <= $max
            && preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $value) !== 1, 'Invalid label');
    }

    private static function atom(array $field, mixed $v, array $assets): void
    {
        switch ($field['type']) {
            case 'text':
                self::must(is_string($v) && strlen($v) <= ($field['maxLength'] ?? 0)
                    && !str_contains($v, "\0"), 'Invalid text property');
                return;
            case 'boolean':
                self::must(is_bool($v), 'Invalid boolean property');
                return;
            case 'number':
                self::must((is_float($v) || is_int($v)) && is_finite((float)$v)
                    && $v >= $field['min'] && $v <= $field['max'], 'Invalid number property');
                return;
            case 'color':
                self::must(is_string($v) && preg_match('/^#[0-9a-fA-F]{6}$/D', $v) === 1, 'Invalid color');
                return;
            case 'length':
                $ok = is_string($v) && preg_match('/^(-?\d+(?:\.\d{1,3})?)(px|rem|%|vw|vh)$/D', $v, $parts);
                self::must((bool)$ok && in_array($parts[2], $field['units'], true)
                    && (float)$parts[1] >= $field['min'] && (float)$parts[1] <= $field['max'], 'Invalid length');
                return;
            case 'enum':
                self::must(is_string($v) && in_array($v, $field['options'], true), 'Invalid enum');
                return;
            case 'url':
                self::must(is_string($v) && strlen($v) <= 300 && (
                    (str_starts_with($v, '/') && !str_starts_with($v, '//')
                        && !str_contains($v, '\\') && preg_match('/[\s"\'<>]/', $v) !== 1)
                    || preg_match('~^https://[a-z0-9.-]+(?::443)?(?:/[^\s"\'<>\\\\]*)?$~iD', $v) === 1
                ), 'Unsafe URL');
                return;
            case 'media':
                self::must(is_string($v) && ($v === '' || isset($assets[$v])), 'Unregistered asset');
                return;
            default:
                throw new InvalidArgumentException('Unknown property type');
        }
    }

    private static function value(array $field, mixed $value, array $assets): void
    {
        if ($field['responsive'] === true) {
            self::must(is_array($value) && !array_is_list($value) && array_key_exists('desktop', $value)
                && !array_diff(array_keys($value), ['desktop', 'tablet', 'mobile']), 'Invalid responsive property');
            foreach ($value as $atom) {
                self::atom($field, $atom, $assets);
            }
        } else {
            self::atom($field, $value, $assets);
        }
    }


    private static function theme(mixed $t): void
    {
        self::keys($t,['background','surface','text','primary','font','maxWidth']);
        foreach (['background','surface','text','primary'] as $name)
            self::must(is_string($t[$name]) && preg_match('/^#[0-9a-fA-F]{6}$/D',$t[$name])===1,'Invalid theme color');
        self::must(in_array($t['font'],['system','arial','georgia'],true)
            && is_int($t['maxWidth']) && $t['maxWidth']>=680 && $t['maxWidth']<=1600,'Invalid theme font/width');
    }
    private static function seo(mixed $s): void
    {
        self::keys($s,['title','description','robots']);
        foreach (['title'=>160,'description'=>300] as $name=>$max)
            self::must(is_string($s[$name]) && mb_strlen($s[$name],'UTF-8')<=$max
                && !preg_match('/[\x00-\x1f]/',$s[$name]),'Invalid SEO text');
        self::must(in_array($s['robots'],['index','noindex'],true),'Invalid robots metadata');
    }
    private static function navigation(mixed $n): void
    {
        self::keys($n,['label','hidden']);
        self::must(is_string($n['label']) && mb_strlen($n['label'],'UTF-8')<=100
            && !preg_match('/[\x00-\x1f]/',$n['label']) && is_bool($n['hidden']),'Invalid navigation');
    }
    public function validate(mixed $site): array
    {
        self::keys($site, ['format', 'siteId', 'title', 'schemaVersion', 'assets', 'pages', 'theme', 'redirects']);
        if (array_key_exists('theme',$site)) self::theme($site['theme']);
        self::must(($site['format'] ?? null) === 'manufact-ai-site-v1'
            && ($site['schemaVersion'] ?? null) === 1, 'Unsupported site format');
        self::id($site['siteId']);
        self::label($site['title'], 130);
        self::must(is_array($site['assets']) && array_is_list($site['assets']) && count($site['assets']) <= 300, 'Invalid assets');
        $assets = [];
        $ids = [$site['siteId'] => true];
        foreach ($site['assets'] as $a) {
            self::keys($a, ['id', 'src', 'alt', 'mime']);
            self::id($a['id']);
            self::must(!isset($assets[$a['id']])
                && in_array($a['mime'], ['image/png','image/webp','image/jpeg','image/svg+xml'], true)
                && is_string($a['src'])
                && preg_match('~^/assets/[a-zA-Z0-9/_-]+\.(png|webp|jpg|jpeg|svg)$~D', $a['src']) === 1
                && is_string($a['alt']) && strlen($a['alt']) <= 200 && preg_match('/[\x00-\x1f]/',$a['alt'])!==1, 'Invalid asset');
            $assets[$a['id']] = true;
            $ids[$a['id']] = true;
        }
        self::must(is_array($site['pages']) && array_is_list($site['pages'])
            && count($site['pages']) >= 1 && count($site['pages']) <= 100, 'Invalid pages');
        $paths = [];
        foreach ($site['pages'] as $page) {
            self::keys($page, ['id', 'path', 'title', 'sections', 'seo', 'navigation']);
            if (array_key_exists('seo',$page)) self::seo($page['seo']);
            if (array_key_exists('navigation',$page)) self::navigation($page['navigation']);
            self::uniqueId($page['id'], $ids);
            self::label($page['title'], 160);
            self::must(is_string($page['path']) && preg_match(self::PATH, $page['path']) === 1
                && !isset($paths[$page['path']]), 'Invalid or duplicate page path');
            $paths[$page['path']] = true;
            self::must(is_array($page['sections']) && array_is_list($page['sections'])
                && count($page['sections']) >= 1 && count($page['sections']) <= 100, 'Invalid sections');
            foreach ($page['sections'] as $section) {
                self::keys($section, ['id', 'component', 'manifestVersion', 'elements', 'items', 'appearance']);
                if (array_key_exists('appearance',$section)) {
                    self::keys($section['appearance'],['surface','spacing','align','width','heading','corners','mobileAlign','mobileSpacing','button']);
                    self::must(in_array($section['appearance']['surface']??null,['default','paper','tint','dark'],true)
                        && in_array($section['appearance']['spacing']??null,['tight','normal','airy'],true)
                        && in_array($section['appearance']['align']??null,['left','center'],true),
                        'Invalid section appearance');
                    foreach (['width'=>['default','narrow','wide'],
                        'heading'=>['default','compact','expressive'],
                        'corners'=>['default','soft','round'],
                        'mobileAlign'=>['inherit','left','center'],
                        'mobileSpacing'=>['inherit','tight','normal','airy'],
                        'button'=>['default','outline','pill']] as $field=>$allowed) {
                        if (array_key_exists($field,$section['appearance']))
                            self::must(in_array($section['appearance'][$field],$allowed,true),
                                'Invalid section appearance '.$field);
                    }
                }
                self::uniqueId($section['id'], $ids);
                $manifest = $this->registry[$section['component']] ?? null;
                self::must($manifest !== null && $manifest['version'] === $section['manifestVersion'],
                    'Unregistered component or version');
                self::must(is_array($section['elements']) && array_is_list($section['elements'])
                    && count($section['elements']) === count($manifest['elements']), 'Incomplete section');
                $indexed = [];
                foreach ($section['elements'] as $element) {
                    self::keys($element, ['id', 'slot', 'values']);
                    self::uniqueId($element['id'], $ids);
                    self::must(is_string($element['slot']) && !isset($indexed[$element['slot']]),
                        'Duplicate slot');
                    $indexed[$element['slot']] = $element;
                }
                foreach ($manifest['elements'] as $slot) {
                    $element = $indexed[$slot['slot']] ?? null;
                    self::must($element !== null && is_array($element['values']), 'Missing slot values');
                    $declared = [];
                    foreach ($slot['fields'] as $field) {
                        $declared[$field['path']] = $field;
                    }
                    self::must(count($element['values']) === count($declared)
                        && !array_diff(array_keys($element['values']), array_keys($declared)), 'Unknown or missing property');
                    foreach ($declared as $path => $field) {
                        self::must(array_key_exists($path, $element['values']), 'Missing property');
                        self::value($field, $element['values'][$path], $assets);
                    }
                }
                if (isset($manifest['repeat'])) {
                    $repeat=$manifest['repeat'];
                    self::must(isset($section['items']) && is_array($section['items']) && array_is_list($section['items'])
                        && count($section['items'])>=$repeat['min'] && count($section['items'])<=$repeat['max'],'Invalid repeat count');
                    $declared=[];
                    foreach ($repeat['fields'] as $field) $declared[$field['path']]=$field;
                    foreach ($section['items'] as $item) {
                        self::keys($item,['id','values']);
                        self::uniqueId($item['id'],$ids);
                        self::must(is_array($item['values']) && count($item['values'])===count($declared)
                            && !array_diff(array_keys($item['values']),array_keys($declared)),'Invalid repeat values');
                        foreach ($declared as $path=>$field) {
                            self::must(array_key_exists($path,$item['values']),'Missing repeat field');
                            self::value($field,$item['values'][$path],$assets);
                        }
                    }
                } else self::must(!array_key_exists('items',$section),'Undeclared repeater');
            }
        }
        if (array_key_exists('redirects',$site)) {
            self::must(is_array($site['redirects']) && array_is_list($site['redirects'])
                && count($site['redirects'])<=60,'Invalid redirect list');
            $seen=[];
            foreach ($site['redirects'] as $redirect) {
                self::keys($redirect,['from','to']);
                $from=$redirect['from']??null;$to=$redirect['to']??null;
                self::must(is_string($from)&&is_string($to)
                    && preg_match(self::PATH,$from)===1&&preg_match(self::PATH,$to)===1
                    && $from!=='/'&&$from!==$to&&!isset($paths[$from])
                    && isset($paths[$to])&&!isset($seen[$from]),'Invalid redirect alias or destination');
                $seen[$from]=true;
            }
        }
        return $site;
    }

    private static function uniqueId(mixed $id, array &$ids): void
    {
        self::id($id);
        self::must(!isset($ids[$id]), 'Duplicate stable ID');
        $ids[$id] = true;
    }
}
