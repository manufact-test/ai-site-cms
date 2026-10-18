<?php
declare(strict_types=1);
// Real OS process dies while holding a SQLite IMMEDIATE transaction in an
// isolated ephemeral Stage2 foundation DB. The test supervisor sends SIGKILL.
// No live site, no external DB, no filesystem modifications outside temp.
if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1' || $argc !== 2) {
    fwrite(STDERR, "CI foundation transaction crash only\n");
    exit(2);
}
$filename=$argv[1];
$root=realpath(dirname($filename));
if ($root === false || dirname($root) !== realpath(sys_get_temp_dir())
    || !preg_match('/^ai-site-cms-db-checkpoint-test-[a-f0-9]{16}$/D', basename($root))
    || basename($filename) !== 'isolated.sqlite'
    || is_link($root) || is_link($filename) || !is_file($filename)
    || realpath($filename) !== $filename) {
    fwrite(STDERR, "Cannot touch foreign DB\n");
    exit(3);
}
$pdo=new PDO('sqlite:'.$filename);
$pdo->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_TIMEOUT,0);
$pdo->exec('BEGIN IMMEDIATE');
$affected=$pdo->exec('UPDATE cms_installation SET storage_generation=9 WHERE singleton_id=1');
if ($affected !== 1) throw new RuntimeException('Dedicated test singleton absent');
echo "UNCOMMITTED\n";
fflush(STDOUT);
// Wait with an uncommitted v2 storage-generation change; supervisor SIGKILLs.
fgets(STDIN);
$pdo->exec('ROLLBACK');
