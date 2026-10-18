<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use RuntimeException;

/**
 * Stage2 host-neutral runtime REQUIREMENT profiles (not host probes or deploy
 * configs). Shared PHP CMS can serve five INDEPENDENT visitor site families.
 * A host must independently demonstrate every requested capability later.
 */
final class LabHostRequirementProfiles
{
    private const FAMILY_RUNTIME = [
        'html'=>'static-files',
        'php'=>'independent-php',
        'react-spa'=>'static-spa-assets',
        'next-static'=>'exported-static-files',
        'next-ssr'=>'independent-node-behind-proxy'
    ];

    /** @return array<string,mixed> */
    public static function describe(string $family, string $webServer): array
    {
        if (!isset(self::FAMILY_RUNTIME[$family])
            || !in_array($webServer, ['apache-2.4', 'nginx'], true)) {
            throw new RuntimeException('Unsupported site family or web server profile');
        }
        $siteNeedsPhp = $family === 'php';
        $siteNeedsNode = $family === 'next-ssr';
        $siteStatic = in_array($family, ['html','react-spa','next-static'], true);
        return [
            'family'=>$family,
            'siteDelivery'=>self::FAMILY_RUNTIME[$family],
            'webServer'=>$webServer,
            'cms'=>[
                'phpMinimum'=>'8.1',
                'phpRuntime'=>'independent-fpm-pool',
                'requiredExtensions'=>['json','pdo','pdo_mysql','openssl'],
                'documentRoot'=>'cms/public',
                'privateCodeAndStateOutsideWebroot'=>true,
                'readOnlyHealthRoute'=>'/api/health',
                'publicAdminRoutesAvailable'=>false
            ],
            'visitor'=>[
                'separateDocumentRoot'=>true,
                'independentPhpWorkerRequired'=>$siteNeedsPhp,
                'nodeServerAndReverseProxyRequired'=>$siteNeedsNode,
                'staticAssetOnly'=>$siteStatic,
                'historyFallbackRequired'=>$family==='react-spa',
                'frameworkSSRVerified'=>false
            ],
            'webServerPrerequisites'=>$webServer==='apache-2.4'
                ? ['apache-2.4','mod_dir','mod_authz_core','mod_proxy_fcgi',
                    'AllowOverride FileInfo Options Indexes AuthConfig',
                    'FallbackResource /index.php','document-root-cms-public']
                : ['nginx','fastcgi_pass-to-independent-php-fpm',
                    'internal-front-controller','deny-dotfiles',
                    'document-root-cms-public'],
            'targetWebServerTested'=>false,
            'targetDnsTlsTested'=>false,
            'productionReady'=>false
        ];
    }
}
