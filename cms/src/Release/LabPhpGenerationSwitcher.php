<?php
declare(strict_types=1);

namespace AiSiteCms\Release;

use RuntimeException;

/**
 * Stage2 CLI-only, CI-only rehearsal for switching separately verified PHP code
 * GENERATIONS by a versioned metadata pointer. No symlink/document-root edit.
 * The code does not configure PHP-FPM/OPcache, HTTPS, databases or real hosting.
 * Operators must independently retain a minimum version and signers' trust pins.
 */
final class LabPhpGenerationSwitcher
{
    private const FORMAT = 'ai-site-cms-php-generation-switch-lab-v1';
    private const PREFIX = 'ai-site-cms-php-switch-lab-';
    private string $root;
    private bool $locked = false;

    private function __construct(string $root)
    {
        $this->root = $root;
        $this->assertRoot();
    }

    private static function requireCI(): void
    {
        if (PHP_SAPI !== 'cli' || getenv('CI') !== 'true'
            || getenv('CMS_ALLOW_PHP_INSTALL_LAB') !== '1') {
            throw new RuntimeException('Version switching only in disposable CLI CI lab');
        }
    }

    public static function create(): self
    {
        self::requireCI();
        $tmp = realpath(sys_get_temp_dir());
        if ($tmp === false) throw new RuntimeException('No OS temp directory');
        $root = $tmp . '/' . self::PREFIX . bin2hex(random_bytes(16));
        if (!mkdir($root, 0700)) throw new RuntimeException('Cannot create switcher lab');
        $lab = new self($root);
        $lab->writeFresh('releases.json', ['format'=>self::FORMAT, 'releases'=>[]]);
        return $lab;
    }

    public static function reopen(string $root): self
    {
        $lab = new self($root);
        $lab->inspect();
        return $lab;
    }

    public function root(): string { return $this->root; }

    private function assertRoot(): void
    {
        self::requireCI();
        $temp = realpath(sys_get_temp_dir());
        if ($temp === false || dirname($this->root) !== $temp
            || !preg_match('/^'.preg_quote(self::PREFIX, '/').'[0-9a-f]{32}$/D', basename($this->root))
            || is_link($this->root) || !is_dir($this->root)
            || realpath($this->root) !== $this->root) {
            throw new RuntimeException('Refusing to switch outside new temporary sandbox');
        }
    }

    private function file(string $name): string { return $this->root . '/' . $name; }

    private static function present(string $path): bool
    {
        return file_exists($path) || is_link($path);
    }

    private static function validVersion(string $version): void
    {
        if (!preg_match('/^0\.[0-9]{1,9}\.[0-9]{1,9}-stage2\.[0-9]{1,9}$/D', $version)) {
            throw new RuntimeException('Invalid lab version');
        }
    }

    private static function compare(string $a, string $b): int
    {
        self::validVersion($a);
        self::validVersion($b);
        $parts = static function (string $value): array {
            preg_match('/^0\.([0-9]+)\.([0-9]+)-stage2\.([0-9]+)$/D', $value, $m);
            return [(int)$m[1],(int)$m[2],(int)$m[3]];
        };
        return $parts($a) <=> $parts($b);
    }

    /** @param list<string> $fields */
    private static function exact(mixed $data, array $fields): void
    {
        if (!is_array($data) || array_keys($data) !== $fields) {
            throw new RuntimeException('Noncanonical switch operator state');
        }
    }

    /** @return array<string,mixed>|null */
    private function json(string $name, bool $required = false): ?array
    {
        $path = $this->file($name);
        if (!self::present($path)) {
            if ($required) throw new RuntimeException('Missing retained switch state');
            return null;
        }
        $stat = @lstat($path);
        if ($stat === false || is_link($path) || !is_file($path)
            || ($stat['nlink'] ?? 0) !== 1 || $stat['size'] < 3 || $stat['size'] > 16384) {
            throw new RuntimeException('Untrusted switch state node');
        }
        $raw = @file_get_contents($path);
        if ($raw === false || strlen($raw) !== $stat['size']) {
            throw new RuntimeException('Switch state changed during read');
        }
        try { $data = json_decode($raw, true, 32, JSON_THROW_ON_ERROR); }
        catch (\JsonException $e) { throw new RuntimeException('Invalid switch state JSON', 0, $e); }
        if (!is_array($data)) throw new RuntimeException('Switch state not an object');
        return $data;
    }

    /** @param array<string,mixed> $data */
    private function writeFresh(string $name, array $data): void
    {
        $file = $this->file($name);
        $fd = @fopen($file, 'x');
        if ($fd === false) throw new RuntimeException('Refusing operator state overwrite');
        try {
            $bytes = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n";
            if (fwrite($fd, $bytes) !== strlen($bytes) || !fflush($fd)) {
                throw new RuntimeException('Incomplete operator write');
            }
            if (function_exists('fsync')) fsync($fd);
        } finally { fclose($fd); }
    }

    /** @param array<string,mixed> $data */
    private function writeAtomic(string $name, array $data): void
    {
        $this->writeFresh($name.'.new', $data);
        if (!rename($this->file($name.'.new'), $this->file($name))) {
            throw new RuntimeException('Atomic operator rename refused');
        }
    }

    /** @return array<string,array{root:string,digest:string}> */
    private function releases(): array
    {
        $data = $this->json('releases.json', true);
        self::exact($data, ['format','releases']);
        if ($data['format'] !== self::FORMAT || !is_array($data['releases'])
            || count($data['releases']) > 16) throw new RuntimeException('Invalid registered versions');
        $seenRoots = [];
        foreach ($data['releases'] as $version=>$entry) {
            self::validVersion((string)$version);
            self::exact($entry, ['root','digest']);
            if (!is_string($entry['root']) || !is_string($entry['digest'])
                || !preg_match('/^[a-f0-9]{64}$/D', $entry['digest'])
                || isset($seenRoots[$entry['root']])) {
                throw new RuntimeException('Invalid generation registration');
            }
            $seenRoots[$entry['root']] = true;
        }
        return $data['releases'];
    }

    /** @return array<string,mixed>|null */
    private function pointer(): ?array
    {
        $p = $this->json('active.json');
        if ($p === null) return null;
        self::exact($p, ['format','current','previous','sequence','kind']);
        if ($p['format'] !== self::FORMAT || !is_string($p['current'])
            || !($p['previous'] === null || is_string($p['previous']))
            || !is_int($p['sequence']) || $p['sequence'] < 1 || $p['sequence'] > 1000
            || !in_array($p['kind'], ['upgrade','rollback'], true)) {
            throw new RuntimeException('Invalid generation pointer');
        }
        self::validVersion($p['current']);
        if ($p['previous'] !== null) {
            self::validVersion($p['previous']);
            if ($p['previous'] === $p['current']) throw new RuntimeException('Aliased generation');
        }
        if (($p['sequence'] === 1) !== ($p['previous'] === null)) {
            throw new RuntimeException('Incorrect generation history');
        }
        return $p;
    }

    private static function pointerHash(array $pointer): string
    {
        return hash('sha256', json_encode($pointer, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)."\n");
    }

    /** @param array{root:string,digest:string} $record */
    private function verifyInstalled(string $version, array $record): void
    {
        require_once __DIR__ . '/LabPackageStager.php';
        $lab = LabPackageStager::reopen($record['root']);
        if ($lab->inspect()['status'] !== 'installed') {
            throw new RuntimeException('Registered install is not complete');
        }
        $code = $record['root'] . '/code';
        $verified = LabPackageStager::verifyPackage($code, $record['digest']);
        if ($verified['version'] !== $version) throw new RuntimeException('Generation/digest mismatch');
    }

    /** @return array<string,mixed> */
    public function inspect(?string $externalMinVersion = null): array
    {
        $this->assertRoot();
        if (!$this->locked && self::present($this->file('switch-exclusive.lock'))) {
            throw new RuntimeException('Switch lock held or stale; operator investigation required');
        }
        foreach (['active.json.new','releases.json.new','switch-intent.json.new',
                  'active-receipt.json.new'] as $name) {
            if (self::present($this->file($name))) {
                throw new RuntimeException('Interrupted switch metadata write; manual review');
            }
        }
        $allow = ['.','..','releases.json','active.json','switch-intent.json',
                  'active-receipt.json','switch-exclusive.lock'];
        foreach (scandir($this->root) ?: [] as $name) {
            if (!in_array($name, $allow, true)) {
                throw new RuntimeException('Foreign switch sandbox file');
            }
        }
        $releases = $this->releases();
        $active = $this->pointer();
        $intent = $this->json('switch-intent.json');
        $receipt = $this->json('active-receipt.json');
        if ($active !== null) {
            if (!isset($releases[$active['current']])) throw new RuntimeException('Unknown active release');
            $this->verifyInstalled($active['current'], $releases[$active['current']]);
            if ($active['previous'] !== null) {
                if (!isset($releases[$active['previous']])) throw new RuntimeException('Missing previous generation');
                $this->verifyInstalled($active['previous'], $releases[$active['previous']]);
            }
        }
        if ($externalMinVersion !== null) {
            self::validVersion($externalMinVersion);
            if ($active !== null && self::compare($active['current'], $externalMinVersion) < 0) {
                throw new RuntimeException('Active generation below independent minimum floor');
            }
        }
        if ($receipt !== null) {
            self::exact($receipt, ['format','sequence','pointerSha256']);
            if ($receipt['format'] !== self::FORMAT || !is_int($receipt['sequence'])
                || !is_string($receipt['pointerSha256'])
                || !preg_match('/^[a-f0-9]{64}$/D', $receipt['pointerSha256'])) {
                throw new RuntimeException('Malformed activation receipt');
            }
            if ($active === null || $receipt['sequence'] !== $active['sequence']
                || !hash_equals(self::pointerHash($active), $receipt['pointerSha256'])) {
                // Exception: receipt for OLD generation until pointer switches.
                if ($intent === null) throw new RuntimeException('Receipt and active generation inconsistent');
            }
        }
        $state = 'clean';
        if ($intent !== null) {
            self::exact($intent, ['format','kind','from','to','sequence','targetSequence','digest']);
            if ($intent['format'] !== self::FORMAT
                || !in_array($intent['kind'], ['upgrade','rollback'], true)
                || !is_int($intent['sequence']) || !is_int($intent['targetSequence'])
                || $intent['sequence'] < 0 || $intent['targetSequence'] !== $intent['sequence']+1
                || !is_string($intent['to']) || !is_string($intent['digest'])
                || !preg_match('/^[a-f0-9]{64}$/D', $intent['digest'])) {
                throw new RuntimeException('Malformed switch intent');
            }
            self::validVersion($intent['to']);
            if ($intent['from'] !== null) {
                if (!is_string($intent['from'])) throw new RuntimeException('Invalid switch source');
                self::validVersion($intent['from']);
            }
            if (!isset($releases[$intent['to']])
                || $releases[$intent['to']]['digest'] !== $intent['digest']) {
                throw new RuntimeException('Intent does not match registered release');
            }
            if (($active === null && $intent['from'] === null && $intent['sequence'] === 0)
                || ($active !== null && $active['current'] === $intent['from']
                    && $active['sequence'] === $intent['sequence'])) {
                if ($receipt !== null
                    && ($active === null || $receipt['sequence'] !== $active['sequence']
                        || !hash_equals(self::pointerHash($active), $receipt['pointerSha256']))) {
                    throw new RuntimeException('Inconsistent pre-switch receipt');
                }
                $state = 'pending-before-switch';
            } elseif ($active !== null && $active['current'] === $intent['to']
                && $active['previous'] === $intent['from']
                && $active['sequence'] === $intent['targetSequence']
                && $active['kind'] === $intent['kind']) {
                if ($receipt === null || $receipt['sequence'] !== $active['sequence']
                    || !hash_equals(self::pointerHash($active), $receipt['pointerSha256'])) {
                    if ($receipt !== null && $receipt['sequence'] !== $intent['sequence']) {
                        throw new RuntimeException('Unexpected activation receipt epoch');
                    }
                    $state = 'pending-after-switch';
                } else $state = 'committed-needs-cleanup';
            } else {
                throw new RuntimeException('Activation and journal conflict');
            }
        } else {
            if ($active === null && $receipt !== null) throw new RuntimeException('Orphan activation receipt');
            if ($active !== null && $receipt === null) throw new RuntimeException('Missing activation receipt');
        }
        return ['format'=>self::FORMAT,'status'=>$state,'current'=>$active['current'] ?? null,
            'previous'=>$active['previous'] ?? null,'sequence'=>$active['sequence'] ?? 0,
            'registered'=>count($releases),'ready'=>$state==='clean'&&$active !== null,
            'webSapiTested'=>false,'opcacheResetPerformed'=>false,'productionReady'=>false];
    }

    /** @return mixed */
    private function exclusive(callable $work): mixed
    {
        $this->assertRoot();
        $lock = $this->file('switch-exclusive.lock');
        if (!mkdir($lock, 0700)) throw new RuntimeException('Concurrent/stale switch lock');
        $stat = lstat($lock);
        if ($stat === false) throw new RuntimeException('Cannot inspect lock');
        $this->locked = true;
        try { return $work(); }
        finally {
            $this->locked = false;
            $now = @lstat($lock);
            if ($now === false || !is_dir($lock) || is_link($lock)
                || $now['ino'] !== $stat['ino'] || $now['dev'] !== $stat['dev']
                || count(scandir($lock) ?: []) !== 2) {
                throw new RuntimeException('Exclusive switch lock modified; manual intervention');
            }
            rmdir($lock);
        }
    }

    public function register(string $installedLabRoot, string $expectedDigest, string $expectedVersion): array
    {
        return $this->exclusive(function () use ($installedLabRoot,$expectedDigest,$expectedVersion): array {
            $view = $this->inspect();
            if ($view['status'] !== 'clean') throw new RuntimeException('Pending switch must be resolved');
            self::validVersion($expectedVersion);
            if (!preg_match('/^[a-f0-9]{64}$/D', $expectedDigest)) {
                throw new RuntimeException('Externally authenticated digest required');
            }
            $this->verifyInstalled($expectedVersion, ['root'=>$installedLabRoot,'digest'=>$expectedDigest]);
            $data = $this->releases();
            if (isset($data[$expectedVersion]) || count($data) >= 16) {
                throw new RuntimeException('Registered generation cannot be overwritten');
            }
            foreach ($data as $entry) {
                if ($entry['root'] === $installedLabRoot) throw new RuntimeException('Reuse of release root forbidden');
            }
            $data[$expectedVersion] = ['root'=>$installedLabRoot,'digest'=>$expectedDigest];
            $this->writeAtomic('releases.json', ['format'=>self::FORMAT,'releases'=>$data]);
            return $this->inspect();
        });
    }

    public function switchTo(
        string $target, ?string $expectedCurrent, int $expectedSequence,
        string $externalMinVersion, ?string $failAt = null
    ): array {
        return $this->exclusive(function () use ($target,$expectedCurrent,$expectedSequence,$externalMinVersion,$failAt): array {
            $view = $this->inspect($externalMinVersion);
            if ($view['status'] !== 'clean') throw new RuntimeException('Unresolved activation intent');
            if ($view['current'] !== $expectedCurrent || $view['sequence'] !== $expectedSequence) {
                throw new RuntimeException('Stale activation generation / ABA sequence mismatch');
            }
            self::validVersion($target);
            self::validVersion($externalMinVersion);
            if (self::compare($target,$externalMinVersion) < 0) {
                throw new RuntimeException('Switch target below externally retained version floor');
            }
            $releases = $this->releases();
            if (!isset($releases[$target])) throw new RuntimeException('Unknown code generation');
            $this->verifyInstalled($target, $releases[$target]);
            $current = $this->pointer();
            $kind = 'upgrade';
            if ($current !== null && self::compare($target,$current['current']) <= 0) {
                if ($current['kind'] !== 'upgrade' || $current['previous'] !== $target) {
                    throw new RuntimeException('Rollback only once to verified immediate previous version');
                }
                $kind = 'rollback';
            }
            if ($expectedSequence >= 1000) throw new RuntimeException('Activation sequence exhausted');
            $intent = ['format'=>self::FORMAT,'kind'=>$kind,'from'=>$expectedCurrent,'to'=>$target,
                'sequence'=>$expectedSequence,'targetSequence'=>$expectedSequence+1,
                'digest'=>$releases[$target]['digest']];
            $this->writeFresh('switch-intent.json', $intent);
            if ($failAt === 'after-intent') throw new RuntimeException('Injected failure after intent');
            $pointer = ['format'=>self::FORMAT,'current'=>$target,'previous'=>$expectedCurrent,
                'sequence'=>$expectedSequence+1,'kind'=>$kind];
            $this->writeAtomic('active.json', $pointer);
            if ($failAt === 'after-pointer') throw new RuntimeException('Injected failure after pointer');
            $this->writeAtomic('active-receipt.json', ['format'=>self::FORMAT,
                'sequence'=>$pointer['sequence'],'pointerSha256'=>self::pointerHash($pointer)]);
            if ($failAt === 'after-receipt') throw new RuntimeException('Injected failure after receipt');
            unlink($this->file('switch-intent.json'));
            return $this->inspect($externalMinVersion);
        });
    }

    public function recover(string $mode, string $externalMinVersion): array
    {
        return $this->exclusive(function () use ($mode,$externalMinVersion): array {
            $view = $this->inspect($externalMinVersion);
            if ($view['status'] === 'pending-before-switch' && $mode === 'abort') {
                unlink($this->file('switch-intent.json'));
            } elseif (in_array($view['status'], ['pending-after-switch','committed-needs-cleanup'], true)
                && $mode === 'finalize') {
                $pointer = $this->pointer();
                if ($pointer === null) throw new RuntimeException('Commit pointer absent');
                if ($view['status'] === 'pending-after-switch') {
                    $this->writeAtomic('active-receipt.json', ['format'=>self::FORMAT,
                        'sequence'=>$pointer['sequence'],'pointerSha256'=>self::pointerHash($pointer)]);
                }
                unlink($this->file('switch-intent.json'));
            } else throw new RuntimeException('Recovery direction conflicts with actual commit boundary');
            return $this->inspect($externalMinVersion);
        });
    }

    /** Read-only pre-request gate: resolves verified code, not mutable symlinks. */
    public function resolve(string $externalMinVersion): array
    {
        $view = $this->inspect($externalMinVersion);
        if (!$view['ready']) throw new RuntimeException('No clean verified generation to serve');
        $data = $this->releases()[$view['current']];
        $code = $data['root'].'/code';
        $entry = $code.'/public/index.php';
        if (is_link($entry) || realpath($entry) !== $entry) {
            throw new RuntimeException('Unsafe generation front controller');
        }
        return ['version'=>$view['current'],'sequence'=>$view['sequence'],
            'entry'=>$entry,'publicRoot'=>$code.'/public','digest'=>$data['digest'],
            'productionReady'=>false,'opcacheResetPerformed'=>false];
    }
}
