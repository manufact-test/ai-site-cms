<?php
declare(strict_types=1);

// Private CLI-only bridge for a manually reviewed two-step hPanel Cron install.
// Credentials are read from a 0600 file outside all web roots, never from argv.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit(1);
}

function stage3_runner_fail(string $message): never
{
    fwrite(STDERR, "Stage3 hosted installer runner refused: " . $message . PHP_EOL);
    exit(1);
}
function stage3_runner_within(string $path, string $parent): bool
{
    $parent = rtrim($parent, DIRECTORY_SEPARATOR);
    return $path === $parent || str_starts_with($path, $parent . DIRECTORY_SEPARATOR);
}
function stage3_runner_validate_web_roots(array $roots, string $runtimeRoot, string $publicRoot, string $privateDir): array
{
    if (!array_is_list($roots) || count($roots) < 1 || count($roots) > 50) {
        throw new RuntimeException('Supply the complete account web-root inventory (1–50 canonical directories)');
    }
    $seen = [];
    foreach ($roots as $root) {
        if (!is_string($root) || $root === '' || $root[0] !== DIRECTORY_SEPARATOR
            || realpath($root) !== $root || !is_dir($root) || is_link($root) || isset($seen[$root])) {
            throw new RuntimeException('Account web-root inventory contains a non-canonical, missing or duplicate directory');
        }
        $seen[$root] = true;
        if (stage3_runner_within($privateDir, $root) || stage3_runner_within($root, $privateDir)) {
            throw new RuntimeException('Private CMS storage overlaps an account web root');
        }
        if ($root !== $publicRoot
            && (stage3_runner_within($runtimeRoot, $root) || stage3_runner_within($root, $runtimeRoot))) {
            throw new RuntimeException('CMS runtime tree overlaps another account web root');
        }
    }
    if (!isset($seen[$publicRoot])) {
        throw new RuntimeException('The dedicated Stage3 public document root must appear in the account web-root inventory');
    }
    return [
        'ok' => true,
        'webRootCount' => count($roots),
        'publicRootIncluded' => true,
        'privateOutsideAllWebRoots' => true,
        'runtimeOutsideOtherWebRoots' => true,
        'inventorySha256' => hash('sha256', stage3_runner_json(array_values($roots)))
    ];
}
function stage3_runner_json(mixed $value): string
{
    return json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;
}
function stage3_runner_read(string $path, string $privateDir, int $limit): array
{
    $stat = @lstat($path);
    $mode = is_file($path) ? @fileperms($path) : false;
    $owner = is_file($path) ? @fileowner($path) : false;
    $directoryOwner = @fileowner($privateDir);
    if ($stat === false || !is_file($path) || is_link($path) || realpath($path) !== $path
        || dirname($path) !== $privateDir || ($stat['nlink'] ?? 0) !== 1
        || $stat['size'] < 1 || $stat['size'] > $limit
        || $mode === false || ($mode & 0777) !== 0600
        || $owner === false || $directoryOwner === false || $owner !== $directoryOwner) {
        throw new RuntimeException('Unsafe private runner file or permissions');
    }
    $raw = @file_get_contents($path);
    if (!is_string($raw) || strlen($raw) !== $stat['size']) {
        throw new RuntimeException('Unable to read private runner file');
    }
    try {
        $document = json_decode($raw, true, 24, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new RuntimeException('Private runner JSON is malformed', 0, $error);
    }
    if (!is_array($document) || !hash_equals(stage3_runner_json($document), $raw)) {
        throw new RuntimeException('Private runner JSON is not canonical');
    }
    return $document;
}
function stage3_runner_write(string $path, string $privateDir, array $document): void
{
    if (dirname($path) !== $privateDir || file_exists($path) || is_link($path)) {
        throw new RuntimeException('Refusing to overwrite private runner state');
    }
    $handle = @fopen($path, 'x');
    if ($handle === false) {
        throw new RuntimeException('Unable to create private runner state');
    }
    $raw = stage3_runner_json($document);
    try {
        if (!chmod($path, 0600) || fwrite($handle, $raw) !== strlen($raw) || !fflush($handle)) {
            throw new RuntimeException('Unable to secure and persist private runner state');
        }
        if (function_exists('fsync')) {
            fsync($handle);
        }
    } catch (Throwable $error) {
        fclose($handle);
        if (is_file($path) && !is_link($path)) {
            unlink($path);
        }
        throw $error;
    }
    fclose($handle);
}
function stage3_runner_remove(string $path, string $privateDir): bool
{
    if (!file_exists($path) && !is_link($path)) {
        return true;
    }
    stage3_runner_read($path, $privateDir, 32768);
    return @unlink($path);
}
function stage3_runner_emit(array $document): void
{
    echo stage3_runner_json($document);
}

$values = [];
try {
    if ($argc !== 3 || !str_starts_with($argv[1] ?? '', '--config=')) {
        throw new RuntimeException('Usage: php hosted-install-runner.php --config=/private/path/hosted-install-runner.json --plan OR --apply=<approval-fingerprint>');
    }
    $requestedConfigPath = substr($argv[1], strlen('--config='));
    $action = $argv[2] ?? '';
    if ($requestedConfigPath === '' || $requestedConfigPath[0] !== DIRECTORY_SEPARATOR
        || !preg_match('/^--(?:plan|apply=[a-f0-9]{64})$/D', $action)) {
        throw new RuntimeException('Invalid private config path or action');
    }
    $privateDir = realpath(dirname($requestedConfigPath));
    if (!is_string($privateDir) || dirname($requestedConfigPath) !== $privateDir || !is_dir($privateDir)
        || is_link(dirname($requestedConfigPath))) {
        throw new RuntimeException('Private runner directory must be canonical');
    }
    $directoryMode = @fileperms($privateDir);
    if ($directoryMode === false || ($directoryMode & 0777) !== 0700) {
        throw new RuntimeException('Private runner directory must have exact 0700 permissions');
    }

    $configPath = $privateDir . DIRECTORY_SEPARATOR . 'hosted-install-runner.json';
    if ($requestedConfigPath !== $configPath) {
        throw new RuntimeException('Config must be hosted-install-runner.json inside the private directory');
    }
    $consumedPath = $privateDir . DIRECTORY_SEPARATOR . 'hosted-install-runner-consumed.json';
    $reviewPath = $privateDir . DIRECTORY_SEPARATOR . 'hosted-install-plan-review.json';
    $statePath = $privateDir . DIRECTORY_SEPARATOR . 'hosted-install-plan-state.json';
    $applyingPath = $privateDir . DIRECTORY_SEPARATOR . 'hosted-install-runner-applying.json';
    $topologyPath = $privateDir . DIRECTORY_SEPARATOR . 'hosted-install-topology.json';

    if (file_exists($consumedPath) || is_link($consumedPath)) {
        $consumed = stage3_runner_read($consumedPath, $privateDir, 8192);
        if (($consumed['format'] ?? null) !== 'manufact-stage3-hosted-install-consumed-v1') {
            throw new RuntimeException('One-shot consumed marker is invalid; manual review required');
        }
        // A recurring hPanel cron entry becomes a harmless no-op after success.
        // The owner should still remove that cron entry from hPanel after the run.
        exit(0);
    }
    if (file_exists($applyingPath) || is_link($applyingPath)) {
        throw new RuntimeException('A previous apply attempt is unresolved; inspect the database before manual recovery');
    }

    $config = stage3_runner_read($configPath, $privateDir, 16384);
    if (array_keys($config) !== ['format', 'accountWebRoots', 'values']
        || ($config['format'] ?? null) !== 'manufact-stage3-hosted-install-runner-config-v1'
        || !is_array($config['values'] ?? null) || !is_array($config['accountWebRoots'] ?? null)) {
        throw new RuntimeException('Private runner config format is invalid');
    }
    $keys = [
        'STAGE3_DSN','STAGE3_DB_USER','STAGE3_DB_PASSWORD','STAGE3_OWNER_USER',
        'STAGE3_OWNER_PASSWORD','STAGE3_FORM_SECRET','STAGE3_FORM_ORIGINS',
        'STAGE3_FORM_ENDPOINT','STAGE3_PRIVATE_DIR','STAGE3_PUBLIC_ROOT'
    ];
    $limits = [
        'STAGE3_DSN'=>2048,'STAGE3_DB_USER'=>256,'STAGE3_DB_PASSWORD'=>4096,
        'STAGE3_OWNER_USER'=>40,'STAGE3_OWNER_PASSWORD'=>1024,'STAGE3_FORM_SECRET'=>1024,
        'STAGE3_FORM_ORIGINS'=>4096,'STAGE3_FORM_ENDPOINT'=>2048,
        'STAGE3_PRIVATE_DIR'=>4096,'STAGE3_PUBLIC_ROOT'=>4096
    ];
    $values = $config['values'];
    $accountWebRoots = $config['accountWebRoots'];
    if (array_keys($values) !== $keys) {
        throw new RuntimeException('Private runner config fields are incomplete or non-canonical');
    }
    foreach ($keys as $key) {
        if (!is_string($values[$key]) || strlen($values[$key]) > $limits[$key]
            || str_contains($values[$key], "\0") || str_contains($values[$key], "\r")
            || str_contains($values[$key], "\n")) {
            throw new RuntimeException('Private runner config contains an invalid value');
        }
    }

    require_once __DIR__ . '/Stage3Installer.php';
    $configuredPrivate = realpath($values['STAGE3_PRIVATE_DIR']);
    $publicRoot = realpath($values['STAGE3_PUBLIC_ROOT']);
    $serverRoot = realpath(dirname(__DIR__));
    $runtimeRoot = is_string($serverRoot) ? realpath(dirname($serverRoot)) : false;
    $publicLayout = is_string($serverRoot) && is_string($publicRoot)
        ? \Manufact\Stage3\Stage3Installer::inspectPublicRootLayout($serverRoot, $publicRoot)
        : ['ok' => false, 'mode' => null, 'clean' => false, 'permissionsOk' => false, 'entries' => []];
    if (!is_string($configuredPrivate) || $configuredPrivate !== $privateDir
        || !is_string($publicRoot) || $publicRoot !== $values['STAGE3_PUBLIC_ROOT']
        || !is_string($serverRoot) || !is_string($runtimeRoot)
        || ($publicLayout['ok'] ?? false) !== true
        || ($publicLayout['clean'] ?? false) !== true
        || ($publicLayout['permissionsOk'] ?? false) !== true
        || !is_dir($publicRoot) || is_link($values['STAGE3_PUBLIC_ROOT'])
        || stage3_runner_within($privateDir, $publicRoot) || stage3_runner_within($publicRoot, $privateDir)
        || stage3_runner_within($privateDir, $runtimeRoot) || stage3_runner_within($runtimeRoot, $privateDir)
        || stage3_runner_within($configPath, $publicRoot) || stage3_runner_within($configPath, $runtimeRoot)) {
        throw new RuntimeException('Private runner config and CMS document root are not safely isolated');
    }
    $hostIsolation = stage3_runner_validate_web_roots($accountWebRoots, $runtimeRoot, $publicRoot, $privateDir);
    if (file_exists($topologyPath) || is_link($topologyPath)) {
        throw new RuntimeException('A previous hosted topology record exists; manual recovery is required');
    }
    if (!str_starts_with($values['STAGE3_DSN'], 'mysql:')
        || $values['STAGE3_DB_USER'] === '' || $values['STAGE3_DB_PASSWORD'] === ''
        || $values['STAGE3_OWNER_USER'] === '' || strlen($values['STAGE3_OWNER_PASSWORD']) < 14
        || strlen($values['STAGE3_FORM_SECRET']) < 32) {
        throw new RuntimeException('Hosted runner requires dedicated MySQL, a database password and complete private credentials');
    }

    foreach ($values as $key => $value) {
        putenv($key . '=' . $value);
        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }
    putenv('CI=');
    putenv('STAGE3_ALLOW_SQLITE_INSTALL=');
    require dirname(__DIR__) . '/bootstrap.php';
    require_once __DIR__ . '/Stage3Installer.php';

    $env = $values + ['CI'=>'','STAGE3_ALLOW_SQLITE_INSTALL'=>''];
    $db = new PDO($values['STAGE3_DSN'], $values['STAGE3_DB_USER'], $values['STAGE3_DB_PASSWORD'], [
        PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC
    ]);

    if ($action === '--plan') {
        foreach ([$reviewPath,$statePath] as $pending) {
            if (file_exists($pending) || is_link($pending)) {
                throw new RuntimeException('A previous plan exists; inspect and remove its private review/state files before planning again');
            }
        }
        $plan = \Manufact\Stage3\Stage3Installer::plan($db, $env);
        $plan['hostIsolation'] = $hostIsolation;
        $token = $plan['token'] ?? null;
        unset($plan['token']);
        if (($plan['state'] ?? null) !== 'install_required' || ($plan['applyAllowed'] ?? false) !== true) {
            stage3_runner_emit($plan);
            exit(($plan['state'] ?? '') === 'already_installed' ? 0 : 1);
        }
        if (!is_string($token) || preg_match('/^[a-f0-9]{64}$/D', $token) !== 1) {
            throw new RuntimeException('Installer did not return a valid private approval token');
        }
        $fingerprint = hash('sha256', stage3_runner_json($plan));
        $review = $plan;
        $review['approvalFingerprint'] = $fingerprint;
        $state = [
            'format'=>'manufact-stage3-hosted-install-plan-state-v1',
            'approvalFingerprint'=>$fingerprint,
            'token'=>$token,
            'createdAt'=>gmdate('Y-m-d\TH:i:s\Z')
        ];
        stage3_runner_write($reviewPath, $privateDir, $review);
        try {
            stage3_runner_write($statePath, $privateDir, $state);
        } catch (Throwable $error) {
            @unlink($reviewPath);
            throw $error;
        }
        $review['approvalRequired'] = 'Review every check, then run --apply=<approvalFingerprint> as a separate manually approved Cron Job.';
        stage3_runner_emit($review);
        exit(0);
    }

    if (preg_match('/^--apply=([a-f0-9]{64})$/D', $action, $match) !== 1) {
        throw new RuntimeException('Invalid apply action');
    }
    $approval = $match[1];
    if (!is_file($reviewPath) || !is_file($statePath) || is_link($reviewPath) || is_link($statePath)) {
        throw new RuntimeException('No pending private plan exists; run --plan first');
    }
    $review = stage3_runner_read($reviewPath, $privateDir, 32768);
    $state = stage3_runner_read($statePath, $privateDir, 8192);
    if (($state['format'] ?? null) !== 'manufact-stage3-hosted-install-plan-state-v1'
        || !is_string($state['token'] ?? null) || preg_match('/^[a-f0-9]{64}$/D', $state['token']) !== 1
        || !is_string($state['approvalFingerprint'] ?? null) || !hash_equals($state['approvalFingerprint'], $approval)
        || !is_string($review['approvalFingerprint'] ?? null) || !hash_equals($review['approvalFingerprint'], $approval)) {
        throw new RuntimeException('Approval fingerprint does not match the private pending plan');
    }
    $reviewFingerprint = $review['approvalFingerprint'];
    unset($review['approvalFingerprint']);
    if (!hash_equals($reviewFingerprint, hash('sha256', stage3_runner_json($review)))) {
        throw new RuntimeException('Private review plan has changed since it was approved');
    }

    $currentPlan = \Manufact\Stage3\Stage3Installer::plan($db, $env);
    $currentPlan['hostIsolation'] = $hostIsolation;
    $currentToken = $currentPlan['token'] ?? null;
    unset($currentPlan['token']);
    $currentFingerprint = hash('sha256', stage3_runner_json($currentPlan));
    if (($currentPlan['state'] ?? null) !== 'install_required'
        || ($currentPlan['applyAllowed'] ?? false) !== true
        || !is_string($currentToken) || !hash_equals($state['token'], $currentToken)
        || !hash_equals($approval, $currentFingerprint)) {
        throw new RuntimeException('Pending plan is stale or blocked; inspect the database and create a new reviewed plan');
    }

    stage3_runner_write($applyingPath, $privateDir, [
        'format'=>'manufact-stage3-hosted-install-applying-v1',
        'approvalFingerprint'=>$approval,
        'startedAt'=>gmdate('Y-m-d\TH:i:s\Z')
    ]);
    $result = \Manufact\Stage3\Stage3Installer::apply($db, stage3_repository(), $env, $state['token']);
    $instanceId = $result['instanceId'] ?? null;
    if (!is_string($instanceId) || preg_match('/^[a-f0-9]{32}$/D', $instanceId) !== 1) {
        throw new RuntimeException('Installed instance identity is invalid; manual recovery is required');
    }
    stage3_runner_write($topologyPath, $privateDir, [
        'format'=>'manufact-stage3-hosted-install-topology-v1',
        'serverRoot'=>$serverRoot,
        'publicRoot'=>$publicRoot,
        'privateDir'=>$privateDir,
        'accountWebRoots'=>array_values($accountWebRoots),
        'instanceId'=>$instanceId,
        'installedAt'=>gmdate('Y-m-d\\TH:i:s\\Z')
    ]);
    stage3_runner_write($consumedPath, $privateDir, [
        'format'=>'manufact-stage3-hosted-install-consumed-v1',
        'approvalFingerprint'=>$approval,
        'instanceId'=>$result['instanceId'] ?? null,
        'consumedAt'=>gmdate('Y-m-d\TH:i:s\Z')
    ]);

    $cleanupWarnings = [];
    foreach ([$statePath,$configPath,$applyingPath] as $path) {
        if (!stage3_runner_remove($path, $privateDir)) {
            $cleanupWarnings[] = basename($path) . ' could not be removed; keep staging protected and remove it manually';
        }
    }
    $result['approvalFingerprint'] = $approval;
    $result['runnerConfigRemoved'] = !file_exists($configPath);
    $result['cleanupWarnings'] = $cleanupWarnings;
    stage3_runner_emit($result);
    exit(0);
} catch (Throwable $error) {
    $message = $error->getMessage();
    foreach (['STAGE3_DSN','STAGE3_DB_PASSWORD','STAGE3_OWNER_PASSWORD','STAGE3_FORM_SECRET'] as $key) {
        $secret = $values[$key] ?? '';
        if (is_string($secret) && $secret !== '') {
            $message = str_replace($secret, '[redacted]', $message);
        }
    }
    stage3_runner_fail($message);
}
