<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use AiSiteCms\Release\Ed25519Backend;
use RuntimeException;

/**
 * Stage2 ONLY: an additional explicit, package- and one-task-bound OWNER
 * Ed25519 permission before any write installation is allowed to connect to DB.
 *
 * The owner trust anchor and signature are local/private, never in the unsigned
 * build or GitHub. The operator must obtain and pin the owner public key through
 * a separate real-world procedure. Cryptographic validity alone does not
 * authenticate the owner or approve Stage2/Stage3.
 *
 * Native Sodium, or a separately security-reviewed bundled verifier, is
 * mandatory for install; missing crypto must fail CLOSED, not become consent.
 * Probe/verify/snapshot are NOT allowed to borrow this write authorization.
 */
final class Stage2OwnerWriteConsent
{
    private const DOMAIN = "AI-SITE-CMS-STAGE2-OWNER-WRITE-INSTALL-V1\0";
    private const SPKI_PREFIX = '302a300506032b6570032100';

    /** @param array<string,mixed> $task */
    public static function verify(string $localRoot, array $task, string $manifestDigest): void
    {
        if (($task['operation'] ?? null) !== 'install') {
            throw new RuntimeException('WRITE_AUTHORIZATION_ONLY_FOR_INSTALL');
        }
        if (!Ed25519Backend::available()) {
            throw new RuntimeException('ED25519_VERIFIER_UNAVAILABLE_FAIL_CLOSED');
        }
        // SECURITY BOUNDARY: a pin stored beside operator once.json is not
        // a trust anchor. An attacker able to replace that directory could
        // forge both its owner-install-public.pem AND trust JSON. The
        // independently provisioned, exact Ed25519 SPKI SHA-256 pin must be
        // injected by the separately administered PHP CLI/Cron environment.
        // Missing or malformed external pin = NO DB connection or receipt.
        // This does NOT authenticate the human owner or certify Hostinger
        // environment administration by itself.
        $externallyPinned = getenv('CMS_STAGE2_OWNER_INSTALL_TRUSTED_SPKI_SHA256');
        if (!is_string($externallyPinned)
            || !preg_match('/\\A[a-f0-9]{64}\\z/D', $externallyPinned)) {
            throw new RuntimeException('OWNER_INSTALL_EXTERNAL_TRUST_ANCHOR_REQUIRED');
        }
        $trust = Stage2PrivateOperatorRecord::readJsonObject(
            $localRoot.'/owner-install-trust.json', 1024
        );
        if (array_keys($trust) !== [
            'format','target','site','trustedOwnerSpkiSha256'
        ] || $trust['format'] !== 'ai-site-cms-stage2-owner-install-trust-v1'
            || $trust['target'] !== HostingerStage2OneShot::TARGET
            || $trust['site'] !== HostingerStage2OneShot::SITE
            || !is_string($trust['trustedOwnerSpkiSha256'])
            || !preg_match('/\A[a-f0-9]{64}\z/D', $trust['trustedOwnerSpkiSha256'])) {
            throw new RuntimeException('OWNER_INSTALL_TRUST_REFUSED');
        }
        $pem = Stage2PrivateOperatorRecord::readBytes(
            $localRoot.'/owner-install-public.pem', 4096, 80
        );
        if (!preg_match('/\A-----BEGIN PUBLIC KEY-----\n([A-Za-z0-9+\/=\n]+)-----END PUBLIC KEY-----\n\z/D', $pem, $m)) {
            throw new RuntimeException('OWNER_INSTALL_PUBLIC_KEY_REFUSED');
        }
        $encoded = str_replace("\n", '', $m[1]);
        $der = base64_decode($encoded, true);
        if (!is_string($der) || strlen($der) !== 44
            || bin2hex(substr($der, 0, 12)) !== self::SPKI_PREFIX
            || !hash_equals($externallyPinned, $trust['trustedOwnerSpkiSha256'])
            || !hash_equals($externallyPinned, hash('sha256', $der))) {
            throw new RuntimeException('OWNER_INSTALL_KEY_PIN_REFUSED');
        }
        $record = Stage2PrivateOperatorRecord::readJsonObject(
            $localRoot.'/owner-install-consent.json', 4096
        );
        if (array_keys($record) !== ['format','payload','signature']
            || $record['format'] !== 'ai-site-cms-stage2-owner-write-consent-v1'
            || !is_array($record['payload']) || array_is_list($record['payload'])
            || !is_string($record['signature'])) {
            throw new RuntimeException('OWNER_INSTALL_CONSENT_REFUSED');
        }
        $payload = $record['payload'];
        if (array_keys($payload) !== [
            'format','target','site','operation','packageManifestSha256',
            'taskSha256','notBeforeUtc','expiresAtUtc','productionReady','stage2Accepted'
        ] || $payload['format'] !== 'ai-site-cms-stage2-owner-write-payload-v1'
            || $payload['target'] !== HostingerStage2OneShot::TARGET
            || $payload['site'] !== HostingerStage2OneShot::SITE
            || $payload['operation'] !== 'install'
            || $payload['productionReady'] !== false || $payload['stage2Accepted'] !== false
            || !is_string($payload['packageManifestSha256'])
            || !hash_equals($manifestDigest, $payload['packageManifestSha256'])
            || !is_string($payload['taskSha256'])
            || !hash_equals(
                hash('sha256', json_encode($task, JSON_THROW_ON_ERROR)),
                $payload['taskSha256']
            )) {
            throw new RuntimeException('OWNER_INSTALL_SCOPE_MISMATCH');
        }
        $start = self::strictUtc($payload['notBeforeUtc']);
        $end = self::strictUtc($payload['expiresAtUtc']);
        $now = time();
        if ($start > $now || $end < $now || $end <= $start
            || $end - $start > 3600 || $now - $start > 3600) {
            throw new RuntimeException('OWNER_INSTALL_CONSENT_TIME_REFUSED');
        }
        $signature = base64_decode($record['signature'], true);
        if (!is_string($signature) || strlen($signature) !== 64
            || base64_encode($signature) !== $record['signature']) {
            throw new RuntimeException('OWNER_INSTALL_SIGNATURE_FORMAT_REFUSED');
        }
        $canonical = json_encode($payload, JSON_THROW_ON_ERROR);
        if (!Ed25519Backend::verifyDetached(
            $signature, self::DOMAIN.$canonical, substr($der, 12)
        )) {
            throw new RuntimeException('OWNER_INSTALL_SIGNATURE_INVALID');
        }
    }

    private static function strictUtc(mixed $value): int
    {
        if (!is_string($value) ||
            !preg_match('/\A20[2-9][0-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12][0-9]|3[01])T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z\z/D', $value)) {
            throw new RuntimeException('OWNER_INSTALL_TIMESTAMP_REFUSED');
        }
        $epoch = strtotime($value);
        if ($epoch === false || gmdate('Y-m-d\TH:i:s\Z', $epoch) !== $value) {
            throw new RuntimeException('OWNER_INSTALL_TIMESTAMP_NONCANONICAL');
        }
        return $epoch;
    }
}
