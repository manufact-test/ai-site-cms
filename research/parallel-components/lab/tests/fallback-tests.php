<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/NoJsResult.php';
$n=0;
function expectFallback(bool $v,string $why):void{global $n;$n++;if(!$v)throw new RuntimeException($why);}
$submitted = ['csrf'=>str_repeat('a',64),'name'=>'<script>hi</script>','email'=>'bad" onfocus="x',
    'phone'=>'','message'=>'<img src=x onerror=1>', 'phone_region'=>'DE'];
$problem = ['code'=>'VALIDATION_ERROR','message'=>'<b>Bad</b>', 'errors'=>['name'=>'<img src=x onerror=1>','email'=>'Invalid']];
$html = NoJsResult::page($problem,$submitted);
expectFallback(str_contains($html,'<form action="/submit-html.php"'),'retry form');
expectFallback(str_contains($html,'&lt;script&gt;hi&lt;/script&gt;'),'escaped name');
expectFallback(!str_contains($html,'<script>'),'no script');
expectFallback(str_contains($html,'bad&quot; onfocus=&quot;x'),'escaped attr');
expectFallback(str_contains($html,'&lt;img src=x onerror=1&gt;'),'escaped message/error');
expectFallback(!str_contains($html,'<img src=x'),'no untrusted markup');
expectFallback(str_contains($html,'aria-invalid="true"'),'field invalid');
expectFallback(str_contains($html,'href="#field-name">Имя: &lt;img src=x onerror=1&gt;'),'accessible label for escaped summary link');
expectFallback(str_contains($html,'href="#field-email">Email: Invalid'),'email summary identifies field');
expectFallback(str_contains($html,'autofocus'),'return focus');
expectFallback(str_contains($html,'value="DE" selected'),'region kept');
expectFallback(str_contains($html,'value="'.str_repeat('a',64).'"'),'same token for validation retry');
expectFallback(!str_contains(NoJsResult::page(['code'=>'CSRF_INVALID','message'=>'No'],$submitted),'<form'),'no CSRF retry');
expectFallback(!str_contains(NoJsResult::page(['code'=>'DELIVERY_UNCONFIRMED','message'=>'unknown'],$submitted),'<form'),'no transport uncertainty retry');
expectFallback(!str_contains(NoJsResult::page(['code'=>'QUEUED_UNCONFIRMED','message'=>'queued'],$submitted),'<form'),'no queued repeat');
expectFallback(!str_contains(NoJsResult::page(['code'=>'MALFORMED_FORM','message'=>'bad'],$submitted),'<form'),'no malformed retry');
expectFallback(!str_contains(NoJsResult::page($problem,array_replace($submitted,['csrf'=>'evil'])), '<form'),'must validate token shape');
expectFallback(str_contains(NoJsResult::page(['code'=>'TOO_FAST','message'=>'wait'],$submitted),'<form'),'too fast retry');
expectFallback(!str_contains(NoJsResult::page(['code'=>'UNKNOWN','message'=>'<script>alert(1)</script>'],$submitted),'<script>'),'message escaped');
expectFallback(!str_contains($html,'name="wizard_complete"'),'no forged wizard proof');
$regionError = ['code'=>'VALIDATION_ERROR','message'=>'country invalid','errors'=>['phone_region'=>'<bad country>']];
$regionHtml = NoJsResult::page($regionError, array_replace($submitted,['phone_region'=>'AA']));
expectFallback(str_contains($regionHtml,'href="#field-phone_region">Страна номера: &lt;bad country&gt;'),'region summary identifies exact selector with escaped text');
expectFallback(str_contains($regionHtml,'id="field-phone_region" name="phone_region" aria-invalid="true" aria-describedby="error-phone_region" autofocus'),'invalid region receives initial focus');
expectFallback(str_contains($regionHtml,'id="error-phone_region">&lt;bad country&gt;'),'selector error is escaped');
expectFallback(!str_contains($regionHtml,'<bad country>'),'injected error not executable markup');
expectFallback(str_contains($regionHtml,'value="ZZ"'),'invalid country not reflected into option list');
echo "NoJsResult PASS: $n assertions (escaped form, focus, unknown transport and retry gates)\n";
