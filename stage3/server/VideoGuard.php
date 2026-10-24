<?php
declare(strict_types=1);
namespace Manufact\Stage3;
use InvalidArgumentException;
/** Validates a small local ISO-BMFF MP4 upload; no remote resources or user markup. */
final class VideoGuard
{
    public const MAX_BYTES=1500000;
    public static function validate(string $bytes,?string $expectedSha=null): string
    {
        $length=strlen($bytes);
        if($length<100||$length>self::MAX_BYTES)
            throw new InvalidArgumentException('Video must be MP4, 100 bytes to 1.5 MB');
        if($expectedSha!==null&&(!preg_match('/^[a-f0-9]{64}$/D',$expectedSha)
            ||!hash_equals(hash('sha256',$bytes),$expectedSha)))
            throw new InvalidArgumentException('Video SHA256 mismatch');
        $offset=0;$boxes=[];$brand=null;
        // Reject truncated, extended-size and ambiguous top-level boxes.
        while($offset<$length){
            if($length-$offset<8)throw new InvalidArgumentException('Truncated MP4 box');
            $size=unpack('N',substr($bytes,$offset,4))[1];
            $type=substr($bytes,$offset+4,4);
            if($size<8||$size>$length-$offset||!in_array($type,['ftyp','moov','mdat','free'],true))
                throw new InvalidArgumentException('Invalid or unsupported MP4 structure');
            if($offset===0){
                if($type!=='ftyp'||$size<16||$size>128)throw new InvalidArgumentException('Missing MP4 file type');
                $brand=substr($bytes,$offset+8,4);
                if(!in_array($brand,['isom','iso2','mp41','mp42','avc1'],true))
                    throw new InvalidArgumentException('Unsupported MP4 brand');
            }
            $boxes[$type]=($boxes[$type]??0)+1;
            $offset+=$size;
        }
        if(($boxes['ftyp']??0)!==1||($boxes['moov']??0)!==1||($boxes['mdat']??0)!==1)
            throw new InvalidArgumentException('MP4 movie and media data are required');
        return hash('sha256',$bytes);
    }
}
