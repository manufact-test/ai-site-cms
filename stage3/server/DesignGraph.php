<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use InvalidArgumentException;

/**
 * Safe, opt-in Design Graph host. No arbitrary tags, CSS strings, scripts or event handlers.
 * This is CMS-side bridge v1, not a claim of compatibility with unfinished Design Factory.
 */
final class DesignGraph
{
    private const IDENT='/^[a-z][a-z0-9-]{2,79}$/D';
    private const TOKEN='/^[a-z][a-z0-9-]{1,39}$/D';
    private const HEX='/^#[0-9a-fA-F]{6}$/D';
    private const STYLES=['display','columns','direction','align','justify','gap','padding','radius',
        'color','background','fontSize','fontWeight','lineHeight','maxWidth','position',
        'top','left','opacity','borderColor','borderWidth','textAlign','order','hidden',
        'rowGap','columnGap','paddingX','paddingY','marginTop','marginBottom','widthPercent',
        'minHeight','gridColumnSpan','flexWrap','flexGrow','alignSelf','letterSpacing',
        'fontFamily','objectFit','aspectRatio','overflow','shadow','gradient','fluidFont','right','bottom','zIndex','widthPx','heightPx','minWidth','maxHeight','gridRowSpan','flexBasisPercent','flexShrink','justifySelf','alignContent','gridAutoFlow','objectPositionX','objectPositionY','outlineColor','outlineWidth','textDecoration','whiteSpace','fontStyle','textTransform','textWrap','wordBreak','textOverflow','textShadow','gridColumnsPreset','transformOrigin','isolation','mixBlendMode','clipShape','wordSpacing','textIndent','gridColumnStart','gridRowStart','translateX','translateY','rotateDeg','scalePercent','backdropBlur','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius','borderStyle','filterPreset'];
    private const ICON_PATHS=[
        'check'=>'<path d="M5 12l4 4L19 6"/>',
        'arrow'=>'<path d="M5 12h14m-6-6 6 6-6 6"/>',
        'star'=>'<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z"/>',
        'sparkles'=>'<path d="m12 3 2 7 7 2-7 2-2 7-7-2 7-2z"/>',
        'shield'=>'<path d="M12 2 20 6v6c0 5-3 8-8 10-5-2-8-5-8-10V6z"/>',
        'clock'=>'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
        'mail'=>'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        'play'=>'<path d="m8 5 12 7-12 7z"/>',
        'menu'=>'<path d="M4 7h16M4 12h16M4 17h16"/>'
    ];
    private const MOTIONS=['none','fade-in','fade-up','slide-left','zoom-in'];
    private const DEFAULT_TOKENS=[
        'colors'=>['foreground'=>'#182b3d','background'=>'#ffffff','accent'=>'#0a5bff','muted'=>'#667788'],
        'spacing'=>['small'=>12,'medium'=>24,'large'=>48],
        'radii'=>['soft'=>12,'round'=>24],
        'typography'=>['body'=>16,'heading'=>42]
    ];

    private static function check(bool $ok, string $why): void
    {
        if (!$ok) throw new InvalidArgumentException('Design Graph '.$why);
    }
    private static function keys(mixed $o,array $keys,string $at): void
    {
        self::check(is_array($o) && (count($o)===0 || !array_is_list($o))
            && !array_diff(array_keys($o),$keys),$at.' unexpected keys');
    }
    private static function integer(mixed $n,int $min,int $max): bool
    {
        return is_int($n) && $n >= $min && $n <= $max;
    }
    public static function tokens(mixed $given): array
    {
        $tokens=$given??self::DEFAULT_TOKENS;
        self::keys($tokens,['colors','spacing','radii','typography'],'tokens');
        foreach (['colors','spacing','radii','typography'] as $kind) {
            self::check(isset($tokens[$kind]) && is_array($tokens[$kind])
                && count($tokens[$kind]) <= 30,'token collection '.$kind);
            foreach ($tokens[$kind] as $name=>$value) {
                self::check(is_string($name) && preg_match(self::TOKEN,$name)===1,'token id '.$kind);
                self::check($kind==='colors'
                    ? is_string($value) && preg_match(self::HEX,$value)===1
                    : self::integer($value,$kind==='typography'?8:0,$kind==='typography'?120:240),
                    'token value '.$kind.'/'.$name);
            }
        }
        return $tokens;
    }
    private static function resolve(mixed $v,string $kind,array $tokens,string $at): string|int
    {
        if (is_string($v) && str_starts_with($v,'@')) {
            $key=substr($v,1);
            self::check(array_key_exists($key,$tokens[$kind]),$at.' unknown token');
            return $tokens[$kind][$key];
        }
        self::check($kind==='colors'
            ? is_string($v)&&preg_match(self::HEX,$v)===1
            : self::integer($v,0,$kind==='typography'?120:240),$at.' invalid value');
        return $v;
    }
    private static function style(mixed $style,array $tokens,string $at,bool $state=false): void
    {
        self::keys($style,self::STYLES,$at);
        $enums=[
            'display'=>['block','grid','flex','none'],'direction'=>['row','column'],
            'align'=>['start','center','end','stretch','between'],
            'justify'=>['start','center','end','stretch','between'],
            'alignSelf'=>['auto','start','center','end','stretch'],
            'position'=>['static','relative','absolute'],'textAlign'=>['left','center','right'],
            'flexWrap'=>['nowrap','wrap'],
            'fontFamily'=>['inherit','system','arial','georgia','serif','mono'],
            'objectFit'=>['cover','contain','fill','none'],
            'aspectRatio'=>['auto','square','portrait','landscape','wide'],
            'overflow'=>['visible','hidden','auto'],'shadow'=>['none','soft','medium','strong'],'justifySelf'=>['auto','start','center','end','stretch'],'alignContent'=>['start','center','end','stretch','between'],'gridAutoFlow'=>['row','column','row-dense','column-dense'],'textDecoration'=>['none','underline','line-through'],'whiteSpace'=>['normal','nowrap','pre-line'],
            'fontStyle'=>['normal','italic'],'textTransform'=>['none','uppercase','lowercase','capitalize'],'textWrap'=>['wrap','balance','pretty','nowrap'],'wordBreak'=>['normal','break-all','break-word'],'textOverflow'=>['clip','ellipsis'],'textShadow'=>['none','soft','strong'],'gridColumnsPreset'=>['sidebar-left','sidebar-right','wide-center','editorial'],'transformOrigin'=>['center','top-left','top-right','bottom-left','bottom-right'],'isolation'=>['auto','isolate'],'mixBlendMode'=>['normal','multiply','screen','overlay','darken','lighten'],'clipShape'=>['none','circle','ellipse','diagonal','hexagon'],'borderStyle'=>['solid','dashed','dotted','double'],'filterPreset'=>['none','grayscale','sepia','contrast','vibrant']];
        $ranges=['columns'=>[1,12],'gridColumnSpan'=>[1,12],'flexGrow'=>[0,6],
            'fontWeight'=>[100,900],'lineHeight'=>[80,250],'letterSpacing'=>[-50,200],
            'maxWidth'=>[0,1920],'widthPercent'=>[1,100],
            'borderWidth'=>[0,12],'order'=>[-30,30],'opacity'=>[0,100],
            'outlineWidth'=>[0,8],'zIndex'=>[-10,30],'widthPx'=>[1,1920],'heightPx'=>[1,1400],'minWidth'=>[0,1920],'maxHeight'=>[0,1600],'gridRowSpan'=>[1,12],'flexBasisPercent'=>[0,100],'flexShrink'=>[0,1],'objectPositionX'=>[0,100],'objectPositionY'=>[0,100],'marginTop'=>[-160,160],'marginBottom'=>[-160,160],'wordSpacing'=>[-40,100],'textIndent'=>[-100,200],'gridColumnStart'=>[1,13],'gridRowStart'=>[1,13],'translateX'=>[-600,600],'translateY'=>[-600,600],'rotateDeg'=>[-180,180],'scalePercent'=>[50,200],'backdropBlur'=>[0,32]];
        foreach ($style as $key=>$value) {
            if ($state)self::check(in_array($key,
                ['color','background','borderColor','borderWidth','borderStyle','radius','opacity','gradient','outlineColor','outlineWidth','filterPreset'],true),
                $at.' unsafe state property');
            if (in_array($key,['color','background','borderColor','outlineColor'],true)){
                self::resolve($value,'colors',$tokens,$at.'/'.$key);continue;
            }
            if ($key==='fluidFont'){
                self::keys($value,['min','max'],$at.'/fluidFont');
                self::check(self::integer($value['min']??null,10,120)
                    &&self::integer($value['max']??null,10,120)
                    &&$value['min']<=$value['max'],$at.' invalid fluid typography');
                continue;
            }
            if ($key==='gradient'){
                self::keys($value,['angle','from','to','via','viaAt'],$at.'/gradient');
                self::check(self::integer($value['angle']??null,0,360)&&isset($value['from'],$value['to'])
                    &&(array_key_exists('via',$value)===array_key_exists('viaAt',$value))
                    &&(!array_key_exists('viaAt',$value)||self::integer($value['viaAt'],1,99)),'invalid gradient');
                self::resolve($value['from'],'colors',$tokens,$at.'/gradient.from');
                self::resolve($value['to'],'colors',$tokens,$at.'/gradient.to');
                if(array_key_exists('via',$value))self::resolve($value['via'],'colors',$tokens,$at.'/gradient.via');
                continue;
            }
            if (in_array($key,['gap','rowGap','columnGap','padding','paddingX','paddingY',
                'top','left','right','bottom','minHeight'],true)){
                self::resolve($value,'spacing',$tokens,$at.'/'.$key);continue;
            }
            if(in_array($key,['radius','fontSize','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'],true)){
                self::resolve($value,$key==='fontSize'?'typography':'radii',$tokens,$at.'/'.$key);
                continue;
            }
            if(isset($enums[$key])){self::check(in_array($value,$enums[$key],true),$at.' invalid '.$key);continue;}
            if(isset($ranges[$key])){self::check(self::integer($value,...$ranges[$key]),$at.' invalid '.$key);continue;}
            if($key==='hidden'){self::check(is_bool($value),$at.' invalid hidden');continue;}
            self::check(false,$at.' invalid '.$key);
        }
        self::check(!(isset($style['fontSize'])&&isset($style['fluidFont'])),$at.' competing typography controls');
        self::check(!(isset($style['widthPx'])&&isset($style['widthPercent'])),$at.' competing width units');
        self::check(!(isset($style['columns'])&&isset($style['gridColumnsPreset'])),$at.' competing grid template');
    }
    private static function motion(mixed $motion,string $at): void
    {
        self::keys($motion,['effect','duration','delay'],$at);
        self::check(in_array($motion['effect']??null,self::MOTIONS,true)
            &&self::integer($motion['duration']??null,150,2000)
            &&self::integer($motion['delay']??null,0,1000),$at.' invalid motion');
    }
    private static function safeHref(mixed $href): bool
    {
        return is_string($href)&&strlen($href)<=300&&(
            preg_match('~^/(?!/)[a-zA-Z0-9/_#?=&.%-]*$~D',$href)===1||
            preg_match('~^https://[a-z0-9.-]+(?:/[^\s"\'<>\\\\]*)?$~iD',$href)===1||
            preg_match('~^mailto:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,63}$~iD',$href)===1||
            preg_match('~^tel:\+[1-9][0-9]{6,14}$~D',$href)===1);
    }
    public static function validate(mixed $graph,array $assets,array &$ids,mixed $tokensInput=null): void
    {
        self::keys($graph,['version','id','nodes'],'graph');
        self::check(($graph['version']??null)===1 && is_string($graph['id']??null)
            && preg_match(self::IDENT,$graph['id'])===1 && !isset($ids[$graph['id']]),
            'unsupported graph version or repeated graph id');
        $ids[$graph['id']]=true;
        $tokens=self::tokens($tokensInput);
        self::check(isset($graph['nodes']) && is_array($graph['nodes']) && array_is_list($graph['nodes'])
            && count($graph['nodes'])>=1 && count($graph['nodes'])<=30,'number of root nodes');
        $count=0;
        $visit=function (mixed $node,int $depth,?string $parentType=null) use (&$visit,&$count,&$ids,$assets,$tokens): void {
            self::check($depth<=8&&++$count<=90,'excessive depth or total nodes');
            self::keys($node,['id','type','text','href','assetId','alt','level','styles','responsive','states','children','icon','motion','posterAssetId','loop','ordered','cite','backgroundMedia'],'node');
            $id=$node['id']??null;$type=$node['type']??null;
            self::check(is_string($id)&&preg_match(self::IDENT,$id)===1&&!isset($ids[$id])
                &&in_array($type,['container','heading','text','button','image','divider','icon','video','disclosure','tabs','tab','list','list-item','link','quote','gallery','table','table-row','table-cell'],true),
                'invalid or duplicate node');
            $ids[$id]=true;
            if(array_key_exists('backgroundMedia',$node)){
                self::check(!in_array($type,['image','video','icon','divider','table-row','table-cell'],true),
                    'background media unsupported for node');
                $m=$node['backgroundMedia'];
                self::keys($m,['assetId','tabletAssetId','mobileAssetId','size','positionX','positionY','overlay'],$id.'/background');
                self::check(is_string($m['assetId']??null)&&$m['assetId']!=='','missing background asset');
                foreach(['assetId','tabletAssetId','mobileAssetId'] as $key){
                    if(!array_key_exists($key,$m))continue;
                    self::check(is_string($m[$key])&&in_array($assets[$m[$key]]??null,
                        ['image/png','image/jpeg','image/webp'],true),'invalid raster background');
                }
                self::check((!isset($m['size'])||in_array($m['size'],['cover','contain'],true))&&
                    (!isset($m['positionX'])||self::integer($m['positionX'],0,100))&&
                    (!isset($m['positionY'])||self::integer($m['positionY'],0,100)),'invalid background placement');
                if(array_key_exists('overlay',$m)){
                    self::keys($m['overlay'],['color','opacity'],'background overlay');
                    self::resolve($m['overlay']['color']??null,'colors',$tokens,'background overlay');
                    self::check(self::integer($m['overlay']['opacity']??null,0,90),'background overlay opacity');
                }
                foreach([$node['styles']??[],$node['responsive']['tablet']??[],
                    $node['responsive']['mobile']??[]] as $layer)
                    self::check(!array_key_exists('gradient',$layer),'background conflicts with gradient');
            }
            self::check(($type==='quote'||!array_key_exists('cite',$node))&&
                ($type!=='quote'||!array_key_exists('cite',$node)||
                (is_string($node['cite'])&&strlen($node['cite'])<=160&&
                    preg_match('/[\x00-\x1f]/',$node['cite'])!==1)),'invalid quote attribution');
            self::check(($type!=='table-row'||$parentType==='table')&&($parentType!=='table'||$type==='table-row')
                &&($type!=='table-cell'||$parentType==='table-row')&&
                ($parentType!=='table-row'||$type==='table-cell')
                &&($parentType!=='gallery'||$type==='image'),'invalid table/gallery hierarchy');
            self::check(($type==='list'||!array_key_exists('ordered',$node))&&($type!=='list'||!array_key_exists('ordered',$node)||is_bool($node['ordered'])),'invalid ordered-list flag');
            self::check(($type!=='list-item'||$parentType==='list')&&($parentType!=='list'||$type==='list-item'),'invalid list hierarchy');
            self::check(($type!=='tab'||$parentType==='tabs')&&($parentType!=='tabs'||$type==='tab'),'invalid tabs hierarchy');
            if($type==='gallery'){
                self::check(is_string($node['text']??null)&&strlen($node['text'])<=120&&trim($node['text'])!==''&&
                    preg_match('/[\x00-\x1f]/',$node['text'])!==1&&
                    !array_intersect(['href','assetId','alt','level','icon','loop','posterAssetId','ordered'],array_keys($node)),
                    'invalid gallery label');
            } elseif($type==='table'){
                self::check((!array_key_exists('text',$node)||
                    (is_string($node['text'])&&strlen($node['text'])<=160&&
                      preg_match('/[\x00-\x1f]/',$node['text'])!==1))&&
                    !array_intersect(['href','assetId','alt','level','icon','loop','posterAssetId','ordered'],array_keys($node)),
                    'invalid table caption');
            } elseif (in_array($type,['container','divider','tabs','list','table-row'],true)) {
                foreach (['text','href','assetId','alt','level','posterAssetId','loop'] as $field)
                    self::check(!array_key_exists($field,$node),'invalid container/divider content');
            } elseif ($type==='table-cell') {
                self::check(is_string($node['text']??null)&&strlen($node['text'])<=1600&&
                    preg_match('/[\x00-\x1f]/',$node['text'])!==1&&
                    !array_intersect(['href','assetId','alt','level','icon','loop','posterAssetId','ordered'],array_keys($node)),
                    'invalid table cell');
            } elseif ($type==='list-item') {
                self::check(is_string($node['text']??null)&&strlen($node['text'])<=3000&&
                    preg_match('/[\x00-\x1f]/',$node['text'])!==1&&
                    !isset($node['href'])&&!isset($node['assetId'])&&!isset($node['alt'])&&
                    !isset($node['level'])&&!isset($node['icon'])&&!isset($node['posterAssetId'])&&
                    !isset($node['loop']), 'invalid list item');
            } elseif (in_array($type,['disclosure','tab'],true)) {
                self::check(is_string($node['text']??null)&&strlen($node['text'])<=160&&
                    trim($node['text'])!==''&&preg_match('/[\x00-\x1f]/',$node['text'])!==1&&
                    !isset($node['href'])&&!isset($node['assetId'])&&!isset($node['alt'])&&
                    !isset($node['level'])&&!isset($node['icon'])&&!isset($node['posterAssetId'])&&
                    !isset($node['loop']), 'invalid interactive label');
            } elseif ($type==='icon') {
                self::check(is_string($node['icon']??null)
                    &&array_key_exists($node['icon'],self::ICON_PATHS)
                    &&!isset($node['text'])&&!isset($node['href'])&&!isset($node['assetId'])
                    &&!isset($node['level'])&&!isset($node['children'])
                    &&(!array_key_exists('alt',$node)||
                        (is_string($node['alt'])&&strlen($node['alt'])<=200
                         &&preg_match('/[\x00-\x1f]/',$node['alt'])!==1)),
                    'invalid icon node');
            } elseif ($type==='video') {
                $videoId=$node['assetId']??null;
                $poster=$node['posterAssetId']??null;
                self::check(is_string($videoId)&&($assets[$videoId]??null)==='video/mp4'
                    &&is_string($node['alt']??null)&&strlen($node['alt'])>=1
                    &&strlen($node['alt'])<=200&&preg_match('/[\x00-\x1f]/',$node['alt'])!==1
                    &&!isset($node['text'])&&!isset($node['href'])&&!isset($node['level'])&&!isset($node['icon'])
                    &&(!array_key_exists('loop',$node)||is_bool($node['loop']))
                    &&(!array_key_exists('posterAssetId',$node)
                        ||(is_string($poster)
                           &&in_array($assets[$poster]??null,['image/png','image/jpeg','image/webp'],true))),
                    'invalid video binding');
            } elseif ($type==='image') {
                self::check(is_string($node['assetId']??null)&&isset($assets[$node['assetId']])&&$assets[$node['assetId']]!=='video/mp4'
                    &&(!array_key_exists('href',$node)||self::safeHref($node['href']))
                    &&!isset($node['posterAssetId'])&&!isset($node['loop'])
                    &&is_string($node['alt']??null)&&strlen($node['alt'])<=200
                    &&preg_match('/[\x00-\x1f]/',$node['alt'])!==1
                    &&!isset($node['text'])&&!isset($node['level'])&&!isset($node['icon']),
                    'invalid image binding');
            } else {
                self::check(is_string($node['text']??null)&&strlen($node['text'])<=3000
                    &&preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/',$node['text'])!==1
                    &&!isset($node['assetId'])&&!isset($node['alt'])&&!isset($node['icon']),'invalid text node');
                if (in_array($type,['button','link'],true)) {
                    $href=$node['href']??null;
                    self::check(is_string($href)&&strlen($href)<=300
                        &&(preg_match('~^/(?!/)[a-zA-Z0-9/_#?=&.%-]*$~D',$href)===1
                            ||preg_match('~^https://[a-z0-9.-]+(?:/[^\s"\'<>\\\\]*)?$~iD',$href)===1
                            ||preg_match('~^mailto:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,63}$~iD',$href)===1
                            ||preg_match('~^tel:\+[1-9][0-9]{6,14}$~D',$href)===1),
                        'unsafe button link');
                } else self::check(!isset($node['href']),'unexpected link');
                if ($type==='heading')self::check(self::integer($node['level']??2,1,6),'heading level');
                else self::check(!isset($node['level']),'unexpected level');
            }
            self::style($node['styles']??[],$tokens,$id.'/style');
            if(array_key_exists('motion',$node))self::motion($node['motion'],$id.'/motion');
            if (isset($node['responsive'])) {
                self::keys($node['responsive'],['tablet','mobile'],$id.'/responsive');
                foreach ($node['responsive'] as $bp=>$style)
                    self::style($style,$tokens,$id.'/'.$bp);
            }
            if (isset($node['states'])) {
                self::keys($node['states'],['hover','focus','active'],$id.'/states');
                foreach ($node['states'] as $name=>$style)
                    self::style($style,$tokens,$id.'/'.$name,true);
            }
            if (!in_array($type,['container','disclosure','tabs','tab','list','gallery','table','table-row'],true))
                self::check(!isset($node['children']),'non-container children');
            else {
                $childCount=is_array($node['children']??null)?count($node['children']):-1;
                $min=in_array($type,['tabs','gallery','table'],true)?2:
                    (in_array($type,['disclosure','tab','list','table-row'],true)?1:0);
                $max=match($type){'tabs'=>8,'list'=>24,'gallery'=>12,'table'=>10,'table-row'=>6,default=>30};
                self::check(isset($node['children'])&&is_array($node['children'])&&
                    array_is_list($node['children'])&&$childCount>=$min&&$childCount<=$max,
                    'invalid content-group children');
                if($type==='table'){
                    $colCount=count($node['children'][0]['children']??[]);
                    self::check($colCount>=2&&$colCount<=6,'table columns 2–6');
                    foreach($node['children'] as $row)
                        self::check(is_array($row['children']??null)&&
                            count($row['children'])===$colCount,'table must have equal columns');
                }
                foreach ($node['children'] as $child) $visit($child,$depth+1,$type);
            }
        };
        foreach ($graph['nodes'] as $node) $visit($node,0);
    }
    private static function h(string $str): string
    {
        return htmlspecialchars($str,ENT_QUOTES|ENT_SUBSTITUTE|ENT_HTML5,'UTF-8');
    }
    private static function declarations(array $styles,array $t): string
    {
        $out=[];$put=static function(string $prop,string|int $value)use(&$out):void{
            $out[]=$prop.':'.$value;
        };
        $aliases=['display'=>'display','direction'=>'flex-direction','color'=>'color',
            'fontWeight'=>'font-weight','maxWidth'=>'max-width','position'=>'position',
            'textAlign'=>'text-align','order'=>'order','flexWrap'=>'flex-wrap',
            'flexGrow'=>'flex-grow','flexShrink'=>'flex-shrink','overflow'=>'overflow','objectFit'=>'object-fit','zIndex'=>'z-index','justifySelf'=>'justify-self','textDecoration'=>'text-decoration','whiteSpace'=>'white-space','fontStyle'=>'font-style','textTransform'=>'text-transform','textWrap'=>'text-wrap','wordBreak'=>'word-break','textOverflow'=>'text-overflow','transformOrigin'=>'transform-origin','isolation'=>'isolation','mixBlendMode'=>'mix-blend-mode'];
        $pixels=['textIndent'=>'text-indent','borderTopLeftRadius'=>'border-top-left-radius','borderTopRightRadius'=>'border-top-right-radius','borderBottomRightRadius'=>'border-bottom-right-radius','borderBottomLeftRadius'=>'border-bottom-left-radius','gap'=>'gap','rowGap'=>'row-gap','columnGap'=>'column-gap',
            'padding'=>'padding','paddingX'=>'padding-inline','paddingY'=>'padding-block',
            'marginTop'=>'margin-top','marginBottom'=>'margin-bottom',
            'radius'=>'border-radius','fontSize'=>'font-size','minHeight'=>'min-height',
            'top'=>'top','left'=>'left','right'=>'right','bottom'=>'bottom','widthPx'=>'width','heightPx'=>'height','minWidth'=>'min-width','maxHeight'=>'max-height'];
        foreach($styles as $key=>$value){
            if($key==='fluidFont'){
                $slope=($value['max']-$value['min'])*100/880;
                $intercept=$value['min']-$slope*3.2;
                $put('font-size','clamp('.$value['min'].'px,calc('.
                    number_format($slope,4,'.','').'vw + '.
                    number_format($intercept,4,'.','').'px),'.$value['max'].'px)');
                continue;
            }
            if($key==='gradient'){
                $put('background-image','linear-gradient('.$value['angle'].'deg,'.
                    self::resolve($value['from'],'colors',$t,$key).','.
                    (isset($value['via'])?self::resolve($value['via'],'colors',$t,$key).' '.$value['viaAt'].'%,':'').
                    self::resolve($value['to'],'colors',$t,$key).')');continue;
            }
            if(in_array($key,['color','background','borderColor','outlineColor'],true))
                $value=self::resolve($value,'colors',$t,$key);
            if(in_array($key,['gap','rowGap','columnGap','padding','paddingX','paddingY',
                'top','left','right','bottom','minHeight','radius','fontSize','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'],true)){
                $group=$key==='fontSize'?'typography':(in_array($key,['radius','borderTopLeftRadius','borderTopRightRadius','borderBottomRightRadius','borderBottomLeftRadius'],true)?'radii':'spacing');
                $value=self::resolve($value,$group,$t,$key);
            }
            if(isset($aliases[$key])){
                $put($aliases[$key],$key==='maxWidth'?$value.'px':$value);continue;
            }
            if($key==='hidden'){if($value)$put('display','none');continue;}
            if($key==='columns'){$put('grid-template-columns','repeat('.$value.',minmax(0,1fr))');continue;}
            if($key==='gridColumnsPreset'){$put('grid-template-columns',['sidebar-left'=>'minmax(0,1fr) minmax(0,2fr)','sidebar-right'=>'minmax(0,2fr) minmax(0,1fr)','wide-center'=>'minmax(0,1fr) minmax(0,3fr) minmax(0,1fr)','editorial'=>'minmax(0,2fr) minmax(0,3fr) minmax(0,2fr)'][$value]);continue;}
            if($key==='gridColumnStart'||$key==='gridRowStart'){$put($key==='gridColumnStart'?'grid-column-start':'grid-row-start',$value);continue;}
            if($key==='translateX'||$key==='translateY'){$put($key==='translateX'?'--cmsdg-tx':'--cmsdg-ty',$value.'px');continue;}
            if($key==='rotateDeg'){$put('rotate',$value.'deg');continue;}
            if($key==='scalePercent'){$put('scale',number_format($value/100,2,'.',''));continue;}
            if($key==='wordSpacing'){$put('word-spacing',number_format($value/10,1,'.','').'px');continue;}
            if($key==='filterPreset'){$put('filter',['none'=>'none','grayscale'=>'grayscale(1)','sepia'=>'sepia(.85)','contrast'=>'contrast(1.25)','vibrant'=>'saturate(1.6)'][$value]);continue;}
            if($key==='borderStyle'){$put('border-style',$value);continue;}
            if($key==='textShadow'){$put('text-shadow',['none'=>'none','soft'=>'0 2px 8px #10182040','strong'=>'0 4px 18px #10182080'][$value]);continue;}
            if($key==='clipShape'){$put('clip-path',['none'=>'none','circle'=>'circle(50% at 50% 50%)','ellipse'=>'ellipse(50% 40% at 50% 50%)','diagonal'=>'polygon(0 0,100% 0,100% 90%,0 100%)','hexagon'=>'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)'][$value]);continue;}
            if($key==='backdropBlur'){$put('backdrop-filter','blur('.$value.'px)');$put('-webkit-backdrop-filter','blur('.$value.'px)');continue;}
            if($key==='gridColumnSpan'){$put('grid-column','span '.$value);continue;}
            if($key==='gridRowSpan'){$put('grid-row','span '.$value);continue;}
            if($key==='gridAutoFlow'){$put('grid-auto-flow',str_replace('-',' ',$value));continue;}
            if($key==='flexBasisPercent'){$put('flex-basis',$value.'%');continue;}
            if($key==='objectPositionX'||$key==='objectPositionY'){$put($key==='objectPositionX'?'--cmsdg-object-x':'--cmsdg-object-y',$value.'%');continue;}
            if($key==='alignContent'){$put('align-content',match($value){'between'=>'space-between','start'=>'flex-start','end'=>'flex-end',default=>$value});continue;}
            if(in_array($key,['align','justify','alignSelf'],true)){
                $property=['align'=>'align-items','justify'=>'justify-content','alignSelf'=>'align-self'][$key];
                $put($property,match($value){'between'=>'space-between','start'=>'flex-start','end'=>'flex-end',default=>$value});
                continue;
            }
            if($key==='fontFamily'){
                $put('font-family',[
                    'inherit'=>'inherit','system'=>'system-ui,Arial,sans-serif',
                    'arial'=>'Arial,sans-serif','georgia'=>'Georgia,serif',
                    'serif'=>'ui-serif,Georgia,serif','mono'=>'ui-monospace,monospace'][$value]);
                continue;
            }
            if($key==='aspectRatio'){
                $put('aspect-ratio',['auto'=>'auto','square'=>'1/1','portrait'=>'3/4',
                    'landscape'=>'4/3','wide'=>'16/9'][$value]);continue;
            }
            if($key==='shadow'){
                $put('box-shadow',['none'=>'none','soft'=>'0 5px 16px #10182020',
                    'medium'=>'0 12px 32px #10182033','strong'=>'0 20px 56px #1018204d'][$value]);
                continue;
            }
            if(isset($pixels[$key])){$put($pixels[$key],$value.'px');continue;}
            if($key==='widthPercent'){$put('width',$value.'%');continue;}
            if($key==='letterSpacing'){$put('letter-spacing',number_format($value/10,1,'.','').'px');continue;}
            if($key==='background')$put('background-color',$value);
            if($key==='borderColor')$put('border-color',$value);
            if($key==='outlineColor')$put('outline-color',$value);
            if($key==='outlineWidth'){$put('outline-style','solid');$put('outline-width',$value.'px');$put('outline-offset','2px');}
            if($key==='lineHeight')$put('line-height',number_format($value/100,2,'.',''));
            if($key==='opacity')$put('opacity',number_format($value/100,2,'.',''));
            if($key==='borderWidth'){if(!isset($styles['borderStyle']))$put('border-style','solid');$put('border-width',$value.'px');}
        }
        return implode(';',$out);
    }
    private static function assetUrl(array $asset,string $mount,?string $assetBasePath): string
    {
        return $assetBasePath===null
            ? $mount.$asset['src']
            : rtrim($assetBasePath,'/').'/'.rawurlencode($asset['id']);
    }

    /** Builds a portable, fully escaped, no-JavaScript composition for both PHP and static output. */
    public static function render(array $site,array $graph,string $mount,?string $sectionId=null,?string $assetBasePath=null): string
    {
        $t=self::tokens($site['designTokens']??null);
        $assetMap=[];foreach ($site['assets'] as $asset)$assetMap[$asset['id']]=$asset;
        $scope='.cmsdg-'.$graph['id'];$rules=[];
        $headerIds=[];
        $collectHeaders=function(array $nodes)use(&$collectHeaders,&$headerIds):void{
            foreach($nodes as $node){
                if($node['type']==='table')
                    foreach($node['children'][0]['children'] as $cell)$headerIds[$cell['id']]=true;
                if(isset($node['children']))$collectHeaders($node['children']);
            }
        };
        $collectHeaders($graph['nodes']);
        $visit=function (array $n) use (&$visit,&$rules,$scope,$t,$assetMap,$mount,$assetBasePath,$headerIds): string {
            $selector=$scope.' .cmsdg-n-'.$n['id'];
            $usesTranslate=false;
            foreach ([$n['styles']??[],$n['responsive']['tablet']??[],$n['responsive']['mobile']??[]] as $layer) {
                if (array_key_exists('translateX',$layer)||array_key_exists('translateY',$layer)){$usesTranslate=true;break;}
            }
            if ($usesTranslate)$rules[]=$selector.'{--cmsdg-tx:0px;--cmsdg-ty:0px;translate:var(--cmsdg-tx) var(--cmsdg-ty)}';
            $base=self::declarations($n['styles']??[],$t);
            if($base!=='')$rules[]=$selector.'{'.$base.'}';
            foreach (['tablet'=>900,'mobile'=>600] as $bp=>$width) {
                $css=self::declarations($n['responsive'][$bp]??[],$t);
                if($css!=='')$rules[]='@media(max-width:'.$width.'px){'.$selector.'{'.$css.'}}';
            }
            foreach (['hover'=>':hover','focus'=>':focus-visible','active'=>':active'] as $name=>$state) {
                $css=self::declarations($n['states'][$name]??[],$t);
                if($css!=='')$rules[]=$selector.$state.'{'.$css.'}';
            }
            if(isset($n['motion'])&&$n['motion']['effect']!=='none')
                $rules[]=$selector.'{animation:cmsdg-'.$n['motion']['effect'].' '.
                    $n['motion']['duration'].'ms ease-out '.$n['motion']['delay'].'ms both}';
            $cls='cmsdg-n-'.$n['id'];
            switch($n['type']){
                case 'container':
                    $body='';foreach ($n['children'] as $child)$body.=$visit($child);
                    return '<div class="'.$cls.'">'.$body.'</div>';
                case 'list':
                    $body='';foreach($n['children'] as $child)$body.=$visit($child);
                    $tag=!empty($n['ordered'])?'ol':'ul';
                    return '<'.$tag.' class="'.$cls.' cmsdg-list">'.$body.'</'.$tag.'>';
                case 'list-item':
                    return '<li class="'.$cls.'">'.self::h($n['text']).'</li>';
                case 'gallery':
                    $body='';foreach($n['children'] as $child)$body.=$visit($child);
                    return '<div class="'.$cls.' cmsdg-gallery" role="region" aria-roledescription="gallery" aria-label="'.self::h($n['text']).'" tabindex="0">'.$body.'</div>';
                case 'table':
                    $first=$visit($n['children'][0]);$rest='';
                    foreach(array_slice($n['children'],1) as $row)$rest.=$visit($row);
                    return '<div class="cmsdg-table-scroll" role="region" aria-label="'.self::h($n['text']??'Таблица').'" tabindex="0"><table class="'.$cls.' cmsdg-table">'.
                        (!empty($n['text'])?'<caption>'.self::h($n['text']).'</caption>':'').
                        '<thead>'.$first.'</thead><tbody>'.$rest.'</tbody></table></div>';
                case 'table-row':
                    $body='';foreach($n['children'] as $cell)$body.=$visit($cell);
                    return '<tr class="'.$cls.'">'.$body.'</tr>';
                case 'table-cell':
                    $isHeader=isset($headerIds[$n['id']]);
                    $tag=$isHeader?'th':'td';
                    return '<'.$tag.($isHeader?' scope="col"':'').' class="'.$cls.'">'.self::h($n['text']).'</'.$tag.'>';
                case 'quote':
                    return '<figure class="'.$cls.' cmsdg-quote"><blockquote><p>'.self::h($n['text']).'</p></blockquote>'.
                        (!empty($n['cite'])?'<figcaption>'.self::h($n['cite']).'</figcaption>':'').'</figure>';
                case 'disclosure':
                    $body='';foreach ($n['children'] as $child)$body.=$visit($child);
                    return '<details class="'.$cls.' cmsdg-disclosure"><summary>'.self::h($n['text']).'</summary><div class="cmsdg-disclosure-body">'.$body.'</div></details>';
                case 'tab':
                    $body='';foreach ($n['children'] as $child)$body.=$visit($child);
                    return '<div class="'.$cls.' cmsdg-tab-panel" id="cmsdg-panel-'.$n['id'].'">'.$body.'</div>';
                case 'tabs':
                    $controls='';$panels='';
                    foreach($n['children'] as $i=>$tab){
                        $controls.='<input type="radio" name="cmsdg-tabs-'.$n['id'].'" id="cmsdg-tab-'.$tab['id'].'" aria-controls="cmsdg-panel-'.$tab['id'].'"'.($i===0?' checked':'').'><label for="cmsdg-tab-'.$tab['id'].'">'.self::h($tab['text']).'</label>';
                        $rules[]=$scope.' .cmsdg-tabs-'.$n['id'].':has(> .cmsdg-tabs-controls > #cmsdg-tab-'.$tab['id'].':checked) > .cmsdg-tabs-panels > #cmsdg-panel-'.$tab['id'].'{display:block}';
                        $panels.=$visit($tab);
                    }
                    return '<div class="'.$cls.' cmsdg-tabs-'.$n['id'].'"><div class="cmsdg-tabs-controls" role="group" aria-label="Вкладки">'.$controls.'</div><div class="cmsdg-tabs-panels">'.$panels.'</div></div>';
                case 'divider':return '<hr class="'.$cls.'">';
                case 'icon':
                    $a=($n['alt']??'')!==''?
                        'role="img" aria-label="'.self::h($n['alt']).'"':'aria-hidden="true"';
                    return '<svg class="'.$cls.'" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" '.$a.'>'.self::ICON_PATHS[$n['icon']].'</svg>';
                case 'heading':
                    $tag='h'.($n['level']??2);
                    return '<'.$tag.' class="'.$cls.'">'.self::h($n['text']).'</'.$tag.'>';
                case 'text':return '<p class="'.$cls.'">'.self::h($n['text']).'</p>';
                case 'button':
                case 'link':
                    $href=str_starts_with($n['href'],'/')?rtrim($mount,'/').$n['href']:$n['href'];
                    return '<a class="'.$cls.'" href="'.self::h($href).'"'.(str_starts_with($href,'https://')?' rel="noopener noreferrer"':'').'>'.self::h($n['text']).'</a>';
                case 'video':
                    $video=$assetMap[$n['assetId']];
                    $src=self::h(self::assetUrl($video,$mount,$assetBasePath));
                    $posterHtml='';
                    if(isset($n['posterAssetId'])){
                        $poster=$assetMap[$n['posterAssetId']];
                        $posterHtml=' poster="'.self::h(self::assetUrl($poster,$mount,$assetBasePath)).'"';
                    }
                    return '<video class="'.$cls.'" controls playsinline preload="metadata"'.
                        (!empty($n['loop'])?' loop':'').$posterHtml.' aria-label="'.self::h($n['alt']).'">'.
                        '<source src="'.$src.'" type="video/mp4">'.
                        'Ваш браузер не поддерживает видео.</video>';
                case 'image':
                    $asset=$assetMap[$n['assetId']];
                    $src=self::h(self::assetUrl($asset,$mount,$assetBasePath));
                    $attrs=PublicRenderer::responsiveAttrs($asset,$mount,
                        '(max-width:600px) 100vw, (max-width:900px) 50vw, 100vw',$assetBasePath);
                    return '<img loading="lazy" class="'.$cls.'" src="'.$src.'"'.$attrs.' alt="'.self::h($n['alt']).'">';
            }
            return '';
        };
        $html='';foreach ($graph['nodes'] as $n)$html.=$visit($n);
        return '<section class="cmsdg cmsdg-'.$graph['id'].'" id="'.($sectionId??$graph['id']).'"><style>'
            .$scope.'{min-width:0;max-width:none;padding:0;min-height:0}'.$scope.' *{box-sizing:border-box;min-width:0}'
            .$scope.' img,'.$scope.' video{max-width:100%;height:auto;object-position:var(--cmsdg-object-x,50%) var(--cmsdg-object-y,50%)}'
            .$scope.' svg{display:inline-block;vertical-align:middle;flex:none}'
             .$scope.' .cmsdg-table-scroll{max-width:100%;overflow-x:auto;overscroll-behavior-inline:contain}'
            .$scope.' .cmsdg-table-scroll:focus-visible,'.$scope.' .cmsdg-gallery:focus-visible{outline:3px solid #1868d3;outline-offset:2px}'
            .$scope.' .cmsdg-table{border-collapse:collapse;width:100%;min-width:480px}'
            .$scope.' .cmsdg-table th,'.$scope.' .cmsdg-table td{padding:12px 16px;border:1px solid #c6cdd7;text-align:start}'
            .$scope.' .cmsdg-table th{font-weight:700;background:#f2f5f9}'
            .$scope.' .cmsdg-gallery{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:8px;padding:8px 2px;overscroll-behavior-inline:contain}'
            .$scope.' .cmsdg-gallery>img{flex:0 0 min(82%,420px);object-fit:cover;scroll-snap-align:start;border-radius:10px}'
            .$scope.' .cmsdg-quote{margin:12px 0;padding:20px;border-inline-start:4px solid currentColor}'
            .$scope.' .cmsdg-quote blockquote{margin:0}'
            .$scope.' .cmsdg-quote figcaption{margin-top:12px;font-size:.9em}'
            .$scope.' .cmsdg-list{padding-inline-start:1.5em;margin-block:12px}'
            .$scope.' .cmsdg-list > li{margin-block:6px}'
            .$scope.' .cmsdg-disclosure > summary{cursor:pointer;list-style-position:inside}'
            .$scope.' .cmsdg-disclosure-body{padding:12px 0}'
            .$scope.' .cmsdg-tabs-controls{display:flex;flex-wrap:wrap;gap:8px;padding:4px 0 12px}'
            .$scope.' .cmsdg-tabs-controls input{position:absolute;width:1px;height:1px;opacity:0}'
            .$scope.' .cmsdg-tabs-controls label{cursor:pointer;padding:10px 16px;border:1px solid currentColor;border-radius:8px}'
            .$scope.' .cmsdg-tabs-controls input:checked + label{font-weight:700;background:#eef3fa}'
            .$scope.' .cmsdg-tabs-controls input:focus-visible + label{outline:3px solid #1868d3;outline-offset:2px}'
            .$scope.' .cmsdg-tab-panel{display:none}'
            .'@keyframes cmsdg-fade-in{from{opacity:0}to{opacity:1}}'
            .'@keyframes cmsdg-fade-up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}'
            .'@keyframes cmsdg-slide-left{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}'
            .'@keyframes cmsdg-zoom-in{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}'
            .'@media(prefers-reduced-motion:reduce){'.$scope.' [class*="cmsdg-n-"]{animation:none!important;transition:none!important}}'
            .implode('',$rules)
            .'</style>'.$html.'</section>';
    }
}
