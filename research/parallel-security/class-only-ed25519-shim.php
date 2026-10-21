<?php
declare(strict_types=1);
/** Research-only *native Sodium* dispatch shim; NOT sodium_compat or Sodium-free evidence. */
if(PHP_SAPI!=='cli'||getenv('CI')!=='true'||getenv('CMS_ALLOW_PHP_INSTALL_LAB')!=='1'
    ||!extension_loaded('sodium')||function_exists('sodium_crypto_sign_verify_detached')
    ||!function_exists('sodium_crypto_sign_open')
    ||class_exists('ParagonIE_Sodium_Compat',false)) {
    throw new LogicException('FORCED_CLASS_RESEARCH_SHIM_INVALID');
}
final class ParagonIE_Sodium_Compat
{
    public static int $verifyCalls=0;
    public static function crypto_sign_verify_detached(
        string $signature,string $message,string $publicKey
    ):bool{
        ++self::$verifyCalls;
        if(strlen($signature)!==64||strlen($publicKey)!==32)return false;
        try{
            $messageRecovered=sodium_crypto_sign_open($signature.$message,$publicKey);
            return is_string($messageRecovered)&&hash_equals($messageRecovered,$message);
        }catch(Throwable){return false;}
    }
}
