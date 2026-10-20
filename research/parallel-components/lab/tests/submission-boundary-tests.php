<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/SubmissionBoundary.php';
$checks = 0;
function bc(bool $ok): void {global $checks; $checks++; if (!$ok) throw new RuntimeException("Submit boundary failure $checks");}
$valid='csrf=abc&company_site=&name=Alex&email=a%40example.test&phone=&phone_region=ZZ&message=The+message+is+long+enough';
$result=SubmissionBoundary::decode($valid);
bc($result['code']==='OK');
bc($result['fields']['message']==='The message is long enough');
bc($result['fields']['email']==='a@example.test');
bc($result['fields']['phone']==='');
foreach (['', 'csrf=x', $valid.'&name=Bob', $valid.'&admin=1', $valid.'&name%5B%5D=foo', $valid.'&%6eame=x', $valid.'&', 'csrf=abc&name', $valid.'&message=%', $valid.'&message=%QQ', str_replace('name=Alex', 'name=%00', $valid), str_replace('name=Alex', 'name=%FF', $valid), str_replace('name=Alex', 'name=Alex%0D%0A', $valid.'&some=1'), str_repeat('a',8193), str_replace('email=a%40example.test','email=a@example.test&email=b@example.test',$valid), str_replace('phone_region=ZZ','phone_region%5B0%5D=ZZ',$valid)] as $bad) {
    bc(SubmissionBoundary::decode($bad)['code']==='MALFORMED_FORM');
}
bc(SubmissionBoundary::decode(str_replace('phone_region=ZZ&', '', $valid))['fields']['phone_region']==='ZZ');
bc(SubmissionBoundary::decode(str_replace('name=Alex','name=%D0%9C%D0%B0%D1%80%D0%B8%D1%8F',$valid))['fields']['name']==='Мария');
echo "SubmissionBoundary PASS: $checks assertions (duplicate, unknown, polluted, unicode, large body)\n";
