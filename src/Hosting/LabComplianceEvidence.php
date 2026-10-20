<?php
declare(strict_types=1);

namespace AiSiteCms\Hosting;

use RuntimeException;

/**
 * Offline Stage2 evidence reconciliation, NOT independent legal due diligence.
 * Call only AFTER PackageArtifactVerifier::verify() for the identical root:
 * that verifier covers file inventory, directory traversal and symlink safety.
 * Comparing three mutually consistent metadata sources still cannot establish
 * authenticity of an unsigned artifact or confer permission to distribute.
 */
final class LabComplianceEvidence
{
    private const LICENSES = ['MIT', 'BSD-3-Clause', 'Apache-2.0'];

    private static function readJson(string $path, int $limit): array
    {
        $stat = @lstat($path);
        if ($stat === false || is_link($path) || !is_file($path)
            || ($stat['nlink'] ?? 0) !== 1 || ($stat['size'] ?? 0) < 2
            || $stat['size'] > $limit || realpath($path) !== $path) {
            throw new RuntimeException('Unsafe Stage2 compliance input');
        }
        $bytes = @file_get_contents($path);
        if (!is_string($bytes) || strlen($bytes) !== $stat['size']) {
            throw new RuntimeException('Unreadable Stage2 compliance input');
        }
        $decoded = json_decode($bytes, true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($decoded) || array_is_list($decoded)) {
            throw new RuntimeException('Unexpected Stage2 compliance record');
        }
        return $decoded;
    }

    /**
     * Cross-check the ACTUAL bundled upstream Composer license, its SBOM
     * content digest and the literal notice copy. Metadata alone is not proof
     * of the license's legal sufficiency or of authentic upstream provenance.
     */
    private static function bundledComposerNotice(
        string $root, string $package, string $version,
        string $license, string $expectedSha256, string $notices
    ): void {
        if (!preg_match('/\\A[a-z0-9_.-]+\\/[a-z0-9_.-]+\\z/D', $package)) {
            throw new RuntimeException('Invalid installed Composer package name');
        }
        $dir = $root.'/vendor/'.$package;
        $names = @scandir($dir);
        if (!is_array($names)) {
            throw new RuntimeException('Missing installed Composer dependency');
        }
        $licenses = array_values(array_filter($names, static fn(string $name): bool =>
            (bool)preg_match('/\\A(?:LICENSE|LICENCE|COPYING)(?:\\.(?:md|txt|text))?\\z/iD', $name)));
        sort($licenses, SORT_STRING);
        if ($licenses === []) {
            throw new RuntimeException('Bundled upstream license missing');
        }
        $name = $licenses[0];
        $file = $dir.'/'.$name;
        $stat = @lstat($file);
        if ($stat === false || is_link($file) || !is_file($file)
            || ($stat['nlink'] ?? 0) !== 1 || $stat['size'] < 20
            || $stat['size'] > 100000 || realpath($file) !== $file) {
            throw new RuntimeException('Unsafe installed upstream license');
        }
        $bytes = @file_get_contents($file);
        $header = '===== composer '.$package.' '.$version.' ('.$license.') / '.$name.' ====='."\n";
        if (!is_string($bytes) || strlen($bytes) !== $stat['size']
            || !hash_equals($expectedSha256, hash('sha256', $bytes))
            || !str_contains($notices, $header.$bytes."\n")) {
            throw new RuntimeException('Copied notice differs from installed upstream license');
        }
    }

    private static function properties(array $component): array
    {
        $out = [];
        foreach ($component['properties'] ?? [] as $property) {
            if (!is_array($property) || !is_string($property['name'] ?? null)
                || !is_string($property['value'] ?? null)
                || isset($out[$property['name']])) {
                throw new RuntimeException('Invalid component evidence property');
            }
            $out[$property['name']] = $property['value'];
        }
        return $out;
    }

    /**
     * @return array{componentCount:int,locksMatchSbom:bool,noticesMatchIndex:bool,independentLegalApproval:bool}
     */
    public static function verify(string $root): array
    {
        $index = self::readJson($root.'/private/compliance/compliance-index.json', 16384);
        $sbom = self::readJson($root.'/private/compliance/sbom.cdx.json', 524288);
        $composer = self::readJson($root.'/composer.lock', 2097152);
        $npm = self::readJson($root.'/private/compliance/npm-package-lock.json', 2097152);
        $manifest = self::readJson($root.'/private/package-manifest.json', 250000);
        $notices = $root.'/private/compliance/THIRD_PARTY_NOTICES.txt';
        $st = @lstat($notices);
        if ($st === false || is_link($notices) || !is_file($notices)
            || ($st['nlink'] ?? 0) !== 1 || $st['size'] < 100
            || $st['size'] > 2097152 || realpath($notices) !== $notices) {
            throw new RuntimeException('Missing bounded third-party notices');
        }
        $noticeBytes = @file_get_contents($notices);
        if (!is_string($noticeBytes) || strlen($noticeBytes) !== $st['size']
            || !is_string($index['noticeSha256'] ?? null)
            || !hash_equals($index['noticeSha256'], hash('sha256', $noticeBytes))) {
            throw new RuntimeException('Third-party notice inventory mismatch');
        }
        if (($index['format'] ?? null) !== 'ai-site-cms-stage2-compliance-v1'
            || ($index['componentCount'] ?? null) !== 43
            || ($index['composerRuntime'] ?? null) !== 14
            || ($index['npmLocked'] ?? null) !== 29
            || ($index['browserRuntime'] ?? null) !== ['jedison@1.27.1']
            || !str_contains((string)($index['attestation'] ?? ''), 'manual legal review remains required')
            || ($sbom['bomFormat'] ?? null) !== 'CycloneDX'
            || ($sbom['specVersion'] ?? null) !== '1.5'
            || ($sbom['metadata']['component']['version'] ?? null) !== ($manifest['releaseVersion'] ?? null)
            || !is_array($sbom['components'] ?? null)
            || count($sbom['components']) !== 43
            || !is_array($composer['packages'] ?? null)
            || count($composer['packages']) !== 14
            || !is_array($npm['packages'] ?? null)
            || ($npm['lockfileVersion'] ?? null) !== 3) {
            throw new RuntimeException('Unreconciled Stage2 dependency inventory');
        }
        $components = [];
        foreach ($sbom['components'] as $component) {
            $purl = $component['purl'] ?? null;
            if (!is_array($component) || !is_string($purl) || isset($components[$purl])
                || ($component['type'] ?? null) !== 'library') {
                throw new RuntimeException('Duplicate or invalid SBOM component');
            }
            $components[$purl] = $component;
        }
        foreach ($composer['packages'] as $pkg) {
            $name = $pkg['name'] ?? null;
            $version = $pkg['version'] ?? null;
            if (!is_string($name) || !is_string($version)
                || !isset($components['pkg:composer/'.$name.'@'.$version])) {
                throw new RuntimeException('Composer lock not reflected in SBOM');
            }
            $comp = $components['pkg:composer/'.$name.'@'.$version];
            $props = self::properties($comp);
            $license = $pkg['license'] ?? null;
            if (!is_array($license) || count($license) !== 1
                || !in_array($license[0], self::LICENSES, true)
                || ($comp['licenses'][0]['license']['id'] ?? null) !== $license[0]
                || ($props['ai-site-cms:scope'] ?? null) !== 'php-runtime'
                || ($props['ai-site-cms:source-ref'] ?? null) !== ($pkg['source']['reference'] ?? null)
                || !preg_match('/\A[a-f0-9]{64}\z/D', $props['ai-site-cms:installed-license-sha256'] ?? '')
                || !str_contains($noticeBytes, '===== composer '.$name.' '.$version.' ('.$license[0].') /')) {
                throw new RuntimeException('Composer license or source evidence mismatch');
            }
            self::bundledComposerNotice($root, $name, $version, $license[0],
                $props['ai-site-cms:installed-license-sha256'], $noticeBytes);
            unset($components['pkg:composer/'.$name.'@'.$version]);
        }
        $npmCount = 0;
        foreach ($npm['packages'] as $key => $info) {
            if ($key === '') continue;
            ++$npmCount;
            if (!is_string($key) || !str_starts_with($key, 'node_modules/')
                || !is_array($info) || !is_string($info['version'] ?? null)
                || !is_string($info['integrity'] ?? null)) {
                throw new RuntimeException('Invalid npm lock component');
            }
            $name = substr($key, strlen('node_modules/'));
            $purl = 'pkg:npm/'.str_replace('/', '%2F', preg_replace('/^@/', '%40', $name)).'@'.$info['version'];
            if (!isset($components[$purl])) {
                throw new RuntimeException('npm lock not reflected in SBOM');
            }
            $comp = $components[$purl];
            $props = self::properties($comp);
            $scope = $name === 'jedison' ? 'browser-runtime'
                : (!empty($info['optional']) ? 'build-optional-platform' : 'build-and-test-only');
            if (!in_array($info['license'] ?? null, self::LICENSES, true)
                || ($comp['licenses'][0]['license']['id'] ?? null) !== $info['license']
                || ($props['ai-site-cms:scope'] ?? null) !== $scope
                || ($props['ai-site-cms:lock-integrity'] ?? null) !== $info['integrity']) {
                throw new RuntimeException('npm license or integrity evidence mismatch');
            }
            unset($components[$purl]);
        }
        if ($npmCount !== 29 || count($components) !== 0
            || !str_contains($noticeBytes, '===== browser-runtime jedison 1.27.1 (MIT) =====')
            || !str_contains($noticeBytes, 'German Bisurgi')) {
            throw new RuntimeException('Incomplete third-party attribution');
        }
        return [
            'componentCount'=>43,
            'locksMatchSbom'=>true,
            'noticesMatchIndex'=>true,
            'independentLegalApproval'=>false
        ];
    }
}
