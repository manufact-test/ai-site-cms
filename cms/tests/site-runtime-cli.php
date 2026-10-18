<?php
declare(strict_types=1);

// Actual separate PHP process invocation for the explicit read-only preflight.
$root=sys_get_temp_dir().'/ai-site-cms-topology-cli-'.bin2hex(random_bytes(12));
mkdir($root,0700);
function tfile(string $name,string $data):void {
    if (!is_dir(dirname($name))) mkdir(dirname($name),0700,true);
    file_put_contents($name,$data);
}
function tclean(string $path):void {
    if (is_file($path)||is_link($path)) {unlink($path);return;}
    foreach(scandir($path) as $name)if($name!=='.'&&$name!=='..')tclean($path.'/'.$name);
    rmdir($path);
}
$script=dirname(__DIR__).'/bin/site-runtime-topology.php';
$checks=0;
function runCli(array $args):array {
    global $script;
    $cmd=array_merge([PHP_BINARY,$script],$args);
    $pipes=[];
    $process=proc_open($cmd,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
    if(!is_resource($process)) throw new RuntimeException('Cannot run PHP test process');
    fclose($pipes[0]);
    $stdout=stream_get_contents($pipes[1]);fclose($pipes[1]);
    $stderr=stream_get_contents($pipes[2]);fclose($pipes[2]);
    return [proc_close($process),$stdout,$stderr];
}
function expect(bool $ok,string $why):void {
    global $checks;
    $checks++;
    if(!$ok)throw new RuntimeException('Runtime topology CLI: '.$why);
}
try {
    tfile($root.'/cms/public/index.php','<?php echo "only";');
    tfile($root.'/cms/vendor/autoload.php','<?php // fixture');
    tfile($root.'/site/public/index.html','<!doctype html><title>site</title>');
    tfile($root.'/cms/private/secrets.txt','PRIVATE_EXAMPLE_TOKEN');
    $caps=[
        'php81'=>true,'pdo'=>true,'https'=>true,'privateStorage'=>true,
        'isolatedRoots'=>true,'rewriteRoutes'=>true,'sitePhp'=>false,
        'nodeRuntime'=>false,'reverseProxy'=>false
    ];
    $declaration=$root.'/caps.json';
    tfile($declaration,json_encode($caps,JSON_THROW_ON_ERROR));
    $argv=['--check','--cms-root='.$root.'/cms','--site-root='.$root.'/site',
        '--family=html','--capabilities-file='.$declaration];
    [$status,$out,$err]=runCli($argv);
    $result=json_decode($out,true);
    expect($status===0&&$err===''&&is_array($result)
        &&($result['declarationCompatible']??false)===true,
        'separate PHP process verifies safe offline static+CMS topology');
    expect(!str_contains($out,$root)&&!str_contains($out,'PRIVATE_EXAMPLE_TOKEN'),
        'CLI report cannot expose local paths or private example credentials');
    $caps['https']=false;
    tfile($declaration,json_encode($caps,JSON_THROW_ON_ERROR));
    [$status,$out,$err]=runCli($argv);
    $result=json_decode($out,true);
    expect($status===4 && ($result['missingDeclaredCapabilities']??[])===['https'],
        'insufficient self-declared HTTPS is reported without treating host as verified');
    $caps['https']=true;
    tfile($declaration,json_encode($caps,JSON_THROW_ON_ERROR));
    $cases=[
        ['--check','--cms-root='.$root.'/cms','--site-root='.$root.'/site',
            '--family=next-ssr','--capabilities-file='.$declaration],
        array_merge($argv,['--surprise=1']),
        ['--check','--cms-root='.$root.'/cms','--site-root='.$root.'/site',
            '--family=html','--capabilities-file='.$declaration,'--family=php'],
        ['--check'],
        [],
        ['--check','--cms-root='.$root.'/cms','--site-root='.$root.'/site',
            '--family=html','--capabilities-file='.$root.'/nonexistent'],
    ];
    foreach($cases as $i=>$case){
        [$status,$out,$err]=runCli($case);
        expect($status===3&&$out===''&&trim($err)==='RUNTIME_TOPOLOGY_REFUSED',
            'invalid command/unsafe runtime rejected without path leak '.$i);
    }
    $bad=json_encode(array_merge($caps,['privateKey'=>'do-not-log']),JSON_THROW_ON_ERROR);
    tfile($declaration,$bad);
    [$status,$out,$err]=runCli($argv);
    expect($status===3&&$out===''&&!str_contains($err,'do-not-log'),
        'unknown JSON attributes cannot inject credentials into report');
    tfile($declaration,json_encode($caps,JSON_THROW_ON_ERROR));
    $alias=$root.'/caps-linked.json';
    symlink($declaration,$alias);
    $args=$argv;$args[4]='--capabilities-file='.$alias;
    [$status,$out,$err]=runCli($args);
    expect($status===3&&$out==='', 'symlinked host capability declaration rejected');
    unlink($alias);
    $help=runCli(['--help']);
    expect($help[0]===0&&str_contains($help[1],'next-ssr'),
        'explicit usage message covers each runtime family');
    echo 'Stage2 read-only runtime topology CLI PASS: '.$checks.
        ' checks; no deploy, network, credentials, DB or actual host probe'."\n";
} finally {
    if(dirname($root)===realpath(sys_get_temp_dir())
        &&preg_match('/^ai-site-cms-topology-cli-[a-f0-9]{24}$/D',basename($root))) {
        tclean($root);
    }
}
