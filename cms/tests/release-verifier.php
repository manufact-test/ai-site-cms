<?php
declare(strict_types=1);

// PHP 8.1–8.4 deterministic signing/verification contract tests using disposable
// opaque bytes, NOT a ZIP integrity/extraction test (real ZIP is in Node->PHP CI).
require dirname(__DIR__) . '/src/Release/OfflineReleaseVerifier.php';

use AiSiteCms\Release\OfflineReleaseVerifier;

$checks = 0;
function releaseCheck(bool $ok, string $name): void {
    global $checks;
    $checks++;
    if (!$ok) throw new RuntimeException('PHP release verifier: ' . $name);
}
function releaseReject(callable $run, string $name): void {
    $rejected = false;
    try { $run(); } catch (RuntimeException $exception) { $rejected = true; }
    releaseCheck($rejected, $name);
}
releaseCheck(function_exists('sodium_crypto_sign_detached'), 'Ed25519 sodium available in test matrix');

$temp = sys_get_temp_dir() . '/ai-site-cms-release-php-' . bin2hex(random_bytes(8));
mkdir($temp, 0700);
mkdir($temp . '/signed', 0700);
$folder = $temp . '/signed';
$keypair = sodium_crypto_sign_keypair();
$public = sodium_crypto_sign_publickey($keypair);
$secret = sodium_crypto_sign_secretkey($keypair);
$der = hex2bin('302a300506032b6570032100') . $public;
$pem = "-----BEGIN PUBLIC KEY-----\n"
    . chunk_split(base64_encode($der), 64, "\n")
    . "-----END PUBLIC KEY-----\n";
$pin = hash('sha256', $der);
$keyFile = $temp . '/trusted.pem';
file_put_contents($keyFile, $pem);
$archive = $folder . '/package.zip';
file_put_contents($archive, 'synthetic non-ZIP payload (metadata binding test only)');
$version = '0.2.0-stage2.1';
$fields = [
    'format' => 'ai-site-cms-stage2-signed-lab-envelope-v1',
    'version' => $version,
    'channel' => 'internal-laboratory',
    'productionReady' => false,
    'signatureAlgorithm' => 'Ed25519',
    'trustedKeyFingerprint' => $pin,
    'archiveName' => 'package.zip',
    'archiveBytes' => filesize($archive),
    'archiveSha256' => hash_file('sha256', $archive),
    'packageManifestSha256' => str_repeat('a', 64),
];
$raw = json_encode($fields, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
file_put_contents($folder . '/envelope.json', $raw);
$signature = sodium_crypto_sign_detached("AI-SITE-CMS-STAGE2-LAB-ENVELOPE-V1\0" . $raw, $secret);
file_put_contents($folder . '/envelope.sig', $signature);
$verify = static fn (?string $minimum = null, array $revoked = [], ?string $fingerprint = null):
    array => OfflineReleaseVerifier::verify($folder, $keyFile, $version, $fingerprint ?? $pin, $minimum, $revoked);

try {
    $result = $verify();
    releaseCheck($result['verification'] === 'signed_archive_metadata_verified',
        'valid cross-platform Ed25519 domain and signed metadata');
    releaseCheck($result['archive_sha256'] === hash_file('sha256', $archive),
        'signed archive digest matches');
    releaseCheck(!$result['safe_to_deploy'] && !$result['inventory_files_verified']
        && !$result['publisher_identity_proven'], 'scope remains narrow');
    releaseCheck(!$result['filesystem_modified'] && !$result['network_attempted'],
        'verifier is a read-only offline operation');
    releaseCheck($verify($version)['version'] === $version, 'equal minimum allowed');
    releaseReject(static fn () => $verify('0.2.0-stage2.2'), 'older-than-minimum release denied');
    releaseReject(static fn () => $verify(null, [$pin]), 'revoked pin denied');
    releaseReject(static fn () => $verify(null, [], str_repeat('0', 64)), 'wrong fingerprint denied');
    releaseReject(static fn () => OfflineReleaseVerifier::verify($folder, $keyFile,
        '0.2.0-stage2.9', $pin), 'unexpected signed version denied');
    releaseReject(static fn () => OfflineReleaseVerifier::verify($folder, $keyFile,
        'bad/../version', $pin), 'malformed version denied');

    $keyInternal = $folder . '/inside.pem';
    file_put_contents($keyInternal, $pem);
    releaseReject(static fn () => OfflineReleaseVerifier::verify($folder, $keyInternal,
        $version, $pin), 'key inside the untrusted archive folder forbidden');
    unlink($keyInternal);

    file_put_contents($archive, 'changed bytes');
    releaseReject($verify, 'modified archive bytes denied');
    file_put_contents($archive, 'synthetic non-ZIP payload (metadata binding test only)');

    file_put_contents($folder . '/envelope.sig', str_repeat("\0", 64));
    releaseReject($verify, 'forged signature denied');
    file_put_contents($folder . '/envelope.sig', $signature);

    file_put_contents($folder . '/envelope.json', str_replace('internal-laboratory', 'production', $raw));
    releaseReject($verify, 'forged channel denied');
    file_put_contents($folder . '/envelope.json', $raw);

    rename($folder . '/envelope.sig', $folder . '/original-sig');
    symlink($folder . '/original-sig', $folder . '/envelope.sig');
    releaseReject($verify, 'signature symlink denied');
    unlink($folder . '/envelope.sig');
    rename($folder . '/original-sig', $folder . '/envelope.sig');

    releaseCheck($verify()['verification'] === 'signed_archive_metadata_verified',
        'intact signature works after all negative fixtures');
    echo "Stage2 PHP 8.1+ Ed25519 OFFLINE verifier PASS: $checks assertions; no real publisher keys\n";
} finally {
    foreach (['envelope.sig','envelope.json','original-sig','package.zip','inside.pem'] as $f) {
        if (is_file($folder . '/' . $f) || is_link($folder . '/' . $f)) unlink($folder . '/' . $f);
    }
    if (is_file($keyFile)) unlink($keyFile);
    rmdir($folder);
    rmdir($temp);
}
