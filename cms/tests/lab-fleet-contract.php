<?php
declare(strict_types=1);
require dirname(__DIR__).'/vendor/autoload.php';
use AiSiteCms\Hosting\LabInstallationFleet as Fleet;
$n=0;
$deny=static function(callable $f,string $reason)use(&$n):void{
    try{$f();}catch(Throwable $e){++$n;return;}
    throw new RuntimeException('Fleet accepted dangerous case: '.$reason);
};
$dir=sys_get_temp_dir().'/cms-fleet-'.bin2hex(random_bytes(6));
foreach (['','/cms1','/site1','/cms2','/site2','/private'] as $sub)mkdir($dir.$sub,0700);
$flags=['php81'=>true,'pdo'=>true,'https'=>true,'privateStorage'=>true,
    'isolatedRoots'=>true,'rewriteRoutes'=>true,'sitePhp'=>false,
    'nodeRuntime'=>false,'reverseProxy'=>false];
$site=static fn(string $id,string $i):array=>[
 'siteId'=>$id,'cmsRoot'=>$dir.'/cms'.$i,'siteRoot'=>$dir.'/site'.$i,
 'family'=>'html','capabilities'=>$flags,'dbFile'=>$dir.'/private/'.$id.'.sqlite',
 'bindingFile'=>$dir.'/private/'.$id.'.binding.json'];
$doc=['format'=>'ai-site-cms-stage2-install-fleet-v1',
      'instances'=>[$site('one','1'),$site('two','2')]];
try{
 if(count(Fleet::validate($doc))!==2)throw new RuntimeException('Validation failed'); ++$n;
 $bad=$doc;$bad['instances'][1]['siteId']='one';
 $deny(static fn()=>Fleet::validate($bad),'duplicate id');
 $bad=$doc;$bad['instances'][1]['dbFile']=$bad['instances'][0]['dbFile'];
 $deny(static fn()=>Fleet::validate($bad),'DB collision');
 $bad=$doc;$bad['instances'][1]['cmsRoot']=$bad['instances'][0]['cmsRoot'];
 $deny(static fn()=>Fleet::validate($bad),'CMS collision');
 $bad=$doc;$bad['instances'][1]['dbFile']=$dir.'/site1/foreign.sqlite';
 $deny(static fn()=>Fleet::validate($bad),'foreign site private file');
 $bad=$doc;$bad['instances'][0]['unrecognized']=true;
 $deny(static fn()=>Fleet::validate($bad),'unknown config key');
 $bad=$doc;$bad['instances']=[];
 $deny(static fn()=>Fleet::validate($bad),'empty group');
 $deny(static fn()=>Fleet::apply($doc,'bad-token'),'unapproved group');
 $deny(static fn()=>Fleet::plan($doc),'no checked real runtime');
 $config=$dir.'/private/fleet.json';file_put_contents($config,json_encode($doc));
 chmod($config,0600);
 if(count(Fleet::load($config)['instances'])!==2)throw new RuntimeException('Config load failed');
 ++$n;
 symlink($config,$dir.'/private/alias.json');
 $deny(static fn()=>Fleet::load($dir.'/private/alias.json'),'symlink config');
 echo "CI-only PHP8.1–8.4 fleet configuration and privilege boundaries PASS: {$n} checks\n";
}finally{
 @unlink($dir.'/private/alias.json');@unlink($dir.'/private/fleet.json');
 foreach (['/cms1','/site1','/cms2','/site2','/private'] as $sub)@rmdir($dir.$sub);
 @rmdir($dir);
}
