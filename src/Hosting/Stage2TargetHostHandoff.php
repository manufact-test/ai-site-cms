<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use RuntimeException;

/**
 * Read-only Stage2 TARGET-HOST HANDOFF. This is a future operator-side tool,
 * NOT permission to access any host and NOT a deployment/acceptance gate.
 *
 * Source-local facts: CLI PHP ABI, packaged CMS integrity, canonical physical
 * root separation and bounded visitor public-tree inventory.
 * HTTP/TLS/FPM/DB are NOT tested. Optional observations remain untrusted
 * operator assertions; they cannot promote a lab into a verified target.
 */
final class Stage2TargetHostHandoff
{
    private const FORMAT = 'ai-site-cms-stage2-target-handoff-v1';
    private const HTTP_FORMAT = 'ai-site-cms-stage2-operator-http-observations-v1';
    private const FAMILIES = ['html','php','react-spa','next-static','next-ssr'];

    private static function root(string $path): string
    {
        if ($path === '' || strlen($path) > 4096 || !str_starts_with($path, '/')
            || str_contains($path, "\0") || str_contains($path, '\\')
            || is_link($path) || realpath($path) !== $path || !is_dir($path)) {
            throw new RuntimeException('Noncanonical or absent target handoff root');
        }
        return $path;
    }

    private static function separate(string $a, string $b): bool
    {
        return $a !== $b && !str_starts_with($a, $b.'/')
            && !str_starts_with($b, $a.'/');
    }

    private static function keys(array $record, array $wanted): bool
    {
        $actual=array_keys($record);
        sort($actual,SORT_STRING);
        sort($wanted,SORT_STRING);
        return $actual===$wanted;
    }

    /**
     * Validates a human-supplied, separately collected observation record.
     * A record is NOT a trusted receipt: the result never asserts a real
     * request was made or that TLS or credentials have been authenticated.
     *
     * @param array<string,mixed> $input
     * @return array<string,mixed>
     */
    public static function inspectOperatorHttp(array $input, string $family): array
    {
        if (!in_array($family, self::FAMILIES, true)
            || !self::keys($input, [
                'format','siteFamily','cmsHealth','cmsWrite','cmsPrivate',
                'visitorHome','httpsPeerChecked','webSapiReported',
                'independentSiteWhenCmsUnavailable','dbConnectivityReported'
            ]) || $input['format'] !== self::HTTP_FORMAT
            || $input['siteFamily'] !== $family) {
            throw new RuntimeException('Unexpected operator HTTP observation schema');
        }
        foreach (['cmsHealth','cmsWrite','cmsPrivate','visitorHome'] as $key) {
            if (!is_int($input[$key]) || $input[$key] < 100 || $input[$key] > 599) {
                throw new RuntimeException('Invalid operator HTTP status');
            }
        }
        foreach (['httpsPeerChecked','independentSiteWhenCmsUnavailable',
            'dbConnectivityReported'] as $key) {
            if (!is_bool($input[$key])) {
                throw new RuntimeException('Operator observation must use strict booleans');
            }
        }
        if (!in_array($input['webSapiReported'], ['fpm-fcgi','apache2handler',
            'cgi-fcgi','litespeed','unknown'], true)) {
            throw new RuntimeException('Unsupported declared web SAPI observation');
        }
        $checks = [
            'cms_readonly_health_200' => $input['cmsHealth']===200,
            'cms_write_route_not_exposed' => $input['cmsWrite']===404,
            'cms_private_path_not_exposed' => in_array($input['cmsPrivate'],[403,404],true),
            'independent_visitor_home_200' => $input['visitorHome']===200,
            'https_peer_reported_verified' => $input['httpsPeerChecked'],
            'separate_fpm_reported' => $input['webSapiReported']==='fpm-fcgi',
            'cms_and_site_independence_reported' => $input['independentSiteWhenCmsUnavailable'],
            'database_connection_reported' => $input['dbConnectivityReported']
        ];
        $unmet=[];
        foreach($checks as $name=>$success) {
            if (!$success) $unmet[]=$name;
        }
        return [
            'format'=>'ai-site-cms-stage2-untrusted-operator-observations-v1',
            'reportedFamily'=>$family,
            'reportedWebSapi'=>$input['webSapiReported'],
            'litespeedLsapiReportedNotVerified'=>$input['webSapiReported']==='litespeed',
            'claimedChecks'=>$checks,
            'unmetClaimedChecks'=>$unmet,
            'allClaimsPresentAndPositive'=>$unmet===[],
            'trustedIndependentEvidence'=>false,
            'liveHttpRequestedByThisTool'=>false,
            'realTargetHostProven'=>false,
            'stage2Accepted'=>false,
            'productionReady'=>false
        ];
    }

    /**
     * @param array<string,mixed>|null $http Operator-supplied optional claims.
     * @return array<string,mixed>
     */
    public static function inspect(
        string $cmsRoot, string $cmsDocumentRoot, string $siteRoot,
        string $family, ?array $http=null
    ): array {
        if (PHP_SAPI!=='cli' || !in_array($family,self::FAMILIES,true)) {
            throw new RuntimeException('Target host handoff must use PHP CLI and known family');
        }
        $cms=self::root($cmsRoot);
        $site=self::root($siteRoot);
        $public=self::root($cmsDocumentRoot);
        if (!self::separate($cms,$site) || $public!==$cms.'/public'
            || is_link($cms.'/public')) {
            throw new RuntimeException('Separate CMS/site and exact CMS public root required');
        }
        // These checks examine only a local, already existing filesystem;
        // they never create a DB, write files or contact a host.
        $package=PackageArtifactVerifier::verify($cms);
        // Digest the exact artifact just fully checked; not a publisher signature.
        // Enables offline owner reports to reject evidence for a DIFFERENT CMS build.
        $manifestSha256=@hash_file('sha256',$cms.'/private/package-manifest.json');
        if (!is_string($manifestSha256) || !preg_match('/\A[a-f0-9]{64}\z/D',$manifestSha256)) {
            throw new RuntimeException('Package manifest evidence unavailable');
        }
        $boundary=SharedHostPreflight::inspect($cms,$public);
        $runtime=RuntimeDoctor::localReport($public,$cms.'/public');
        $allFalse=[
            'php81'=>false,'pdo'=>false,'https'=>false,'privateStorage'=>false,
            'isolatedRoots'=>false,'rewriteRoutes'=>false,'sitePhp'=>false,
            'nodeRuntime'=>false,'reverseProxy'=>false
        ];
        // Capabilities intentionally FALSE: the topology scan validates only
        // filesystem structure and public bytes, never operator capability claims.
        $topology=SiteRuntimeTopology::assess($cms,$site,$family,$allFalse);
        $cliReady=$boundary['result']==='offline_structure_pass'
            && $runtime['php_runtime_baseline']==='pass'
            && $runtime['document_root']==='verified_public_only'
            && $package['filesVerified'] >= 20;
        $unresolved=[
            'permissioned_actual_web_sapi_and_route_execution',
            'permissioned_verified_https_dns_and_private_path_probe',
            'permissioned_database_connectivity_and_account_privileges',
            'permissioned_independent_site_vhost_and_runtime_probe',
            'owner_architecture_and_independent_license_decision',
            'explicit_owner_stage2_acceptance'
        ];
        $observations=$http===null ? null : self::inspectOperatorHttp($http,$family);
        return [
            'format'=>self::FORMAT,
            'cmsFamily'=>$family,
            'cmsPackageFilesVerified'=>$package['filesVerified'],
            'cmsPackageManifestSha256'=>$manifestSha256,
            'sitePublicFingerprintSha256'=>$topology['sitePublicFingerprint'],
            'cmsAndSiteRootsSeparated'=>true,
            'cmsDocumentRootIsPublic'=>true,
            'phpCliVersion'=>PHP_MAJOR_VERSION.'.'.PHP_MINOR_VERSION,
            'phpCliBaseline'=>$runtime['php_runtime_baseline'],
            'localFilesystemAndPackageCompatible'=>$cliReady,
            'runtimeCapabilitiesDeclaredAsVerified'=>false,
            'reportedHttpObservations'=>$observations,
            'unresolvedHostAndOwnerChecks'=>$unresolved,
            'scope'=>'local-readonly-observation-not-live-host-certification',
            'hostAccessAuthorizationVerifiedByTool'=>false,
            'webSapiActuallyExecutedByTool'=>false,
            'networkAttempted'=>false,
            'databaseConnected'=>false,
            'filesystemModified'=>false,
            'actualTargetHostTestedByProject'=>false,
            'targetHostAccepted'=>false,
            'stage2Accepted'=>false,
            'stage3Authorized'=>false,
            'productionReady'=>false
        ];
    }
}
