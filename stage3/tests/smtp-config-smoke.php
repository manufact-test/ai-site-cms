<?php
declare(strict_types=1);

require dirname(__DIR__).'/server/SmtpTransport.php';
use Manufact\Stage3\SmtpTransport;

// Configuration-only assertions; never opens sockets or sends a test message.
$check=static function(bool $ok,string $description):void {
    if(!$ok)throw new RuntimeException($description);
};
foreach(['STAGE3_SMTP_HOST','STAGE3_SMTP_PORT','STAGE3_SMTP_SECURITY','STAGE3_SMTP_USER','STAGE3_SMTP_PASSWORD'] as $key)
    putenv($key);
$check(SmtpTransport::configuration()['enabled']===false,'PHP mail fallback remains the default');
putenv('STAGE3_SMTP_HOST=smtp.example.com');
putenv('STAGE3_SMTP_USER=sender@example.com');
putenv('STAGE3_SMTP_PASSWORD=unused-test-secret');
$ready=SmtpTransport::configuration();
$check($ready['enabled']===true&&$ready['ready']===true&&$ready['security']==='starttls'
    &&$ready['port']===587,'Explicit SMTP selects verified STARTTLS/587');
putenv('STAGE3_SMTP_SECURITY=tls');
$ready=SmtpTransport::configuration();
$check($ready['ready']===true&&$ready['port']===465,'Implicit TLS defaults to port 465');
putenv('STAGE3_SMTP_PORT=25');
$check(SmtpTransport::configuration()['reason']==='smtp_security_invalid','Plain port 25 is rejected');
$blocked=SmtpTransport::send('receiver@example.com','sender@example.com','Test','Offline');
$check($blocked['state']==='configuration_required','No connection attempted on invalid security');
putenv('STAGE3_SMTP_PORT');
putenv('STAGE3_SMTP_PASSWORD');
$check(SmtpTransport::configuration()['reason']==='smtp_password_missing','No SMTP fallback if password is absent');
putenv('STAGE3_SMTP_HOST=127.0.0.1');
$check(SmtpTransport::configuration()['reason']==='smtp_host_invalid','Non-DNS SMTP host rejected');
require dirname(__DIR__).'/server/FormDelivery.php';
$modeProbe=new class {
    use \Manufact\Stage3\FormDelivery;
    public function mode(): array { return $this->deliveryDispatchMode(); }
};
putenv('STAGE3_DELIVERY_DISPATCH_MODE');
$check($modeProbe->mode()['mode']==='inline','Default forms still send inline');
putenv('STAGE3_DELIVERY_DISPATCH_MODE=queue');
$check($modeProbe->mode()['mode']==='queue'&&$modeProbe->mode()['valid'],
    'Explicit queue mode avoids synchronous outgoing calls');
putenv('STAGE3_DELIVERY_DISPATCH_MODE=typo');
$check($modeProbe->mode()['mode']==='queue'&&!$modeProbe->mode()['valid'],
    'Unknown dispatch modes fail closed without accidentally sending');
echo "SMTP configuration-only smoke passed (no network I/O)\n";
