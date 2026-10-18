<?php
declare(strict_types=1);

/**
 * SETUP ONLY FOR DISPOSABLE GITHUB ACTIONS MYSQL SERVICE. NEVER invoke on
 * Hostinger or against a real server. CI instance credentials are ephemeral.
 */
if (getenv('CI') !== 'true'
    || getenv('CMS_ALLOW_DESTRUCTIVE_MYSQL_CI') !== '1'
    || getenv('CMS_TEST_MYSQL_USER') !== 'cms_ci'
    || !str_contains(getenv('CMS_TEST_MYSQL_DSN') ?: '', 'dbname=ai_site_cms_ci;')
    || getenv('CMS_TEST_MYSQL_ROOT_PASSWORD') !== 'ephemeral_root_ci_only') {
    throw new RuntimeException('Refusing to provision MySQL restore fixture outside disposable CI');
}
$connection = new PDO(
    'mysql:host=127.0.0.1;port=3306;dbname=ai_site_cms_ci;charset=utf8mb4',
    'root',
    getenv('CMS_TEST_MYSQL_ROOT_PASSWORD')
);
if ($connection->query('SELECT DATABASE()')->fetchColumn() !== 'ai_site_cms_ci'
    || $connection->query("SELECT SUBSTRING_INDEX(CURRENT_USER(),'@',1)")->fetchColumn() !== 'root') {
    throw new RuntimeException('Wrong root connection, refusing CI setup');
}
$connection->exec('CREATE DATABASE ai_site_cms_restore_ci CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$connection->exec("GRANT ALL PRIVILEGES ON ai_site_cms_restore_ci.* TO 'cms_ci'@'%'");
echo "Stage2 ephemeral restore target MySQL database created; no production data contacted\n";
