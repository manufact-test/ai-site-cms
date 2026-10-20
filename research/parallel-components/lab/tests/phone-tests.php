<?php
declare(strict_types=1);
require_once __DIR__ . '/../src/PhoneAdapter.php';
require_once __DIR__ . '/../src/FormLab.php';
$n=0;
function must(bool $state, string $what): void {global $n; $n++; if (!$state) throw new RuntimeException($what);}
final class PhoneDouble {
    public function parse(string $phone, ?string $region): object {
        if ($phone === '9999') throw new RuntimeException('test parse rejection');
        $canonical = match($phone) {
            '0151 23456789', '+4915123456789' => '+4915123456789',
            '+447911123456' => '+447911123456',
            '0000' => '+0000', default => '+1212'
        };
        return new class($canonical, $region, $phone) {
            public function __construct(public string $canonical, public ?string $region, public string $phone) {}
            public function hasExtension(): bool { return $this->phone === '+7777'; }
        };
    }
    public function isValidNumber(object $p): bool { return $p->phone !== '8888'; }
    public function isValidNumberForRegion(object $p,string $region): bool {
        return $p->canonical === '+4915123456789' && $region === 'DE'
            || $p->canonical === '+447911123456' && $region === 'GB';
    }
    public function format(object $p,int $f): string {return $p->canonical;}
}
$d = new PhoneDouble();
must(!PhoneAdapter::available(), 'No vendor installed on isolated runner');
try {PhoneAdapter::normalize('+4915123456789','DE');throw new Exception('should fail');}
catch(RuntimeException $e){must($e->getMessage()==='PHONE_VALIDATOR_REQUIRED','no regex fallback');}
must(PhoneAdapter::normalize('0151 23456789','DE',$d,1)==='+4915123456789','national to E164 via provider');
must(PhoneAdapter::normalize('+4915123456789','DE',$d,1)==='+4915123456789','international to E164');
must(PhoneAdapter::normalize('+447911123456','GB',$d,1)==='+447911123456','GB recognized');
must(PhoneAdapter::normalize('+447911123456','DE',$d,1)===null,'region mismatch refused');
must(PhoneAdapter::normalize('0151 23456789','ZZ',$d,1)===null,'countryless national refused');
must(PhoneAdapter::normalize('+447911123456','ZZ',$d,1)==='+447911123456','international with ZZ');
must(PhoneAdapter::normalize('9999','DE',$d,1)===null,'parse errors refused');
must(PhoneAdapter::normalize('Call +4915123456789','DE',$d,1)===null,'embedded prose rejected before metadata');
must(PhoneAdapter::normalize('tel:+4915123456789','DE',$d,1)===null,'URI scheme rejected');
must(PhoneAdapter::normalize('+49+15123456789','DE',$d,1)===null,'multiple plus rejected');
must(PhoneAdapter::normalize('+49 151 23456789 ext 5','DE',$d,1)===null,'extensions in freeform text rejected');
must(PhoneAdapter::normalize("+49\xE2\x80\xAE15123456789",'DE',$d,1)===null,'bidi-format control rejected');
must(PhoneAdapter::normalize('0151 23456789','DE',$d,1)==='+4915123456789','normal national separators remain valid');
must(PhoneAdapter::normalize('8888','DE',$d,1)===null,'invalid numbering metadata refused');
must(PhoneAdapter::normalize('0000','ZZ',$d,1)===null,'country code must not begin zero');
must(PhoneAdapter::normalize('+7777','ZZ',$d,1)===null,'extensions not guessed');
must(PhoneAdapter::normalize('+4915123456789','de',$d,1)===null,'noncanonical region refused');
must(PhoneAdapter::normalize('+4915123456789','ABC',$d,1)===null,'non ISO region refused');
must(PhoneAdapter::normalize("+49\r123",'DE',$d,1)===null,'header/control refused');
must(PhoneAdapter::normalize(str_repeat('1',41),'DE',$d,1)===null,'bounded phone input');
$session=[];$now=1_700_000_100;$token=FormLab::issueToken($session,$now-10);
$data=['csrf'=>$token,'company_site'=>'','name'=>'Мария','email'=>'maria@example.test','phone'=>'0151 23456789','message'=>'Тестовый текст более десяти символов.'];
$last=null;
$r=FormLab::submit($data,$session,$now,'inbox@example.test',static function($to,$fields) use (&$last): bool {$last=$fields;return true;}, static fn($p) => PhoneAdapter::normalize($p,'DE',new PhoneDouble(),1));
must($r['code']==='QUEUED_UNCONFIRMED','upstream-normalized phone submission');
must($last['phone']==='+4915123456789','deliver only canonical E164');
echo "Phone adapter protocol PASS: $n assertions (provider double only; no real numbering-metadata claim)\n";
