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
        'public/.htaccess' => 'FallbackResource /index.php',
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
    labOk($valid['files'] === 5 && $valid['version'] === '0.2.0-stage2.1',
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

    // These are correctly indexed payloads with self-consistent hashes, not
    // accidental tampering. Stage2 must reject adding a public form, upload
    // handler or JS from the independent research, even with a fresh digest.
    $manifestFile=$source.'/private/package-manifest.json';
    $originalManifest=(string)file_get_contents($manifestFile);
    foreach ([
        'public/assets/ui.js'=>'document.title="unapproved-form";',
        'public/contact.html'=>'<form method="post"></form>',
        'public/upload.php'=>'<?php echo "unapproved upload";'
    ] as $extraPath=>$extraBytes) {
        $full=$source.'/'.$extraPath;
        $parent=dirname($full);
        if (!is_dir($parent)) mkdir($parent,0700,true);
        file_put_contents($full,$extraBytes);
        $fixtureManifest=json_decode($originalManifest,true,16,JSON_THROW_ON_ERROR);
        $fixtureManifest['files'][]=['path'=>$extraPath,
            'bytes'=>strlen($extraBytes),'sha256'=>hash('sha256',$extraBytes)];
        $newManifest=json_encode($fixtureManifest,
            JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
        file_put_contents($manifestFile,$newManifest);
        $attackerDigest=hash('sha256',$newManifest);
        labReject(static fn()=>Lab::verifyPackage($source,$attackerDigest),
            'fresh digest cannot authorize additional Stage2 public app surface: '.$extraPath);
        $rejectLab=Lab::create();$labRoots[]=$rejectLab->root();
        labReject(static fn()=> $rejectLab->stage($source,$attackerDigest),
            'unapproved public app cannot create even temporary install intent: '.$extraPath);
        labOk($rejectLab->inspect()['status']==='empty',
            'refusal made zero installer state changes for '.$extraPath);
        file_put_contents($manifestFile,$originalManifest);
        unlink($full);
        if ($parent===$source.'/public/assets') rmdir($parent);
    }
    labOk(Lab::verifyPackage($source,$hash)['files']===5,
        'after public-surface attack original verified inventory remains recoverable');

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

    // Operator journals are security-relevant, not merely debug metadata.
    // Any alternate JSON bytes (even if json_decode returns the SAME values)
    // must block both startup inspection and automatic-looking recovery.
    $ambiguous = Lab::create(); $labRoots[] = $ambiguous->root();
    labReject(static fn () => $ambiguous->stage($source, $hash, 'after-intent'),
        'construct pending installation for journal forensic mutations');
    $intentPath = $ambiguous->root() . '/install-intent.json';
    $intentRaw = (string)file_get_contents($intentPath);
    $intent = json_decode($intentRaw, true, 16, JSON_THROW_ON_ERROR);
    $journalVariants = [
        'appended_space' => $intentRaw . ' ',
        'removed_final_newline' => rtrim($intentRaw, "\n"),
        'extra_prefix_space' => ' ' . $intentRaw,
        'duplicate_format' => str_replace('"format":',
            '"format":"spoof","format":', $intentRaw),
        'duplicate_version' => str_replace('"version":',
            '"version":"0.0.0-stage2.0","version":', $intentRaw),
        'different_field_order' => json_encode([
            'version'=>$intent['version'], 'format'=>$intent['format'],
            'manifestSha256'=>$intent['manifestSha256']
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n",
        'wrong_digest_encoding' => json_encode(array_replace($intent,
            ['manifestSha256'=>str_repeat('g',64)]), JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n",
        'wrong_version_type' => json_encode(array_replace($intent,
            ['version'=>7]), JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n",
        'invalid_version' => json_encode(array_replace($intent,
            ['version'=>'0.2.0-stage2.invalid']), JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n"
    ];
    foreach ($journalVariants as $why => $attacked) {
        labOk($attacked !== $intentRaw, 'Journal attack fixture genuinely changed: '.$why);
        file_put_contents($intentPath, $attacked);
        labReject(static fn () => $ambiguous->inspect(),
            'noncanonical/inconsistent pending intent refused: '.$why);
        labReject(static fn () => $ambiguous->recover('abort'),
            'hostile intent cannot authorize removal of interrupted staging: '.$why);
        labOk((string)file_get_contents($intentPath) === $attacked,
            'refusal retains hostile intent for forensic review: '.$why);
    }
    file_put_contents($intentPath, $intentRaw);
    labOk($ambiguous->inspect()['status'] === 'pending-before-rename',
        'authentic pending journal remains recoverable after forensic restoration');
    labOk($ambiguous->recover('abort')['status'] === 'empty',
        'explicit abort after restoring unmodified intent');

    $partial = Lab::create(); $labRoots[] = $partial->root();
    labReject(static fn () => $partial->stage($source, $hash, 'after-receipt'),
        'construct committed install with unresolved cleanup journal');
    $receiptPath = $partial->root() . '/install-receipt.json';
    $validReceipt = (string)file_get_contents($receiptPath);
    foreach (['trailing-whitespace'=>$validReceipt . ' ',
              'duplicate-digest'=>str_replace('"manifestSha256":',
                  '"manifestSha256":"'.str_repeat('0',64).'","manifestSha256":',
                  $validReceipt)] as $why=>$tampered) {
        file_put_contents($receiptPath, $tampered);
        labReject(static fn () => $partial->inspect(),
            'ambiguous committed receipt is not considered ready: '.$why);
        labReject(static fn () => $partial->recover('finalize'),
            'ambiguous receipt cannot finalize interrupted install: '.$why);
    }
    file_put_contents($receiptPath, $validReceipt);
    labOk($partial->recover('finalize')['status'] === 'installed',
        'restored exact receipt and intent finalize normally');
    labOk(Lab::reopen($partial->root())->inspect()['ready'] === true,
        'canonical committed install remains ready after independent reopen');

    // Guard the actual operating-system permissions of the private operator
    // workspace even when a CI process inherits umask(0000).
    $oldMask = umask(0000);
    try {
        $private = Lab::create(); $labRoots[] = $private->root();
        labReject(static fn() => $private->stage($source,$hash,'after-intent'),
            'construct private journal under wide-open process umask');
        $intentFile = $private->root().'/install-intent.json';
        clearstatcache(true,$intentFile);
        labOk((fileperms($intentFile) & 0777) === 0600,
            'new intent always mode 0600 independent of caller umask');
        labOk((fileperms($private->root()) & 0777) === 0700,
            'new installation root always mode 0700');
        labOk($private->inspect()['status'] === 'pending-before-rename',
            'mode 0600 journal remains readable by private operator');

        chmod($intentFile, 0644);
        clearstatcache(true,$intentFile);
        labReject(static fn()=> $private->inspect(),
            'world-readable intent cannot authorize startup or recovery');
        labReject(static fn()=> $private->recover('abort'),
            'world-readable intent cannot authorize destructive stage cleanup');
        labOk(is_file($intentFile), 'unsafe intent retained for manual review');
        chmod($intentFile, 0600);
        clearstatcache(true,$intentFile);

        chmod($private->root(), 0777);
        // Deliberately DO NOT clear PHP's stat cache: the verifier itself
        // must spot out-of-band permission drift within this same process.
        labReject(static fn()=> Lab::reopen($private->root()),
            'world-writable imitation of private installer root is rejected');
        labReject(static fn()=> $private->inspect(),
            'existing lab object cannot use altered world-writable root');
        chmod($private->root(), 0700);
        labOk($private->recover('abort')['status'] === 'empty',
            'exact rights restoration permits explicit abort only');

        $receiptLab = Lab::create(); $labRoots[] = $receiptLab->root();
        labReject(static fn()=> $receiptLab->stage($source,$hash,'after-receipt'),
            'prepare crashed receipt under hostile caller umask');
        $receiptFile = $receiptLab->root().'/install-receipt.json';
        clearstatcache(true,$receiptFile);
        labOk((fileperms($receiptFile) & 0777) === 0600,
            'committed receipt always mode 0600 independent of process umask');
        chmod($receiptFile, 0666);
        clearstatcache(true,$receiptFile);
        labReject(static fn()=> $receiptLab->inspect(),
            'world-writable receipt cannot be considered a ready installation');
        labReject(static fn()=> $receiptLab->recover('finalize'),
            'world-writable receipt cannot finalize release');
        chmod($receiptFile, 0600);
        clearstatcache(true,$receiptFile);
        labOk($receiptLab->recover('finalize')['ready'] === true,
            'real signed-inventory receipt may finalize after permissions repair');

        // Never silently clean up a half-written receipt: it is a forensic
        // marker of an interrupted commit, even when other bytes are valid.
        $inflight = Lab::create(); $labRoots[]=$inflight->root();
        labReject(static fn()=> $inflight->stage($source,$hash,'after-intent'),
            'construct pending intent and interrupted receipt fixture');
        $receiptTemp=$inflight->root().'/install-receipt.json.tmp';
        file_put_contents($receiptTemp,'{"partial":');
        labReject(static fn()=> $inflight->inspect(),
            'incomplete receipt temporary file fails closed');
        labReject(static fn()=> $inflight->recover('abort'),
            'do not erase evidence of unfinished receipt write');
        labOk(is_file($receiptTemp), 'incomplete temp journal left for forensic review');
        unlink($receiptTemp);
        labOk($inflight->recover('abort')['status'] === 'empty',
            'explicit abort only after separate operator resolution of temp journal');
    } finally { umask($oldMask); }

    // Hardlinks to identical bytes in the installed code must not pass its
    // read-only integrity check; a file shared with a foreign tree is mutable.
    $linked = Lab::create(); $labRoots[] = $linked->root();
    labOk($linked->stage($source,$hash)['ready'] === true,
        'establish valid private package to exercise inode link refusal');
    $installedEditor=$linked->root().'/code/private/editor/editor.js';
    $outsideEditor=$fixtureRoot.'/external-editor-identical.js';
    file_put_contents($outsideEditor,'(() => {})();');
    unlink($installedEditor);
    link($outsideEditor,$installedEditor);
    labReject(static fn()=> $linked->inspect(),
        'foreign-linked editor cannot masquerade as installed immutable code');
    labOk((string)file_get_contents($outsideEditor)==='(() => {})();',
        'hardlink rejection did not change foreign operator data');
    unlink($installedEditor);
    file_put_contents($installedEditor,'(() => {})();');
    labOk($linked->inspect()['ready'] === true,
        'private inventory recovers once standalone original bytes restored');
    unlink($outsideEditor);

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
