<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use PDO;
use RuntimeException;

/**
 * Explicit, tested server-version support policy for hosted Stage3 databases.
 *
 * PDO reports MariaDB through the "mysql" driver. Detect the server family
 * from SELECT VERSION(), rather than assuming that the PDO driver identifies it.
 */
final class DatabaseServerCompatibility
{
    public static function inspect(PDO $db): array
    {
        if ((string)$db->getAttribute(PDO::ATTR_DRIVER_NAME) !== 'mysql') {
            return [
                'ok' => false,
                'engine' => 'unsupported',
                'version' => null,
                'minimum' => null,
                'reason' => 'Stage3 hosted databases require PDO MySQL'
            ];
        }

        $version = trim((string)$db->query('SELECT VERSION()')->fetchColumn());
        $isMariaDb = stripos($version, 'mariadb') !== false;
        $engine = $isMariaDb ? 'MariaDB' : 'MySQL';
        $minimum = $isMariaDb ? '10.11.0' : '8.0.0';

        // MariaDB may expose a compatibility prefix such as 5.5.5-10.11.8-MariaDB.
        $matched = $isMariaDb
            ? preg_match('/(\d+)\.(\d+)\.(\d+)-MariaDB/i', $version, $parts) === 1
            : preg_match('/^(\d+)\.(\d+)\.(\d+)/', $version, $parts) === 1;

        $numericVersion = $matched ? $parts[1] . '.' . $parts[2] . '.' . $parts[3] : '';
        $supported = $matched && version_compare($numericVersion, $minimum, '>=');

        return [
            'ok' => $supported,
            'engine' => $engine,
            'version' => substr($version, 0, 80),
            'minimum' => $minimum,
            'reason' => $supported
                ? null
                : ($engine . ' ' . $minimum . ' or newer is required')
        ];
    }

    public static function assertSupported(PDO $db): array
    {
        $result = self::inspect($db);
        if (!$result['ok']) {
            throw new RuntimeException(
                'Stage3 requires MySQL 8.0+ or MariaDB 10.11+; detected '
                . $result['engine'] . ' ' . (string)($result['version'] ?? 'unknown')
            );
        }
        return $result;
    }
}
