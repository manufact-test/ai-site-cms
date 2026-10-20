<?php
declare(strict_types=1);

/**
 * Independent real-PHP complete operator evidence chain:
 * pre-signed permit -> post-activation receipt -> signed settlement.
 * No DB, hosting, code-switch, ZIP extraction or production authorization.
 */
require_once dirname(__DIR__, 2) . '/cms/src/Release/LabSettledUpgradeGate.php';

use AiSiteCms\Release\LabSettledUpgradeGate as Settlement;

if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
    fwrite(STDERR, "BLOCKED: explicit CI=true CMS_ALLOW_PHP_INSTALL_LAB=1 required\n");
    exit(2);
}
if (!extension_loaded('sodium')) {
    fwrite(STDERR, "BLOCKED: native sodium required for ephemeral operator key generation\n");
    exit(3);
}
$root = sys_get_temp_dir() . '/ai-site-cms-trusted-upgrade-fixture-' . bin2hex(random_bytes(8));
$receipts = $root . '/receipts';
$settlements = $root . '/settlements';
$archive = $root . '/approved-permit-proofs';
foreach ([$root,$receipts,$settlements,$archive,$archive.'/permit-000001',
    $archive.'/permit-000002'] as $d) {
    if (!mkdir($d,0700)) throw new RuntimeException('Cannot create isolated settlement fixture');
}
$pair = sodium_crypto_sign_keypair();
$secret = sodium_crypto_sign_secretkey($pair);
$der = hex2bin('302a300506032b6570032100') . sodium_crypto_sign_publickey($pair);
$keyfile = $root . '/operator.pem';
file_put_contents($keyfile,"-----BEGIN PUBLIC KEY-----\n"
    . chunk_split(base64_encode($der),64,"\n") . "-----END PUBLIC KEY-----\n");
$keyPin = hash('sha256',$der);
$pubPin = str_repeat('a',64);
$site = 'research-settled';
$v1 = '0.2.0-stage2.1';
$v2 = '0.2.1-stage2.1';
$domainReceipt = "AI-SITE-CMS-STAGE2-OPERATOR-RECEIPT-V1\0";
$domainPermit = "AI-SITE-CMS-STAGE2-PREACTIVATION-V1\0";
$domainSettlement = "AI-SITE-CMS-STAGE2-SETTLEMENT-V1\0";
$canonical = static fn(array $r):string =>
    json_encode($r,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
$files = static function(string $type,int $n):array {
    if($type==='permit')return ['permit.json','permit.sig'];
    $stem=$type.'-'.sprintf('%06d',$n);
    return [$stem.'.json',$stem.'.sig'];
};
$sign = static function(string $folder,string $type,int $n,array $data,
    string $domain,?string $override=null) use ($files,$secret,$canonical):string {
    [$jsonFile,$sigFile]=$files($type,$n);
    $raw=$override??$canonical($data);
    $sig=sodium_crypto_sign_detached($domain.$raw,$secret);
    file_put_contents($folder.'/'.$jsonFile,$raw);
    file_put_contents($folder.'/'.$sigFile,$sig);
    return hash('sha256',$domain.$raw.$sig);
};
$r1 = [
    'format'=>'ai-site-cms-stage2-operator-activation-receipt-v1',
    'siteId'=>$site,'sequence'=>1,'fromVersion'=>null,'version'=>$v1,
    'minimumVersion'=>$v1,'publisherFingerprint'=>$pubPin,
    'manifestSha256'=>str_repeat('b',64),'archiveSha256'=>str_repeat('c',64),
    'dbCheckpoint'=>['codeVersion'=>$v1],
    'previousReceiptSha256'=>null,'productionReady'=>false
];
$r2=$r1;
$r2['sequence']=2;$r2['fromVersion']=$v1;$r2['version']=$v2;
$r2['dbCheckpoint']=['codeVersion'=>$v2];
$p1 = [
    'format'=>'ai-site-cms-stage2-preactivation-approval-v1',
    'siteId'=>$site,'nonce'=>str_repeat('1',32),
    'switchRootSha256'=>str_repeat('d',64),'sequence'=>1,
    'fromVersion'=>null,'version'=>$v1,'minimumVersion'=>$v1,
    'previousReceiptSha256'=>null,'publisherFingerprint'=>$pubPin,
    'manifestSha256'=>$r1['manifestSha256'],'archiveSha256'=>$r1['archiveSha256'],
    'dbCheckpoint'=>['codeVersion'=>$v1],'productionReady'=>false
];
$p2=$p1;
$p2['nonce']=str_repeat('2',32);$p2['sequence']=2;
$p2['fromVersion']=$v1;$p2['version']=$v2;
$p2['dbCheckpoint']=['codeVersion'=>$v2];
$assertions=0;
$check=static function(bool $ok,string $label) use (&$assertions):void {
    if(!$ok)throw new RuntimeException('ASSERT FAILED: '.$label);
    ++$assertions;
};
$reject=static function(callable $run,string $label) use ($check):void {
    try{$run();}catch(RuntimeException $e){$check(true,$label);return;}
    throw new RuntimeException('Accepted untrusted signed settlement: '.$label);
};
$verify=static fn(string $rh,string $sh,string $pin='',string $publisher='',string $siteId=''):array=>
    Settlement::verify($settlements,$receipts,$archive,$keyfile,
        $pin?:$keyPin,$publisher?:$pubPin,$rh,$sh,$siteId?:$site);
$overwrite=static function(string $file,string $bytes,callable $test):void{
    $original=file_get_contents($file);
    try{file_put_contents($file,$bytes);$test();}
    finally{file_put_contents($file,$original);}
};
$moveAside=static function(string $file,callable $test) use ($root):void {
    $outside=$root.'/withheld-'.basename(dirname($file)).'-'.basename($file);
    if(!rename($file,$outside))throw new RuntimeException('Cannot remove evidence for test');
    try{$test();}finally{rename($outside,$file);}
};
$symlink=static function(string $file,callable $test) use ($moveAside,$root):void {
    $outside=$root.'/withheld-'.basename(dirname($file)).'-'.basename($file);
    $moveAside($file,static function()use($file,$outside,$test):void {
        if(!symlink($outside,$file))throw new RuntimeException('Cannot create symlink');
        try{$test();}finally{unlink($file);}
    });
};

try{
    $p1Head=$sign($archive.'/permit-000001','permit',1,$p1,$domainPermit);
    $r1Head=$sign($receipts,'receipt',1,$r1,$domainReceipt);
    $r2['previousReceiptSha256']=$r1Head;
    $p2['previousReceiptSha256']=$r1Head;
    $p2Head=$sign($archive.'/permit-000002','permit',2,$p2,$domainPermit);
    $r2Head=$sign($receipts,'receipt',2,$r2,$domainReceipt);
    $s1=[
        'format'=>'ai-site-cms-stage2-settlement-v1',
        'siteId'=>$site,'sequence'=>1,'version'=>$v1,
        'permitSha256'=>$p1Head,'receiptSha256'=>$r1Head,
        'previousSettlementSha256'=>null,'productionReady'=>false
    ];
    $s1Head=$sign($settlements,'settlement',1,$s1,$domainSettlement);
    $s2=$s1;
    $s2['sequence']=2;$s2['version']=$v2;
    $s2['permitSha256']=$p2Head;$s2['receiptSha256']=$r2Head;
    $s2['previousSettlementSha256']=$s1Head;
    $s2Head=$sign($settlements,'settlement',2,$s2,$domainSettlement);

    $good=$verify($r2Head,$s2Head);
    $check($good['count']===2 && $good['headSha256']===$s2Head,
        'valid complete two-step permit/receipt/settlement chain');
    $check($good['permitRootSha256']===$p2['switchRootSha256'],
        'independently signed switch root exposed');
    $check($good['settlement']['productionReady']===false,
        'settled evidence not production authorization');
    $reject(static fn()=> $verify($r2Head,$s1Head),'stale externally pinned settlement head');
    $reject(static fn()=> $verify($r1Head,$s2Head),'stale externally pinned receipt head');
    $reject(static fn()=> $verify(str_repeat('0',64),$s2Head),'wrong receipt head');
    $reject(static fn()=> $verify($r2Head,str_repeat('0',64)),'wrong settlement head');
    $reject(static fn()=> $verify($r2Head,$s2Head,str_repeat('0',64)),'wrong operator key pin');
    $reject(static fn()=> $verify($r2Head,$s2Head,'',str_repeat('0',64)),'wrong publisher pin');
    $reject(static fn()=> $verify($r2Head,$s2Head,'','','other-site'),'cross-site replay');
    $settleJson=$settlements.'/settlement-000002.json';
    $settleSig=$settlements.'/settlement-000002.sig';
    $overwrite($settleSig,str_repeat("\0",64),
        static fn()=> $reject(static fn()=> $verify($r2Head,$s2Head),'forged settlement signature'));
    $overwrite($settleSig,str_repeat("\0",63),
        static fn()=> $reject(static fn()=> $verify($r2Head,$s2Head),'short settlement signature'));
    $overwrite($settleJson,file_get_contents($settleJson).' ',
        static fn()=> $reject(static fn()=> $verify($r2Head,$s2Head),'modified settlement bytes'));
    $moveAside($settleSig,
        static fn()=> $reject(static fn()=> $verify($r2Head,$s2Head),'missing settlement signature'));
    $moveAside($archive.'/permit-000002/permit.json',
        static fn()=> $reject(static fn()=> $verify($r2Head,$s2Head),'missing archived permit'));
    $symlink($settleSig,
        static fn()=> $reject(static fn()=> $verify($r2Head,$s2Head),'symlinked settlement signature'));
    $symlink($settleJson,
        static fn()=> $reject(static fn()=> $verify($r2Head,$s2Head),'symlinked settlement JSON'));
    $symlink($keyfile,
        static fn()=> $reject(static fn()=> $verify($r2Head,$s2Head),'symlinked signing key'));
    $hardlink=$root.'/settlement-hardlink-victim';
    if(!link($settleSig,$hardlink))throw new RuntimeException('Hardlink fixture unavailable');
    try{$reject(static fn()=> $verify($r2Head,$s2Head),'hardlinked settlement signature');}
    finally{unlink($hardlink);}
    file_put_contents($settlements.'/foreign.json','{}');
    try{$reject(static fn()=> $verify($r2Head,$s2Head),'untracked settlement sidecar');}
    finally{unlink($settlements.'/foreign.json');}
    mkdir($archive.'/permit-000003',0700);
    try{$reject(static fn()=> $verify($r2Head,$s2Head),'unmatched extra permit');}
    finally{rmdir($archive.'/permit-000003');}

    $mutateSettlement=static function(callable $alter,string $label,bool $canonical=true)
        use($s2,$settlements,$domainSettlement,$sign,$verify,$r2Head,$reject,$settleJson,$settleSig):void {
        $oldRaw=file_get_contents($settleJson);$oldSig=file_get_contents($settleSig);
        try{
            $bad=$s2;$alter($bad);
            $bytes=$canonical?null:json_encode($bad,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)." \n";
            $newHead=$sign($settlements,'settlement',2,$bad,$domainSettlement,$bytes);
            // Correct signature AND re-pinned hostile head: semantic enforcement.
            $reject(static fn()=> $verify($r2Head,$newHead),$label);
        }finally{file_put_contents($settleJson,$oldRaw);file_put_contents($settleSig,$oldSig);}
    };
    $mutateSettlement(static function(array &$r):void{$r['productionReady']=true;},
        'correctly signed production readiness forgery');
    $mutateSettlement(static function(array &$r):void{$r['sequence']=3;},
        'correctly signed skipped settlement sequence');
    $mutateSettlement(static function(array &$r):void{$r['version']='0.2.0-stage2.1';},
        'correctly signed wrong settled version');
    $mutateSettlement(static function(array &$r):void{$r['permitSha256']=str_repeat('e',64);},
        'correctly signed substituted permit head');
    $mutateSettlement(static function(array &$r):void{$r['receiptSha256']=str_repeat('e',64);},
        'correctly signed substituted receipt head');
    $mutateSettlement(static function(array &$r):void{$r['previousSettlementSha256']=str_repeat('e',64);},
        'correctly signed settlement history break');
    $mutateSettlement(static function(array &$r):void{$r['format']='unsupported';},
        'correctly signed format downgrade');
    $mutateSettlement(static function(array &$r):void{$r['siteId']='other-site';},
        'correctly signed cross-site substitution');
    $mutateSettlement(static function(array &$r):void{$r['extra']='not-authorized';},
        'correctly signed extra field');
    $mutateSettlement(static function(array &$r):void{},
        'correctly signed noncanonical bytes',false);

    $permitJson=$archive.'/permit-000002/permit.json';
    $permitSig=$archive.'/permit-000002/permit.sig';
    $mutatePermit=static function(callable $alter,string $label) use (
        $p2,$s2,$sign,$archive,$domainPermit,$settlements,$domainSettlement,
        $verify,$r2Head,$reject,$permitJson,$permitSig,$settleJson,$settleSig
    ):void{
        $pj=file_get_contents($permitJson);$ps=file_get_contents($permitSig);
        $sj=file_get_contents($settleJson);$ss=file_get_contents($settleSig);
        try{
            $bad=$p2;$alter($bad);
            // Both the permit and its settlement are genuinely re-signed.
            $pHead=$sign($archive.'/permit-000002','permit',2,$bad,$domainPermit);
            $newSettlement=$s2;$newSettlement['permitSha256']=$pHead;
            $sHead=$sign($settlements,'settlement',2,$newSettlement,$domainSettlement);
            $reject(static fn()=> $verify($r2Head,$sHead),$label);
        }finally{
            file_put_contents($permitJson,$pj);file_put_contents($permitSig,$ps);
            file_put_contents($settleJson,$sj);file_put_contents($settleSig,$ss);
        }
    };
    $mutatePermit(static function(array &$p):void{$p['nonce']=str_repeat('1',32);},
        'reused validly signed prior operator nonce');
    $mutatePermit(static function(array &$p):void{$p['manifestSha256']=str_repeat('f',64);},
        'permit + settlement both signed but wrong manifest');
    $mutatePermit(static function(array &$p):void{$p['archiveSha256']=str_repeat('f',64);},
        'permit + settlement both signed but wrong archive hash');
    $mutatePermit(static function(array &$p):void{$p['sequence']=3;},
        'permit + settlement signed but skipped permit generation');
    $mutatePermit(static function(array &$p):void{$p['fromVersion']='0.2.8-stage2.1';},
        'permit + settlement signed but wrong prior version');
    $mutatePermit(static function(array &$p):void{$p['minimumVersion']='0.1.0-stage2.1';},
        'permit + settlement signed but changed release floor');

    $last=$verify($r2Head,$s2Head);
    $check($last['count']===2 && $last['headSha256']===$s2Head
        && $last['settlement']['version']===$v2,
        'original complete externally pinned chain restored');
    echo "Stage2 signed settlement chain research PASS: $assertions assertions; disposable PHP only, NOT production approval\n";
}finally{
    foreach ([$receipts,$settlements,$archive.'/permit-000001',
        $archive.'/permit-000002'] as $d){
        foreach(glob($d.'/*')?:[] as $f)if(is_file($f)||is_link($f))unlink($f);
    }
    foreach ([$archive.'/permit-000001',$archive.'/permit-000002',
        $archive,$receipts,$settlements] as $d)if(is_dir($d))rmdir($d);
    foreach(glob($root.'/*')?:[] as $f)if(is_file($f)||is_link($f))unlink($f);
    if(is_dir($root))rmdir($root);
}
