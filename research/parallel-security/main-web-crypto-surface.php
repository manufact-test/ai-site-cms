<?php
declare(strict_types=1);
// Static/tokenized observations of original web source; NOT whole-program
// reachability analysis, runtime server config or production authorization.
if (PHP_SAPI !== 'cli' || $argc !== 2 || !is_dir($argv[1])) {
    fwrite(STDERR, "WEB_SURFACE_CENSUS_INPUT_REFUSED\n");exit(3);
}
$root=realpath($argv[1]);
if (!$root) {fwrite(STDERR,"WEB_SURFACE_CENSUS_ROOT_REFUSED\n");exit(3);}
function observe(bool $ok,string $note):void {
    if(!$ok)throw new RuntimeException('WEB_SURFACE_UNVERIFIED '.$note);
}
function contents(string $relative):string {
    global $root;
    $p=$root.'/'.$relative;
    $s=@lstat($p);
    observe($s!==false&&!is_link($p)&&is_file($p)&&($s['nlink']??0)===1&&
        $s['size']>20&&$s['size']<1000000&&realpath($p)===$p,'unsafe source '.$relative);
    $raw=@file_get_contents($p);
    observe(is_string($raw)&&strlen($raw)===$s['size'],'short source '.$relative);
    return $raw;
}
function lex(string $source):array {
    $tokens=token_get_all($source,TOKEN_PARSE);$out=[];
    foreach($tokens as $token) {
        if(is_array($token)) {
            if(in_array($token[0],[T_WHITESPACE,T_COMMENT,T_DOC_COMMENT],true))continue;
            $out[]=$token[1];
        }else $out[]=$token;
    }
    return $out;
}
function hasTokenSeq(array $tokens,array $seq):bool {
    $n=count($tokens);$m=count($seq);
    for($i=0;$i<=$n-$m;$i++) {
        $found=true;
        for($j=0;$j<$m;$j++)if($tokens[$i+$j]!==$seq[$j]){$found=false;break;}
        if($found)return true;
    }
    return false;
}
function literal(string $v):?string {
    if(strlen($v)<2)return null;
    $q=$v[0];
    if(($q!=="'"&&$q!=='"')||substr($v,-1)!==$q)return null;
    return stripcslashes(substr($v,1,-1));
}
try {
    $webPath='cms/public/index.php';
    $kernelPath='cms/src/HttpKernel.php';
    $hostPath='cms/hosting/hostinger-readonly/index.php';
    $web=lex(contents($webPath));$kernel=lex(contents($kernelPath));
    $host=lex(contents($hostPath));
    observe(hasTokenSeq($web,['HttpKernel','::','create','(',')','->','run','(',')'])||
       hasTokenSeq($web,['\AiSiteCms\HttpKernel','::','create','(',')','->','run','(',')'])||
       hasTokenSeq($web,['AiSiteCms\HttpKernel','::','create','(',')','->','run','(',')']),
       'public bootstrap no longer runs known kernel');
    $found=[];
    foreach($kernel as $i=>$t){
      if($t==='$app'&&($kernel[$i+1]??null)==='->'&&
        in_array($kernel[$i+2]??null,['get','post','put','patch','delete',
          'any','map','options','group'],true)&&($kernel[$i+3]??null)==='('){
        $method=$kernel[$i+2];$arg=literal($kernel[$i+4]??'');
        observe($arg!==null,'dynamic registered Slim route');
        $found[]=[$method,$arg];
      }
    }
    observe($found===[['get','/api/health']],'unexpected original public Slim routes');
    // These are *syntactic* references; no negative whole-program claim.
    foreach([[$webPath,$web],[$kernelPath,$kernel],[$hostPath,$host]] as [$name,$tokens]){
      foreach($tokens as $t){
        observe(!preg_match('/(?:^|\\\\)(?:Ed25519Backend|OfflineReleaseVerifier|TrustedChainVerifier|LabSettledUpgradeGate)$/i',$t),
          'direct Ed25519 release class reference in web entrypoint '.$name);
      }
    }
    $actual=[];
    for($i=0;$i<count($host)-2;$i++){
      if($host[$i]==='$path'&&in_array($host[$i+1],['===','!=='],true)){
         $v=literal($host[$i+2]);if($v!==null)$actual[]=$v;
      }
    }
    $actual=array_values(array_unique($actual));
    sort($actual,SORT_STRING);
    $expected=['/','/api/health','/__stage2/host','/__stage2/offweb-package',
      '/__stage2/kernel/smoke','/__stage2/private-boundary',
      '/__stage2/rewrite/proof'];
    sort($expected,SORT_STRING);
    observe($actual===$expected,'Hostinger preflight path census drift');
    foreach(['cms/bin/verify-lab-release.php','cms/bin/verify-lab-trust.php'] as $name) {
      $tokens=lex(contents($name));
      observe(hasTokenSeq($tokens,['PHP_SAPI','!==',"'cli'"]),
        'CLI-only release verifier boundary removed from '.$name);
    }
    $runtime=0;$others=[];
    $iterator=new RecursiveIteratorIterator(
      new RecursiveDirectoryIterator($root.'/cms/src',FilesystemIterator::SKIP_DOTS));
    foreach($iterator as $file){
      if(!$file->isFile()||strtolower($file->getExtension())!=='php')continue;
      ++$runtime;
      $rel=substr($file->getPathname(),strlen($root)+1);
      $tokens=lex(contents($rel));
      $isKernel=($rel===$kernelPath);
      for($i=0;$i<count($tokens)-3;$i++){
        if(!$isKernel&&($tokens[$i]==='AppFactory')&&
          ($tokens[$i+1]==='::')&&($tokens[$i+2]==='create')&&$tokens[$i+3]==='(')
          $others[]=$rel;
        // Visible Slim route registrations on $app outside expected kernel.
        if(!$isKernel&&$tokens[$i]==='$app'&&$tokens[$i+1]==='->'&&
          in_array($tokens[$i+2],['get','post','put','patch','delete','map','any','group','options'],true)&&
          $tokens[$i+3]==='(')$others[]=$rel;
      }
    }
    observe($runtime>=25&&$runtime<=200,'unrecognized CMS src PHP inventory size');
    observe($others===[],'unexpected additional app/router registration source '.implode(',',$others));
    $result=[
      'schema'=>'ai-site-cms-original-main-web-ed25519-static-census-v1',
      'slimRoutes'=>[['method'=>'GET','path'=>'/api/health']],
      'slimRouteCount'=>1,'webEntrypointsAnalyzed'=>2,
      'hostingerPreflightPathCount'=>count($actual),
      'hostingerPreflightPathComparisons'=>$actual,
      'cliReleaseVerifiersChecked'=>2,
      'phpRuntimeSourceClassesReviewed'=>$runtime,
      'unexpectedRuntimeRouterSources'=>[],
      'directEd25519ReleaseReferencesInEntrypoints'=>0,
      'dynamicOrIndirectReachabilityExcludedFromProof'=>true,
      'serverRewriteAndHostRoutingNotTested'=>true,
      'mainReleaseOperatorSafelyPublic'=>null,
      'remoteEd25519DoSProven'=>false,
      'hostingerTested'=>false,'productionApproved'=>false
    ];
    echo json_encode($result,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
    echo 'ORIGINAL main static web-to-release route census PASS exact 1 health route, 7 Hostinger paths, 2 CLI guards; NO whole-program or Hostinger proof'."\n";
}catch(Throwable $error){
    fwrite(STDERR,'WEB_SURFACE_REFUSED '.$error->getMessage()."\n");exit(1);
}
