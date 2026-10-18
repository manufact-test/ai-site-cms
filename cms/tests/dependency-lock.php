<?php
declare(strict_types=1);

// Stage2 supply-chain baseline: declared licenses and fixed release refs.
// Does NOT replace reviewing upstream LICENSE files, NOTICE or future SBOM.
$path = dirname(__DIR__).'/composer.lock';
$lock = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
$packages = $lock['packages'] ?? [];
if (!$packages || count($packages) !== 14) {
    throw new RuntimeException('Unexpected dependency set; review changes before allowing CI');
}
$expected = [
    'fig/http-message-util' => '1.1.5',
    'nikic/fast-route' => '1.3.1',
    'opis/json-schema' => '2.6.0',
    'opis/string' => '2.1.0',
    'opis/uri' => '1.1.0',
    'psr/container' => '2.0.2',
    'psr/http-factory' => '1.1.0',
    'psr/http-message' => '2.0',
    'psr/http-server-handler' => '1.0.2',
    'psr/http-server-middleware' => '1.0.2',
    'psr/log' => '3.0.2',
    'ralouphie/getallheaders' => '3.0.3',
    'slim/psr7' => '1.8.0',
    'slim/slim' => '4.15.3',
];
foreach ($packages as $package) {
    $name = $package['name'] ?? '';
    if (!isset($expected[$name]) || $expected[$name] !== ($package['version'] ?? '')) {
        throw new RuntimeException("Unexpected unreviewed pinned package $name");
    }
    $declared = $package['license'] ?? [];
    if (!$declared || array_diff($declared, ['MIT', 'BSD-3-Clause', 'Apache-2.0'])) {
        throw new RuntimeException("Unapproved declared license $name");
    }
    if (empty($package['source']['reference']) || empty($package['dist']['reference'])) {
        throw new RuntimeException("Missing source/distribution pin $name");
    }
    unset($expected[$name]);
}
if ($expected || ($lock['packages-dev'] ?? [])) {
    throw new RuntimeException('Missing expected or unexpected dev dependencies');
}
echo 'Stage2 fixed dependency baseline PASS: 14 packages, declared permissive licenses and source pins'.PHP_EOL;
