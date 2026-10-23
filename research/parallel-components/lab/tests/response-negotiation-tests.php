<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/ResponseNegotiation.php';
$n=0;
function expectNegotiation(bool $condition, string $why):void{global $n;$n++;if(!$condition)throw new RuntimeException($why);}
foreach ([
    ['text/html', true], ['TEXT/HTML', true],
    ['text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', true],
    ['text/html;q=0.9, application/json;q=0.8', true],
    ['text/html;q=0.0', false], ['text/html;q=0', false],
    ['application/json,text/html;q=0', false], ['application/json', false],
    ['application/json,text/html', false], ['text/html;q=0.1,application/json;q=1', false],
    ['text/html;q=1.1', false], ['text/html;q=abc', false],
    ['text/html;q=0.5;q=1', false], ['text/html;q=0.001', true],
    ['text/html;q=0.000', false], ['*/*', false],
    ['', false], ["text/html\r\nInjected: x", false],
    [str_repeat('text/html,', 17), false],
] as [$accept,$wanted]) {
    expectNegotiation(ResponseNegotiation::wantsHtml($accept) === $wanted, "Accept mismatch: " . var_export($accept, true));
}
expectNegotiation(ResponseNegotiation::wantsHtml(null)===false,'missing accept falls back JSON');
expectNegotiation(ResponseNegotiation::wantsHtml(['text/html'])===false,'non-string accept fails closed');
echo "Response negotiation PASS: $n assertions (weighted Accept, q=0, fail-closed invalid/malformed)\n";
