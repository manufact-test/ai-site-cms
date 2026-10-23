<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

/**
 * Stage2 read-only LiteSpeed/LSAPI filesystem and front-controller boundary
 * observation. The operator may run this on an explicitly authorized TEST
 * instance later. It does NOT open network/DB connections or make host changes.
 *
 * Deliberately NEVER grants acceptance: real worker isolation, server-level
 * private-path denial, HTTPS peer validation and safe signed activation require
 * separately scoped, human-reviewed evidence.
 */
final class Stage2LiteSpeedBoundary
{
    /**
     * @param array<string,mixed> $server PHP-provided $_SERVER (never HTTP_* authority)
     * @return array<string,mixed> Nonsecret, closed schema
     */
    public static function inspect(string $cmsRoot, array $server, string $sapi): array
    {
        $baseline = [
            'format'=>'ai-site-cms-stage2-litespeed-boundary-observation-v1',
            'result'=>'blocked',
            'sapi'=>'litespeed',
            'checks'=>[
                'actual_lsapi_sapi'=>$sapi==='litespeed',
                'cms_root_canonical'=>false,
                'public_only_document_root'=>false,
                'front_controller_exact'=>false,
                'private_code_outside_public'=>false,
                'public_files_restricted'=>false
            ],
            'filesystemModified'=>false,
            'networkRequested'=>false,
            'databaseConnected'=>false,
            'workerIsolationVerified'=>false,
            'apacheRulesHonoredByLiteSpeed'=>false,
            'tlsPeerVerified'=>false,
            'sodiumFreeReleaseTrustAccepted'=>false,
            'realTargetHostAccepted'=>false,
            'stage2Accepted'=>false,
            'stage3Authorized'=>false,
            'productionReady'=>false
        ];
        // Reject CLI/FPM and any alias of the app root. Static PHP_CLI fixture
        // tests can inject 'litespeed', but cannot elevate this local report.
        if ($sapi!=='litespeed'||$cmsRoot===''||!str_starts_with($cmsRoot,'/')
            ||str_contains($cmsRoot,"\0")||str_contains($cmsRoot,'\\')
            ||is_link($cmsRoot)||realpath($cmsRoot)!==$cmsRoot||!is_dir($cmsRoot)) {
            return $baseline;
        }
        $baseline['checks']['cms_root_canonical']=true;
        $public=$cmsRoot.'/public';
        $mapping=SharedHostPreflight::inspectWebMapping($server,$public,$sapi);
        $boundary=SharedHostPreflight::inspect($cmsRoot,$public);
        $checks=&$baseline['checks'];
        $checks['public_only_document_root']=($mapping['checks']['document_root_maps_only_public']??false)===true;
        $checks['front_controller_exact']=($mapping['checks']['script_maps_front_controller']??false)===true;
        $checks['private_code_outside_public']=($boundary['checks']['private_code_outside_public']??false)===true;
        $checks['public_files_restricted']=($boundary['checks']['public_asset_tree_restricted']??false)===true
            &&($boundary['checks']['single_php_front_controller']??false)===true;
        if(!in_array(false,$checks,true)){
            $baseline['result']='local_lsapi_mapping_candidate';
        }
        return $baseline;
    }

    /** @return array<string,mixed> */
    public static function fromProcess(string $cmsRoot): array
    {
        // Read the actual SAPI/runtime mapping instead of environment flags or
        // spoofable client headers. No exposed HTTP handler is added here.
        return self::inspect($cmsRoot,$_SERVER,PHP_SAPI);
    }
}
