<?php
declare(strict_types=1);

/**
 * Independent Stage2 preactivation permit lab: real project verifier, ephemeral
 * native Ed25519 signatures, no production installation, DB or host access.
 */
require_once dirname(__DIR__, 2) . '/cms/src/Release/LabPreauthorizedUpgradeGate.php';

use AiSiteCms\Release\LabPreauthorizedUpgradeGate as Permit;

if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
    fwrite(STDERR, "BLOCKED: explicit disposable CI lab flags required\n");
    exit(2);
}
if (!extension_loaded('sodium')) {
    fwrite(STDERR, "BLOCKED: native sodium needed for ephemeral test signer\n");
    exit(3);
}
$root = sys_get_temp_dir() . '/ai-site-cms-trusted-upgrade-fixture-' . bin2hex(random_bytes(8));
$archive = $root . '/approved-permit-proofs';
$first = $archive . '/permit-000001';
$second = $archive . '/permit-000002';
$pending = $root . '/pending';
foreach ([$root, $archive, $first, $second, $pending] as $dir) {
    if (!mkdir($dir, 0700)) throw new RuntimeException('Cannot create permit scratch directory');
}
$pair = sodium_crypto_sign_keypair();
$private = sodium_crypto_sign_secretkey($pair);
$public = sodium_crypto_sign_publickey($pair);
$der = hex2bin('302a300506032b6570032100') . $public;
$keyfile = $root . '/operator.pem';
file_put_contents($keyfile, "-----BEGIN PUBLIC KEY-----\n"
    . chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n");
$pin = hash('sha256', $der);
$publisher = str_repeat('c', 64);
$site = 'permit-sandbox';
$domain = "AI-SITE-CMS-STAGE2-PREACTIVATION-V1\0";
$raw = static fn(array $v): string => json_encode($v, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
$sign = static function (string $dir, array $r, ?string $bytes = null)
    use ($private, $domain, $raw): string {
    $json = $bytes ?? $raw($r);
    $sig = sodium_crypto_sign_detached($domain . $json, $private);
    file_put_contents($dir . '/permit.json', $json);
    file_put_contents($dir . '/permit.sig', $sig);
    return hash('sha256', $domain . $json . $sig);
};
$base = [
    'format' => 'ai-site-cms-stage2-preactivation-approval-v1',
    'siteId' => $site,
    'nonce' => str_repeat('1', 32),
    'switchRootSha256' => str_repeat('2', 64),
    'sequence' => 1,
    'fromVersion' => null,
    'version' => '0.2.0-stage2.1',
    'minimumVersion' => '0.2.0-stage2.1',
    'previousReceiptSha256' => null,
    'publisherFingerprint' => $publisher,
    'manifestSha256' => str_repeat('3', 64),
    'archiveSha256' => str_repeat('4', 64),
    'dbCheckpoint' => ['codeVersion' => '0.2.0-stage2.1'],
    'productionReady' => false,
];
$next = $base;
$next['nonce'] = str_repeat('5', 32);
$next['sequence'] = 2;
$next['fromVersion'] = $base['version'];
$next['version'] = '0.2.1-stage2.1';
$next['dbCheckpoint'] = ['codeVersion' => $next['version']];
$prior = str_repeat('6', 64);
$next['previousReceiptSha256'] = $prior;
$checks = 0;
$check = static function (bool $condition, string $label) use (&$checks): void {
    if (!$condition) throw new RuntimeException('ASSERT FAILED: ' . $label);
    ++$checks;
};
$reject = static function (callable $fn, string $label) use ($check): void {
    try { $fn(); }
    catch (RuntimeException $e) { $check(true, $label); return; }
    throw new RuntimeException('Unexpectedly accepted malicious permit: ' . $label);
};
$verify = static fn(string $folder, string $head, ?string $previous,
    string $siteId = '', string $pub = '', string $operatorPin = ''): array =>
    Permit::verifyPermit($folder, $keyfile, $operatorPin ?: $pin, $head,
        $previous, $siteId ?: $site, $pub ?: $publisher);
$overwrite = static function (string $file, string $bytes, callable $test): void {
    $original = file_get_contents($file);
    try { file_put_contents($file, $bytes); $test(); }
    finally { file_put_contents($file, $original); }
};
$missing = static function (string $file, callable $test) use ($root): void {
    $aside = $root . '/away-' . basename(dirname($file)) . '-' . basename($file);
    if (!rename($file, $aside)) throw new RuntimeException('Cannot stage missing file');
    try { $test(); } finally { rename($aside, $file); }
};
$symlink = static function (string $file, callable $test) use ($missing, $root): void {
    $aside = $root . '/away-' . basename(dirname($file)) . '-' . basename($file);
    $missing($file, static function () use ($file, $aside, $test): void {
        if (!symlink($aside, $file)) throw new RuntimeException('Cannot stage symlink');
        try { $test(); } finally { unlink($file); }
    });
};
$malicious = static function (callable $mutation, string $label, bool $canonical = true)
    use ($next, $second, $sign, $verify, $reject, $prior): void {
    $oldJson = file_get_contents($second . '/permit.json');
    $oldSig = file_get_contents($second . '/permit.sig');
    try {
        $record = $next;
        $mutation($record);
        $bytes = $canonical ? null :
            json_encode($record, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . " \n";
        // A correct new signature AND new independently supplied hash isolate
        // actual semantics: these negatives must NOT rely on a stale hash.
        $hostileHead = $sign($second, $record, $bytes);
        $reject(static fn(): array => $verify($second, $hostileHead, $prior), $label);
    } finally {
        file_put_contents($second . '/permit.json', $oldJson);
        file_put_contents($second . '/permit.sig', $oldSig);
    }
};

try {
    $head1 = $sign($first, $base);
    $head2 = $sign($second, $next);
    $check($verify($first, $head1, null)['sequence'] === 1, 'signed genesis permit');
    $check($verify($second, $head2, $prior)['sequence'] === 2, 'signed successor permit');
    $check($verify($second, $head2, $prior)['productionReady'] === false, 'no production approval');
    Permit::assertNoPending($pending);
    $check(true, 'no pending operator approvals');

    $reject(static fn() => $verify($second, $head1, $prior), 'replayed old permit head');
    $reject(static fn() => $verify($second, str_repeat('0', 64), $prior), 'wrong head');
    $reject(static fn() => $verify($second, $head2, str_repeat('0', 64)), 'wrong prior receipt');
    $reject(static fn() => $verify($second, $head2, null), 'missing prior receipt');
    $reject(static fn() => $verify($second, $head2, $prior, 'another-site'), 'other site');
    $reject(static fn() => $verify($second, $head2, $prior, '../invalid'), 'bad site');
    $reject(static fn() => $verify($second, $head2, $prior, '', str_repeat('0', 64)), 'wrong publisher');
    $reject(static fn() => $verify($second, $head2, $prior, '', '', str_repeat('0', 64)), 'wrong operator pin');

    $overwrite($second . '/permit.sig', str_repeat("\0", 64),
        static fn() => $reject(static fn() => $verify($second, $head2, $prior), 'forged signature'));
    $overwrite($second . '/permit.sig', str_repeat("\0", 63),
        static fn() => $reject(static fn() => $verify($second, $head2, $prior), 'short signature'));
    $overwrite($second . '/permit.json', file_get_contents($second . '/permit.json') . ' ',
        static fn() => $reject(static fn() => $verify($second, $head2, $prior), 'tampered JSON'));
    $missing($second . '/permit.sig',
        static fn() => $reject(static fn() => $verify($second, $head2, $prior), 'missing signature'));
    $missing($second . '/permit.json',
        static fn() => $reject(static fn() => $verify($second, $head2, $prior), 'missing JSON'));
    $symlink($second . '/permit.sig',
        static fn() => $reject(static fn() => $verify($second, $head2, $prior), 'linked signature'));
    $symlink($second . '/permit.json',
        static fn() => $reject(static fn() => $verify($second, $head2, $prior), 'linked JSON'));
    $symlink($keyfile,
        static fn() => $reject(static fn() => $verify($second, $head2, $prior), 'linked public key'));
    $overwrite($keyfile, 'invalid PEM',
        static fn() => $reject(static fn() => $verify($second, $head2, $prior), 'malformed public key'));
    $victim = $root . '/hardlinked-permit';
    if (!link($second . '/permit.sig', $victim)) throw new RuntimeException('Cannot stage hardlink');
    try { $reject(static fn() => $verify($second, $head2, $prior), 'hardlinked signature'); }
    finally { unlink($victim); }
    file_put_contents($second . '/unexpected.txt', 'untrusted');
    try { $reject(static fn() => $verify($second, $head2, $prior), 'foreign permit file'); }
    finally { unlink($second . '/unexpected.txt'); }
    file_put_contents($pending . '/approval.tmp', 'unresolved');
    try { $reject(static fn() => Permit::assertNoPending($pending), 'pending file blocks reads'); }
    finally { unlink($pending . '/approval.tmp'); }
    symlink($second . '/permit.json', $pending . '/pending-link');
    try { $reject(static fn() => Permit::assertNoPending($pending), 'pending link blocks reads'); }
    finally { unlink($pending . '/pending-link'); }
    $rogue = sodium_crypto_sign_secretkey(sodium_crypto_sign_keypair());
    $overwrite($second . '/permit.sig', sodium_crypto_sign_detached(
        $domain . file_get_contents($second . '/permit.json'), $rogue),
        static fn() => $reject(static fn() => $verify($second, $head2, $prior), 'unknown operator signer'));

    $malicious(static function (array &$r): void { $r['sequence'] = 17; }, 'validly signed sequence outside range');
    $malicious(static function (array &$r): void { $r['productionReady'] = true; }, 'validly signed production flag');
    $malicious(static function (array &$r): void { $r['nonce'] = 'invalid'; }, 'validly signed nonce');
    $malicious(static function (array &$r): void { $r['nonce'] = str_repeat('7', 31); }, 'validly signed short nonce');
    $malicious(static function (array &$r): void { $r['version'] = '0.2.0-stage2.1'; }, 'validly signed rollback');
    $malicious(static function (array &$r): void { $r['minimumVersion'] = '0.9.0-stage2.1'; }, 'validly signed impossible floor');
    $malicious(static function (array &$r): void { $r['dbCheckpoint']['codeVersion'] = 'incorrect'; }, 'validly signed DB mismatch');
    $malicious(static function (array &$r): void { $r['previousReceiptSha256'] = str_repeat('8', 64); }, 'validly signed old head mismatch');
    $malicious(static function (array &$r): void { $r['fromVersion'] = null; }, 'validly signed missing predecessor version');
    $malicious(static function (array &$r): void { $r['publisherFingerprint'] = str_repeat('9', 64); }, 'validly signed wrong publisher');
    $malicious(static function (array &$r): void { $r['siteId'] = 'another-site'; }, 'validly signed site substitution');
    $malicious(static function (array &$r): void { $r['switchRootSha256'] = 'invalid'; }, 'validly signed malformed switch root');
    $malicious(static function (array &$r): void { $r['manifestSha256'] = 'invalid'; }, 'validly signed malformed manifest hash');
    $malicious(static function (array &$r): void { $r['archiveSha256'] = 'invalid'; }, 'validly signed malformed archive hash');
    $malicious(static function (array &$r): void { $r['format'] = 'downgraded'; }, 'validly signed old format');
    $malicious(static function (array &$r): void { $r['extra'] = 'unapproved'; }, 'validly signed extra field');
    $malicious(static function (array &$r): void {}, 'validly signed noncanonical whitespace', false);

    // Deliberate API boundary: verifyPermit() cannot independently establish
    // expected CAS sequence; activation()/settlement must check it separately.
    $skipped = $next;
    $skipped['sequence'] = 3;
    $skipHead = $sign($second, $skipped);
    try {
        $check($verify($second, $skipHead, $prior)['sequence'] === 3,
            'standalone permit does not by itself establish generation CAS');
    } finally { $sign($second, $next); }
    $check($verify($second, $head2, $prior)['sequence'] === 2, 'original signed permit restored');
    Permit::assertNoPending($pending);
    $check(true, 'pending remains empty after hostile mutations');
    echo "Stage2 signed permit adversarial research PASS: $checks assertions; native ephemeral PHP only, NOT production approval\n";
} finally {
    foreach ([$first, $second, $pending] as $d) {
        foreach (glob($d . '/*') ?: [] as $file) {
            if (is_file($file) || is_link($file)) unlink($file);
        }
        if (is_dir($d)) rmdir($d);
    }
    foreach (glob($root . '/*') ?: [] as $file) {
        if (is_file($file) || is_link($file)) unlink($file);
    }
    if (is_dir($archive)) rmdir($archive);
    if (is_dir($root)) rmdir($root);
}
