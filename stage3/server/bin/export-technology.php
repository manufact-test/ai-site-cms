<?php
declare(strict_types=1);
/**
 * Single-shot published CMS -> independent runtime output, CLI only.
 * Uses the existing strict snapshot renderer. No DB writes/deployments/servers.
 */
if (PHP_SAPI !== 'cli') exit(1);
function techRemove(string $folder): void
{
    if (!is_dir($folder) || is_link($folder)) return;
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($folder, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($files as $f) {
        if ($f->isDir() && !$f->isLink()) rmdir($f->getPathname());
        else unlink($f->getPathname());
    }
    rmdir($folder);
}
try {
    if ($argc !== 4 || !in_array($argv[2], ['php','next-static','next-ssr'], true)
        || preg_match('/^[a-z][a-z0-9-]{2,79}$/D',$argv[1])!==1)
        throw new RuntimeException('Usage: php export-technology.php <site-id> <php|next-static|next-ssr> <NEW-absolute-output-dir>');
    $tmp = sys_get_temp_dir().'/stage3-tech-'.bin2hex(random_bytes(12));
    if (!mkdir($tmp,0700)) throw new RuntimeException('Cannot create temporary export root');
    try {
        $commands = [
            [PHP_BINARY, __DIR__.'/export-published.php', $argv[1], $tmp.'/published'],
            ['node', dirname(__DIR__,2).'/runtime-export/bin/build.cjs', $tmp.'/published', $argv[2], $argv[3]]
        ];
        foreach ($commands as $command) {
            $pipes=[];
            $proc=proc_open($command,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
            if (!is_resource($proc)) throw new RuntimeException('Unable to launch export worker');
            fclose($pipes[0]);
            $stdout=stream_get_contents($pipes[1]);fclose($pipes[1]);
            $stderr=stream_get_contents($pipes[2]);fclose($pipes[2]);
            if (proc_close($proc)!==0) throw new RuntimeException(trim((string)$stderr) ?: 'Export worker failed');
            echo $stdout;
        }
    } finally {
        techRemove($tmp);
    }
} catch (Throwable $e) {
    fwrite(STDERR,"Technology export refused: ".$e->getMessage()."\n");
    exit(1);
}
