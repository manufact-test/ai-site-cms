<?php
/* Stage 1 ONLY: independently written typed PHP renderer for mixed site
 * components. Not a production adapter or an HTTP form handler. */
declare(strict_types=1);
function reject(string $why): never {fwrite(STDERR, $why . "\n"); exit(7);}
function sameKeys(array $value, array $keys): bool {
    $a=array_keys($value); sort($a); sort($keys); return $a===$keys;
}
function escaped(string $s): string {return htmlspecialchars($s, ENT_QUOTES|ENT_SUBSTITUTE|ENT_HTML5, 'UTF-8');}
function stringField(mixed $s): bool {return is_string($s)&&mbStrCount($s)<=400;}
function mbStrCount(string $s): int {
    return preg_match_all('/./us',$s,$m) ?: (strlen($s)===0 ? 0 : 99999);
}
function validateShape(mixed $shape): void {
    if(!is_array($shape)||!array_is_list($shape)||count($shape)<2||count($shape)>12)reject('invalid array');
    $names=[];
    $types=[
      'hero'=>['headline','gradientFrom','gradientTo','durationMs','ctaHref','featureAsset'],
      'accordion'=>['title','open'],
      'form'=>['placeholder','enabled'],
      'media'=>['asset','alt'],
      'copy'=>['body']
    ];
    foreach($shape as $block) {
        if(!is_array($block)||!sameKeys($block,['id','kind','values']))reject('component envelope');
        $id=$block['id']; $kind=$block['kind']; $v=$block['values'];
        if(!is_string($id)||!preg_match('/^[a-z][a-z0-9-]{2,50}$/D',$id)||isset($names[$id]))reject('component id');
        $names[$id]=true;
        if(!is_string($kind)||!array_key_exists($kind,$types)||!is_array($v)||!sameKeys($v,$types[$kind]))reject('kind or fields');
        foreach($v as $key=>$value) {
            $valid=match($key) {
              'headline','title','placeholder','alt','body' => stringField($value),
              'gradientFrom','gradientTo'=>is_string($value)&&(bool)preg_match('/^#[0-9a-fA-F]{6}$/D',$value),
              'durationMs'=>is_int($value)&&$value>=100&&$value<=10000,
              'ctaHref'=>is_string($value)&&(bool)preg_match('/^#[a-z][a-z0-9-]{0,40}$/D',$value),
              'featureAsset','asset'=>is_string($value)&&in_array($value,['orb','reef'],true),
              'open','enabled'=>is_bool($value),
              default=>false
            };
            if(!$valid)reject('invalid value: '.$key);
        }
    }
}
try {$shape=json_decode(stream_get_contents(STDIN),true,64,JSON_THROW_ON_ERROR);}
catch(Throwable $err){reject('invalid json');}
validateShape($shape);
$assets=['orb'=>'/fixtures/orb.svg','reef'=>'/fixtures/reef.svg'];
echo '<main data-site="tide-atlas">';
foreach($shape as $c) {
  $id=escaped($c['id']);$v=$c['values'];
  if($c['kind']==='hero') {
    echo '<section data-cms-id="'.$id.'" id="hero"><h1>'.escaped($v['headline']).'</h1><a href="'.escaped($v['ctaHref']).'">Explore</a><img src="'.$assets[$v['featureAsset']].'" alt="Curated artwork"></section>';
  } elseif($c['kind']==='accordion') {
    echo '<section data-cms-id="'.$id.'"><details'.($v['open']?' open':'').'><summary>'.escaped($v['title']).'</summary><p>Reviewed disclosure</p></details></section>';
  } elseif($c['kind']==='form') {
    echo '<section data-cms-id="'.$id.'" id="signup"><label>Email<input type="email" placeholder="'.escaped($v['placeholder']).'"></label><button'.($v['enabled']?'':' disabled').' type="button">Preview only</button></section>';
  } elseif($c['kind']==='media') {
    echo '<section data-cms-id="'.$id.'"><img src="'.$assets[$v['asset']].'" alt="'.escaped($v['alt']).'"></section>';
  } else {
    echo '<section data-cms-id="'.$id.'"><p>'.escaped($v['body']).'</p></section>';
  }
}
echo '</main>';
