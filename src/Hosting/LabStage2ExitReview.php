<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use RuntimeException;

/**
 * Read-only Stage2 EXIT REVIEW built solely from a lab-only fleet and
 * blueprint. Audits every independently assembled package and compliance
 * inventory, records host prerequisites and BLOCKS any claim of acceptance.
 * No external host access, CI-key signing, DB writes, DNS, deploy or client
 * content. Real-host proof & owner architectural approval cannot be faked by
 * passing local tests.
 */
final class LabStage2ExitReview
{
    private const FORMAT = 'ai-site-cms-stage2-exit-review-v1';
    private const COMPLIANCE = 'ai-site-cms-stage2-compliance-v1';

    /** @param array<string,mixed> $blueprint */
    public static function inspect(array $blueprint): array
    {
        if (PHP_SAPI !== 'cli' || getenv('CMS_ENV') !== 'test'
            || getenv('CMS_STAGE2_RUNTIME_GATE') !== 'ci-bound'
            || getenv('CMS_ALLOW_SQLITE_TEST_ONLY') !== '1') {
            throw new RuntimeException('Exit review is strictly local CI only');
        }
        $topology = LabDeploymentBlueprint::inspect($blueprint);
        $fleet = LabInstallationFleet::load($blueprint['fleetConfig']);
        $sites = LabInstallationFleet::validate($fleet);
        $plan = LabInstallationFleet::plan($fleet);
        if (count($sites) !== count($topology['items'])) {
            throw new RuntimeException('Incomplete review scope');
        }
        $endpoints = [];
        foreach ($blueprint['endpoints'] as $entry) {
            $endpoints[$entry['siteId']] = $entry;
        }
        $sitePlans = [];
        foreach ($plan['instances'] as $record) {
            $sitePlans[$record['siteId']] = $record;
        }
        $results = [];
        $manifests = [];
        foreach ($sites as $site) {
            $id = $site['siteId'];
            if (!isset($endpoints[$id], $sitePlans[$id])) {
                throw new RuntimeException('Site missing from review');
            }
            $root = $site['cmsRoot'];
            $verification = PackageArtifactVerifier::verify($root);
            $manifest = $root.'/private/package-manifest.json';
            $manifestDigest = @hash_file('sha256', $manifest);
            if (!is_string($manifestDigest)
                || !preg_match('/\A[a-f0-9]{64}\z/D', $manifestDigest)) {
                throw new RuntimeException('Package manifest fingerprint failed');
            }
            $index = $root.'/private/compliance/compliance-index.json';
            $stat = @lstat($index);
            if ($stat === false || is_link($index)
                || !is_file($index) || ($stat['nlink'] ?? 0) !== 1
                || $stat['size'] < 80 || $stat['size'] > 16384) {
                throw new RuntimeException('Unavailable locked-component compliance inventory');
            }
            $bytes = @file_get_contents($index);
            if (!is_string($bytes) || strlen($bytes) !== $stat['size']) {
                throw new RuntimeException('Unreadable compliance inventory');
            }
            $json = json_decode($bytes, true, 16, JSON_THROW_ON_ERROR);
            if (!is_array($json)
                || ($json['format'] ?? null) !== self::COMPLIANCE
                || ($json['componentCount'] ?? null) !== 43
                || ($json['composerRuntime'] ?? null) !== 14
                || ($json['npmLocked'] ?? null) !== 29
                || ($json['browserRuntime'] ?? null) !== ['jedison@1.27.1']
                || !is_string($json['attestation'] ?? null)
                || !str_contains($json['attestation'], 'manual legal review remains required')) {
                throw new RuntimeException('Dependency/license inventory inconsistent');
            }
            $compliance = LabComplianceEvidence::verify($root);
            $profiles = [
                'apache'=>LabHostRequirementProfiles::describe($site['family'],'apache-2.4'),
                'nginx'=>LabHostRequirementProfiles::describe($site['family'],'nginx')
            ];
            $results[] = [
                'siteId'=>$id,
                'family'=>$site['family'],
                'fleetState'=>$sitePlans[$id]['state'],
                'cmsPackageSha256'=>$manifestDigest,
                'packageFilesVerified'=>$verification['filesVerified'],
                'dependencyInventoryComponents'=>$compliance['componentCount'],
                'dependencyLockEvidenceCrossChecked'=>$compliance['locksMatchSbom'],
                'thirdPartyNoticeDigestChecked'=>$compliance['noticesMatchIndex'],
                'independentLegalApproval'=>false,
                'requiredWebServerProfiles'=>$profiles,
                'declaredPhpSapi'=>$endpoints[$id]['phpSapi'],
                'declaredTargetPhp'=>$endpoints[$id]['phpTarget'],
                'requiresIndependentNode'=>$site['family']==='next-ssr',
                'targetHostingVerified'=>false,
                'productionReady'=>false
            ];
            $manifests[$id] = $manifestDigest;
        }
        usort($results, static fn(array $a,array $b): int =>
            strcmp($a['siteId'],$b['siteId']));
        ksort($manifests,SORT_STRING);
        $local = $topology['localCliCompatible'] && $plan['allReady'];
        $criteria = [
            'architecture_package_boundaries'=>[
                'status'=>'demonstrated_in_lab',
                'proof'=>'five-family declarative roots, isolated packages and web routing',
                'ownerApproved'=>false
            ],
            'dependency_inventory_and_licenses'=>[
                'status'=>'inventory_locked_not_independent_legal_approval',
                'componentCount'=>43,
                'manualLicenseReviewRequired'=>true,
                'lockEvidenceReconciledAcrossComposerAndNpm'=>true,
                'independentLegalApproval'=>false
            ],
            'empty_cms_starts_in_test_environment'=>[
                'status'=>$local ? 'verified_local_read_only' : 'pending_local_install_or_abi',
                'runtimeGateEnabled'=>true
            ],
            'empty_cms_starts_on_target_host'=>[
                'status'=>'not_tested_permission_required',
                'targetHostAccessPerformed'=>false
            ],
            'owner_accepts_final_architecture'=>[
                'status'=>'owner_decision_not_recorded',
                'autoApprovalPossible'=>false
            ]
        ];
        return [
            'format'=>self::FORMAT,
            'scope'=>'stage2-laboratory-architecture-review',
            'sites'=>count($sites),
            'instances'=>$results,
            'fleetState'=>$topology['fleetState'],
            'localCliCompatible'=>$topology['localCliCompatible'],
            'deploymentIntentSha256'=>$topology['deploymentIntentSha256'],
            'fleetApprovalTokenSha256'=>$plan['token'],
            'packageSetSha256'=>hash('sha256', json_encode(
                $manifests, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)),
            'criteria'=>$criteria,
            'remainingAcceptanceGates'=>[
                'independent_license_review_and_owner_architecture_agreement',
                'permissioned_real_target_host_php_fpm_or_apache_boot',
                'real_target_host_filesystem_db_routes_tls_and_isolation',
                'explicit_owner_stage2_acceptance'
            ],
            'readyForOwnerArchitectureReview'=>$local,
            'actualTargetHostTested'=>false,
            'networkAttempted'=>false,
            'databaseWritten'=>false,
            'stage2Accepted'=>false,
            'stage3Authorized'=>false,
            'productRequirementsAccepted'=>0,
            'productionReady'=>false
        ];
    }
}
