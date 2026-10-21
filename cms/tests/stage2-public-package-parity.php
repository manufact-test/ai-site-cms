<?php
declare(strict_types=1);

// Three separate Stage2 host-side trust boundaries against real packaged bytes:
// PHP verifier, credential-free hPanel preflight and actual one-shot Cron.
// Only disposable local filesystem. No HTTP, Hostinger, real DB or secrets.
if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('GITHUB_ACTIONS') !== 'true') {
    fwrite(STDERR,"STAGE2_PUBLIC_PARITY_CI_ONLY\n");exit(3);
}
require dirname(__DIR__).'/vendor/autoload.php';

use AiSiteCms\Hosting\PackageArtifactVerifier;
use AiSiteCms\Hosting\HostingerStage2OneShot;

$stage=dirname(__DIR__).'/.build/internal-stage2-package';
if (!is_file($stage.'/private/package-manifest.json')) {
    throw new RuntimeException('Build real complete Stage2 distribution before parity test');
}
$home=sys_get_temp_dir().'/cms-public-parity-'.bin2hex(random_bytes(8));
$package=$home.'/cms-stage2-offweb-runtime';
$local=$home.'/cms-stage2-local';
$visitor=$home.'/public_html';
mkdir($home,0700);mkdir($package,0700);mkdir($local,0700);mkdir($visitor,0700);
$marker=$visitor.'/index.html';
file_put_contents($marker,'ISOLATED-HOSTING-SITE-NOT-TOUCHED');
$visitorHash=hash_file('sha256',$marker);
$checks=0;
$check=static function(bool $pass,string $why)use(&$checks):void{
    ++$checks;if(!$pass)throw new RuntimeException('Stage2 public parity failed: '.$why);
};
$refuse=static function(callable $fn,string $why)use($check):void{
    try{$fn();}catch(Throwable $ignored){$check(true,$why);return;}
    $check(false,$why.' unexpectedly accepted');
};
$clone=static function(string $src,string $dst)use(&$clone):void{
    foreach(new DirectoryIterator($src) as $entry) {
        if($entry->isDot())continue;
        if($entry->isLink())throw new RuntimeException('Source package contains link');
        $destination=$dst.'/'.$entry->getFilename();
        if($entry->isDir()){mkdir($destination,0700);$clone($entry->getPathname(),$destination);}
        elseif($entry->isFile()){if(!copy($entry->getPathname(),$destination))throw new RuntimeException('Cannot copy package');}
        else throw new RuntimeException('Unrecognized package node');
    }
};
$cleanup=static function(string $dir)use(&$cleanup):void{
    foreach(new DirectoryIterator($dir) as $entry){
        if($entry->isDot())continue;
        $file=$entry->getPathname();
        if($entry->isDir()&&!$entry->isLink())$cleanup($file);
        else unlink($file);
    }
    rmdir($dir);
};
$canonical=static function(array $data):string{
    $pretty=json_encode($data,JSON_THROW_ON_ERROR|JSON_PRETTY_PRINT
        |JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
    $two=preg_replace_callback('/^ +/m',
        static fn(array $m):string=>str_repeat(' ',intdiv(strlen($m[0]),2)),
        $pretty);
    return $two.chr(10);
};
$invoke=static function(string $script)use($package):array{
    $pipes=[];
    $handle=proc_open([PHP_BINARY,$package.'/bin/'.$script],
        [['pipe','r'],['pipe','w'],['pipe','w']],$pipes);
    if(!is_resource($handle))throw new RuntimeException('Unable to spawn local PHP CLI');
    fclose($pipes[0]);
    $stdout=stream_get_contents($pipes[1]);fclose($pipes[1]);
    $stderr=stream_get_contents($pipes[2]);fclose($pipes[2]);
    return [proc_close($handle),$stdout,$stderr];
};
try{
    $clone($stage,$package);
    $baseline=file_get_contents($package.'/private/package-manifest.json');
    $baselineDoc=json_decode($baseline,true,16,JSON_THROW_ON_ERROR);
    $check(PackageArtifactVerifier::verify($package)['filesVerified']
        ===count($baselineDoc['files']),'real original package accepted by host PHP');
    [$code,$stdout,$stderr]=$invoke('hostinger-stage2-preflight.php');
    $ok=json_decode($stdout,true,16,JSON_THROW_ON_ERROR);
    $check($code===0 && $stderr==='' && $ok['unsignedInventoryPassed']===true
        && $ok['unsignedInventoryFilesVerified']===count($baselineDoc['files']),
        'credential-free real packaged preflight accepts same original package');

    $writeTask=static function()use($local,$package):void{
        $task=[
            'format'=>'ai-site-cms-stage2-hostinger-task-v1',
            'package_manifest_sha256'=>hash_file('sha256',
                $package.'/private/package-manifest.json'),
            'target'=>HostingerStage2OneShot::TARGET,
            'site'=>HostingerStage2OneShot::SITE,
            'operation'=>'probe','confirm'=>'READ_ONLY_OR_FOUNDATION_BACKUP_ONCE',
            'db_host'=>'127.0.0.1','db_name'=>'synthetic_never_connect',
            'db_user'=>'synthetic_no_db','db_password'=>'synthetic_not_real'
        ];
        file_put_contents($local.'/once.json',json_encode($task,JSON_THROW_ON_ERROR));
        chmod($local.'/once.json',0600);
    };
    $manifestPath=$package.'/private/package-manifest.json';
    $attacks=[
        ['public/upload.php','<?php echo "SYNTHETIC_UNAPPROVED_UPLOAD";'],
        ['public/assets/ui.js','SYNTHETIC_UNAPPROVED_EDITOR'],
        ['public/.git/config','SYNTHETIC_HIDDEN_GIT'],
        ['public/.well-known/security.txt','SYNTHETIC_STAGE2_UNAPPROVED'],
        ['public/private/debug.log','SYNTHETIC_SENSITIVE_LOG'],
        ['public/API/HEALTH.php','<?php echo "SYNTHETIC_SECOND_CONTROLLER";']
    ];
    foreach($attacks as [$relative,$content]){
        $new=$package.'/'.$relative;
        if(!is_dir(dirname($new)))mkdir(dirname($new),0700,true);
        file_put_contents($new,$content);chmod($new,0644);
        $changed=$baselineDoc;
        $changed['files'][]=['path'=>$relative,'bytes'=>strlen($content),
            'sha256'=>hash('sha256',$content)];
        file_put_contents($manifestPath,$canonical($changed));
        $check(hash_file('sha256',$new)===hash('sha256',$content)
            &&is_file($new),'adversarial '.$relative.' is genuinely present, size/hash match');
        $refuse(static fn()=>PackageArtifactVerifier::verify($package),
            'host PHP rejects rehashed additional web file '.$relative);
        [$code,$stdout,$stderr]=$invoke('hostinger-stage2-preflight.php');
        $check($code===3 && $stdout===''
            &&str_contains($stderr,'STAGE2_PREFLIGHT_REFUSED'),
            'credential-free PHP preflight rejects '.$relative);
        $writeTask();
        [$code,$stdout,$stderr]=$invoke('hostinger-stage2-once.php');
        $check($code===3 && $stdout===''
            &&str_contains($stderr,'STAGE2_PACKAGE_REFUSED')
            &&is_file($local.'/once.json')&&!is_file($local.'/receipt.json'),
            'real Cron refuses '.$relative.' before task consumption or DB/receipt');
        $refuse(static fn()=>HostingerStage2OneShot::run($package,$local),
            'direct one-shot refuses unsafe '.$relative.' before DB');
        $check(hash_file('sha256',$marker)===$visitorHash,
            'neighbor visitor site intact after refused '.$relative);
        unlink($local.'/once.json');
        unlink($new);
        $parts=explode('/',dirname($relative));
        $directory=dirname($new);
        while($directory!==$package.'/public'&&$directory!==$package){
            if(count(scandir($directory))!==2)break;
            rmdir($directory);$directory=dirname($directory);
        }
        file_put_contents($manifestPath,$baseline);
    }
    $mutations=[
        ['extra_manifest_attribute',static function(array &$d):void{$d['operatorApproved']=true;}],
        ['manifest_field_order',static function(array &$d):void{
            $stage=$d['stage'];unset($d['stage']);$d['stage']=$stage;
        }],
        ['inventory_record_order',static function(array &$d):void{
            $i=0;$d['files'][$i]=array_reverse($d['files'][$i],true);
        }],
        ['case_collision',static function(array &$d):void{
            $d['files'][]=['path'=>'PUBLIC/INDEX.PHP','bytes'=>7,
                'sha256'=>hash('sha256','GARBAGE')];
        }],
        ['public_root_missing_htaccess',static function(array &$d):void{
            $d['files']=array_values(array_filter($d['files'],
                static fn(array $row):bool=>$row['path']!=='public/.htaccess'));
        }]
    ];
    foreach($mutations as [$label,$mutate]){
        $record=$baselineDoc;$mutate($record);
        file_put_contents($manifestPath,$canonical($record));
        $refuse(static fn()=>PackageArtifactVerifier::verify($package),
            'PHP verifier refuses forged declaration '.$label);
        [$code,$stdout,$stderr]=$invoke('hostinger-stage2-preflight.php');
        $check($code===3&&$stdout===''&&str_contains($stderr,'STAGE2_PREFLIGHT_REFUSED'),
            'preflight refuses forged declaration '.$label);
        file_put_contents($manifestPath,$baseline);
    }
    foreach([
        ['prefix'=>' '.$baseline],
        ['duplicate'=>'{'.chr(10).'  "format": "forged",'.substr($baseline,1)]
    ] as $mut){
        $label=array_key_first($mut);
        file_put_contents($manifestPath,$mut[$label]);
        $refuse(static fn()=>PackageArtifactVerifier::verify($package),
            'PHP refuses deceptive/noncanonical bytes '.$label);
        [$code,$stdout,$stderr]=$invoke('hostinger-stage2-preflight.php');
        $check($code===3 && $stdout==='', 'preflight refuses '.$label);
        file_put_contents($manifestPath,$baseline);
    }
    $check(PackageArtifactVerifier::verify($package)['filesVerified']
        ===count($baselineDoc['files']),'recover exact original real package after hostile cases');
    [$code,$stdout,$stderr]=$invoke('hostinger-stage2-preflight.php');
    $check($code===0 && $stderr==='',
        'recover credential-free original package inspection after hostile cases');
    $check(hash_file('sha256',$marker)===$visitorHash
        &&!file_exists($local.'/receipt.json')
        &&!file_exists($local.'/once.json'),
        'no receipt, database task or visitor file was altered');
    echo "Stage2 REAL PHP distributed public-boundary parity PASS: {$checks} checks; ".
        "no Hostinger/DB/HTTP operations; source-bound 480-file fixture.\n";
}finally{$cleanup($home);}
