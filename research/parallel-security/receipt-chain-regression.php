<?php
declare(strict_types=1);

/**
 * Independent Stage2 research: operator Ed25519 receipt chain adversarial checks.
 * Tests the real LabAttestedActivationGate::verifyChain() only; NEVER installs,
 * switches files, modifies production data, or reaches external services.
 */
require_once dirname(__DIR__, 2) . '/cms/src/Release/LabAttestedActivationGate.php';
use AiSiteCms\Release\LabAttestedActivationGate as Gate;

if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
    fwrite(STDERR, "BLOCKED: explicit CI=true CMS_ALLOW_PHP_INSTALL_LAB=1 required\n");
    exit(2);
}
if (!extension_loaded('sodium')) {
    fwrite(STDERR, "BLOCKED: this test needs native ext-sodium to generate ephemeral test keys\n");
    exit(3);
}
$domain = "AI-SITE-CMS-STAGE2-OPERATOR-RECEIPT-V1\0";
$spki = hex2bin('302a300506032b6570032100');
$dir = sys_get_temp_dir() . '/ai-site-cms-security-receipt-' . bin2hex(random_bytes(12));
if (!mkdir($dir, 0700) || !mkdir($dir . '/receipts', 0700)) {
    throw new RuntimeException('Cannot create disposable evidence directory');
}
$store = $dir . '/receipts';
$keyfile = $dir . '/operator.pem';
$site = 'research-labsite';
$publisher = str_repeat('b', 64);
$keys = sodium_crypto_sign_keypair();
$secret = sodium_crypto_sign_secretkey($keys);
$pub = sodium_crypto_sign_publickey($keys);
$der = $spki . $pub;
$pin = hash('sha256', $der);
file_put_contents($keyfile, "-----BEGIN PUBLIC KEY-----\n" .
    chunk_split(base64_encode($der), 64, "\n") . "-----END PUBLIC KEY-----\n");

$checks = 0;
$assert = static function (bool $ok, string $label) use (&$checks): void {
    if (!$ok) throw new RuntimeException("ASSERT FAILED: " . $label);
    $checks++;
};
$reject = static function (callable $fn, string $label) use ($assert): void {
    try {
        $fn();
    } catch (RuntimeException $e) {
        $assert(true, $label);
        return;
    }
    throw new RuntimeException('Unexpected accepted hostile receipt: ' . $label);
};
$encode = static fn(array $r): string =>
    json_encode($r, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
$recordFile = static fn(int $n): string =>
    $store . '/' . sprintf('receipt-%06d.json', $n);
$sigFile = static fn(int $n): string =>
    $store . '/' . sprintf('receipt-%06d.sig', $n);
$sign = static function (int $n, array $r, ?string $noncanonical = null)
    use ($recordFile, $sigFile, $secret, $domain, $encode): string {
    $raw = $noncanonical ?? $encode($r);
    $sig = sodium_crypto_sign_detached($domain . $raw, $secret);
    file_put_contents($recordFile($n), $raw);
    file_put_contents($sigFile($n), $sig);
    return hash('sha256', $domain . $raw . $sig);
};
$v1 = '0.2.0-stage2.1';
$v2 = '0.2.1-stage2.1';
$r1 = [
    'format' => 'ai-site-cms-stage2-operator-activation-receipt-v1',
    'siteId' => $site,
    'sequence' => 1,
    'fromVersion' => null,
    'version' => $v1,
    'minimumVersion' => $v1,
    'publisherFingerprint' => $publisher,
    'manifestSha256' => str_repeat('a', 64),
    'archiveSha256' => str_repeat('c', 64),
    'dbCheckpoint' => ['codeVersion' => $v1],
    'previousReceiptSha256' => null,
    'productionReady' => false,
];
$r2 = $r1;
$r2['sequence'] = 2;
$r2['fromVersion'] = $v1;
$r2['version'] = $v2;
$r2['dbCheckpoint'] = ['codeVersion' => $v2];
$verify = static fn(string $head, string $pem = '', string $keyPin = '', string $publisherPin = '',
    string $siteId = ''): array =>
    Gate::verifyChain($store, $pem ?: $keyfile, $keyPin ?: $pin,
        $head, $siteId ?: $site, $publisherPin ?: $publisher);
$saveMutatedSecond = static function (callable $fn, string $label, bool $isCanonical = true)
    use ($recordFile, $sigFile, &$r2, $sign, $verify, $reject, $encode, $domain, $secret): void {
    $json = file_get_contents($recordFile(2));
    $sig = file_get_contents($sigFile(2));
    try {
        $mod = $r2;
        $fn($mod);
        $raw = $isCanonical ? $encode($mod) : json_encode($mod, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . " \n";
        $head = $sign(2, $mod, $raw);
        // Crucially, *re-pin the new correctly signed head*: invalid semantic
        // records cannot be rejected merely because the old head was pinned.
        $reject(static fn(): array => $verify($head), $label);
    } finally {
        file_put_contents($recordFile(2), $json);
        file_put_contents($sigFile(2), $sig);
    }
};
$damage = static function (string $path, string $bytes, callable $fn): void {
    $before = file_get_contents($path);
    try {
        file_put_contents($path, $bytes);
        $fn();
    } finally {
        file_put_contents($path, $before);
    }
};
$missing = static function (string $path, callable $fn) use ($dir): void {
    $aside = $dir . '/' . basename($path) . '.outside';
    if (!rename($path, $aside)) throw new RuntimeException('Cannot stage missing-file attack');
    try { $fn(); } finally { rename($aside, $path); }
};
$symlink = static function (string $path, callable $fn) use ($missing, $dir): void {
    $aside = $dir . '/' . basename($path) . '.outside';
    $missing($path, static function () use ($path, $aside, $fn): void {
        if (!symlink($aside, $path)) throw new RuntimeException('Cannot stage symlink attack');
        try { $fn(); } finally { unlink($path); }
    });
};

try {
    $head1 = $sign(1, $r1);
    $r2['previousReceiptSha256'] = $head1;
    $head2 = $sign(2, $r2);
    $state = $verify($head2);
    $assert($state['count'] === 2 && $state['headSha256'] === $head2
        && $state['receipt']['version'] === $v2, 'valid 2-receipt out-of-band-pinned chain');
    $assert($state['receipt']['productionReady'] === false,
        'signed research receipt cannot assert production readiness');
    $reject(static fn(): array => $verify($head1), 'whole old receipt chain cannot replay under latest head');
    $reject(static fn(): array => $verify(str_repeat('0', 64)), 'wrong retained external receipt head');
    $reject(static fn(): array => $verify($head2, '', str_repeat('0', 64)), 'wrong out-of-band operator key pin');
    $reject(static fn(): array => $verify($head2, '', '', str_repeat('0', 64)), 'wrong independent publisher pin');
    $reject(static fn(): array => $verify($head2, '', '', '', 'different-site'), 'cross-site receipt replay');
    $reject(static fn(): array => $verify($head2, '', '', '', '../invalid'), 'invalid site identity');
    $damage($sigFile(2), str_repeat("\0", 64),
        static fn() => $reject(static fn(): array => $verify($head2), 'signature forgery'));
    $damage($sigFile(2), str_repeat("\0", 63),
        static fn() => $reject(static fn(): array => $verify($head2), 'short Ed25519 signature'));
    $damage($recordFile(2), file_get_contents($recordFile(2)) . ' ',
        static fn() => $reject(static fn(): array => $verify($head2), 'signed receipt bytes modified'));
    $missing($sigFile(2), static fn() => $reject(
        static fn(): array => $verify($head2), 'missing detached signature'));
    $symlink($sigFile(2), static fn() => $reject(
        static fn(): array => $verify($head2), 'symlinked detached signature'));
    $symlink($recordFile(2), static fn() => $reject(
        static fn(): array => $verify($head2), 'symlinked receipt JSON'));
    $other = $dir . '/hardlink-victim';
    if (!link($sigFile(2), $other)) throw new RuntimeException('Cannot stage hardlink');
    try { $reject(static fn(): array => $verify($head2), 'hardlinked signature refused'); }
    finally { unlink($other); }
    $missing($recordFile(1), static fn() => $reject(
        static fn(): array => $verify($head2), 'gap in sequence'));
    file_put_contents($store . '/extra-file.json', '{}');
    try { $reject(static fn(): array => $verify($head2), 'foreign file alongside receipts'); }
    finally { unlink($store . '/extra-file.json'); }
    $symlink($keyfile, static fn() => $reject(
        static fn(): array => $verify($head2), 'symlinked operator trust anchor'));
    $damage($keyfile, "-----BEGIN PUBLIC KEY-----\nINVALID\n-----END PUBLIC KEY-----\n",
        static fn() => $reject(static fn(): array => $verify($head2), 'malformed operator key'));
    $rogue = sodium_crypto_sign_keypair();
    $rogueSig = sodium_crypto_sign_detached($domain . file_get_contents($recordFile(2)),
        sodium_crypto_sign_secretkey($rogue));
    $damage($sigFile(2), $rogueSig,
        static fn() => $reject(static fn(): array => $verify($head2), 'unauthorized alternative operator signing key'));

    $saveMutatedSecond(static function (array &$r): void { $r['sequence'] = 3; },
        'valid signature cannot bypass strictly consecutive sequence');
    $saveMutatedSecond(static function (array &$r): void { $r['productionReady'] = true; },
        'valid signature cannot authorize production');
    $saveMutatedSecond(static function (array &$r) use ($v1): void { $r['version'] = $v1; },
        'valid signature cannot roll back version');
    $saveMutatedSecond(static function (array &$r): void {
        $r['minimumVersion'] = '0.1.0-stage2.1';
    }, 'valid signature cannot reduce release floor');
    $saveMutatedSecond(static function (array &$r): void {
        $r['previousReceiptSha256'] = str_repeat('d', 64);
    }, 'valid signature cannot break previous receipt hash link');
    $saveMutatedSecond(static function (array &$r): void {
        $r['fromVersion'] = '0.2.9-stage2.9';
    }, 'valid signature cannot falsify prior version');
    $saveMutatedSecond(static function (array &$r): void {
        $r['dbCheckpoint']['codeVersion'] = '0.2.9-stage2.9';
    }, 'valid signature cannot mismatch signed DB checkpoint');
    $saveMutatedSecond(static function (array &$r): void {
        $r['publisherFingerprint'] = str_repeat('a', 64);
    }, 'valid signature cannot substitute publisher identity');
    $saveMutatedSecond(static function (array &$r): void { $r['siteId'] = 'another-site'; },
        'valid signature cannot rebind site identity');
    $saveMutatedSecond(static function (array &$r): void {
        $r['format'] = 'legacy-insecure-receipt';
    }, 'valid signature cannot downgrade receipt format');
    $saveMutatedSecond(static function (array &$r): void {
        $r['manifestSha256'] = 'untrusted';
    }, 'valid signature cannot contain unpinned manifest digest');
    $saveMutatedSecond(static function (array &$r): void {
        $r['archiveSha256'] = 'untrusted';
    }, 'valid signature cannot contain unpinned archive digest');
    $saveMutatedSecond(static function (array &$r): void {
        $r['minimumVersion'] = '0.9.0-stage2.1';
    }, 'valid signature cannot set floor above version');
    $saveMutatedSecond(static function (array &$r): void { $r['extra'] = 'unreviewed'; },
        'valid signature cannot expand canonical receipt schema');
    $saveMutatedSecond(static function (array &$r): void { }, 'correctly signed but noncanonical whitespace rejected', false);

    $final = $verify($head2);
    $assert($final['count'] === 2 && $final['headSha256'] === $head2,
        'original evidence remains valid after all hostile mutations');
    echo "Stage2 research operator receipt chain: $checks independent assertions PASS; "
        . "ephemeral native PHP only, no production approval\n";
} finally {
    foreach (glob($store . '/*') ?: [] as $path) {
        if (is_file($path) || is_link($path)) unlink($path);
    }
    if (is_file($keyfile) || is_link($keyfile)) unlink($keyfile);
    if (is_dir($store)) rmdir($store);
    if (is_dir($dir)) rmdir($dir);
}
