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
    private const PLAIN_ANCHOR = "ai-site-cms-php-lease-v1\n";
    private const SEALED_ANCHOR = "ai-site-cms-php-signed-v1\n";
    private string $root;
    private bool $locked = false;
    /** @var array<string,mixed>|null Permit-bound scoped writer, never persisted. */
    private ?array $signedWriteGrant = null;

    private function __construct(string $root)
    {
        $this->root = $root;
        $this->assertRoot();
    }

    private static function requireCI(bool $readOnly = false): void
    {
        $readOnlyHttp = $readOnly && PHP_SAPI === 'cli-server'
            && getenv('CMS_PHP_LAB_HTTP_ONLY') === '1';
        if (!(PHP_SAPI === 'cli' || $readOnlyHttp) || getenv('CI') !== 'true'
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
        $lab->createLeaseAnchor();
        return $lab;
    }

    /**
     * New CI switch roots can opt into a fail-closed signed-only mutation mode.
     * Existing unsealed switch fixtures are deliberately left intact.
     */
    public static function createSealed(string $siteId, string $operatorPin, string $publisherPin): self
    {
        self::requireCI();
        if (!preg_match('/^[a-zA-Z0-9_-]{1,80}$/D', $siteId)) {
            throw new RuntimeException('Invalid site identity in sealed switcher');
        }
        foreach ([$operatorPin,$publisherPin] as $pin) {
            if (!preg_match('/^[a-f0-9]{64}$/D', $pin)) {
                throw new RuntimeException('Sealed release roots require two independent SHA-256 signer pins');
            }
        }
        if (hash_equals($operatorPin,$publisherPin)) {
            throw new RuntimeException('Release publisher and operator identities must be independent');
        }
        $tmp = realpath(sys_get_temp_dir());
        if ($tmp === false) throw new RuntimeException('No OS temp directory');
        $root = $tmp . '/' . self::PREFIX . bin2hex(random_bytes(16));
        if (!mkdir($root, 0700)) throw new RuntimeException('Cannot create signed-only switch lab');
        $lab = new self($root);
        $lab->writeFresh('releases.json', ['format'=>self::FORMAT,'releases'=>[]]);
        $lab->writeFresh('signed-only.json', [
            'format'=>'ai-site-cms-stage2-signed-switch-v1',
            'siteId'=>$siteId,'operatorFingerprint'=>$operatorPin,'publisherFingerprint'=>$publisherPin,
            'productionReady'=>false
        ]);
        // Independent identity also encoded in the permanent lease anchor:
        // deleting signed-only.json cannot silently downgrade the root.
        $lab->createLeaseAnchor(true);
        $lab->inspect();
        return $lab;
    }

    public static function reopen(string $root): self
    {
        $lab = new self($root);
        $lab->inspect();
        return $lab;
    }

    /**
     * Operator-only reentry when a SIGKILL left the mkdir lock behind.
     * Does NOT automatically clear, recover, activate or serve anything.
     */
    public static function reopenForStaleLockReview(string $root): self
    {
        self::requireCI();
        return new self($root);
    }

    public function root(): string { return $this->root; }

    private function assertRoot(): void
    {
        self::requireCI(true);
        $temp = realpath(sys_get_temp_dir());
        if ($temp === false || dirname($this->root) !== $temp
            || !preg_match('/^'.preg_quote(self::PREFIX, '/').'[0-9a-f]{32}$/D', basename($this->root))
            || is_link($this->root) || !is_dir($this->root)
            || realpath($this->root) !== $this->root) {
            throw new RuntimeException('Refusing to switch outside new temporary sandbox');
        }
    }

    private function file(string $name): string { return $this->root . '/' . $name; }

    /** @return array<string,mixed>|null */
    private function sealedConfig(): ?array
    {
        $config = $this->json('signed-only.json');
        if ($config !== null) {
            self::exact($config, [
                'format','siteId','operatorFingerprint','publisherFingerprint','productionReady'
            ]);
            if ($config['format'] !== 'ai-site-cms-stage2-signed-switch-v1'
                || !is_string($config['siteId'])
                || !preg_match('/^[a-zA-Z0-9_-]{1,80}$/D', $config['siteId'])
                || $config['productionReady'] !== false
                || !is_string($config['operatorFingerprint'])
                || !is_string($config['publisherFingerprint'])
                || !preg_match('/^[a-f0-9]{64}$/D', $config['operatorFingerprint'])
                || !preg_match('/^[a-f0-9]{64}$/D', $config['publisherFingerprint'])
                || hash_equals($config['operatorFingerprint'], $config['publisherFingerprint'])) {
                throw new RuntimeException('Untrusted sealed release root configuration');
            }
        }
        return $config;
    }

    /**
     * The only mutation scope allowed for opt-in signed-only lab switch roots.
     * The signed permit MUST bind the root's separately pinned signer identities,
     * target, CAS sequence, old version and package digest.
     *
     * A public callback cannot gain broader raw mutation authority: register and
     * switchTo recheck all permitted fields before writing under their locks.
     *
     * @template T
     * @param callable(array<string,mixed>):T $action
     * @return T
     */
    public function withSignedPermitMutation(
        string $pendingDir, string $operatorPem, string $operatorPin,
        string $permitHead, ?string $previousReceiptHead,
        string $siteId, string $publisherPin, callable $action
    ): mixed {
        self::requireCI();
        $this->assertRoot();
        $seal = $this->sealedConfig();
        if ($seal === null
            || $seal['siteId'] !== $siteId
            || !hash_equals($seal['operatorFingerprint'], $operatorPin)
            || !hash_equals($seal['publisherFingerprint'], $publisherPin)
            || $this->signedWriteGrant !== null) {
            throw new RuntimeException('Signed-only generation requires its sealed signer pins');
        }
        require_once __DIR__.'/LabPreauthorizedUpgradeGate.php';
        $approval = LabPreauthorizedUpgradeGate::verifyPermit(
            $pendingDir, $operatorPem, $operatorPin, $permitHead,
            $previousReceiptHead, $siteId, $publisherPin
        );
        if (!hash_equals($approval['switchRootSha256'], hash('sha256', $this->root))) {
            throw new RuntimeException('Signed operator permit was issued for another isolated generation root');
        }
        $this->signedWriteGrant = [
            'version'=>$approval['version'],'fromVersion'=>$approval['fromVersion'],
            'sequence'=>$approval['sequence'],'digest'=>$approval['manifestSha256'],
            'floor'=>$approval['minimumVersion'],'registered'=>false,'switched'=>false
        ];
        try {
            $result = $action($approval);
            $again = LabPreauthorizedUpgradeGate::verifyPermit(
                $pendingDir,$operatorPem,$operatorPin,$permitHead,
                $previousReceiptHead,$siteId,$publisherPin
            );
            if ($again !== $approval || !$this->signedWriteGrant['switched']) {
                throw new RuntimeException('Signed operator permit changed or no authorized CAS switch occurred');
            }
            return $result;
        } finally {
            $this->signedWriteGrant = null;
        }
    }

    private function demandSignedRegistration(string $version, string $digest): void
    {
        if ($this->sealedConfig() === null) return;
        $grant = $this->signedWriteGrant;
        if ($grant === null || $grant['registered'] || $grant['switched']
            || $grant['version'] !== $version
            || !hash_equals($grant['digest'], $digest)) {
            throw new RuntimeException('Raw code registration forbidden on signed-only generation root');
        }
    }

    private function demandSignedSwitch(
        string $target, ?string $current, int $sequence, string $floor
    ): void {
        if ($this->sealedConfig() === null) return;
        $grant = $this->signedWriteGrant;
        if ($grant === null || !$grant['registered'] || $grant['switched']
            || $grant['version'] !== $target || $grant['fromVersion'] !== $current
            || $grant['sequence'] !== $sequence + 1
            || $grant['floor'] !== $floor) {
            throw new RuntimeException('Raw CAS switching forbidden on signed-only generation root');
        }
    }

    private function demandUnsealedRecovery(): void
    {
        if ($this->sealedConfig() !== null
            && (($this->signedWriteGrant['recovery'] ?? false) !== true)) {
            throw new RuntimeException('Sealed generation recovery requires independently signed interrupted intent');
        }
    }

    // Every cooperative reader and writer holds a stable local-filesystem inode.
    // Not a distributed lock and not a proof of PHP-FPM/OPcache compatibility.
    private function createLeaseAnchor(bool $sealed = false): void
    {
        $handle = @fopen($this->file('request-lease.lock'), 'x');
        if ($handle === false) throw new RuntimeException('Cannot create permanent lease anchor');
        try {
            $marker = $sealed ? self::SEALED_ANCHOR : self::PLAIN_ANCHOR;
            if (fwrite($handle, $marker) !== strlen($marker) || !fflush($handle)) {
                throw new RuntimeException('Incomplete lease anchor');
            }
            if (function_exists('fsync')) fsync($handle);
        } finally { fclose($handle); }
    }

    /** @return resource */
    private function acquireLease(int $kind)
    {
        $this->assertRoot();
        $file = $this->file('request-lease.lock');
        $marker = $this->sealedConfig() === null ? self::PLAIN_ANCHOR : self::SEALED_ANCHOR;
        $before = @lstat($file);
        if ($before === false || is_link($file) || !is_file($file)
            || ($before['nlink'] ?? 0) !== 1
            || ($before['size'] ?? 0) !== strlen($marker)) {
            throw new RuntimeException('Missing or replaced request lease anchor');
        }
        $handle = @fopen($file, 'rb');
        if ($handle === false) throw new RuntimeException('Cannot open request lease');
        $opened = fstat($handle);
        if ($opened === false || $opened['ino'] !== $before['ino']
            || $opened['dev'] !== $before['dev']
            || !hash_equals($marker, stream_get_contents($handle) ?: '')) {
            fclose($handle);
            throw new RuntimeException('Request lease anchor mutated');
        }
        if (!flock($handle, $kind | LOCK_NB)) {
            fclose($handle);
            throw new RuntimeException('Concurrent PHP request or activation holds generation lease');
        }
        $now = @lstat($file);
        if ($now === false || is_link($file) || $now['ino'] !== $opened['ino']
            || $now['dev'] !== $opened['dev'] || ($now['nlink'] ?? 0) !== 1) {
            flock($handle, LOCK_UN);
            fclose($handle);
            throw new RuntimeException('Request lease replaced during acquisition');
        }
        return $handle;
    }

    /** @param resource $handle */
    private static function releaseLease($handle): void
    {
        flock($handle, LOCK_UN);
        fclose($handle);
    }

    /**
     * The shared lease is retained until the handler returns or throws.
     * CLI-only rehearsal, not an installed web endpoint.
     *
     * @template T
     * @param callable(array<string,mixed>):T $handler
     * @return T
     */
    public function withRequestLease(string $externalMinVersion, callable $handler): mixed
    {
        $lease = $this->acquireLease(LOCK_SH);
        try {
            return $handler($this->resolve($externalMinVersion));
        } finally {
            self::releaseLease($lease);
        }
    }

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
        $leaseMarker = $this->sealedConfig() === null ? self::PLAIN_ANCHOR : self::SEALED_ANCHOR;
        $leaseStat = @lstat($this->file('request-lease.lock'));
        if ($leaseStat === false || is_link($this->file('request-lease.lock'))
            || !is_file($this->file('request-lease.lock'))
            || ($leaseStat['size'] ?? 0) !== strlen($leaseMarker) || ($leaseStat['nlink'] ?? 0) !== 1
            || !hash_equals($leaseMarker, @file_get_contents($this->file('request-lease.lock')) ?: '')) {
            throw new RuntimeException('Missing or unsafe request lease anchor');
        }
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
                  'active-receipt.json','switch-exclusive.lock','request-lease.lock','signed-only.json'];
        foreach (scandir($this->root) ?: [] as $name) {
            if (!in_array($name, $allow, true)) {
                throw new RuntimeException('Foreign switch sandbox file');
            }
        }
        $this->sealedConfig();
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
        self::requireCI(); // Never allow HTTP-driven registration, recovery or activation.
        $this->assertRoot();
        $lease = $this->acquireLease(LOCK_EX);
        try {
            $lock = $this->file('switch-exclusive.lock');
            if (!@mkdir($lock, 0700)) throw new RuntimeException('Concurrent/stale switch lock');
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
        } finally {
            self::releaseLease($lease);
        }
    }

    public function register(string $installedLabRoot, string $expectedDigest, string $expectedVersion): array
    {
        $this->demandSignedRegistration($expectedVersion, $expectedDigest);
        $result = $this->exclusive(function () use ($installedLabRoot,$expectedDigest,$expectedVersion): array {
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
        if ($this->signedWriteGrant !== null) $this->signedWriteGrant['registered'] = true;
        return $result;
    }

    public function switchTo(
        string $target, ?string $expectedCurrent, int $expectedSequence,
        string $externalMinVersion, ?string $failAt = null
    ): array {
        $this->demandSignedSwitch($target,$expectedCurrent,$expectedSequence,$externalMinVersion);
        $result = $this->exclusive(function () use ($target,$expectedCurrent,$expectedSequence,$externalMinVersion,$failAt): array {
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
            // SIGKILL test: the supervising CI process must terminate this CLI
            // operator after it observes the durable journal on disk.
            if ($failAt === 'pause-after-intent') usleep(15000000);
            $pointer = ['format'=>self::FORMAT,'current'=>$target,'previous'=>$expectedCurrent,
                'sequence'=>$expectedSequence+1,'kind'=>$kind];
            $this->writeAtomic('active.json', $pointer);
            if ($failAt === 'after-pointer') throw new RuntimeException('Injected failure after pointer');
            if ($failAt === 'pause-after-pointer') usleep(15000000);
            $this->writeAtomic('active-receipt.json', ['format'=>self::FORMAT,
                'sequence'=>$pointer['sequence'],'pointerSha256'=>self::pointerHash($pointer)]);
            if ($failAt === 'after-receipt') throw new RuntimeException('Injected failure after receipt');
            if ($failAt === 'pause-after-receipt') usleep(15000000);
            unlink($this->file('switch-intent.json'));
            return $this->inspect($externalMinVersion);
        });
        if ($this->signedWriteGrant !== null) $this->signedWriteGrant['switched'] = true;
        return $result;
    }

    /**
     * CI-only coordinated activation. Migration mutex is acquired BEFORE the
     * code switch lock, and the actual site/schema check runs under that mutex.
     * Code generation and DB identity must be on the same intentionally
     * isolated test installation. This does not enable production deploy.
     */
    public function switchToWithSchema(
        \PDO $pdo, string $siteId, string $target, ?string $expectedCurrent,
        int $expectedSequence, string $externalMinVersion, ?string $failAt = null
    ): array {
        require_once __DIR__ . '/LabSchemaVersionGate.php';
        return LabSchemaVersionGate::withMigrationFence(
            $pdo, $siteId, $target,
            fn (): array => $this->switchTo(
                $target, $expectedCurrent, $expectedSequence, $externalMinVersion, $failAt
            )
        );
    }

    /**
     * Manual repair of a stale process-killed mkdir lock. The kernel-level
     * lease MUST be freely and exclusively acquirable: never steal from a live
     * request/operator. Independently verify expected journal and CAS state.
     * Cannot repair hostile temporary state or silently finalize a switch.
     */
    public function releaseStaleOperatorLock(
        ?string $expectedCurrent, int $expectedSequence,
        string $expectedStatus, string $externalMinVersion
    ): array {
        self::requireCI(); // A public HTTP request cannot remove any operator lock.
        $this->demandUnsealedRecovery();
        $this->assertRoot();
        if (!in_array($expectedStatus, [
            'pending-before-switch','pending-after-switch','committed-needs-cleanup'
        ], true)) {
            throw new RuntimeException('Explicit pending journal status needed for lock repair');
        }
        $lease = $this->acquireLease(LOCK_EX);
        try {
            $lock = $this->file('switch-exclusive.lock');
            $stat = @lstat($lock);
            if ($stat === false || is_link($lock) || !is_dir($lock)
                || count(scandir($lock) ?: []) !== 2) {
                throw new RuntimeException('Unsafe or missing crashed operator lock');
            }
            $this->locked = true;
            try {
                $state = $this->inspect($externalMinVersion);
                if ($state['status'] !== $expectedStatus
                    || $state['current'] !== $expectedCurrent
                    || $state['sequence'] !== $expectedSequence) {
                    throw new RuntimeException('Operator lock recovery CAS mismatch');
                }
            } finally {
                $this->locked = false;
            }
            $fresh = @lstat($lock);
            if ($fresh === false || is_link($lock) || !is_dir($lock)
                || $fresh['ino'] !== $stat['ino'] || $fresh['dev'] !== $stat['dev']
                || count(scandir($lock) ?: []) !== 2 || !rmdir($lock)) {
                throw new RuntimeException('Stale operator lock changed during recovery');
            }
            return $this->inspect($externalMinVersion);
        } finally {
            self::releaseLease($lease);
        }
    }


    /**
     * Re-enter an actual SIGKILL journal only under the original pinned
     * operator permit, publisher-signed archive, previous receipt head and
     * independent foundation DB checkpoint. CI-only, not power-cut proof.
     * The pending operator permit is NEVER cleared automatically.
     */
    public function recoverWithSignedPermit(
        \PDO $pdo, string $siteId, string $receiptDir, string $pending,
        string $operatorPem, string $operatorPin, string $permitHead,
        ?string $previousReceiptHead, string $bundle, string $extracted,
        string $publisherPem, string $publisherPin, string $expectedStatus,
        string $mode
    ): array {
        self::requireCI();
        $seal = $this->sealedConfig();
        if ($seal === null || $seal['siteId'] !== $siteId
            || !hash_equals($seal['operatorFingerprint'], $operatorPin)
            || !hash_equals($seal['publisherFingerprint'], $publisherPin)
            || $this->signedWriteGrant !== null) {
            throw new RuntimeException('Refusing recovery outside pinned signed-only switch root');
        }
        $directions = [
            'pending-before-switch'=>'abort',
            'pending-after-switch'=>'finalize',
            'committed-needs-cleanup'=>'finalize'
        ];
        if (($directions[$expectedStatus] ?? null) !== $mode) {
            throw new RuntimeException('Signed recovery direction conflicts with commit boundary');
        }
        require_once __DIR__.'/LabPreauthorizedUpgradeGate.php';
        require_once __DIR__.'/LabAttestedActivationGate.php';
        require_once __DIR__.'/LabTrustedUpgradeCoordinator.php';
        require_once __DIR__.'/LabSchemaVersionGate.php';
        $p = LabPreauthorizedUpgradeGate::verifyPermit(
            $pending,$operatorPem,$operatorPin,$permitHead,
            $previousReceiptHead,$siteId,$publisherPin
        );
        if (!hash_equals($p['switchRootSha256'], hash('sha256',$this->root))) {
            throw new RuntimeException('Signed recovery permit belongs to another switcher');
        }
        if ($p['sequence'] > 1) {
            $chain = LabAttestedActivationGate::verifyChain(
                $receiptDir,$operatorPem,$operatorPin,$previousReceiptHead,$siteId,$publisherPin
            );
            if ($chain['count'] !== $p['sequence'] - 1
                || $chain['receipt']['version'] !== $p['fromVersion']) {
                throw new RuntimeException('Wrong independent predecessor activation');
            }
        } else {
            $entries = @scandir($receiptDir);
            if ($entries === false || array_values(array_diff($entries, ['.','..'])) !== []) {
                throw new RuntimeException('Genesis signed recovery cannot skip older receipts');
            }
        }
        $preflight = LabTrustedUpgradeCoordinator::preflight(
            $pdo,$siteId,$bundle,$extracted,$publisherPem,$publisherPin,
            $p['version'],$p['minimumVersion'],$p['dbCheckpoint']
        );
        if (!hash_equals($p['manifestSha256'], $preflight['manifestSha256'])
            || !hash_equals($p['archiveSha256'], $preflight['archiveSha256'])) {
            throw new RuntimeException('Signed recovery original publisher archive changed');
        }
        return LabSchemaVersionGate::withCheckpointFence(
            $pdo,$siteId,$p['version'],$p['dbCheckpoint'],
            function () use (
                $p,$siteId,$pending,$operatorPem,$operatorPin,$permitHead,
                $previousReceiptHead,$publisherPin,$expectedStatus,$mode
            ): array {
                $again = LabPreauthorizedUpgradeGate::verifyPermit(
                    $pending,$operatorPem,$operatorPin,$permitHead,
                    $previousReceiptHead,$siteId,$publisherPin
                );
                if ($again !== $p) {
                    throw new RuntimeException('Operator permit changed after DB fence');
                }
                $j = $this->json('switch-intent.json',true);
                if ($j['format'] !== self::FORMAT || $j['kind'] !== 'upgrade'
                    || $j['to'] !== $p['version'] || $j['from'] !== $p['fromVersion']
                    || $j['targetSequence'] !== $p['sequence']
                    || $j['sequence'] !== $p['sequence']-1
                    || !hash_equals($j['digest'], $p['manifestSha256'])) {
                    throw new RuntimeException('Killed journal not bound to original signed permit');
                }
                $before = $expectedStatus === 'pending-before-switch';
                $current = $before ? $p['fromVersion'] : $p['version'];
                $sequence = $before ? $p['sequence']-1 : $p['sequence'];
                $this->signedWriteGrant = ['recovery'=>true];
                try {
                    $unlocked = $this->releaseStaleOperatorLock(
                        $current,$sequence,$expectedStatus,$p['minimumVersion']
                    );
                    if ($unlocked['status'] !== $expectedStatus) {
                        throw new RuntimeException('Operator journal changed during stale lock release');
                    }
                    $done = $this->recover($mode,$p['minimumVersion']);
                    if ($done['status'] !== 'clean' || $done['current'] !== $current
                        || $done['sequence'] !== $sequence) {
                        throw new RuntimeException('Signed recovery produced unexpected pointer');
                    }
                    if (!$before) {
                        $resolved = $this->resolve($p['minimumVersion']);
                        if (!hash_equals($resolved['digest'], $p['manifestSha256'])) {
                            throw new RuntimeException('Recovered signed code digest changed');
                        }
                    }
                    LabPreauthorizedUpgradeGate::verifyPermit(
                        $pending,$operatorPem,$operatorPin,$permitHead,
                        $previousReceiptHead,$siteId,$publisherPin
                    );
                    return [
                        'status'=>$done['status'],'version'=>$done['current'],
                        'sequence'=>$done['sequence'],'mode'=>$mode,
                        'interruptedStatus'=>$expectedStatus,
                        'receiptRequired'=>!$before,
                        'permitStillPending'=>true,'productionReady'=>false
                    ];
                } finally {
                    $this->signedWriteGrant = null;
                }
            }
        );
    }

    /**
     * Stronger read-only lab contract: refuse a code swap if the separately
     * retained foundation checkpoint is stale, including storage_generation.
     * Does not migrate or roll back DB content. No production release support.
     */
    public function switchToWithCheckpoint(
        \PDO $pdo, string $siteId, string $target, ?string $expectedCurrent,
        int $expectedSequence, string $externalMinVersion,
        array $expectedCheckpoint, ?string $failAt = null
    ): array {
        require_once __DIR__.'/LabSchemaVersionGate.php';
        return LabSchemaVersionGate::withCheckpointFence(
            $pdo, $siteId, $target, $expectedCheckpoint,
            fn (): array => $this->switchTo(
                $target, $expectedCurrent, $expectedSequence, $externalMinVersion, $failAt
            )
        );
    }

    /**
     * A post-crash operator is not authorized to finish/abort a journal if
     * the database foundation has changed in the meantime. The same snapshot
     * must still match before manually recovering the pointer.
     */
    public function recoverWithCheckpoint(
        \PDO $pdo, string $siteId, string $targetCodeVersion,
        string $mode, string $externalMinVersion, array $expectedCheckpoint
    ): array {
        require_once __DIR__.'/LabSchemaVersionGate.php';
        return LabSchemaVersionGate::withCheckpointFence(
            $pdo, $siteId, $targetCodeVersion, $expectedCheckpoint,
            fn (): array => $this->recover($mode, $externalMinVersion)
        );
    }

    /**
     * CLI-only simulated request gate. Existing request lease remains in force
     * through the DB checkpoint and handler. The caller must supply the
     * independently retained expected DB fingerprint, not regenerate it here.
     *
     * @template T
     * @param callable(array<string,mixed>):T $handler
     * @return T
     */
    public function withRequestLeaseAndCheckpoint(
        \PDO $pdo, string $siteId, string $codeVersion,
        string $externalMinVersion, array $expectedCheckpoint, callable $handler
    ): mixed {
        require_once __DIR__.'/LabSchemaVersionGate.php';
        return LabSchemaVersionGate::withCheckpointFence(
            $pdo, $siteId, $codeVersion, $expectedCheckpoint,
            fn (): mixed => $this->withRequestLease(
                $externalMinVersion, static function (array $generation) use ($codeVersion,$handler): mixed {
                    if ($generation['version'] !== $codeVersion) {
                        throw new RuntimeException('DB checkpoint bound to different active code');
                    }
                    return $handler($generation);
                }
            )
        );
    }

    public function recover(string $mode, string $externalMinVersion): array
    {
        $this->demandUnsealedRecovery();
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
