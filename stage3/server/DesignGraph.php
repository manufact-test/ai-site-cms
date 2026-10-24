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
        'top','left','opacity','borderColor','borderWidth','textAlign','order','hidden'];
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
        if ($state) foreach (array_keys($style) as $key) self::check(
            in_array($key,['color','background','borderColor','borderWidth','radius','opacity'],true),
            $at.' unsafe interaction style');
        foreach ($style as $key=>$value) {
            if (in_array($key,['color','background','borderColor'],true)) {
                self::resolve($value,'colors',$tokens,$at.'/'.$key);continue;
            }
            if (in_array($key,['gap','padding','top','left','radius','fontSize'],true)) {
                $group=$key==='radius'?'radii':($key==='fontSize'?'typography':'spacing');
                self::resolve($value,$group,$tokens,$at.'/'.$key);continue;
            }
            $ok=match ($key) {
                'display'=>in_array($value,['block','grid','flex','none'],true),
                'direction'=>in_array($value,['row','column'],true),
                'align','justify'=>in_array($value,['start','center','end','stretch','between'],true),
                'position'=>in_array($value,['static','relative','absolute'],true),
                'textAlign'=>in_array($value,['left','center','right'],true),
                'hidden'=>is_bool($value),
                'columns'=>self::integer($value,1,12),
                'fontWeight'=>self::integer($value,100,900),
                'lineHeight'=>self::integer($value,80,250),
                'maxWidth'=>self::integer($value,0,1920),
                'borderWidth'=>self::integer($value,0,12),
                'order'=>self::integer($value,-30,30),
                'opacity'=>self::integer($value,0,100),
                default=>false
            };
            self::check($ok,$at.' invalid '.$key);
        }
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
        $visit=function (mixed $node,int $depth) use (&$visit,&$count,&$ids,$assets,$tokens): void {
            self::check($depth<=8&&++$count<=90,'excessive depth or total nodes');
            self::keys($node,['id','type','text','href','assetId','alt','level','styles','responsive','states','children'],'node');
            $id=$node['id']??null;$type=$node['type']??null;
            self::check(is_string($id)&&preg_match(self::IDENT,$id)===1&&!isset($ids[$id])
                &&in_array($type,['container','heading','text','button','image','divider'],true),
                'invalid or duplicate node');
            $ids[$id]=true;
            if (in_array($type,['container','divider'],true)) {
                foreach (['text','href','assetId','alt','level'] as $field)
                    self::check(!array_key_exists($field,$node),'invalid container/divider content');
            } elseif ($type==='image') {
                self::check(is_string($node['assetId']??null)&&isset($assets[$node['assetId']])
                    &&is_string($node['alt']??null)&&strlen($node['alt'])<=200
                    &&preg_match('/[\x00-\x1f]/',$node['alt'])!==1
                    &&!isset($node['text'])&&!isset($node['href'])&&!isset($node['level']),
                    'invalid image binding');
            } else {
                self::check(is_string($node['text']??null)&&strlen($node['text'])<=3000
                    &&preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/',$node['text'])!==1
                    &&!isset($node['assetId'])&&!isset($node['alt']),'invalid text node');
                if ($type==='button') {
                    $href=$node['href']??null;
                    self::check(is_string($href)&&strlen($href)<=300
                        &&(preg_match('~^/(?!/)[a-zA-Z0-9/_#?=&.%-]*$~D',$href)===1
                            ||preg_match('~^https://[a-z0-9.-]+(?:/[^\s"\'<>\\\\]*)?$~iD',$href)===1),
                        'unsafe button link');
                } else self::check(!isset($node['href']),'unexpected link');
                if ($type==='heading')self::check(self::integer($node['level']??2,1,6),'heading level');
                else self::check(!isset($node['level']),'unexpected level');
            }
            self::style($node['styles']??[],$tokens,$id.'/style');
            if (isset($node['responsive'])) {
                self::keys($node['responsive'],['tablet','mobile'],$id.'/responsive');
                foreach ($node['responsive'] as $bp=>$style)
                    self::style($style,$tokens,$id.'/'.$bp);
            }
            if (isset($node['states'])) {
                self::keys($node['states'],['hover','focus'],$id.'/states');
                foreach ($node['states'] as $name=>$style)
                    self::style($style,$tokens,$id.'/'.$name,true);
            }
            if ($type!=='container')self::check(!isset($node['children']),'non-container children');
            else {
                self::check(isset($node['children'])&&is_array($node['children'])
                    &&array_is_list($node['children'])&&count($node['children'])<=30,'invalid children');
                foreach ($node['children'] as $child) $visit($child,$depth+1);
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
        $out=[];
        foreach ($styles as $key=>$value) {
            if(in_array($key,['color','background','borderColor'],true))
                $value=self::resolve($value,'colors',$t,$key);
            if(in_array($key,['gap','padding','top','left','radius','fontSize'],true)){
                $group=$key==='radius'?'radii':($key==='fontSize'?'typography':'spacing');
                $value=self::resolve($value,$group,$t,$key);
            }
            $put=static function(string $property,string|int $v) use (&$out): void {$out[]=$property.':'.$v;};
            switch($key){
                case 'display':$put('display',$value);break;
                case 'hidden':if($value)$put('display','none');break;
                case 'columns':$put('grid-template-columns','repeat('.$value.',minmax(0,1fr))');break;
                case 'direction':$put('flex-direction',$value);break;
                case 'align':$put('align-items',match($value){'start'=>'flex-start','end'=>'flex-end','between'=>'space-between',default=>$value});break;
                case 'justify':$put('justify-content',match($value){'start'=>'flex-start','end'=>'flex-end','between'=>'space-between',default=>$value});break;
                case 'gap':$put('gap',$value.'px');break;
                case 'padding':$put('padding',$value.'px');break;
                case 'radius':$put('border-radius',$value.'px');break;
                case 'color':$put('color',$value);break;
                case 'background':$put('background-color',$value);break;
                case 'fontSize':$put('font-size',$value.'px');break;
                case 'fontWeight':$put('font-weight',$value);break;
                case 'lineHeight':$put('line-height',number_format($value/100,2,'.',''));break;
                case 'maxWidth':$put('max-width',$value.'px');break;
                case 'position':$put('position',$value);break;
                case 'top':$put('top',$value.'px');break;
                case 'left':$put('left',$value.'px');break;
                case 'opacity':$put('opacity',number_format($value/100,2,'.',''));break;
                case 'borderColor':$put('border-color',$value);break;
                case 'borderWidth':$put('border-style','solid');$put('border-width',$value.'px');break;
                case 'textAlign':$put('text-align',$value);break;
                case 'order':$put('order',$value);break;
            }
        }
        return implode(';',$out);
    }
    /** Builds a portable, fully escaped, no-JavaScript composition for both PHP and static output. */
    public static function render(array $site,array $graph,string $mount,?string $sectionId=null): string
    {
        $t=self::tokens($site['designTokens']??null);
        $assetMap=[];foreach ($site['assets'] as $asset)$assetMap[$asset['id']]=$asset;
        $scope='.cmsdg-'.$graph['id'];$rules=[];
        $visit=function (array $n) use (&$visit,&$rules,$scope,$t,$assetMap,$mount): string {
            $selector=$scope.' .cmsdg-n-'.$n['id'];
            $base=self::declarations($n['styles']??[],$t);
            if($base!=='')$rules[]=$selector.'{'.$base.'}';
            foreach (['tablet'=>900,'mobile'=>600] as $bp=>$width) {
                $css=self::declarations($n['responsive'][$bp]??[],$t);
                if($css!=='')$rules[]='@media(max-width:'.$width.'px){'.$selector.'{'.$css.'}}';
            }
            foreach (['hover'=>':hover','focus'=>':focus-visible'] as $name=>$state) {
                $css=self::declarations($n['states'][$name]??[],$t);
                if($css!=='')$rules[]=$selector.$state.'{'.$css.'}';
            }
            $cls='cmsdg-n-'.$n['id'];
            switch($n['type']){
                case 'container':
                    $body='';foreach ($n['children'] as $child)$body.=$visit($child);
                    return '<div class="'.$cls.'">'.$body.'</div>';
                case 'divider':return '<hr class="'.$cls.'">';
                case 'heading':
                    $tag='h'.($n['level']??2);
                    return '<'.$tag.' class="'.$cls.'">'.self::h($n['text']).'</'.$tag.'>';
                case 'text':return '<p class="'.$cls.'">'.self::h($n['text']).'</p>';
                case 'button':
                    $href=str_starts_with($n['href'],'/')?$mount.$n['href']:$n['href'];
                    return '<a class="'.$cls.'" href="'.self::h($href).'">'.self::h($n['text']).'</a>';
                case 'image':
                    $asset=$assetMap[$n['assetId']];
                    $src=self::h($mount.$asset['src']);
                    $srcset='';
                    if(!empty($asset['variants'])){
                        $parts=$asset['variants'];
                        usort($parts,static fn(array $a,array $b)=>$a['width']<=>$b['width']);
                        $entries=[];
                        foreach ($parts as $v)$entries[]=self::h($mount.$v['src']).' '.$v['width'].'w';
                        $srcset=' srcset="'.implode(', ',$entries).'" sizes="(max-width:600px) 100vw, (max-width:900px) 50vw, 100vw"';
                    }
                    return '<img loading="lazy" class="'.$cls.'" src="'.$src.'"'.$srcset.' alt="'.self::h($n['alt']).'">';
            }
            return '';
        };
        $html='';foreach ($graph['nodes'] as $n)$html.=$visit($n);
        return '<section class="cmsdg cmsdg-'.$graph['id'].'" id="'.($sectionId??$graph['id']).'"><style>'
            .$scope.'{min-width:0;max-width:none;padding:0;min-height:0}'.$scope.' *{box-sizing:border-box;min-width:0}'
            .$scope.' img{max-width:100%;height:auto}'.implode('',$rules)
            .'</style>'.$html.'</section>';
    }
}
