<?php
declare(strict_types=1);

// Private CI fixture only: execute the single authenticated upgrade coordinator
// under a fresh independent PHP process with an ephemeral SQLite installation.
require dirname(__DIR__,2).'/src/Storage/SchemaManager.php';
require dirname(__DIR__,2).'/src/Release/LabSchemaVersionGate.php';
require dirname(__DIR__,2).'/src/Release/LabPackageStager.php';
require dirname(__DIR__,2).'/src/Release/LabPhpGenerationSwitcher.php';
require dirname(__DIR__,2).'/src/Release/LabTrustedUpgradeCoordinator.php';

use AiSiteCms\Storage\SchemaManager;
use AiSiteCms\Release\LabSchemaVersionGate as Gate;
use AiSiteCms\Release\LabPhpGenerationSwitcher as Switcher;
use AiSiteCms\Release\LabTrustedUpgradeCoordinator as Upgrade;

if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
    fwrite(STDERR, "AUTHORIZED_DISPOSABLE_CI_ONLY\n");exit(2);
}
try {
    $action=$argv[1] ?? '';
    $site='labsite';
    $dbPath=$argv[2] ?? '';
    $parent=realpath(dirname($dbPath));
    if ($parent===false || dirname($parent)!==realpath(sys_get_temp_dir())
        || !preg_match('/^ai-site-cms-trusted-upgrade-fixture-[a-f0-9]{16}$/D',basename($parent))
        || basename($dbPath)!=='site.sqlite'
        || is_link($parent) || is_link($dbPath)) {
        throw new RuntimeException('Refusing non-ephemeral test DB');
    }
    if ($action==='setup' && $argc===4) {
        if (file_exists($dbPath)) throw new RuntimeException('Test DB already exists');
        $pdo=new PDO('sqlite:'.$dbPath);
        $pdo->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
        (new SchemaManager($pdo,true))->installSite($site);
        echo json_encode(['first'=>Gate::checkpoint($pdo,$site,'0.2.0-stage2.1'),
            'second'=>Gate::checkpoint($pdo,$site,'0.2.0-stage2.2')],
            JSON_THROW_ON_ERROR),"\n";
    } elseif ($action==='new' && $argc===3) {
        echo json_encode(['root'=>Switcher::create()->root()],JSON_THROW_ON_ERROR),"\n";
    } elseif ($action==='mutate' && $argc===4) {
        if (!in_array($argv[3],['0','1','2'],true)) throw new RuntimeException('Invalid synthetic generation');
        $pdo=new PDO('sqlite:'.$dbPath);
        (new SchemaManager($pdo,true))->assertSite($site);
        $pdo->exec('UPDATE cms_installation SET storage_generation='.(int)$argv[3].' WHERE singleton_id=1');
        echo '{"mutated":true}',"\n";
    } elseif ($action==='activate' && $argc===13) {
        [$root,$expectedFile,$bundle,$extracted,$pem,$fingerprint,$version,$minimum,
            $current,$generation]=array_slice($argv,3);
        $bytes=file_get_contents($expectedFile);
        if ($bytes===false || strlen($bytes)>4096 || is_link($expectedFile)) {
            throw new RuntimeException('Untrusted independent DB checkpoint file');
        }
        $checkpoint=json_decode($bytes,true,16,JSON_THROW_ON_ERROR);
        $pdo=new PDO('sqlite:'.$dbPath);
        $active=Upgrade::stageAndActivate(
            $pdo,$site,Switcher::reopen($root),
            $bundle,$extracted,$pem,$fingerprint,$version,$minimum,$checkpoint,
            $current==='none'?null:$current,(int)$generation
        );
        echo json_encode($active,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),"\n";
    } elseif ($action==='inspect' && $argc===5) {
        $state=Switcher::reopen($argv[3])->inspect($argv[4]);
        echo json_encode($state,JSON_THROW_ON_ERROR),"\n";
    } elseif ($action==='serve' && $argc===7) {
        [$root,$version,$floor,$checkpointFile]=array_slice($argv,3);
        $checkpoint=json_decode(file_get_contents($checkpointFile),true,16,JSON_THROW_ON_ERROR);
        $pdo=new PDO('sqlite:'.$dbPath);
        $version=Switcher::reopen($root)->withRequestLeaseAndCheckpoint(
            $pdo,$site,$version,$floor,$checkpoint,
            static fn(array $generation):array =>
                ['version'=>$generation['version'],'sequence'=>$generation['sequence']]
        );
        echo json_encode($version,JSON_THROW_ON_ERROR),"\n";
    } else {
        throw new RuntimeException('Unsupported isolated operator request');
    }
} catch (Throwable $e) {
    fwrite(STDERR,"UNIFIED_TRUSTED_UPGRADE_REFUSED\n");
    exit(3);
}
