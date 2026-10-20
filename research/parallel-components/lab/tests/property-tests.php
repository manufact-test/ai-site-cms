<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/PropertySafety.php';
$valid = ['/contact', '/faq?ref=2', '#section_1', 'https://example.test/contact', 'https://example.test:443/contact'];
$invalid = ['', '//evil.test/x', 'javascript:alert(1)', 'data:text/html,x',
 'http://example.test', 'https://evil.test', 'https://user:password@example.test/',
 "/contact\nX:Injected", ' /contact', '\\evil.test', '#?x', '/%2f%2fevil.test', '/%0d%0aInjected', '/%252e%252e/x', '/foo/../admin', '/./x',
 'https://example.test./', 'https://example.test:444/path', 'https://example.test:0/path', 'https://example.test:65536/path',
 'https://evil.test@example.test/', 'https://example.test\\@evil.test/', 'https://example.test/%2e%2e/x'];
foreach ($valid as $url) if (!PropertySafety::safeHref($url,'example.test')) throw new RuntimeException("Valid rejected: $url");
foreach ($invalid as $url) if (PropertySafety::safeHref($url,'example.test')) throw new RuntimeException("Unsafe accepted: $url");
if (PropertySafety::safeAction(['kind'=>'link','href'=>'javascript:alert(1)'],'example.test')) throw new RuntimeException('JS href accepted');
if (PropertySafety::safeAction(['kind'=>'submit','href'=>'/external'],'example.test')) throw new RuntimeException('Submit target accepted');
if (!PropertySafety::safeAction(['kind'=>'submit','href'=>null],'example.test')) throw new RuntimeException('Submit no target failed');
if (PropertySafety::safeAction(['kind'=>'link','href'=>'/ok','extra'=>'inject'],'example.test')) throw new RuntimeException('Unknown action key accepted');
echo 'PropertySafety PASS: '.(count($valid)+count($invalid)+4).' checks of semantic URL/action guard' . PHP_EOL;
