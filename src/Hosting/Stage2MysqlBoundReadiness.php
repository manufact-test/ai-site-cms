<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use AiSiteCms\Storage\SchemaManager;
use PDO;
use RuntimeException;
use Throwable;

/**
 * Only for a disposable CI MySQL 8.4 host. This closes the gap between
 * CLI-installed MySQL CMS and actual HTTP readiness without introducing a
 * production DB health probe or a web installer.
 *
 * Binding metadata is an UNSIGNED locally written consistency check, not an
 * authorization credential and never a guarantee against a privileged attacker.
 * All DB sessions set READ ONLY and the runtime account has SELECT ONLY.
 */
final class Stage2MysqlBoundReadiness
{
    private const FORMAT='ai-site-cms-stage2-mysql-ci-binding-v1';
    private const PAIRS=[
        'stage2-packaged-a'=>['db'=>'ai_stage2_pkg_a_ci','readUser'=>'stage2pkg_ro_a_ci'],
        'stage2-packaged-b'=>['db'=>'ai_stage2_pkg_b_ci','readUser'=>'stage2pkg_ro_b_ci'],
    ];
    /** @return array{ready:bool,state:string,readOnly:bool,ciOnly:bool,productionReady:bool} */
    private static function result(bool $ready,string $state):array
    {
        return ['ready'=>$ready,'state'=>$state,'readOnly'=>true,
            'ciOnly'=>true,'productionReady'=>false];
    }
    /** @param array<string,mixed> $env */
    private static function configuration(array $env):?array
    {
        if (($env['CI']??null)!=='true'||($env['GITHUB_ACTIONS']??null)!=='true'
            ||($env['CMS_ENV']??null)!=='test'
            ||($env['CMS_STAGE2_RUNTIME_GATE']??null)!=='mysql-ci-bound'
            ||($env['CMS_ALLOW_STAGE2_MYSQL_HTTP_CI']??null)!=='1')return null;
        $site=$env['CMS_SITE_ID']??null;
        if (!is_string($site)||!isset(self::PAIRS[$site]))return null;
        $db=self::PAIRS[$site]['db'];
        $dsn='mysql:host=127.0.0.1;port=3306;dbname='.$db.';charset=utf8mb4';
        if (($env['CMS_DB_DSN']??null)!==$dsn
            ||($env['CMS_DB_USER']??null)!==self::PAIRS[$site]['readUser']
            ||!is_string($env['CMS_DB_PASSWORD']??null)
            ||strlen($env['CMS_DB_PASSWORD'])<12
            ||strlen($env['CMS_DB_PASSWORD'])>128)return null;
        return ['site'=>$site,'db'=>$db,'dsn'=>$dsn,'user'=>$env['CMS_DB_USER'],
            'password'=>$env['CMS_DB_PASSWORD']];
    }
    private static function canonicalDir(string $file):?string
    {
        if($file===''||$file==='/'||strlen($file)>4096
            ||!str_starts_with($file,'/')||str_contains($file,"\0")
            ||str_contains($file,'\\')||is_link($file)
            ||realpath($file)!==$file||!is_dir($file))return null;
        return $file;
    }
    /** @param array<string,mixed> $env */
    public static function inspect(string $cmsRoot,array $env):array
    {
        $config=self::configuration($env);
        if($config===null)return self::result(false,'ci_mysql_gate_required');
        $binding=$env['CMS_STAGE2_MYSQL_BINDING_FILE']??null;
        $root=self::canonicalDir($cmsRoot);
        if($root===null||!is_string($binding)||$binding===''
            ||strlen($binding)>4096||!str_starts_with($binding,'/')
            ||str_contains($binding,"\0")||str_contains($binding,'\\')
            ||is_link($binding)||realpath($binding)!==$binding
            ||!is_file($binding)||str_starts_with($binding,$root.'/'))
            return self::result(false,'binding_missing_or_invalid');
        try{
            $stat=@lstat($binding);
            $parent=dirname($binding);
            if($stat===false||($stat['mode']&0077)!==0
                ||($stat['nlink']??0)!==1||$stat['size']<120
                ||$stat['size']>4096||realpath($parent)!==$parent
                ||is_link($parent)||(@fileperms($parent)&0077)!==0)
                return self::result(false,'binding_unsafe');
            $contents=@file_get_contents($binding);
            if(!is_string($contents)||strlen($contents)!==$stat['size'])
                return self::result(false,'binding_unsafe');
            $record=json_decode($contents,true,8,JSON_THROW_ON_ERROR);
            if(!is_array($record)||array_is_list($record))return self::result(false,'binding_invalid');
            $fields=array_keys($record);
            sort($fields,SORT_STRING);
            $expected=['format','cmsRoot','siteRoot','siteId','dbName',
                'readUser','manifestSha256','visitorPublicSha256','recordSha256'];
            sort($expected,SORT_STRING);
            if($fields!==$expected||$record['format']!==self::FORMAT
                ||$record['cmsRoot']!==$root
                ||$record['siteId']!==$config['site']
                ||$record['dbName']!==$config['db']
                ||$record['readUser']!==$config['user']
                ||!is_string($record['manifestSha256'])
                ||!preg_match('/\A[a-f0-9]{64}\z/D',$record['manifestSha256'])
                ||!is_string($record['visitorPublicSha256'])
                ||!preg_match('/\A[a-f0-9]{64}\z/D',$record['visitorPublicSha256'])
                ||!is_string($record['recordSha256'])
                ||!preg_match('/\A[a-f0-9]{64}\z/D',$record['recordSha256'])
                ||!is_string($record['siteRoot']))
                return self::result(false,'binding_invalid');
            $signed=$record;
            unset($signed['recordSha256']);
            $local=hash('sha256',json_encode($signed,
                JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
            if(!hash_equals($record['recordSha256'],$local))
                return self::result(false,'binding_checksum_mismatch');
            $site=self::canonicalDir($record['siteRoot']);
            if($site===null||$site===$root
                ||str_starts_with($site,$root.'/')||str_starts_with($root,$site.'/')
                ||str_starts_with($binding,$site.'/')
                ||!is_dir($root.'/public')||is_link($root.'/public'))
                return self::result(false,'site_boundary_invalid');
            $public=$site.'/public';
            if(!is_dir($public)||is_link($public))
                return self::result(false,'visitor_public_invalid');
            $manifest=$root.'/private/package-manifest.json';
            if(is_link($manifest)||!is_file($manifest)
                ||!hash_equals($record['manifestSha256'],
                    (string)@hash_file('sha256',$manifest)))
                return self::result(false,'package_mismatch');
            // A stable fingerprint is a consistency check only. It never means
            // the visitor website was cryptographically authenticated.
            $fingerprint=self::visitorFingerprint($site);
            if(!hash_equals($record['visitorPublicSha256'],$fingerprint))
                return self::result(false,'visitor_changed');
            $pdo=new PDO($config['dsn'],$config['user'],$config['password'],[
                PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT=>2,
                PDO::ATTR_EMULATE_PREPARES=>false
            ]);
            $pdo->exec('SET SESSION TRANSACTION READ ONLY');
            $state=(new SchemaManager($pdo))->inspectSite($config['site']);
            if(($state['state']??null)!=='ready')
                return self::result(false,'mysql_schema_or_identity_not_ready');
            return self::result(true,'ready');
        }catch(Throwable $e){
            return self::result(false,'mysql_binding_or_database_unavailable');
        }
    }
    private static function visitorFingerprint(string $site):string
    {
        $root=$site.'/public';
        if(!is_dir($root)||is_link($root))throw new RuntimeException('Invalid visitor root');
        $result=[];
        $walk=static function(string $dir,string $prefix,int $depth)
            use (&$walk,&$result):void{
            if($depth>8||count($result)>128)throw new RuntimeException('Large visitor tree');
            foreach(scandir($dir)?:[] as $name){
                if($name==='.'||$name==='..')continue;
                $relative=$prefix===''?$name:$prefix.'/'.$name;
                $item=$dir.'/'.$name;
                $stat=@lstat($item);
                if($stat===false||is_link($item))throw new RuntimeException('Symlinked visitor asset');
                if(is_dir($item)){$walk($item,$relative,$depth+1);continue;}
                if(!is_file($item)||($stat['size']??0)>1048576)
                    throw new RuntimeException('Visitor asset unsafe');
                $result[$relative]=hash_file('sha256',$item);
                if(count($result)>128)throw new RuntimeException('Too many visitor assets');
            }
        };
        $walk($root,'',0);
        if(count($result)<1)throw new RuntimeException('Empty visitor public tree');
        ksort($result,SORT_STRING);
        return hash('sha256',json_encode($result,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
    }
    /** @param array<string,mixed> $env */
    public static function create(
        string $cmsRoot,string $siteRoot,string $bindingFile,array $env
    ):array
    {
        if(PHP_SAPI!=='cli'||self::configuration($env)===null)
            throw new RuntimeException('CI MySQL binding requires explicit disposable mode');
        $root=self::canonicalDir($cmsRoot);
        $site=self::canonicalDir($siteRoot);
        if($root===null||$site===null||$root===$site
            ||str_starts_with($site,$root.'/')||str_starts_with($root,$site.'/')
            ||!is_dir($root.'/public')||!is_dir($site.'/public')
            ||is_link($root.'/public')||is_link($site.'/public'))
            throw new RuntimeException('Unseparated CMS/visitor roots');
        $parent=dirname($bindingFile);
        if(self::canonicalDir($parent)===null||$parent==='/'
            ||(@fileperms($parent)&0077)!==0
            ||!str_starts_with($bindingFile,'/')
            ||$bindingFile!==$parent.'/'.basename($bindingFile)
            ||str_starts_with($bindingFile,$root.'/')
            ||str_starts_with($bindingFile,$site.'/')
            ||file_exists($bindingFile)||is_link($bindingFile))
            throw new RuntimeException('Binding output must be new and private');
        PackageArtifactVerifier::verify($root);
        // Do not write a binding if the MySQL read-only account cannot inspect
        // a REAL already-installed, correctly identified dedicated schema.
        $record=[
            'format'=>self::FORMAT,'cmsRoot'=>$root,'siteRoot'=>$site,
            'siteId'=>$env['CMS_SITE_ID'],
            'dbName'=>self::PAIRS[$env['CMS_SITE_ID']]['db'],
            'readUser'=>$env['CMS_DB_USER'],
            'manifestSha256'=>hash_file('sha256',$root.'/private/package-manifest.json'),
            'visitorPublicSha256'=>self::visitorFingerprint($site)
        ];
        $record['recordSha256']=hash('sha256',json_encode($record,
            JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR));
        $json=json_encode($record,JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR)."\n";
        if(strlen($json)>4096)throw new RuntimeException('Binding too large');
        // Validate MySQL credentials/schema BEFORE committing the new file,
        // using same read-only connection as actual HTTP readiness.
        $tmp=$parent.'/.mysql-bind-check-'.bin2hex(random_bytes(8));
        $old=umask(0077);
        try{
            $ok=false;
            $handle=@fopen($tmp,'x');
            if($handle===false)throw new RuntimeException('Cannot create temporary binding');
            try{
                if(!chmod($tmp,0600)||fwrite($handle,$json)!==strlen($json)
                    ||!fflush($handle))throw new RuntimeException('Cannot write binding');
            }finally{fclose($handle);}
            $check=self::inspect($root,array_merge($env,
                ['CMS_STAGE2_MYSQL_BINDING_FILE'=>$tmp]));
            if(!$check['ready'])throw new RuntimeException('MySQL binding preflight rejected');
            if(!rename($tmp,$bindingFile))throw new RuntimeException('Cannot finalize binding');
            $ok=true;
            return ['bound'=>true,'mysqlReadOnlyInspected'=>true,
                'productionReady'=>false,'stage2Accepted'=>false];
        }finally{
            if(file_exists($tmp))@unlink($tmp);
            umask($old);
        }
    }
    /** @return array{ready:bool,state:string,readOnly:bool,ciOnly:bool,productionReady:bool} */
    public static function fromProcess(string $cmsRoot):array
    {
        $env=[];
        foreach(['CI','GITHUB_ACTIONS','CMS_ENV','CMS_STAGE2_RUNTIME_GATE',
            'CMS_ALLOW_STAGE2_MYSQL_HTTP_CI','CMS_DB_DSN','CMS_DB_USER',
            'CMS_DB_PASSWORD','CMS_SITE_ID','CMS_STAGE2_MYSQL_BINDING_FILE'] as $name){
            $v=getenv($name);
            $env[$name]=$v===false?null:$v;
        }
        return self::inspect($cmsRoot,$env);
    }
}
