<?php
declare(strict_types=1);

/**
 * Strictly disposable GitHub Actions MySQL provisioning for the packaged-CMS
 * integration. Never use on a shared host, developer DB or client database.
 * The ONLY permitted SQL writes are two hardcoded throwaway DB/user pairs.
 */
$action=$argv[1]??'';
if (PHP_SAPI!=='cli' || $argc!==2 || !in_array($action,['--provision','--cleanup'],true)
    || getenv('CI')!=='true' || getenv('GITHUB_ACTIONS')!=='true'
    || getenv('CMS_ALLOW_DESTRUCTIVE_MYSQL_CI')!=='1'
    || getenv('CMS_TEST_MYSQL_ROOT_PASSWORD')!=='ephemeral_root_ci_only'
    || getenv('CMS_TEST_MYSQL_USER')!=='cms_ci'
    || getenv('CMS_TEST_MYSQL_DSN')!==
        'mysql:host=127.0.0.1;port=3306;dbname=ai_site_cms_ci;charset=utf8mb4') {
    fwrite(STDERR,"STAGE2_PACKAGED_MYSQL_OPERATOR_REFUSED\n");exit(3);
}
try {
    $pdo=new PDO('mysql:host=127.0.0.1;port=3306;dbname=ai_site_cms_ci;charset=utf8mb4',
        'root',getenv('CMS_TEST_MYSQL_ROOT_PASSWORD'),[
            PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_TIMEOUT=>3,
            PDO::ATTR_EMULATE_PREPARES=>false
        ]);
    if ($pdo->query("SELECT SUBSTRING_INDEX(CURRENT_USER(),'@',1)")->fetchColumn()!=='root'
        || $pdo->query('SELECT DATABASE()')->fetchColumn()!=='ai_site_cms_ci') {
        throw new RuntimeException('Wrong ephemeral MySQL identity');
    }
    $pairs=[
        ['ai_stage2_pkg_a_ci','stage2pkg_a_ci','disposable_stage2_a_ci'],
        ['ai_stage2_pkg_b_ci','stage2pkg_b_ci','disposable_stage2_b_ci']
    ];
    if ($action==='--provision') {
        foreach ($pairs as [$db,$user,$password]) {
            $pdo->exec("CREATE DATABASE \`$db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("CREATE USER '$user'@'%' IDENTIFIED BY '$password'");
            $pdo->exec("GRANT ALL PRIVILEGES ON \`$db\`.* TO '$user'@'%'");
        }
    } else {
        foreach ($pairs as [$db,$user]) {
            $pdo->exec("DROP USER IF EXISTS '$user'@'%'");
            $pdo->exec("DROP DATABASE IF EXISTS \`$db\`");
        }
    }
    echo "STAGE2_PACKAGED_MYSQL_".($action==='--provision'?'PROVISIONED':'CLEANED')."\n";
} catch (Throwable $e) {
    fwrite(STDERR,"STAGE2_PACKAGED_MYSQL_OPERATOR_REFUSED\n");exit(3);
}
