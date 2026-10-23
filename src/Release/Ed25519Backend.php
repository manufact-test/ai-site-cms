<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

/**
 * Single Stage2 Ed25519 verifier. Prefer the native internal Sodium extension.
 *
 * The only considered userland candidate is the exact Composer-installed
 * paragonie/sodium_compat 2.5.2 source pinned in the isolated Stage2 review.
 * This is NOT approval to ship that candidate: the production lock has not
 * adopted it and independent legal/security/target-host review is still open.
 * Missing provider, forged userland functions/classes, or unpinned source fail
 * closed. Do not substitute external commands, hashes or unsigned receipts.
 */
final class Ed25519Backend
{
    private const COMPAT_PACKAGE = 'paragonie/sodium_compat';
    private const COMPAT_VERSION = 'v2.5.2';
    private const COMPAT_REFERENCE = '3246b36803c177847e677862fedeb7f937869adb';

    private static function nativeAvailable(): bool
    {
        // A disabled PHP internal function may be reintroduced by untrusted
        // userland with the SAME name: function_exists alone is insufficient.
        if (!extension_loaded('sodium') || !function_exists('sodium_crypto_sign_verify_detached')) {
            return false;
        }
        try {
            return (new \ReflectionFunction('sodium_crypto_sign_verify_detached'))->isInternal();
        } catch (\ReflectionException $error) {
            return false;
        }
    }

    private static function pinnedCompatAvailable(): bool
    {
        // Do not even autoload an untrusted class by its claimed name until
        // Composer confirms that the exact reviewed *candidate* was installed.
        if (!class_exists('Composer\\InstalledVersions')) {
            return false;
        }
        try {
            if (!\Composer\InstalledVersions::isInstalled(self::COMPAT_PACKAGE)
                || \Composer\InstalledVersions::getPrettyVersion(self::COMPAT_PACKAGE) !== self::COMPAT_VERSION
                || \Composer\InstalledVersions::getReference(self::COMPAT_PACKAGE) !== self::COMPAT_REFERENCE) {
                return false;
            }
            $install = \Composer\InstalledVersions::getInstallPath(self::COMPAT_PACKAGE);
            if (!is_string($install) || ($realInstall = realpath($install)) === false
                || !is_dir($realInstall)
                || !class_exists('ParagonIE_Sodium_Compat')) {
                return false;
            }
            // Composer metadata without origin checking is not enough: a
            // preloaded lookalike class outside the installed package could
            // claim to verify any detached signature.
            $reflection = new \ReflectionClass('ParagonIE_Sodium_Compat');
            $file = $reflection->getFileName();
            if (!$reflection->isUserDefined() || !is_string($file)
                || ($realFile = realpath($file)) === false
                || !str_starts_with($realFile, $realInstall . DIRECTORY_SEPARATOR)
                || !is_file($realFile) || is_link($file)
                || !$reflection->hasMethod('crypto_sign_verify_detached')) {
                return false;
            }
            $method = $reflection->getMethod('crypto_sign_verify_detached');
            return $method->isPublic() && $method->isStatic();
        } catch (\Throwable $error) {
            return false;
        }
    }

    /** Local capability information only; never an identity or host approval. */
    public static function provider(): string
    {
        if (self::nativeAvailable()) {
            return 'native-sodium';
        }
        return self::pinnedCompatAvailable() ? 'pinned-sodium-compat-2.5.2' : 'unavailable';
    }

    public static function available(): bool
    {
        return self::provider() !== 'unavailable';
    }

    public static function verifyDetached(string $signature, string $message, string $publicKey): bool
    {
        if (strlen($signature) !== 64 || strlen($publicKey) !== 32) {
            return false;
        }
        if (self::nativeAvailable()) {
            try {
                return \sodium_crypto_sign_verify_detached($signature, $message, $publicKey);
            } catch (\SodiumException|\ValueError $error) {
                return false;
            }
        }
        if (!self::pinnedCompatAvailable()) {
            return false;
        }
        try {
            return \ParagonIE_Sodium_Compat::crypto_sign_verify_detached(
                $signature, $message, $publicKey
            );
        } catch (\Throwable $error) {
            return false;
        }
    }
}
