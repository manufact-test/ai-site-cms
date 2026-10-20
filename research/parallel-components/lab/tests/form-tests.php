<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/FormLab.php';
$assertions = 0;
function check(bool $cond, string $name): void {
    global $assertions;
    $assertions++;
    if (!$cond) throw new RuntimeException("FAIL: $name");
}
$now = 1_700_000_000;
$input = ['name' => 'Мария', 'email' => 'maria@example.test', 'phone' => '',
    'message' => 'Это тестовое сообщение, длиннее десяти символов.', 'company_site' => ''];
function scenario(array $data, ?string $recipient = 'team@example.test', ?callable $delivery = null,
    ?callable $validator = null, int $age = 10): array {
    global $now;
    $session = [];
    $token = FormLab::issueToken($session, $now - $age);
    $data['csrf'] = $token;
    $calls = 0;
    $transport = $delivery ?? static function ($to, $fields) use (&$calls): bool {$calls++; return true;};
    $result = FormLab::submit($data, $session, $now, $recipient, $transport, $validator);
    return [$result, $session, $data];
}
[$r,$s,$data] = scenario($input, null);
check($r['code'] === 'CONFIGURATION_REQUIRED' && $r['http'] === 503, 'no target never succeeds');
check(isset($s['form_lab_token_hash']), 'configuration failure has not consumed token');
[$r,$s,$data] = scenario($input);
check($r['code'] === 'QUEUED_UNCONFIRMED' && $r['http'] === 202, 'transport accepted not falsely delivered');
check(!isset($s['form_lab_token_hash']), 'one-use token consumed');
check(FormLab::submit($data, $s, $now, 'team@example.test', static fn()=>true)['code'] === 'CSRF_INVALID', 'no duplicate send');
[$r] = scenario($input, 'not-an-email');
check($r['code'] === 'CONFIGURATION_REQUIRED', 'invalid recipient refused');
[$r] = scenario($input, 'team@example.test', static fn()=>false);
check($r['code'] === 'DELIVERY_FAILED' && $r['http'] === 502, 'transport failure honest');
[$r] = scenario($input, 'team@example.test', static function(){throw new RuntimeException('private mail error');});
check($r['code'] === 'DELIVERY_FAILED' && !str_contains($r['message'],'private'), 'exception redacted');
[$r] = scenario(array_replace($input, ['company_site'=>'bot']));
check($r['code'] === 'SPAM_REJECTED', 'honeypot');
[$r] = scenario($input, 'team@example.test', null, null, 0);
check($r['code'] === 'TOO_FAST', 'time trap');
[$r] = scenario($input, 'team@example.test', null, null, 1801);
check($r['code'] === 'CSRF_INVALID', 'expired token');
[$r] = scenario(array_replace($input,['email'=>'x@y']));
check($r['code'] === 'VALIDATION_ERROR' && isset($r['errors']['email']), 'bad email');
[$r] = scenario(array_replace($input,['name'=>'<script>']));
check($r['code'] === 'QUEUED_UNCONFIRMED', 'text kept plain and safe output layer owns escaping');
[$r] = scenario(array_replace($input,['message'=>str_repeat('x',2001)]));
check($r['code'] === 'VALIDATION_ERROR', 'message max');
[$r] = scenario(array_replace($input,['name'=>"\xC3\x28"]));
check($r['code'] === 'VALIDATION_ERROR', 'invalid UTF8');
[$r] = scenario(array_replace($input,['phone'=>'+4915123456789']));
check($r['code'] === 'PHONE_VALIDATOR_REQUIRED', 'cannot fake international validator');
[$r] = scenario(array_replace($input,['phone'=>'+4915123456789']), 'team@example.test',null,static fn($p)=>false);
check($r['code'] === 'VALIDATION_ERROR', 'phone rejected by provider');
[$r] = scenario(array_replace($input,['phone'=>'+4915123456789']), 'team@example.test',null,static fn($p)=>true);
check($r['code'] === 'QUEUED_UNCONFIRMED', 'phone adapter can integrate after verification');
$session = []; $csrf = FormLab::issueToken($session, $now - 10);
$data = $input + ['csrf'=>$csrf];
for($i=0;$i<5;$i++) FormLab::submit(array_replace($data,['csrf'=>'wrong']),$session,$now,'team@example.test',static fn()=>true);
check(FormLab::submit($data,$session,$now,'team@example.test',static fn()=>true)['code'] === 'RATE_LIMITED', 'per-session attempts limit');
[$r] = scenario(array_replace($input,['name'=>[]]));
check($r['code'] === 'VALIDATION_ERROR', 'array injection refused');
[$r] = scenario(array_replace($input,['phone'=>str_repeat('a',41)]));
check($r['code'] === 'VALIDATION_ERROR', 'phone length');
echo "FormLab PASS: $assertions standalone assertions (delivery, replay, validation, abuse, configuration)\n";
