<?php
declare(strict_types=1);

// Independent PHP sodium trust-chain fixture, supported on PHP 8.1–8.4.
// No Node dependency, real hosting contact, production keys or code deployment.
require dirname(__DIR__) . '/src/Release/TrustedChainVerifier.php';

use AiSiteCms\Release\TrustedChainVerifier as Trust;

$checks = 0;
function trustCheck(bool $ok, string $label): void {
    global $checks;
    $checks++;
    if (!$ok) throw new RuntimeException('PHP trust-chain fixture: ' . $label);
}
function trustReject(callable $call, string $label): void {
    $failed = false;
    try { $call(); } catch (RuntimeException $e) { $failed = true; }
    trustCheck($failed, $label);
}
function pubKey(array $keypair): string {
    return sodium_crypto_sign_publickey($keypair['pair']);
}
function privateKey(array $keypair): string {
    return sodium_crypto_sign_secretkey($keypair['pair']);
}
function pem(string $public): string {
    $der = hex2bin('302a300506032b6570032100') . $public;
    return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($der), 64, "\n")
        . "-----END PUBLIC KEY-----\n";
}
function fp(string $public): string {
    return hash('sha256', hex2bin('302a300506032b6570032100') . $public);
}
function signedTransition(array $old, array $new, string $root, int $epoch, string $floor): array {
    $proposal = [
        'format' => 'ai-site-cms-stage2-trust-chain-lab-v1',
        'root' => $root,
        'from' => fp(pubKey($old)),
        'to' => fp(pubKey($new)),
        'epochFrom' => $epoch,
        'epochTo' => $epoch + 1,
        'floorVersion' => $floor,
        'newPublicDer' => base64_encode(hex2bin('302a300506032b6570032100') . pubKey($new)),
        'purpose' => 'scheduled-rotation',
    ];
    $raw = "AI-SITE-CMS-STAGE2-TRUST-ROTATION-V1\0"
        . json_encode($proposal, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
    return [
        'proposal' => $proposal,
        'oldSignature' => bin2hex(sodium_crypto_sign_detached($raw, privateKey($old))),
        'newSignature' => bin2hex(sodium_crypto_sign_detached($raw, privateKey($new))),
    ];
}
function writeChain(string $file, string $root, array $events): void {
    file_put_contents($file, json_encode([
        'format' => 'ai-site-cms-stage2-trust-chain-lab-v1',
        'root' => $root,
        'events' => $events,
    ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n");
}
$root = sys_get_temp_dir() . '/ai-site-cms-trust-lab-' . bin2hex(random_bytes(8));
$outside = sys_get_temp_dir() . '/ai-site-cms-test-root-' . bin2hex(random_bytes(8)) . '.pem';
mkdir($root, 0700);
$chain = $root . '/trust-chain.json';
$keys = [];
foreach (['a','b','c','evil'] as $name) {
    $pair = sodium_crypto_sign_keypair();
    $keys[$name] = ['pair' => $pair];
}
$anchor = fp(pubKey($keys['a']));
file_put_contents($outside, pem(pubKey($keys['a'])));
$inspect = static fn (int $epoch=0): array => Trust::inspect($chain, $outside, $anchor, $epoch);
$ab = signedTransition($keys['a'], $keys['b'], $anchor, 0, '0.2.0-stage2.1');
$bc = signedTransition($keys['b'], $keys['c'], $anchor, 1, '0.2.0-stage2.2');
try {
    writeChain($chain, $anchor, []);
    trustCheck($inspect()['epoch'] === 0, 'initial root/empty history');
    trustReject(static fn () => $inspect(1), 'cannot fake next externally checkpointed epoch');
    writeChain($chain, $anchor, [$ab]);
    $b = $inspect(1);
    trustCheck($b['active_key_fingerprint'] === fp(pubKey($keys['b']))
        && $b['minimum_release_version'] === '0.2.0-stage2.1',
        'dual signatures produce expected B root and floor');
    trustCheck($b['status'] === 'clean' && !$b['production_ready']
        && !$b['publisher_identity_proven'], 'no production readiness or publisher identity');
    trustReject(static fn () => Trust::inspect($chain, $outside, fp(pubKey($keys['evil'])), 1),
        'external root pin mismatch');

    $bad = $ab;
    $bad['oldSignature'] = str_repeat('0', 128);
    writeChain($chain, $anchor, [$bad]);
    trustReject(static fn () => $inspect(1), 'forged old signer rejected');
    $bad = $ab;
    $bad['newSignature'] = str_repeat('0', 128);
    writeChain($chain, $anchor, [$bad]);
    trustReject(static fn () => $inspect(1), 'missing new signer consent rejected');

    $bad = $ab;
    $bad['proposal']['newPublicDer'] = base64_encode(
        hex2bin('302a300506032b6570032100') . pubKey($keys['evil'])
    );
    writeChain($chain, $anchor, [$bad]);
    trustReject(static fn () => $inspect(1), 'unauthorized new key substitution');
    writeChain($chain, $anchor, [$ab]);
    $intent = $root . '/trust-intent.json';
    file_put_contents($intent, json_encode([
        'format' => 'ai-site-cms-stage2-trust-chain-lab-v1',
        'fromEpoch' => 1,
        'eventSha256' => hash('sha256', json_encode($bc, JSON_UNESCAPED_SLASHES) . "\n"),
    ]) . "\n");
    trustCheck($inspect(1)['status'] === 'pending-before-commit',
        'incomplete transition journal detected');
    trustReject(static fn () => Trust::verifyRelease($chain, $outside, $anchor, 1, $outside,
        $root, '0.2.0-stage2.1'), 'no release authorization while trust journal pending');
    writeChain($chain, $anchor, [$ab,$bc]);
    trustCheck($inspect(2)['status'] === 'committed-needs-cleanup',
        'commit-before-journal-cleanup distinguished');
    unlink($intent);
    trustCheck($inspect(2)['active_key_fingerprint'] === fp(pubKey($keys['c'])),
        'trusted C follows valid A-B-C chain');
    trustReject(static fn () => $inspect(3), 'external epoch cannot exceed locally verified chain');
    writeChain($chain, $anchor, [$ab]);
    trustReject(static fn () => $inspect(2), 'external epoch prevents chain truncation');
    writeChain($chain, $anchor, [$ab,$bc]);
    $badC = $bc;
    $badC['proposal']['floorVersion'] = '0.2.0-stage2.0';
    $badC = signedTransition($keys['b'], $keys['c'], $anchor, 1, '0.2.0-stage2.0');
    writeChain($chain, $anchor, [$ab,$badC]);
    trustReject(static fn () => $inspect(2), 'correctly signed floor regression still forbidden');
    writeChain($chain, $anchor, [$ab,$bc]);

    file_put_contents($chain . '.new', 'interrupted');
    trustReject(static fn () => $inspect(2), 'unresolved atomic trust file refused');
    unlink($chain . '.new');
    mkdir($root . '/trust-exclusive.lock');
    trustReject(static fn () => $inspect(2), 'stale operator exclusive lock refused');
    rmdir($root . '/trust-exclusive.lock');

    trustCheck($inspect(2)['status'] === 'clean', 'final intact state after hostile fixtures');
    echo "Stage2 PHP-only dual-signature trust history PASS: $checks assertions (PHP "
        . PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION . ", disposable only)\n";
} finally {
    foreach (['trust-exclusive.lock'] as $dir) {
        if (is_dir($root . '/' . $dir)) rmdir($root . '/' . $dir);
    }
    foreach (['trust-chain.json','trust-chain.json.new','trust-intent.json',
        'trust-intent.json.new'] as $name) {
        $p = $root . '/' . $name;
        if (is_file($p) || is_link($p)) unlink($p);
    }
    if (is_file($outside)) unlink($outside);
    rmdir($root);
}
