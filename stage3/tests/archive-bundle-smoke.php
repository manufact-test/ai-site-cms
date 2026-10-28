<?php
declare(strict_types=1);
require dirname(__DIR__) . '/server/bootstrap.php';
require dirname(__DIR__) . '/server/ArchiveBundle.php';

use Manufact\Stage3\ArchiveBundle;
use Manufact\Stage3\ContractValidator;
use Manufact\Stage3\SiteRepository;

function bundleAssert(bool $condition, string $message): void
{
    if (!$condition) throw new RuntimeException($message);
}
$pdo = new PDO('sqlite::memory:');
$repository = new SiteRepository($pdo, new ContractValidator(dirname(__DIR__) . '/components'));
$repository->initializeEmptyDatabase();
$site = json_decode(file_get_contents(dirname(__DIR__) . '/fixtures/industrial-site.json'), true, 512, JSON_THROW_ON_ERROR);
$repository->createSite($site);
$directory = sys_get_temp_dir() . '/stage3-test-bundle-' . bin2hex(random_bytes(10));
$target = 'site-bundle-recovery';
try {
    $created = ArchiveBundle::export($repository, $site['siteId'], $directory);
    bundleAssert($created['parts'] > 0 && is_file($directory . '/manifest.json'), 'bundle files missing');
    $plan = ArchiveBundle::plan($repository, $directory, $target);
    bundleAssert($plan['targetSiteId'] === $target && !$plan['willPublish'], 'unsafe recovery plan');
    $recovered = ArchiveBundle::restore($repository, $directory, $target);
    bundleAssert($recovered['targetSiteId'] === $target, 'restoration failed');
    bundleAssert($repository->getDraft($target)['site']['siteId'] === $target, 'draft identity mismatch');
    bundleAssert($repository->published($target) === null, 'recovered site unexpectedly published');
    try {
        ArchiveBundle::restore($repository, $directory, $target);
        throw new RuntimeException('overwriting existing target was accepted');
    } catch (\Manufact\Stage3\Conflict $expected) {}
    $part = $directory . '/part-001.bin';
    $original = file_get_contents($part);
    file_put_contents($part, 'X' . substr($original, 1));
    try {
        ArchiveBundle::plan($repository, $directory, 'site-bundle-invalid');
        throw new RuntimeException('corrupted backup accepted');
    } catch (InvalidArgumentException $expected) {}
    file_put_contents($part, $original);
    $archive = ArchiveBundle::read($directory);
    bundleAssert($archive['format'] === 'manufact-site-backup-v2'
        && $archive['sha256'] === hash('sha256', json_encode($archive['payload'],
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)), 'v2 checksum changed');
    echo "Private bundle export, plan, isolated restore, integrity and no-overwrite: OK\n";
} finally {
    if (is_dir($directory)) {
        foreach (glob($directory . '/*') ?: [] as $file) unlink($file);
        rmdir($directory);
    }
}
