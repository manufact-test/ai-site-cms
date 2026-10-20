<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/PhoneAdapter.php';

// MUST be run against a disposable external Composer installation, not a protocol double.
// No skip-as-success: missing vendor, missing mbstring, wrong version => nonzero failure.
$repoRoot = realpath(dirname(__DIR__, 4));
$autoloadEnv = getenv('LAB_PHONE_AUTOLOAD');
$autoload = is_string($autoloadEnv) && str_starts_with($autoloadEnv, DIRECTORY_SEPARATOR)
    ? realpath($autoloadEnv) : false;
if (!$autoload || !is_file($autoload) || ($repoRoot && str_starts_with($autoload, $repoRoot . DIRECTORY_SEPARATOR))) {
    fwrite(STDERR, "PHONE_REAL_NOT_EXECUTED: require external absolute LAB_PHONE_AUTOLOAD path\n");
    exit(2);
}
if (!extension_loaded('mbstring')) {
    fwrite(STDERR, "PHONE_REAL_NOT_EXECUTED: upstream requires PHP mbstring extension\n");
    exit(2);
}
require_once $autoload;
$expected='9.0.41';
if (!class_exists('Composer\InstalledVersions') || !\Composer\InstalledVersions::isInstalled('giggsey/libphonenumber-for-php-lite')
    || \Composer\InstalledVersions::isInstalled('giggsey/libphonenumber-for-php')
    || ltrim((string)\Composer\InstalledVersions::getPrettyVersion('giggsey/libphonenumber-for-php-lite'), 'v') !== $expected
    || !\Composer\InstalledVersions::isInstalled('symfony/polyfill-mbstring')
    || ltrim((string)\Composer\InstalledVersions::getPrettyVersion('symfony/polyfill-mbstring'), 'v') !== '1.38.2'
    || !PhoneAdapter::available()) {
    fwrite(STDERR,"PHONE_REAL_VERSION_OR_PROVIDER_MISMATCH: expected lite $expected + Symfony polyfill v1.38.2 only\n");
    exit(2);
}
$n=0;
$cases = [
    ['+1 202-555-0123','US','+12025550123'],
    ['2025550123','US','+12025550123'],
    ['+49 151 23456789','DE','+4915123456789'],
    ['+49 151 23456789','PL',null],
    ['+33 6 12 34 56 78','FR','+33612345678'],
    ['2025550123','ZZ',null],
    ['+1 202 555 0123 ext 99','US',null],
    ['+123','ZZ',null],
    ['javascript:alert(1)','ZZ',null],
    ['Call +1 202 555 0123','US',null],
    ['+1+2025550123','US',null],
    ['tel:+12025550123','US',null],
    ['+1 202 555 0123 ext. 4','US',null],
];
foreach ($cases as [$input,$region,$wanted]) {
    $n++;
    $actual=PhoneAdapter::normalize($input,$region);
    if ($actual !== $wanted) {
        fwrite(STDERR, "PHONE_REAL_MISMATCH case $n region $region: expected " . var_export($wanted,true)
            . ', got ' . var_export($actual,true) . "\n");
        exit(1);
    }
}
echo "PHONE_REAL_INTEGRATION_PASSED: $n genuine metadata assertions; lite $expected (not carrier reachability)\n";
