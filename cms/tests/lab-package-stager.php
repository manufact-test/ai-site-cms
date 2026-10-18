<?php
declare(strict_types=1);

// Only transient CI directories are ever created or deleted by this test.
// A fully verified internal package is tested when the editor/build job provides one.
require dirname(__DIR__) . '/src/Release/LabPackageStager.php';

use AiSiteCms\Release\LabPackageStager as Lab;

if (getenv('CI') !== 'true' || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
    throw new RuntimeException('Explicit disposable CI lab flags required');
}
$checks = 0;
function labOk(bool $ok, string $label): void {
    global $checks;
    $checks++;
    if (!$ok) throw new RuntimeException('Stage2 PHP install lab: ' . $label);
}
function labReject(callable $fn, string $label): void {
    global $checks;
    $checks++;
    try { $fn(); } catch (\Throwable $error) { return; }
    throw new RuntimeException('Unexpectedly allowed unsafe install: ' . $label);
}
function makeFixture(string $path): string {
    mkdir($path, 0700);
    foreach (['public','vendor','private','private/editor'] as $dir) {
        mkdir($path . '/' . $dir, 0700, true);
    }
    $files = [
        'public/index.php' => '<?php echo "ok";',
        'vendor/autoload.php' => '<?php // simulated Composer autoload',
        'private/editor/editor.js' => '(() => {})();',
        'composer.json' => '{"require":{}}',
    ];
    $records = [];
    foreach ($files as $name => $contents) {
        file_put_contents($path . '/' . $name, $contents);
        $records[] = ['path'=>$name,'bytes'=>strlen($contents),
            'sha256'=>hash('sha256', $contents)];
    }
    $manifest = [
        'format'=>'ai-site-cms-internal-stage2-v2',
        'stage'=>2,
        'releaseVersion'=>'0.2.0-stage2.1',
        'productionReady'=>false,
        'documentRoot'=>'public',
        'isSigned'=>false,
        'writeEndpointsAvailable'=>false,
        'files'=>$records,
    ];
    $raw = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
    file_put_contents($path . '/private/package-manifest.json', $raw);
    return hash('sha256', $raw);
}
function cleanupFixture(string $path): void {
    if (is_link($path) || is_file($path)) { unlink($path); return; }
    foreach (scandir($path) as $name) {
        if ($name !== '.' && $name !== '..') cleanupFixture($path . '/' . $name);
    }
    rmdir($path);
}
$fixtureRoot = sys_get_temp_dir() . '/ai-site-cms-php-install-fixtures-' . bin2hex(random_bytes(8));
mkdir($fixtureRoot, 0700);
$source = $fixtureRoot . '/package';
$hash = makeFixture($source);
$labRoots = [];
try {
    $valid = Lab::verifyPackage($source, $hash);
    labOk($valid['files'] === 4 && $valid['version'] === '0.2.0-stage2.1',
        'verified synthetic internal package');
    labReject(static fn () => Lab::verifyPackage($source, str_repeat('0', 64)),
        'unknown supplied package digest');
    labReject(static fn () => Lab::verifyPackage($source, '../' . $hash),
        'non-hex alleged signed digest');
    labReject(static fn () => Lab::reopen($source), 'cannot adopt non-lab app');
    labReject(static fn () => Lab::reopen(sys_get_temp_dir()), 'cannot adopt OS temp root');

    file_put_contents($source . '/public/backdoor.php', '<?php echo 1;');
    labReject(static fn () => Lab::verifyPackage($source, $hash), 'unlisted executable');
    unlink($source . '/public/backdoor.php');
    file_put_contents($source . '/public/.env', 'test-marker-not-a-secret');
    labReject(static fn () => Lab::verifyPackage($source, $hash), 'unexpected public env');
    unlink($source . '/public/.env');
    symlink($source . '/vendor/autoload.php', $source . '/public/alias.txt');
    labReject(static fn () => Lab::verifyPackage($source, $hash), 'symlink injection');
    unlink($source . '/public/alias.txt');
    link($source . '/vendor/autoload.php', $source . '/public/hardlink.txt');
    labReject(static fn () => Lab::verifyPackage($source, $hash), 'hardlink injection');
    unlink($source . '/public/hardlink.txt');
    file_put_contents($source . '/private/editor/editor.js', 'TAMPER');
    labReject(static fn () => Lab::verifyPackage($source, $hash), 'tampered source bytes');
    file_put_contents($source . '/private/editor/editor.js', '(() => {})();');

    foreach (['after-intent','after-copy','after-rename','after-receipt',null] as $fault) {
        $lab = Lab::create();
        $labRoots[] = $lab->root();
        if ($fault !== null) {
            labReject(static fn () => $lab->stage($source, $hash, $fault),
                'injected interruption ' . $fault);
        } else {
            labOk($lab->stage($source, $hash)['status'] === 'installed', 'clean install');
        }
        if ($fault !== null) {
            $before = $lab->inspect()['status'];
            $expected = in_array($fault, ['after-intent','after-copy'], true)
                ? 'pending-before-rename'
                : ($fault === 'after-rename' ? 'pending-after-rename' : 'committed-needs-cleanup');
            labOk($before === $expected, 'journal distinguishes fault ' . $fault);
            labReject(static fn () => $lab->stage($source, $hash), 'duplicate/unfinished install');
            $recovery = in_array($fault, ['after-intent','after-copy'], true) ? 'abort' : 'finalize';
            labReject(static fn () => $lab->recover($recovery === 'abort' ? 'finalize' : 'abort'),
                'wrong recovery direction');
            labOk($lab->recover($recovery)['status']
                === ($recovery === 'abort' ? 'empty' : 'installed'),
                'explicit correct recovery ' . $fault);
            if ($recovery === 'abort') {
                labOk($lab->stage($source, $hash)['status'] === 'installed',
                    'repeat only after explicit aborted staging');
            }
        }
        labOk(Lab::reopen($lab->root())->inspect()['status'] === 'installed',
            'restart independently re-verifies installed package');
        labReject(static fn () => $lab->recover('abort'), 'cannot reverse an installed release');
        labReject(static fn () => $lab->stage($source, $hash), 'cannot overwrite installed release');
    }

    $hostile = Lab::create(); $labRoots[] = $hostile->root();
    labReject(static fn () => $hostile->stage($source, $hash, 'after-intent'),
        'make pending install journal');
    symlink($fixtureRoot, $hostile->root() . '/staging');
    labReject(static fn () => $hostile->recover('abort'), 'do not clean symlink toward foreign files');
    unlink($hostile->root() . '/staging');
    labOk($hostile->recover('abort')['status'] === 'empty', 'manual removal of foreign node permits abort');

    // Full compiled distribution from the static editor workflow, not a fake fixture.
    // This verifies actual package bytes; the separate Node/PHP signed-archive test
    // authenticates the digest used for the end-to-end distribution workflow.
    $real = dirname(__DIR__) . '/.build/internal-stage2-package';
    if (is_dir($real)) {
        $manifestFile = $real . '/private/package-manifest.json';
        $expectedDigest = hash_file('sha256', $manifestFile);
        if ($expectedDigest === false) throw new RuntimeException('Cannot hash compiled package manifest');
        $report = Lab::verifyPackage($real, $expectedDigest);
        labOk($report['files'] >= 400, 'real compiled private package full inventory verified');
        $lab = Lab::create(); $labRoots[] = $lab->root();
        labOk($lab->stage($real, $expectedDigest)['status'] === 'installed',
            'real distribution staged only under isolated temporary root');
        labOk(Lab::reopen($lab->root())->inspect()['status'] === 'installed',
            'actual installed code reverified after re-opening lab');
    }
    labOk($checks >= 45, 'adversarial install coverage exercised');
    echo 'Stage2 PHP-only disposable package install PASS: ' . $checks
        . " checks; no production target, DB or HTTP changes\n";
} finally {
    foreach ($labRoots as $directory) cleanupFixture($directory);
    cleanupFixture($fixtureRoot);
}
