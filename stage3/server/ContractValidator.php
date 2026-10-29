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
                self::must(is_string($v) && ($v === '' || (isset($assets[$v]) && str_starts_with($assets[$v],'image/'))), 'Missing image media');
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
        self::keys($t,['background','surface','text','primary','font','maxWidth','bodySize','lineHeight','headingScale','buttonStyle','buttonRadius','buttonText','fontFiles']);
        foreach (['background','surface','text','primary'] as $name)
            self::must(is_string($t[$name]) && preg_match('/^#[0-9a-fA-F]{6}$/D',$t[$name])===1,'Invalid theme color');
        self::must(in_array($t['font'],['system','arial','georgia'],true)
            && is_int($t['maxWidth']) && $t['maxWidth']>=680 && $t['maxWidth']<=1600,'Invalid theme font/width');
        if (array_key_exists('bodySize',$t)) self::must(is_int($t['bodySize']) && $t['bodySize']>=14 && $t['bodySize']<=22,'Invalid global body size');
        if (array_key_exists('lineHeight',$t)) self::must(in_array($t['lineHeight'],['compact','normal','relaxed'],true),'Invalid global line height');
        if (array_key_exists('headingScale',$t)) self::must(in_array($t['headingScale'],['compact','normal','large'],true),'Invalid global heading scale');
        if (array_key_exists('buttonStyle',$t)) self::must(in_array($t['buttonStyle'],['solid','outline','pill'],true),'Invalid global button style');
        if (array_key_exists('buttonRadius',$t)) self::must(is_int($t['buttonRadius']) && $t['buttonRadius']>=0 && $t['buttonRadius']<=32,'Invalid global button radius');
        if (array_key_exists('buttonText',$t)) self::must(is_string($t['buttonText']) && preg_match('/^#[0-9a-fA-F]{6}$/D',$t['buttonText'])===1,'Invalid global button text color');
    }
    private static function seo(mixed $s, array $assets): void
    {
        self::keys($s,['title','description','robots','ogTitle','ogDescription','ogImage']);
        foreach (['title'=>160,'description'=>300] as $name=>$max)
            self::must(is_string($s[$name]) && mb_strlen($s[$name],'UTF-8')<=$max
                && !preg_match('/[\x00-\x1f]/',$s[$name]),'Invalid SEO text');
        self::must(in_array($s['robots'],['index','noindex'],true),'Invalid robots metadata');
        foreach (['ogTitle'=>160,'ogDescription'=>300] as $name=>$max) {
            if (!array_key_exists($name,$s)) continue;
            self::must(is_string($s[$name]) && mb_strlen($s[$name],'UTF-8')<=$max
                && !preg_match('/[\x00-\x1f]/',$s[$name]),'Invalid social metadata');
        }
        if (array_key_exists('ogImage',$s)) {
            $image=$s['ogImage'];
            self::must(is_string($image) && ($image==='' ||
                (preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$image)===1
                    && in_array($assets[$image]??null,['image/png','image/jpeg','image/webp'],true))),
                'Invalid SEO social image');
        }
    }
    private static function navigation(mixed $n): void
    {
        self::keys($n,['label','hidden','parentId']);
        self::must(is_string($n['label']) && mb_strlen($n['label'],'UTF-8')<=100
            && !preg_match('/[\x00-\x1f]/',$n['label']) && is_bool($n['hidden'])
            && (!array_key_exists('parentId',$n)||(is_string($n['parentId'])
                && preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$n['parentId'])===1)),'Invalid navigation');
    }
    private static function menu(mixed $menu): void
    {
        self::keys($menu,['style','sticky','mobile','ctaPageId','ctaLabel']);
        self::must(in_array($menu['style']??null,['default','quiet','bold'],true)
            && is_bool($menu['sticky']??null)
            && in_array($menu['mobile']??null,['collapsible','expanded'],true)
            && is_string($menu['ctaPageId']??null)
            && ($menu['ctaPageId']==='' || preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$menu['ctaPageId'])===1)
            && is_string($menu['ctaLabel']??null)
            && mb_strlen($menu['ctaLabel'],'UTF-8')<=64
            && !preg_match('/[\\x00-\\x1f]/',$menu['ctaLabel'])
            && (($menu['ctaPageId']==='' && $menu['ctaLabel']==='')
                || ($menu['ctaPageId']!=='' && trim($menu['ctaLabel'])!=='')),
            'Invalid global menu settings');
    }

    private static function header(mixed $h,array $pages): void
    {
        self::keys($h,['notice','noticePageId','email','phone','tone','mobile']);
        foreach(['notice'=>180,'email'=>254,'phone'=>32] as $key=>$max)
            self::must(is_string($h[$key]??null)&&mb_strlen($h[$key],'UTF-8')<=$max
                &&preg_match('/[\x00-\x1f]/',$h[$key])!==1,'Invalid header text');
        self::must(is_string($h['noticePageId']??null)
            &&in_array($h['tone']??null,['light','dark','primary'],true)
            &&in_array($h['mobile']??null,['show','hide'],true),
            'Invalid header settings');
        self::must($h['noticePageId']===''||(trim($h['notice'])!==''&&
            in_array($h['noticePageId'],array_column($pages,'id'),true)),
            'Invalid header page destination');
        self::must($h['email']===''||preg_match('/^[a-zA-Z0-9.!#$%&\x27*+\/=?^_\x60{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/D',$h['email'])===1,
            'Invalid header email');
        self::must($h['phone']===''||(preg_match('/^\+?[0-9 ()-]{6,32}$/D',$h['phone'])===1
            &&preg_match_all('/[0-9]/',$h['phone'])>=6),'Invalid header phone');
    }

    private static function footer(mixed $footer,array $pages): void
    {
        self::keys($footer,['description','email','phone','links','socials','style','layout']);
        self::must(!isset($footer['style'])||in_array($footer['style'],['light','dark','primary'],true),
            'Invalid footer color style');
        self::must(!isset($footer['layout'])||in_array($footer['layout'],['columns','stacked'],true),
            'Invalid footer layout');
        foreach(['description'=>300,'email'=>254,'phone'=>32] as $key=>$max)
            self::must(is_string($footer[$key]??null)&&strlen($footer[$key])<=$max
                &&preg_match('/[\x00-\x1f]/',$footer[$key])!==1,'Invalid footer text or contacts');
        $email=$footer['email'];$phone=$footer['phone'];
        self::must($email===''||preg_match('/^[a-zA-Z0-9.!#$%&\x27*+\/=?^_`{|}~-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,24}$/D',$email)===1,
            'Invalid footer email');
        self::must($phone===''||(preg_match('/^\+?[0-9 ()-]{6,32}$/D',$phone)===1
            &&preg_match_all('/[0-9]/',$phone)>=6),'Invalid footer phone');
        self::must(is_array($footer['links']??null)&&array_is_list($footer['links'])
            &&count($footer['links'])<=8&&is_array($footer['socials']??null)
            &&array_is_list($footer['socials'])&&count($footer['socials'])<=8,'Invalid footer collections');
        $pageIds=array_column($pages,'id');$seen=[];
        foreach($footer['links'] as $link){
            self::keys($link,['label','pageId']);
            self::must(is_string($link['label']??null)&&strlen($link['label'])<=70
                &&trim($link['label'])!==''&&preg_match('/[\x00-\x1f]/',$link['label'])!==1
                &&is_string($link['pageId']??null)&&in_array($link['pageId'],$pageIds,true)
                &&!isset($seen[$link['pageId']]),'Invalid footer page link');
            $seen[$link['pageId']]=true;
        }
        $domains=[
            'instagram'=>['instagram.com'],'facebook'=>['facebook.com','fb.com'],
            'linkedin'=>['linkedin.com'],'youtube'=>['youtube.com','youtu.be'],
            'telegram'=>['t.me'],'whatsapp'=>['wa.me','whatsapp.com'],
            'tiktok'=>['tiktok.com'],'x'=>['x.com','twitter.com'],'github'=>['github.com']];
        $seen=[];
        foreach($footer['socials'] as $social){
            self::keys($social,['network','url']);
            $network=$social['network']??null;$url=$social['url']??null;
            self::must(is_string($network)&&isset($domains[$network])&&!isset($seen[$network])
                &&is_string($url)&&strlen($url)<=300
                &&preg_match('/[\x00-\x20<>"\x27]/',$url)!==1,'Invalid social link');
            $parts=parse_url($url);
            self::must(is_array($parts)&&($parts['scheme']??null)==='https'
                &&!isset($parts['user'])&&!isset($parts['pass'])&&!isset($parts['port'])
                &&isset($parts['host']),'Footer social HTTPS required');
            $host=strtolower($parts['host']);
            self::must(in_array($host,$domains[$network],true)
                ||(str_starts_with($host,'www.')
                    &&in_array(substr($host,4),$domains[$network],true)),
                'Footer social host mismatches network');
            $seen[$network]=true;
        }
    }

    /** Normalize one linked instance without its page/element/graph IDs. */
    private static function sharedShape(array $section): array
    {
        unset($section['id'],$section['sharedKey']);
        foreach($section['elements'] as &$element)unset($element['id']);
        unset($element);
        if(isset($section['items'])){
            foreach($section['items'] as &$item)unset($item['id']);
            unset($item);
        }
        if(isset($section['designGraph'])){
            $mapping=[];$number=0;
            $index=static function(array $nodes) use (&$index,&$mapping,&$number):void{
                foreach($nodes as $node){
                    $mapping[$node['id']]='shared-node-'.(++$number);
                    if(isset($node['children']))$index($node['children']);
                }
            };
            $index($section['designGraph']['nodes']);
            $normalize=static function(array &$nodes) use (&$normalize,$mapping):void{
                foreach($nodes as &$node){
                    if(isset($node['popupTarget']))$node['popupTarget']=$mapping[$node['popupTarget']]??'missing-target';
                    $node['id']=$mapping[$node['id']];
                    if(isset($node['children']))$normalize($node['children']);
                }
                unset($node);
            };
            $section['designGraph']['id']='shared-design';
            $normalize($section['designGraph']['nodes']);
        }
        return $section;
    }
    public function validate(mixed $site): array
    {
        self::keys($site, ['format', 'siteId', 'title', 'schemaVersion', 'assets', 'pages', 'theme', 'redirects', 'menu', 'designTokens', 'language', 'branding', 'footer', 'header']);
        DesignGraph::tokens($site['designTokens']??null);
        if (array_key_exists('menu',$site)) self::menu($site['menu']);
        if (array_key_exists('header',$site)) self::header($site['header'],$site['pages']??[]);
        if (array_key_exists('theme',$site)) self::theme($site['theme']);
        self::must(!array_key_exists('language',$site) || in_array($site['language'],['ru','en','pl','de','be','uk'],true), 'Invalid site language');
        self::must(($site['format'] ?? null) === 'manufact-ai-site-v1'
            && ($site['schemaVersion'] ?? null) === 1, 'Unsupported site format');
        self::id($site['siteId']);
        self::label($site['title'], 130);
        self::must(is_array($site['assets']) && array_is_list($site['assets']) && count($site['assets']) <= 300, 'Invalid assets');
        $assets = [];
        $ids = [$site['siteId'] => true];
        foreach ($site['assets'] as $a) {
            self::keys($a, ['id', 'src', 'alt', 'mime', 'variants', 'width', 'height']);
            self::id($a['id']);
            self::must(!isset($assets[$a['id']])
                && in_array($a['mime'], ['image/png','image/webp','image/jpeg','image/svg+xml','video/mp4','font/woff2'], true)
                && is_string($a['src'])
                && preg_match('~^/assets/[a-zA-Z0-9/_-]+\.(png|webp|jpg|jpeg|svg|mp4|woff2)$~D', $a['src']) === 1
                && is_string($a['alt']) && strlen($a['alt']) <= 200 && preg_match('/[\x00-\x1f]/',$a['alt'])!==1, 'Invalid asset');
            $hasWidth = array_key_exists('width', $a);
            $hasHeight = array_key_exists('height', $a);
            self::must($hasWidth === $hasHeight && (!$hasWidth
                || (in_array($a['mime'], ['image/png','image/jpeg','image/webp'], true)
                    && is_int($a['width']) && $a['width'] >= 1 && $a['width'] <= 4096
                    && is_int($a['height']) && $a['height'] >= 1 && $a['height'] <= 4096)),
                'Invalid intrinsic image dimensions');
            self::must(!isset($ids[$a['id']]), 'Duplicate asset ID');
            $assets[$a['id']] = $a['mime'];
            if($a['mime']==='video/mp4')self::must($a['src']==='/assets/'.$a['id'].'.mp4','Invalid video URL');
            if($a['mime']==='font/woff2')self::must($a['src']==='/assets/'.$a['id'].'.woff2','Invalid WOFF2 path');
            $ids[$a['id']] = true;
            if (array_key_exists('variants', $a)) {
                self::must(is_array($a['variants']) && array_is_list($a['variants'])
                    && count($a['variants']) <= 3 && !in_array($a['mime'],['image/svg+xml','video/mp4','font/woff2'],true),
                    'Invalid responsive variants');
                $widths = [];
                $ext = ['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp'][$a['mime']];
                foreach ($a['variants'] as $variant) {
                    self::keys($variant, ['id','src','sha256','width','height']);
                    self::id($variant['id']);
                    self::must(!isset($ids[$variant['id']]) && in_array($variant['width'], [360,720,1200], true)
                        && !isset($widths[$variant['width']])
                        && is_int($variant['height']) && $variant['height'] >= 1 && $variant['height'] <= 4096
                        && is_string($variant['sha256']) && preg_match('/^[a-f0-9]{64}$/D', $variant['sha256']) === 1
                        && $variant['src'] === '/assets/'.$variant['id'].'.'.$ext, 'Invalid responsive variant');
                    $ids[$variant['id']] = true; $widths[$variant['width']] = true;
                }
            }
        }
        if(array_key_exists('footer',$site))self::footer($site['footer'],$site['pages']);
        if(array_key_exists('branding',$site)){
            $branding=$site['branding'];
            self::keys($branding,['logoAssetId','mobileLogoAssetId','faviconAssetId','logoWidth']);
            foreach(['logoAssetId','mobileLogoAssetId','faviconAssetId'] as $key){
                if(!array_key_exists($key,$branding))continue;
                $id=$branding[$key];
                self::must(is_string($id)&&($id===''||
                    in_array($assets[$id]??null,['image/png','image/jpeg','image/webp'],true)),
                    'Brand must use existing raster media');
                if($key==='faviconAssetId'&&$id!=='')
                    self::must(($assets[$id]??null)==='image/png','Favicon must be PNG');
            }
            self::must(empty($branding['mobileLogoAssetId'])||!empty($branding['logoAssetId']),
                'Mobile logo requires desktop logo');
            if(array_key_exists('logoWidth',$branding))
                self::must(is_int($branding['logoWidth'])&&$branding['logoWidth']>=48&&$branding['logoWidth']<=320,
                    'Invalid site logo width');
        }
        if (isset($site['theme']['fontFiles'])) {
            $faces=$site['theme']['fontFiles'];
            self::keys($faces,['body','heading']);
            self::must(count($faces)>0,'At least one WOFF2 font required');
            foreach($faces as $role=>$assetId)
                self::must(is_string($assetId)&&($assets[$assetId]??null)==='font/woff2',
                    'Theme font must reference a site-owned WOFF2 asset');
        }
        self::must(is_array($site['pages']) && array_is_list($site['pages'])
            && count($site['pages']) >= 1 && count($site['pages']) <= 100, 'Invalid pages');
        $paths = [];$sharedGroups=[];
        foreach ($site['pages'] as $page) {
            self::keys($page, ['id', 'path', 'title', 'sections', 'seo', 'navigation']);
            if (array_key_exists('seo',$page)) self::seo($page['seo'],$assets);
            if (array_key_exists('navigation',$page)) self::navigation($page['navigation']);
            self::uniqueId($page['id'], $ids);
            self::label($page['title'], 160);
            self::must(is_string($page['path']) && preg_match(self::PATH, $page['path']) === 1
                && !isset($paths[$page['path']]), 'Invalid or duplicate page path');
            $paths[$page['path']] = true;
            self::must(is_array($page['sections']) && array_is_list($page['sections'])
                && count($page['sections']) >= 1 && count($page['sections']) <= 100, 'Invalid sections');
            foreach ($page['sections'] as $section) {
                self::keys($section, ['id', 'component', 'manifestVersion', 'elements', 'items', 'appearance', 'formFields', 'formSteps', 'designGraph','sharedKey']);
                if(array_key_exists('sharedKey',$section)){
                    self::id($section['sharedKey']);
                    $sharedGroups[$section['sharedKey']][]=['pageId'=>$page['id'],'section'=>$section];
                }
                if (array_key_exists('appearance',$section)) {
                    self::keys($section['appearance'],['surface','spacing','align','width','heading','corners','mobileAlign','mobileSpacing','button']);
                    self::must(in_array($section['appearance']['surface']??null,['default','paper','tint','dark'],true)
                        && in_array($section['appearance']['spacing']??null,['tight','normal','airy'],true)
                        && in_array($section['appearance']['align']??null,['left','center'],true),
                        'Invalid section appearance');
                    foreach (['width'=>['default','narrow','wide','edge'],
                        'heading'=>['default','compact','expressive'],
                        'corners'=>['default','soft','round'],
                        'mobileAlign'=>['inherit','left','center'],
                        'mobileSpacing'=>['inherit','tight','normal','airy'],
                        'button'=>['default','solid','outline','pill']] as $field=>$allowed) {
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
                FlexForm::definitions($section); // optional new fields, select dependencies and cross-field constraints
                FlexForm::steps($section); // all fields partitioned exactly once across 2–4 steps
                if ($section['component']==='custom-section')
                    self::must(array_key_exists('designGraph',$section),'Custom section requires a Design Graph');
                if (array_key_exists('designGraph',$section))
                    DesignGraph::validate($section['designGraph'],$assets,$ids,$site['designTokens']??null);
            }
        }
        foreach($sharedGroups as $key=>$members){
            self::must(count($members)<=20,'Too many shared section instances');
            $reference=json_encode(self::sharedShape($members[0]['section']),JSON_THROW_ON_ERROR);
            $visited=[];
            foreach($members as $member){
                self::must(!isset($visited[$member['pageId']]),'Shared section repeated on same page');
                $visited[$member['pageId']]=true;
                self::must(json_encode(self::sharedShape($member['section']),JSON_THROW_ON_ERROR)===$reference,
                    'Shared section copies diverged: '.$key);
            }
        }
        $pageIds=[];
        foreach ($site['pages'] as $page) $pageIds[$page['id']]=$page;
        foreach ($site['pages'] as $page) {
            $parentId=$page['navigation']['parentId']??null;
            if ($parentId===null) continue;
            $parent=$pageIds[$parentId]??null;
            self::must($parent!==null && $parentId!==$page['id'] && $page['path']!=='/'
                && !($parent['navigation']['hidden']??false)
                && !isset($parent['navigation']['parentId']),
                'Invalid menu hierarchy');
        }
        if (($site['menu']['ctaPageId']??'')!=='') {
            self::must(isset($pageIds[$site['menu']['ctaPageId']]),'Menu CTA destination missing');
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
