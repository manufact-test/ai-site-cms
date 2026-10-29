<?php
declare(strict_types=1);
namespace Manufact\Stage3;
use InvalidArgumentException;

/** Bounded, site-owned WOFF2; does not parse, decompress or execute font programs. */
final class FontGuard
{
    public const MAX_BYTES=1048576;

    public static function validate(string $bytes,?string $expectedSha=null): string
    {
        $size=strlen($bytes);
        if($size<48||$size>self::MAX_BYTES||substr($bytes,0,4)!=='wOF2')
            throw new InvalidArgumentException('Only local WOFF2 files up to 1 MiB are accepted');
        $flavor=substr($bytes,4,4);
        $declared=unpack('N',substr($bytes,8,4))[1];
        $tables=unpack('n',substr($bytes,12,2))[1];
        $reserved=unpack('n',substr($bytes,14,2))[1];
        $sfnt=unpack('N',substr($bytes,16,4))[1];
        $compressed=unpack('N',substr($bytes,20,4))[1];
        if(!in_array($flavor,["\x00\x01\x00\x00",'OTTO','true'],true)
            ||$declared!==$size||$tables<1||$tables>128||$reserved!==0
            ||$sfnt<12||$sfnt>33554432||$compressed<1||$compressed>$size-48)
            throw new InvalidArgumentException('Invalid WOFF2 header or table metadata');
        if($expectedSha!==null&&(!preg_match('/^[a-f0-9]{64}$/D',$expectedSha)
            ||!hash_equals(hash('sha256',$bytes),$expectedSha)))
            throw new InvalidArgumentException('WOFF2 checksum mismatch');
        return hash('sha256',$bytes);
    }
}
