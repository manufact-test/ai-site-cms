<?php
declare(strict_types=1);
// Disposable CI operator for the PHP HTTP multi-process rehearsal.
// Never installed, never a production updater, no DB, Hostinger or DNS access.
require dirname(__DIR__, 2).'/src/Release/LabPackageStager.php';
require dirname(__DIR__, 2).'/src/Release/LabPhpGenerationSwitcher.php';

use AiSiteCms\Release\LabPackageStager as Stager;
use AiSiteCms\Release\LabPhpGenerationSwitcher as Switcher;

if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
    fwrite(STDERR,"CI-only CLI operator refused\n");exit(2);
}
try {
    $mode=$argv[1] ?? '';
    if ($mode==='--bootstrap' && $argc===6) {
        $sw=Switcher::create();
        $receipts=[];
        foreach ([[$argv[2],$argv[3]],[$argv[4],$argv[5]]] as [$source,$digest]) {
            $info=Stager::verifyPackage($source,$digest);
            $slot=Stager::create();
            if ($slot->stage($source,$digest)['status']!=='installed') {
                throw new RuntimeException('Cannot install verified lab code');
            }
            $sw->register($slot->root(),$digest,$info['version']);
            $receipts[]=['root'=>$slot->root(),'version'=>$info['version']];
        }
        $state=$sw->switchTo($receipts[0]['version'],null,0,$receipts[0]['version']);
        echo json_encode(['switchRoot'=>$sw->root(),'releases'=>$receipts,
            'current'=>$state['current'],'sequence'=>$state['sequence']],
            JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),"\n";
    } elseif ($mode==='--switch' && $argc===8) {
        $sw=Switcher::reopen($argv[2]);
        $state=$sw->switchTo($argv[3],$argv[4]==='none'?null:$argv[4],
            (int)$argv[5],$argv[6],$argv[7]==='none'?null:$argv[7]);
        echo json_encode($state,JSON_THROW_ON_ERROR),"\n";
    } elseif ($mode==='--unlock' && $argc===7) {
        // Reopen cannot proceed with the stale mkdir lock, so the constructor
        // is allowed through via a restricted read-only reflection call.
        $class=new ReflectionClass(Switcher::class);
        $constructor=$class->getConstructor();
        $instance=$class->newInstanceWithoutConstructor();
        $constructor->invoke($instance,$argv[2]);
        $state=$instance->releaseStaleOperatorLock(
            $argv[3]==='none'?null:$argv[3],(int)$argv[4],$argv[5],$argv[6]);
        echo json_encode($state,JSON_THROW_ON_ERROR),"\n";
    } elseif ($mode==='--recover' && $argc===5) {
        $sw=Switcher::reopen($argv[2]);
        $state=$sw->recover($argv[3],$argv[4]);
        echo json_encode($state,JSON_THROW_ON_ERROR),"\n";
    } elseif ($mode==='--inspect' && $argc===4) {
        $state=Switcher::reopen($argv[2])->inspect($argv[3]);
        echo json_encode($state,JSON_THROW_ON_ERROR),"\n";
    } else {
        fwrite(STDERR,"Unknown CI operator action\n");exit(2);
    }
} catch (Throwable $e) {
    // Never echo filesystem paths or internal credentials into HTTP-facing logs.
    fwrite(STDERR,"OPERATOR_REFUSED\n");
    exit(3);
}
