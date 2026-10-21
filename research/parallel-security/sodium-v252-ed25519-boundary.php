<?php
declare(strict_types=1);
// Read-only physical no-Sodium verification of actually Composer-installed
// pinned sodium_compat 2.5.2 Ed25519 security fixes from upstream PR #208.
// No key generation, release installation, production approval or CMS changes.
if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true' || $argc !== 1) {
    fwrite(STDERR, "RESEARCH_BOUNDARY_INFRASTRUCTURE_REFUSED\n");
    exit(3);
}
$autoload = getenv('SODIUM_COMPAT_AUTOLOAD');
if (!$autoload || !is_file($autoload) || !str_ends_with($autoload, '/autoload.php')) {
    fwrite(STDERR, "RESEARCH_BOUNDARY_INSTALLED_SOURCE_REQUIRED\n");
    exit(3);
}
$assertions = 0;
function verifyCondition(bool $ok, string $label): void {
    global $assertions;
    if (!$ok) throw new RuntimeException("BOUNDARY_FAILURE: " . $label);
    ++$assertions;
    echo "PASS " . $label . "\n";
}
function refuseSignature(callable $call, string $label): void {
    $refused = false;
    try {
        $result = $call();
        $refused = ($result === false);
    } catch (SodiumException $e) {
        $refused = true;
    }
    verifyCondition($refused, $label);
}
try {
    verifyCondition(PHP_VERSION_ID >= 80300 && PHP_VERSION_ID < 80400 &&
        PHP_INT_SIZE === 8 && !extension_loaded('sodium'), 'real physical PHP8.3 no sodium');
    verifyCondition(!function_exists('sodium_crypto_sign_verify_detached'),
        'no native detached verifier');
    require_once $autoload;
    verifyCondition(class_exists('ParagonIE_Sodium_Compat', false) &&
        class_exists('ParagonIE_Sodium_Core_Ed25519', true),
        'installed original Ed25519 implementation present');
    // RFC8032 test vector #1, independently established in existing
    // original CMS Ed25519 release lab.
    $pub = hex2bin('d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a');
    $sig = hex2bin('e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155'
      . '5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b');
    verifyCondition($pub !== false && $sig !== false &&
        ParagonIE_Sodium_Compat::crypto_sign_verify_detached($sig, '', $pub),
        'RFC8032 authentic positive via installed public API');

    // Upstream 2.5.2 PR #208 specifically fixes signature forgery from an
    // Ed25519 identity/small-order PUBLIC KEY. This is the upstream fixture.
    $identity = "\x01" . str_repeat("\0", 31);
    $forgery = "\x58" . str_repeat("\x66", 31) . "\x01" . str_repeat("\0", 31);
    refuseSignature(fn() => ParagonIE_Sodium_Compat::crypto_sign_verify_detached(
        $forgery, 'message', $identity), 'identity-key forgery rejected by public API');
    refuseSignature(fn() => ParagonIE_Sodium_Core_Ed25519::verify_detached(
        $forgery, 'message', $identity), 'identity-key forgery rejected by core');
    refuseSignature(fn() => ParagonIE_Sodium_Compat::crypto_sign_verify_detached(
        $forgery, 'message', str_repeat("\0", 32)),
        'all-zero public key rejected by public API');

    // Original upstream mixed-order vector from CoreEd25519Test. In 2.5.2
    // an exception must NOT leak the static global fastMult setting.
    $mixedPk = hex2bin('d1e06adf4e05e248e1e52beca14b6be4da0af01b41645d2849b407ec22f41d47');
    $mixedSig = hex2bin('6291d657deec24024827e69c3abe01a30ce548a284743a445e3680d7db5ac3ac'
        . '18ff9b538d16f290ae67f760984dc6594a7c15e9716ed28dc027beceea1ec40a');
    if (!$mixedPk || !$mixedSig) throw new RuntimeException('invalid upstream test vector');
    ParagonIE_Sodium_Compat::$fastMult = false;
    refuseSignature(fn() => ParagonIE_Sodium_Core_Ed25519::verify_detached(
        $mixedSig, hex2bin('af82'), $mixedPk),
        'mixed-subgroup public key rejected by core');
    verifyCondition(ParagonIE_Sodium_Compat::$fastMult === false,
        'fastMult global flag restored after mixed-order rejection');
    verifyCondition(ParagonIE_Sodium_Core_Ed25519::verify_detached($sig, '', $pub),
        'authentic positive signature accepted after adversarial exception');
    verifyCondition(ParagonIE_Sodium_Compat::$fastMult === false,
        'fastMult global flag restored after successful verification');

    refuseSignature(fn() => ParagonIE_Sodium_Compat::crypto_sign_verify_detached(
        $sig, 'domain-tampered', $pub), 'message binding prevents domain substitution');
    $badScalar = $sig;
    $badScalar[63] = "\xff";
    refuseSignature(fn() => ParagonIE_Sodium_Compat::crypto_sign_verify_detached(
        $badScalar, '', $pub), 'noncanonical signature scalar rejected');
    verifyCondition(ParagonIE_Sodium_Compat::$fastMult === false,
        'no global arithmetic-mode change after malformed signature');

    if ($assertions !== 13) throw new RuntimeException('incomplete independently checked cases');
    echo "REAL original sodium_compat 2.5.2 Ed25519 identity, subgroup and state-boundary PASS 13 assertions; physical native-free PHP; NOT formal crypto audit or production approval\n";
    echo json_encode(['schema'=>'ai-site-cms-source-ed25519-v252-boundary-v1',
       'assertions'=>$assertions,'physicalNoNative'=>true,'upstreamPatch'=>'paragonie/sodium_compat#208',
       'signedReleaseApproved'=>false,'cryptoExpertSignoff'=>false,'productionApproved'=>false],
       JSON_THROW_ON_ERROR) . "\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'REAL_SOURCE_BOUNDARY_FAILED: '. get_class($e).' '.$e->getMessage()."\n");
    exit(1);
}
