<?php
declare(strict_types=1);
// Explicit offline EMPTY foundation portability rehearsal, NOT a data mover.
if (PHP_SAPI!=='cli' || $argc!==4 || !in_array($argv[1]??'', ['--plan','--apply'],true)) {
    fwrite(STDERR,"FOUNDATION_TRANSFER_REFUSED\n");exit(3);
}
require dirname(__DIR__).'/vendor/autoload.php';
try {
    $opts=[];
    foreach (array_slice($argv,2) as $arg) {
        if (!preg_match('/^--(config|approval)=(.+)$/D',$arg,$matches)
            || isset($opts[$matches[1]])) throw new RuntimeException('Invalid option');
        $opts[$matches[1]]=$matches[2];
    }
    if (count($opts)!==2) throw new RuntimeException('Missing options');
    $doc=\AiSiteCms\Hosting\LabFoundationTransfer::load($opts['config']);
    if ($argv[1]==='--plan') {
        if ($opts['approval']!=='none') throw new RuntimeException('Plan must be unsigned');
        $result=\AiSiteCms\Hosting\LabFoundationTransfer::plan($doc);
    } else {
        $result=\AiSiteCms\Hosting\LabFoundationTransfer::apply($doc,$opts['approval']);
    }
    echo json_encode($result,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),"\n";
} catch (Throwable $e) {
    fwrite(STDERR,"FOUNDATION_TRANSFER_REFUSED\n");exit(3);
}
