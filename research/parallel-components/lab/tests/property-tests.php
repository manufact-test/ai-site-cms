<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/PropertySafety.php';
$valid = ['/contact', '/faq?ref=2', '#section_1', 'https://example.test/contact'];
$invalid = ['', '//evil.test/x', 'javascript:alert(1)', 'data:text/html,x',
 'http://example.test', 'https://evil.test', 'https://user:password@example.test/',
 "/contact\nX:Injected", ' /contact', '\\evil.test', '#?x'];
foreach ($valid as $url) if (!PropertySafety::safeHref($url,'example.test')) throw new RuntimeException("Valid rejected: $url");
foreach ($invalid as $url) if (PropertySafety::safeHref($url,'example.test')) throw new RuntimeException("Unsafe accepted: $url");
if (PropertySafety::safeAction(['kind'=>'link','href'=>'javascript:alert(1)'],'example.test')) throw new RuntimeException('JS href accepted');
if (PropertySafety::safeAction(['kind'=>'submit','href'=>'/external'],'example.test')) throw new RuntimeException('Submit target accepted');
if (!PropertySafety::safeAction(['kind'=>'submit','href'=>null],'example.test')) throw new RuntimeException('Submit no target failed');
echo 'PropertySafety PASS: '.(count($valid)+count($invalid)+3).' checks of semantic URL/action guard' . PHP_EOL;
