<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

/**
 * Single Stage2 Ed25519 verifier backend. Native libsodium remains preferred.
 *
 * The optional, security-reviewed and exact Composer-pinned
 * paragonie/sodium_compat may be used only when it is independently installed
 * in the application's trusted, private vendor tree. No network, shell,
 * embedded public keys or fallback to insecure hashes/unsigned receipts.
 *
 * Current production composer.lock does NOT yet include the polyfill:
 * missing ext-sodium and missing audited polyfill MUST reject signatures.
 */
final class Ed25519Backend
{
    public static function available(): bool
    {
        return function_exists('sodium_crypto_sign_verify_detached')
            || class_exists('ParagonIE_Sodium_Compat');
    }

    public static function verifyDetached(string $signature, string $message, string $publicKey): bool
    {
        if (strlen($signature) !== 64 || strlen($publicKey) !== 32) {
            return false;
        }
        if (function_exists('sodium_crypto_sign_verify_detached')) {
            try {
                return sodium_crypto_sign_verify_detached($signature, $message, $publicKey);
            } catch (\SodiumException|\ValueError $error) {
                return false;
            }
        }
        if (!class_exists('ParagonIE_Sodium_Compat')) {
            return false;
        }
        try {
            // Same strict Ed25519 detached signature check; no downgrade of
            // existing envelope/key pin/epoch/version/receipt authorization.
            return \ParagonIE_Sodium_Compat::crypto_sign_verify_detached(
                $signature, $message, $publicKey
            );
        } catch (\Throwable $error) {
            return false;
        }
    }
}
