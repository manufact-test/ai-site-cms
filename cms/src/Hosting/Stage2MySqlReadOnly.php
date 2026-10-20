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
        // MySQL applies this to the NEXT transaction, not globally or to
        // the distinct install action's fresh connection.
        $pdo->exec('SET TRANSACTION READ ONLY');
        $pdo->beginTransaction();
        if (!$pdo->inTransaction()) {
            throw new RuntimeException('MYSQL_READONLY_TRANSACTION_NOT_STARTED');
        }
    }

    public static function finish(PDO $pdo): void
    {
        if ($pdo->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql'
            || !$pdo->inTransaction()) {
            throw new RuntimeException('MYSQL_READONLY_TRANSACTION_LOST');
        }
        $pdo->rollBack();
        if ($pdo->inTransaction()) {
            throw new RuntimeException('MYSQL_READONLY_ROLLBACK_INCOMPLETE');
        }
    }
}
