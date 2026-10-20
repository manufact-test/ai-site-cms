<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use PDO;
use RuntimeException;

/**
 * Stage2 Hostinger MySQL non-install operations: SERVER-ENFORCED SQL read-only.
 * This guard protects probe / verify / snapshot-read from accidental DML/DDL
 * even when the operator has the future installer privileges. The connection
 * is discarded after the single operation; no shared long-lived session.
 *
 * It does not authorize a database selection, grant, backup or real installation.
 */
final class Stage2MySqlReadOnly
{
    public static function begin(PDO $pdo): void
    {
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql'
            || $pdo->inTransaction()) {
            throw new RuntimeException('MYSQL_READONLY_BOUNDARY_REQUIRED');
        }
        // SET TRANSACTION READ ONLY protects only ONE transaction.
        // Permanent DDL may implicitly end that transaction, so it is NOT
        // sufficient when the dedicated operator also has installer grants.
        // Pin the entire disposable CONNECTION to READ ONLY instead.
        // A separate install action always opens its own new connection.
        $pdo->exec('SET SESSION TRANSACTION READ ONLY');
        $pdo->beginTransaction();
        if (!$pdo->inTransaction()
            || (int) $pdo->query('SELECT @@SESSION.transaction_read_only')->fetchColumn() !== 1) {
            throw new RuntimeException('MYSQL_READONLY_TRANSACTION_NOT_STARTED');
        }
    }

    public static function finish(PDO $pdo): void
    {
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql'
            || !$pdo->inTransaction()) {
            throw new RuntimeException('MYSQL_READONLY_TRANSACTION_LOST');
        }
        if ((int) $pdo->query('SELECT @@SESSION.transaction_read_only')->fetchColumn() !== 1) {
            throw new RuntimeException('MYSQL_READONLY_SESSION_LOST');
        }
        $pdo->rollBack();
        if ($pdo->inTransaction()
            || (int) $pdo->query('SELECT @@SESSION.transaction_read_only')->fetchColumn() !== 1) {
            throw new RuntimeException('MYSQL_READONLY_ROLLBACK_INCOMPLETE');
        }
    }
}
