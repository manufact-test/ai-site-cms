<?php
declare(strict_types=1);

require __DIR__ . '/../server/Api.php';

$method = new ReflectionMethod(\\Manufact\\Stage3\\Api::class, 'hostingOpenBasedirAllows');
$method->setAccessible(true);
$stage3Root = realpath(dirname(__DIR__));
$testsRoot = realpath(__DIR__);
$serverRoot = realpath(__DIR__ . '/../server');

if (!is_string($stage3Root) || !is_string($testsRoot) || !is_string($serverRoot)) {
    fwrite(STDERR, "Hosting diagnostics test paths are unavailable\n");
    exit(1);
}

$checks = [
    'empty open_basedir means no additional PHP path restriction' =>
        $method->invoke(null, $testsRoot, '') === true,
    'a parent directory allows its child runtime path' =>
        $method->invoke(null, $testsRoot, $stage3Root) === true,
    'multiple allowed roots are evaluated independently' =>
        $method->invoke(null, $testsRoot, $serverRoot . PATH_SEPARATOR . $stage3Root) === true,
    'a sibling directory does not authorize the runtime path' =>
        $method->invoke(null, $testsRoot, $serverRoot) === false
];

foreach ($checks as $name => $passed) {
    if (!$passed) {
        fwrite(STDERR, "FAIL: " . $name . PHP_EOL);
        exit(1);
    }
}

echo json_encode(['ok' => true, 'checks' => array_keys($checks)], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
