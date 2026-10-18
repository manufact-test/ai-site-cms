<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

use AiSiteCms\Storage\SchemaManager;
use PDO;
use RuntimeException;

/**
 * Stage2 disposable release operator. This is the ONE integrated lab API for
 * authenticated ZIP metadata -> safe-extracted inventory -> native PHP staging
 * -> registered verified slot -> CAS pointer under independent database fence.
 *
 * The extractor is intentionally a separate least-privilege Python step.
 * The caller MUST retain the Ed25519 pin and DB checkpoint out-of-band.
 * This class has no web routes and cannot deploy to a real filesystem root.
 * Existing individual lab APIs remain research fixtures, not release paths.
 */
final class LabTrustedUpgradeCoordinator
{
    private static function requireLab(): void
    {
        if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
            || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
            throw new RuntimeException('Only explicit isolated CLI release coordinator');
        }
    }

    /**
     * Independently verify signed ZIP bytes and every extracted file before
     * touching the activation journal. No staging on failed preflight.
     *
     * @return array{format:string,version:string,manifestSha256:string,archiveSha256:string,files:int,bytes:int,productionReady:bool}
     */
    public static function preflight(
        PDO $pdo, string $siteId, string $bundleFolder, string $extractedFolder,
        string $publicKeyPem, string $pinnedKeyFingerprint, string $expectedVersion,
        string $minimumVersion, array $expectedDbCheckpoint
    ): array {
        self::requireLab();
        require_once __DIR__ . '/OfflineReleaseVerifier.php';
        require_once __DIR__ . '/LabPackageStager.php';
        require_once __DIR__ . '/LabSchemaVersionGate.php';
        require_once dirname(__DIR__) . '/Storage/SchemaManager.php';
        $signed = OfflineReleaseVerifier::verify(
            $bundleFolder, $publicKeyPem, $expectedVersion,
            $pinnedKeyFingerprint, $minimumVersion
        );
        if ($signed['verification'] !== 'signed_archive_metadata_verified'
            || $signed['version'] !== $expectedVersion
            || $signed['safe_to_deploy'] !== false) {
            throw new RuntimeException('Untrusted lab release');
        }
        $package = LabPackageStager::verifyPackage(
            $extractedFolder, $signed['manifest_sha256']
        );
        if ($package['version'] !== $expectedVersion
            || $package['manifestSha256'] !== $signed['manifest_sha256']) {
            throw new RuntimeException('Signed archive does not bind extracted release');
        }
        LabSchemaVersionGate::assertCheckpoint(
            $pdo, $siteId, $expectedVersion, $expectedDbCheckpoint
        );
        return [
            'format'=>'ai-site-cms-stage2-php-trusted-upgrade-v1',
            'version'=>$expectedVersion,
            'manifestSha256'=>$signed['manifest_sha256'],
            'archiveSha256'=>$signed['archive_sha256'],
            'files'=>$package['files'],
            'bytes'=>$package['bytes'],
            'productionReady'=>false
        ];
    }

    /**
     * Requires caller-retained CAS generation and DB checkpoint; never obtains
     * either by trusting mutable release metadata. All operations are CI-only.
     * The DB migration lock is acquired before code-switch lock (deadlock order).
     * Storage content is never migrated and no live directory is modified.
     *
     * @return array<string,mixed>
     */
    public static function stageAndActivate(
        PDO $pdo, string $siteId, LabPhpGenerationSwitcher $switcher,
        string $bundleFolder, string $extractedFolder, string $publicKeyPem,
        string $pinnedKeyFingerprint, string $expectedVersion, string $minimumVersion,
        array $expectedDbCheckpoint, ?string $expectedCurrent, int $expectedSequence
    ): array {
        self::requireLab();
        require_once __DIR__ . '/LabPhpGenerationSwitcher.php';
        $verified = self::preflight(
            $pdo, $siteId, $bundleFolder, $extractedFolder, $publicKeyPem,
            $pinnedKeyFingerprint, $expectedVersion, $minimumVersion, $expectedDbCheckpoint
        );
        return LabSchemaVersionGate::withCheckpointFence(
            $pdo, $siteId, $expectedVersion, $expectedDbCheckpoint,
            static function () use (
                $switcher, $verified, $extractedFolder,
                $expectedVersion, $expectedCurrent, $expectedSequence, $minimumVersion
            ): array {
                // CAS and clean journal BEFORE creating any new installed slot.
                $active = $switcher->inspect($minimumVersion);
                if ($active['status'] !== 'clean'
                    || $active['current'] !== $expectedCurrent
                    || $active['sequence'] !== $expectedSequence) {
                    throw new RuntimeException('Unclean/stale generation before authenticated install');
                }
                // Recheck extracted files AFTER entering the DB migration fence;
                // do not assume a preflight result is immutable (TOCTOU remains).
                $package = LabPackageStager::verifyPackage(
                    $extractedFolder, $verified['manifestSha256']
                );
                if ($package['version'] !== $expectedVersion) {
                    throw new RuntimeException('Verified generation changed');
                }
                $installed = LabPackageStager::create();
                $result = $installed->stage(
                    $extractedFolder, $verified['manifestSha256']
                );
                if ($result['status'] !== 'installed') {
                    throw new RuntimeException('Incomplete authenticated package stage');
                }
                $switcher->register(
                    $installed->root(), $verified['manifestSha256'], $expectedVersion
                );
                $changed = $switcher->switchTo(
                    $expectedVersion, $expectedCurrent, $expectedSequence, $minimumVersion
                );
                if ($changed['status'] !== 'clean'
                    || $changed['current'] !== $expectedVersion
                    || $changed['sequence'] !== $expectedSequence+1) {
                    throw new RuntimeException('Incomplete generation activation');
                }
                return [
                    'format'=>'ai-site-cms-stage2-php-trusted-upgrade-v1',
                    'verification'=>'signed_inventory_and_db_checkpoint_passed',
                    'version'=>$expectedVersion,
                    'sequence'=>$changed['sequence'],
                    'manifestSha256'=>$verified['manifestSha256'],
                    'archiveSha256'=>$verified['archiveSha256'],
                    'installedLabRoot'=>$installed->root(),
                    'files'=>$package['files'],
                    'productionReady'=>false,
                    'sharedHostVerified'=>false,
                    'siteDataMigrated'=>false,
                    'powerLossProven'=>false
                ];
            }
        );
    }
}
