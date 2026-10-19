<?php
declare(strict_types=1);

// CI-DISPOSABLE ONLY. The operator explicitly binds a previously installed,
// separated CMS/visitor tree to a dedicated MySQL read-only account.
// This is not a production installer or a real-host permission.
if(PHP_SAPI!=='cli'||$argc!==5||($argv[1]??'')!=='--bind'
    ||!str_starts_with($argv[2]??'','--cms-root=')
    ||!str_starts_with($argv[3]??'','--site-root=')
    ||!str_starts_with($argv[4]??'','--output=')){
    fwrite(STDERR,"STAGE2_MYSQL_CI_BINDING_REFUSED\n");exit(3);
}
require dirname(__DIR__).'/vendor/autoload.php';
try{
    $record=\AiSiteCms\Hosting\Stage2MysqlBoundReadiness::create(
        substr($argv[2],11),substr($argv[3],12),substr($argv[4],9),
        array_reduce([
            'CI','GITHUB_ACTIONS','CMS_ENV','CMS_STAGE2_RUNTIME_GATE',
            'CMS_ALLOW_STAGE2_MYSQL_HTTP_CI','CMS_DB_DSN',
            'CMS_DB_USER','CMS_DB_PASSWORD','CMS_SITE_ID'
        ],static function(array $state,string $key):array{
            $v=getenv($key);$state[$key]=$v===false?null:$v;return $state;
        },[])
    );
    echo json_encode($record,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR),"\n";
}catch(Throwable $e){
    fwrite(STDERR,"STAGE2_MYSQL_CI_BINDING_REFUSED\n");exit(3);
}
