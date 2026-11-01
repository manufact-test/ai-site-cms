<?php
declare(strict_types=1);

namespace Manufact\Stage3;

use PDO;
use RuntimeException;
use Throwable;

/** Private byte-preserving snapshot for schema-preserving CMS engine updates. */
final class DatabaseSnapshot
{
    public const FORMAT = 'manufact-stage3-engine-db-snapshot-v1';
    private const MAX_BYTES = 536870912;

    public static function create(PDO $db, string $privateDir, string $databaseFingerprint, string $instanceId, int $schemaVersion = 1): array
    {
        if (!preg_match('/^[a-f0-9]{64}$/D', $databaseFingerprint)
            || !preg_match('/^[a-f0-9]{32}$/D', $instanceId) || $schemaVersion !== 1 || $db->inTransaction()) {
            throw new RuntimeException('Database snapshot preconditions are not satisfied');
        }
        $privateDir = self::privateDirectory($privateDir);
        $driver = (string)$db->getAttribute(PDO::ATTR_DRIVER_NAME);
        if (!in_array($driver, ['mysql','sqlite'], true)) throw new RuntimeException('Unsupported Stage3 snapshot driver');
        if ($driver === 'mysql') {
            $version = (string)$db->query('SELECT VERSION()')->fetchColumn();
            if (stripos($version, 'mariadb') !== false || !preg_match('/^(\d+)\.(\d+)\.(\d+)/', $version, $m)
                || version_compare($m[1].'.'.$m[2].'.'.$m[3], '8.0.0', '<')) {
                throw new RuntimeException('Stage3 snapshots require MySQL 8.0 or newer');
            }
        }
        $tables = self::tableInventory($db, $driver);
        $required = self::requiredTables();
        sort($required, SORT_STRING);
        if ($tables !== $required) throw new RuntimeException('Snapshot requires the complete dedicated 25-table Stage3 schema');

        $engine = self::ensureDirectory($privateDir . DIRECTORY_SEPARATOR . 'engine');
        $snapshots = self::ensureDirectory($engine . DIRECTORY_SEPARATOR . 'snapshots');
        $snapshotId = 'snapshot-' . gmdate('YmdHis') . '-' . bin2hex(random_bytes(8));
        $destination = $snapshots . DIRECTORY_SEPARATOR . $snapshotId;
        if (file_exists($destination) || is_link($destination) || !mkdir($destination, 0700)) {
            throw new RuntimeException('Unable to create a private Stage3 snapshot');
        }
        chmod($destination, 0700);
        $started = false;
        try {
            if ($driver === 'mysql') $db->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
            $db->beginTransaction();
            $started = true;
            $entries = [];
            $totalBytes = 0;
            foreach ($tables as $table) {
                $ddl = self::createStatement($db, $driver, $table);
                $columns = self::columns($db, $driver, $table);
                $file = $table . '.jsonl';
                $path = $destination . DIRECTORY_SEPARATOR . $file;
                $handle = @fopen($path, 'x');
                if ($handle === false) throw new RuntimeException('Unable to create a snapshot table file');
                chmod($path, 0600);
                $hash = hash_init('sha256');
                $size = 0;
                $rows = 0;
                try {
                    $header = self::canonicalJson([
                        'columns'=>$columns,
                        'createSqlBase64'=>base64_encode($ddl),
                        'format'=>'manufact-stage3-engine-db-table-v1',
                        'table'=>$table
                    ]) . "\n";
                    self::writeHashed($handle, $hash, $header, $size);
                    $query = $db->query('SELECT * FROM ' . self::quote($table, $driver));
                    while (($row = $query->fetch(PDO::FETCH_NUM)) !== false) {
                        $values = [];
                        foreach ($row as $value) $values[] = $value === null ? null : base64_encode((string)$value);
                        self::writeHashed($handle, $hash, self::canonicalJson(['row'=>$values]) . "\n", $size);
                        ++$rows;
                        if ($size > self::MAX_BYTES || $totalBytes + $size > self::MAX_BYTES) {
                            throw new RuntimeException('Stage3 snapshot exceeds the supported size limit');
                        }
                    }
                    if (!fflush($handle)) throw new RuntimeException('Unable to flush snapshot table');
                    if (function_exists('fsync')) fsync($handle);
                } finally {
                    fclose($handle);
                }
                $totalBytes += $size;
                $entries[] = ['bytes'=>$size,'file'=>$file,'rows'=>$rows,'sha256'=>hash_final($hash),'table'=>$table];
            }
            $db->commit();
            $started = false;
            $manifest = [
                'createdAt'=>gmdate('Y-m-d\TH:i:s\Z'),
                'databaseFingerprint'=>$databaseFingerprint,
                'driver'=>$driver,
                'format'=>self::FORMAT,
                'instanceId'=>$instanceId,
                'schemaVersion'=>$schemaVersion,
                'snapshotId'=>$snapshotId,
                'tables'=>$entries
            ];
            self::writeFresh($destination . DIRECTORY_SEPARATOR . 'manifest.json', self::canonicalJson($manifest) . "\n");
            self::verify($destination);
            return [
                'snapshotId'=>$snapshotId,
                'fingerprint'=>hash('sha256',self::canonicalJson($manifest)),
                'tableCount'=>count($entries),
                'rowCount'=>array_sum(array_column($entries,'rows')),
                'bytes'=>$totalBytes,
                'driver'=>$driver,
                'verified'=>true
            ];
        } catch (Throwable $error) {
            if ($started && $db->inTransaction()) {
                try { $db->rollBack(); } catch (Throwable) {}
            }
            self::removeTree($destination);
            throw $error;
        }
    }

    public static function verify(string $snapshotDirectory): array
    {
        $root = self::canonicalDirectory($snapshotDirectory);
        $raw = self::readPrivateFile($root . DIRECTORY_SEPARATOR . 'manifest.json', 262144);
        try { $manifest = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
        catch (Throwable $error) { throw new RuntimeException('Snapshot manifest is malformed', 0, $error); }
        if (!is_array($manifest) || !hash_equals(self::canonicalJson($manifest) . "\n", $raw)) {
            throw new RuntimeException('Snapshot manifest is not canonical');
        }
        $keys = ['createdAt','databaseFingerprint','driver','format','instanceId','schemaVersion','snapshotId','tables'];
        if (array_keys($manifest) !== $keys || $manifest['format'] !== self::FORMAT
            || !in_array($manifest['driver'], ['mysql','sqlite'], true) || $manifest['schemaVersion'] !== 1
            || !is_string($manifest['instanceId']) || !preg_match('/^[a-f0-9]{32}$/D',$manifest['instanceId'])
            || !is_string($manifest['databaseFingerprint']) || !preg_match('/^[a-f0-9]{64}$/D',$manifest['databaseFingerprint'])
            || !is_string($manifest['snapshotId']) || basename($root) !== $manifest['snapshotId']
            || !is_array($manifest['tables']) || !array_is_list($manifest['tables'])) {
            throw new RuntimeException('Snapshot identity is invalid');
        }
        $expectedTables = self::requiredTables();
        sort($expectedTables, SORT_STRING);
        $actualTables = [];
        $totalBytes = 0;
        $totalRows = 0;
        foreach ($manifest['tables'] as $entry) {
            if (!is_array($entry) || array_keys($entry) !== ['bytes','file','rows','sha256','table']
                || !is_string($entry['table']) || !preg_match('/^[a-z][a-z0-9_]{1,79}$/D',$entry['table'])
                || $entry['file'] !== $entry['table'].'.jsonl'
                || !is_int($entry['bytes']) || $entry['bytes'] < 1
                || !is_int($entry['rows']) || $entry['rows'] < 0
                || !is_string($entry['sha256']) || !preg_match('/^[a-f0-9]{64}$/D',$entry['sha256'])) {
                throw new RuntimeException('Snapshot table entry is invalid');
            }
            $actualTables[] = $entry['table'];
            $path = $root . DIRECTORY_SEPARATOR . $entry['file'];
            $stat = @lstat($path);
            $mode = is_file($path) ? @fileperms($path) : false;
            if ($stat === false || !is_file($path) || is_link($path) || realpath($path) !== $path
                || ($stat['nlink'] ?? 0) !== 1 || $mode === false || (($mode & 0077) !== 0)
                || (int)$stat['size'] !== $entry['bytes']
                || !hash_equals($entry['sha256'],(string)hash_file('sha256',$path))) {
                throw new RuntimeException('Snapshot table file failed integrity verification');
            }
            $lineCount = 0;
            $handle = fopen($path,'rb');
            if ($handle === false) throw new RuntimeException('Unable to read snapshot table');
            try {
                while (($line = fgets($handle)) !== false) {
                    ++$lineCount;
                    $record = json_decode($line,true,64,JSON_THROW_ON_ERROR);
                    if ($lineCount === 1) {
                        if (!is_array($record) || ($record['format'] ?? null) !== 'manufact-stage3-engine-db-table-v1'
                            || ($record['table'] ?? null) !== $entry['table']
                            || !is_array($record['columns'] ?? null) || !is_string($record['createSqlBase64'] ?? null)
                            || base64_decode($record['createSqlBase64'],true) === false) {
                            throw new RuntimeException('Snapshot table header is invalid');
                        }
                    } elseif (!is_array($record) || array_keys($record) !== ['row']
                        || !is_array($record['row']) || !array_is_list($record['row'])) {
                        throw new RuntimeException('Snapshot row is invalid');
                    } else {
                        foreach ($record['row'] as $value) {
                            if ($value !== null && (!is_string($value) || base64_decode($value,true) === false)) {
                                throw new RuntimeException('Snapshot row encoding is invalid');
                            }
                        }
                    }
                }
            } finally { fclose($handle); }
            if ($lineCount !== $entry['rows'] + 1) throw new RuntimeException('Snapshot row count does not match');
            $totalBytes += $entry['bytes'];
            $totalRows += $entry['rows'];
        }
        sort($actualTables,SORT_STRING);
        if ($actualTables !== $expectedTables || $totalBytes > self::MAX_BYTES) {
            throw new RuntimeException('Snapshot does not contain the complete Stage3 schema');
        }
        $actualFiles = array_values(array_diff(scandir($root) ?: [],['.','..']));
        $expectedFiles = array_merge(['manifest.json'],array_map(static fn(array $e): string=>$e['file'],$manifest['tables']));
        sort($actualFiles,SORT_STRING);sort($expectedFiles,SORT_STRING);
        if ($actualFiles !== $expectedFiles) throw new RuntimeException('Snapshot contains untracked files');
        return [
            'manifest'=>$manifest,
            'fingerprint'=>hash('sha256',self::canonicalJson($manifest)),
            'tableCount'=>count($actualTables),
            'rowCount'=>$totalRows,
            'bytes'=>$totalBytes,
            'verified'=>true
        ];
    }

    /** Restore rehearsal only: explicit CLI authorization and a completely empty target DB. */
    public static function restoreToEmpty(PDO $target, string $snapshotDirectory): array
    {
        if (PHP_SAPI !== 'cli' || getenv('STAGE3_ALLOW_SNAPSHOT_RESTORE') !== 'YES') {
            throw new RuntimeException('Snapshot restore is restricted to authorized CLI rehearsal');
        }
        $verified = self::verify($snapshotDirectory);
        $manifest = $verified['manifest'];
        $driver = (string)$target->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver !== $manifest['driver'] || self::tableInventory($target,$driver) !== []) {
            throw new RuntimeException('Snapshot rehearsal requires an empty target with the same database driver');
        }
        foreach ($manifest['tables'] as $entry) {
            $path = rtrim($snapshotDirectory,DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$entry['file'];
            $handle = fopen($path,'rb');
            if ($handle === false) throw new RuntimeException('Unable to read snapshot table for restore');
            try {
                $header = json_decode((string)fgets($handle),true,64,JSON_THROW_ON_ERROR);
                $ddl = base64_decode($header['createSqlBase64'],true);
                if (!is_string($ddl) || $ddl === '') throw new RuntimeException('Snapshot DDL is invalid');
                $target->exec($ddl);
                $columns = $header['columns'];
                if (!is_array($columns) || $columns === []) throw new RuntimeException('Snapshot columns are invalid');
                $names = [];
                foreach ($columns as $column) {
                    if (!is_array($column) || !is_string($column['name'] ?? null)
                        || !preg_match('/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/D',$column['name'])
                        || !is_bool($column['binary'] ?? null)) throw new RuntimeException('Snapshot column definition is invalid');
                    $names[] = self::quote($column['name'],$driver);
                }
                $sql = 'INSERT INTO '.self::quote($entry['table'],$driver).' ('.implode(',',$names).') VALUES ('
                    .implode(',',array_fill(0,count($names),'?')).')';
                $insert = $target->prepare($sql);
                $restoredRows = 0;
                while (($line = fgets($handle)) !== false) {
                    $record = json_decode($line,true,64,JSON_THROW_ON_ERROR);
                    $row = $record['row'];
                    if (!is_array($row) || count($row) !== count($columns)) throw new RuntimeException('Snapshot row width is invalid');
                    foreach ($row as $index=>$value) {
                        if ($value === null) $insert->bindValue($index+1,null,PDO::PARAM_NULL);
                        else {
                            $decoded = base64_decode($value,true);
                            if (!is_string($decoded)) throw new RuntimeException('Snapshot value is invalid');
                            $insert->bindValue($index+1,$decoded,$columns[$index]['binary']?PDO::PARAM_LOB:PDO::PARAM_STR);
                        }
                    }
                    $insert->execute();
                    ++$restoredRows;
                }
                if ($restoredRows !== $entry['rows']) throw new RuntimeException('Snapshot restore row count does not match');
            } finally { fclose($handle); }
        }
        $restored = self::tableInventory($target,$driver);
        $expected = self::requiredTables();
        sort($expected,SORT_STRING);
        if ($restored !== $expected) throw new RuntimeException('Snapshot restore rehearsal is incomplete');
        return ['restoredTables'=>count($restored),'snapshotId'=>$manifest['snapshotId'],'verified'=>true];
    }

    private static function requiredTables(): array
    {
        if (!class_exists(Stage3Installer::class, false)) {
            require_once __DIR__ . '/bin/Stage3Installer.php';
        }
        return Stage3Installer::requiredSchemaTables();
    }

    private static function tableInventory(PDO $db,string $driver): array
    {
        if ($driver==='sqlite') {
            $objects=$db->query("SELECT type,name FROM sqlite_master WHERE type IN ('table','view','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type,name")->fetchAll(PDO::FETCH_ASSOC);
            foreach($objects as $object)if($object['type']!=='table')throw new RuntimeException('Stage3 snapshot refuses extra database views or triggers');
            $tables=array_column($objects,'name');
        } else {
            $rows=$db->query("SELECT TABLE_NAME,ENGINE,TABLE_TYPE FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME")->fetchAll(PDO::FETCH_ASSOC);
            foreach($rows as $row){
                if(($row['TABLE_TYPE']??null)!=='BASE TABLE')throw new RuntimeException('Stage3 snapshot refuses extra database views or non-table objects');
                if(strcasecmp((string)$row['ENGINE'],'InnoDB')!==0)throw new RuntimeException('All Stage3 tables must use InnoDB for a consistent snapshot');
            }
            $tables=array_column($rows,'TABLE_NAME');
        }
        $tables=array_values(array_map('strval',$tables));sort($tables,SORT_STRING);return $tables;
    }

    private static function createStatement(PDO $db,string $driver,string $table): string
    {
        if($driver==='sqlite'){
            $q=$db->prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?");$q->execute([$table]);$sql=$q->fetchColumn();
        }else{
            $row=$db->query('SHOW CREATE TABLE '.self::quote($table,$driver))->fetch(PDO::FETCH_NUM);$sql=is_array($row)?($row[1]??null):null;
        }
        if(!is_string($sql)||$sql==='')throw new RuntimeException('Unable to read Stage3 table definition');
        return $sql;
    }

    private static function columns(PDO $db,string $driver,string $table): array
    {
        if($driver==='sqlite'){
            $rows=$db->query('PRAGMA table_info('.self::quote($table,$driver).')')->fetchAll(PDO::FETCH_ASSOC);
            return array_map(static function(array $r):array{$type=strtolower((string)$r['type']);return ['binary'=>str_contains($type,'blob'),'name'=>(string)$r['name'],'type'=>$type];},$rows);
        }
        $rows=$db->query('SHOW FULL COLUMNS FROM '.self::quote($table,$driver))->fetchAll(PDO::FETCH_ASSOC);
        return array_map(static function(array $r):array{$type=strtolower((string)$r['Type']);return ['binary'=>str_contains($type,'blob')||str_contains($type,'binary')||$type==='bit','name'=>(string)$r['Field'],'type'=>$type];},$rows);
    }

    private static function quote(string $name,string $driver): string
    {
        if(!preg_match('/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/D',$name))throw new RuntimeException('Unsafe Stage3 SQL identifier');
        return $driver==='mysql'?chr(96).$name.chr(96):'"'.$name.'"';
    }

    private static function privateDirectory(string $path): string
    {
        $real=realpath($path);$mode=is_dir($path)?@fileperms($path):false;
        if(!is_string($real)||$real!==$path||!is_dir($real)||is_link($path)||$mode===false||(($mode&0077)!==0))
            throw new RuntimeException('Stage3 private snapshot directory must be canonical and mode 0700');
        return $real;
    }

    private static function canonicalDirectory(string $path): string
    {
        $real=realpath($path);$mode=is_dir($path)?@fileperms($path):false;
        if(!is_string($real)||$real!==$path||!is_dir($real)||is_link($path)||$mode===false||(($mode&0077)!==0))throw new RuntimeException('Snapshot directory is not canonical and private');
        return $real;
    }

    private static function ensureDirectory(string $path): string
    {
        if(!file_exists($path)&&!is_link($path)){if(!mkdir($path,0700))throw new RuntimeException('Unable to create private snapshot directory');}
        if(is_link($path)||!is_dir($path)||realpath($path)!==$path)throw new RuntimeException('Unsafe private snapshot directory');
        chmod($path,0700);return $path;
    }

    private static function readPrivateFile(string $path,int $limit): string
    {
        $s=@lstat($path);$mode=is_file($path)?@fileperms($path):false;
        if($s===false||!is_file($path)||is_link($path)||realpath($path)!==$path||($s['nlink']??0)!==1
            ||$s['size']<1||$s['size']>$limit||$mode===false||(($mode&0077)!==0))
            throw new RuntimeException('Unsafe private Stage3 snapshot file');
        $raw=file_get_contents($path);if(!is_string($raw)||strlen($raw)!==(int)$s['size'])throw new RuntimeException('Unable to read private snapshot file');
        return $raw;
    }

    private static function writeFresh(string $path,string $bytes): void
    {
        if(file_exists($path)||is_link($path))throw new RuntimeException('Refusing to overwrite private snapshot metadata');
        $h=@fopen($path,'x');if($h===false)throw new RuntimeException('Unable to create private snapshot metadata');
        try{chmod($path,0600);if(fwrite($h,$bytes)!==strlen($bytes)||!fflush($h))throw new RuntimeException('Unable to write snapshot metadata');if(function_exists('fsync'))fsync($h);}
        catch(Throwable $e){fclose($h);if(is_file($path)&&!is_link($path))unlink($path);throw $e;}fclose($h);
    }

    private static function writeHashed($handle,$hash,string $bytes,int &$size): void
    {
        if(fwrite($handle,$bytes)!==strlen($bytes))throw new RuntimeException('Unable to write Stage3 snapshot data');
        hash_update($hash,$bytes);$size+=strlen($bytes);
    }

    private static function canonicalJson(mixed $value): string
    {
        $normalize=static function(mixed $v)use(&$normalize):mixed{
            if(!is_array($v))return $v;
            if(array_is_list($v))return array_map($normalize,$v);
            ksort($v,SORT_STRING);foreach($v as $k=>$child)$v[$k]=$normalize($child);return $v;
        };
        return json_encode($normalize($value),JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);
    }

    private static function removeTree(string $path): void
    {
        if(!file_exists($path)&&!is_link($path))return;
        if(is_link($path)||!is_dir($path)){if(!is_link($path))unlink($path);return;}
        foreach(scandir($path)?:[] as $name)if($name!=='.'&&$name!=='..')self::removeTree($path.DIRECTORY_SEPARATOR.$name);
        @rmdir($path);
    }
}
