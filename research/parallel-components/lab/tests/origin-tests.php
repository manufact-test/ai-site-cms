<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/OriginPolicy.php';
$assertions = 0;
function expect(string $found, string $expected, string $name): void {
    global $assertions;
    $assertions++;
    if ($found !== $expected) throw new RuntimeException("$name: expected $expected, got $found");
}
expect(OriginPolicy::evaluate('https://example.test','https://example.test','example.test','same-origin'),'ALLOW','valid origin');
expect(OriginPolicy::evaluate('http://127.0.0.1:8765','http://127.0.0.1:8765','127.0.0.1:8765',null),'ALLOW','local dev origin');
expect(OriginPolicy::evaluate('https://example.test',null,'example.test',null),'ORIGIN_CONFIGURATION_REQUIRED','missing configuration');
expect(OriginPolicy::evaluate('https://example.test','http://example.test','example.test',null),'ORIGIN_CONFIGURATION_REQUIRED','non TLS production configuration');
expect(OriginPolicy::evaluate('https://example.test','https://example.test/','example.test',null),'ORIGIN_CONFIGURATION_REQUIRED','trailing slash configured origin rejected');
expect(OriginPolicy::evaluate(null,'https://example.test','example.test',null),'ORIGIN_INVALID','absent browser origin refused');
expect(OriginPolicy::evaluate('null','https://example.test','example.test',null),'ORIGIN_INVALID','opaque null origin refused');
expect(OriginPolicy::evaluate('https://evil.test','https://example.test','example.test',null),'ORIGIN_INVALID','foreign origin refused');
expect(OriginPolicy::evaluate('https://example.test','https://example.test','evil.test',null),'HOST_INVALID','spoofed Host header refused');
expect(OriginPolicy::evaluate('https://example.test','https://example.test','example.test:443',null),'HOST_INVALID','unexpected explicit port refused');
expect(OriginPolicy::evaluate('https://example.test','https://example.test','example.test','cross-site'),'ORIGIN_INVALID','cross site fetch metadata refused');
expect(OriginPolicy::evaluate('https://example.test','https://example.test','example.test','same-site'),'ORIGIN_INVALID','same site other origin refused');
expect(OriginPolicy::evaluate('https://example.test','https://example.test','example.test','none'),'ALLOW','none fetch metadata allowed');
expect(OriginPolicy::evaluate('https://example.test','https://example.test:8443','example.test:8443',null),'ORIGIN_INVALID','wrong port refused');
expect(OriginPolicy::evaluate('https://example.test.','https://example.test.','example.test.',null),'ORIGIN_CONFIGURATION_REQUIRED','trailing dot denied');
expect(OriginPolicy::evaluate('https://example.test','https://example.test:443','example.test:443',null),'ORIGIN_CONFIGURATION_REQUIRED','noncanonical default port denied');
expect(OriginPolicy::evaluate('https://example.test','https://example.test','example.test',null),'ALLOW','no untrusted forwarded headers used');
echo "OriginPolicy PASS: $assertions origin/proxy/header checks\n";
