<?php
declare(strict_types=1);
require_once __DIR__.'/../src/PrivateStateMaintenance.php';
require_once __DIR__.'/../src/ReceiptLedger.php';
require_once __DIR__.'/../src/SharedThrottle.php';
$n=0;
function audit(bool $v,string $why):void {global $n;$n++;if(!$v)throw new RuntimeException("Canonical state #$n: $why");}
$secret=str_repeat('Q',48);
$dir=sys_get_temp_dir().'/cms-private-canonical-'.bin2hex(random_bytes(10));
mkdir($dir,0700);chmod($dir,0700);
$now=2000;
$recipient='team@example.test';
$fields=['name'=>'Person','email'=>'person@example.test','phone'=>'','message'=>'Complete private audit message'];
try {
    $root=__DIR__.'/../public';
    $throttle=new SharedThrottle($dir,$secret,$root);
    $ledger=new ReceiptLedger($dir,$secret,$root);
    $ip='203.0.113.70';
    $rateName=hash_hmac('sha256','form-v1|'.$ip,$secret).'.rate';
    $claimName=hash_hmac('sha256','receipt-v1|'.json_encode([$recipient,$fields],
        JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),$secret).'.claim';
    $ratePath=$dir.'/'.$rateName;
    $claimPath=$dir.'/'.$claimName;
    // Every malformed entry is rejected unchanged by the live path, AND
    // ignored by retention even when its apparent timestamp is long expired.
    $invalidRates=[
        '[]','{}','null','[null]','[true]','[1e3]','[2000.0]',
        '[2000,"2000"]','[2001]','[-1]','[3,2]','[2000,1999]',
        '{"0":2000}','{"0":10,"1":20}','[2000,]','[2000] ',
        ' [2000]','[ 2000]','[2000 ]',"[2000]\n",
        '[2000,2000,2000,2000,2000,2000]',
        '[0,0]','{"secret":"pii"}','['.str_repeat('1',8200).']'
    ];
    foreach($invalidRates as $payload) {
        // An otherwise canonical rate array of six events is a valid full
        // bucket and should also be denied. The rest are malformed values.
        file_put_contents($ratePath,$payload);chmod($ratePath,0600);
        audit(!$throttle->allow($ip,$now,5,60),'malformed/full rate history refused');
        audit(file_get_contents($ratePath)===$payload,'rate denied without rewriting evidence');
    }
    $invalidClaims=[
        '', '{}', '[]', 'null','{"v":1}', '{"at":0,"v":1}',
        '{"v":1,"at":true}', '{"v":1,"at":0.0}',
        '{"v":1,"at":"0"}','{"v":1,"at":-1}',
        '{"v":1,"at":2001}', '{"v":1,"at":0,"extra":1}',
        '{"v":1,"v":1,"at":0}', '{"v":1,"at":0} ',
        ' {"v":1,"at":0}', "{\"v\":1,\"at\":0}\n",
        '{"v":2,"at":0}','{"v":1,"at":null}',
        '{"v":1,"at":0,"at":0}', '{"v":1,"at":0',
        '{"v":1,"at":'.str_repeat('9',256).'}'
    ];
    foreach($invalidClaims as $payload) {
        file_put_contents($claimPath,$payload);chmod($claimPath,0600);
        audit($ledger->claim($recipient,$fields,$now)==='RECEIPT_STORE_UNAVAILABLE',
            'malformed claim rejected without a second send');
        audit(file_get_contents($claimPath)===$payload,'claim evidence not overwritten');
    }
    file_put_contents($ratePath,'[0]');chmod($ratePath,0600);
    file_put_contents($claimPath,'{"v":1,"at":0}');chmod($claimPath,0600);
    $result=PrivateStateMaintenance::prune($dir,$root,$now,128,32);
    audit($result['code']==='PRUNED'&&$result['deleted']===0,
        'valid canonical records within maximum retention window preserved');
    $result=PrivateStateMaintenance::prune($dir,$root,4000,128,32);
    audit($result['code']==='PRUNED'&&$result['deleted']===2,
        'canonical expired records pruned exactly once');
    audit(!file_exists($ratePath)&&!file_exists($claimPath),'old paths removed');
    audit($throttle->allow($ip,4000,5,60),'fresh canonical bucket accepted after pruning');
    audit($ledger->claim($recipient,$fields,4000)==='CLAIMED',
        'fresh canonical claim accepted after pruning');
    audit($ledger->claim($recipient,$fields,4000)==='DUPLICATE_REQUEST',
        'fresh valid record enforces duplicate fence');
} finally {
    foreach(array_diff(scandir($dir)?:[],['.','..']) as $leaf) @unlink($dir.'/'.$leaf);
    @rmdir($dir);
}
echo "Canonical private-state audit PASS: $n assertions (malformed JSON, preservation, TTL)\n";
