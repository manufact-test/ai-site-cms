<?php
declare(strict_types=1);
namespace Manufact\Stage3;

use RuntimeException;
use Throwable;

/**
 * Optional, dependency-free authenticated SMTP. Never selects plaintext SMTP:
 * explicit STARTTLS (587 by default) or implicit verified TLS (465).
 * The host and credentials come ONLY from private server environment variables.
 */
final class SmtpTransport
{
    public static function configuration(): array
    {
        $host=getenv('STAGE3_SMTP_HOST');
        if(!is_string($host)||$host==='')return ['enabled'=>false,'ready'=>false,'reason'=>'not_selected'];
        $security=getenv('STAGE3_SMTP_SECURITY')?:'starttls';
        $portValue=getenv('STAGE3_SMTP_PORT');
        $port=$portValue===false||$portValue===''?($security==='tls'?465:587):filter_var($portValue,FILTER_VALIDATE_INT);
        $user=getenv('STAGE3_SMTP_USER');
        $password=getenv('STAGE3_SMTP_PASSWORD');
        if(strlen($host)>253||!preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/Di',$host))
            return ['enabled'=>true,'ready'=>false,'reason'=>'smtp_host_invalid'];
        if(!in_array($security,['starttls','tls'],true)||!in_array($port,[465,587],true)
            ||($security==='starttls'&&$port!==587)||($security==='tls'&&$port!==465))
            return ['enabled'=>true,'ready'=>false,'reason'=>'smtp_security_invalid'];
        if(!extension_loaded('openssl')||!function_exists('stream_socket_enable_crypto'))
            return ['enabled'=>true,'ready'=>false,'reason'=>'smtp_tls_unavailable'];
        if(!is_string($user)||$user===''||strlen($user)>254||preg_match('/[\x00-\x1f\x7f]/',$user))
            return ['enabled'=>true,'ready'=>false,'reason'=>'smtp_user_missing'];
        if(!is_string($password)||$password===''||strlen($password)>512||str_contains($password,"\0"))
            return ['enabled'=>true,'ready'=>false,'reason'=>'smtp_password_missing'];
        return ['enabled'=>true,'ready'=>true,'reason'=>'ready','mode'=>'smtp',
            'host'=>$host,'port'=>$port,'security'=>$security];
    }

    /** Only a definitive SMTP 250 after DATA counts as transport acceptance. */
    public static function send(string $recipient,string $from,string $subject,string $message): array
    {
        $config=self::configuration();
        if(!$config['ready'])return ['state'=>'configuration_required','error'=>$config['reason']];
        if(!filter_var($recipient,FILTER_VALIDATE_EMAIL)||!filter_var($from,FILTER_VALIDATE_EMAIL)
            ||preg_match('/[\r\n]/',$recipient.$from)
            ||strlen($recipient)>254||strlen($from)>254
            ||strlen($subject)>300||preg_match('/[\r\n]/',$subject)||strlen($message)>65536)
            return ['state'=>'failed','error'=>'smtp_message_invalid'];

        $socket=null;$dataCommitted=false;
        try {
            $host=$config['host'];
            $context=stream_context_create(['ssl'=>[
                'verify_peer'=>true,'verify_peer_name'=>true,'allow_self_signed'=>false,
                'peer_name'=>$host,'SNI_enabled'=>true,
                'crypto_method'=>STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT|STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT
            ]]);
            $address=($config['security']==='tls'?'ssl://':'tcp://').$host.':'.$config['port'];
            $socket=@stream_socket_client($address,$errno,$error,4,STREAM_CLIENT_CONNECT,$context);
            if(!is_resource($socket))throw new RuntimeException('smtp_connect_failed');
            stream_set_timeout($socket,4);
            self::expect($socket,[220]);
            self::write($socket,"EHLO cms.invalid\r\n");
            self::expect($socket,[250]);
            if($config['security']==='starttls'){
                self::write($socket,"STARTTLS\r\n");
                self::expect($socket,[220]);
                if(@stream_socket_enable_crypto($socket,true,
                    STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT|STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)!==true)
                    throw new RuntimeException('smtp_tls_failed');
                self::write($socket,"EHLO cms.invalid\r\n");
            }else{
                // Always EHLO again on the authenticated, verified connection.
                self::write($socket,"EHLO cms.invalid\r\n");
            }
            $capabilities=self::expect($socket,[250]);
            $user=(string)getenv('STAGE3_SMTP_USER');
            $password=(string)getenv('STAGE3_SMTP_PASSWORD');
            if(preg_match('/^250[- ]AUTH\s+[^\r\n]*\bPLAIN\b/im',$capabilities)){
                self::write($socket,"AUTH PLAIN ".base64_encode("\0".$user."\0".$password)."\r\n");
                self::expect($socket,[235]);
            }elseif(preg_match('/^250[- ]AUTH\s+[^\r\n]*\bLOGIN\b/im',$capabilities)){
                self::write($socket,"AUTH LOGIN\r\n");
                self::expect($socket,[334]);
                self::write($socket,base64_encode($user)."\r\n");
                self::expect($socket,[334]);
                self::write($socket,base64_encode($password)."\r\n");
                self::expect($socket,[235]);
            }else throw new RuntimeException('smtp_auth_unsupported');
            self::write($socket,"MAIL FROM:<".$from.">\r\n");
            self::expect($socket,[250]);
            self::write($socket,"RCPT TO:<".$recipient.">\r\n");
            self::expect($socket,[250,251]);
            self::write($socket,"DATA\r\n");
            self::expect($socket,[354]);
            // Base64-encoding the body prevents SMTP dot-stuffing and header
            // injection by any untrusted client-submitted message or extras.
            $headers="From: <".$from.">\r\nTo: <".$recipient.">\r\n"
                ."Subject: =?UTF-8?B?".base64_encode($subject)."?=\r\n"
                ."MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n"
                ."Content-Transfer-Encoding: base64\r\n\r\n";
            $body=$headers.chunk_split(base64_encode($message),76,"\r\n");
            // A disconnect after any DATA bytes could conceal delivery;
            // preserve 'uncertain' and require explicit owner retry.
            $dataCommitted=true;
            self::write($socket,$body."\r\n.\r\n");
            self::expect($socket,[250]);
            return ['state'=>'accepted','error'=>null];
        }catch(Throwable $e){
            $error=$e instanceof RuntimeException?$e->getMessage():'smtp_transport_failed';
            if(!in_array($error,[
                'smtp_connect_failed','smtp_tls_failed','smtp_auth_unsupported',
                'smtp_rejected','smtp_disconnected','smtp_transport_failed'
            ],true))$error='smtp_transport_failed';
            return ['state'=>$dataCommitted?'uncertain':'failed','error'=>$error];
        }finally{
            if(is_resource($socket))fclose($socket);
        }
    }

    private static function write($socket,string $data): void
    {
        $length=strlen($data);$sent=0;
        while($sent<$length){
            $w=@fwrite($socket,substr($data,$sent));
            if($w===false||$w===0)throw new RuntimeException('smtp_disconnected');
            $sent+=$w;
        }
    }

    private static function expect($socket,array $expected): string
    {
        $response='';$status=0;
        for($i=0;$i<30;$i++){
            $line=@fgets($socket,2049);
            if(!is_string($line)||strlen($line)>2048||!preg_match('/^([0-9]{3})([ -])/', $line,$m))
                throw new RuntimeException('smtp_disconnected');
            $status=(int)$m[1];$response.=$line;
            if($m[2]===' ') {
                if(!in_array($status,$expected,true))throw new RuntimeException('smtp_rejected');
                return $response;
            }
        }
        throw new RuntimeException('smtp_transport_failed');
    }
}
