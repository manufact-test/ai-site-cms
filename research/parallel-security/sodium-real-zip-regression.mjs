#!/usr/bin/env node
// Offline ZIP structure adversaries: real upstream tree remains the only source
// of trusted 78 hashes; these archives are synthetic transport test vectors.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import {crc32,readZipEntries,verifyComposerZip,fetchPublicZip} from './sodium-real-zip-proof.mjs';
let count=0;
const ok=(test,msg)=>{assert.ok(test,msg);count++;};
const reject=(why,fn)=>{assert.throws(fn,/SODIUM_REAL_ZIP_REFUSED/,why);count++;};
const u16=(x)=>{const b=Buffer.alloc(2);b.writeUInt16LE(x);return b};
const u32=(x)=>{const b=Buffer.alloc(4);b.writeUInt32LE(x>>>0);return b};
function makeZip(items){
  const local=[],central=[];let at=0;
  for(const obj of items){
    const name=Buffer.from(obj.name),payload=Buffer.from(obj.text||'');
    const method=obj.method??8,zipped=method===8?zlib.deflateRawSync(payload):payload;
    const crc=crc32(payload);
    const loc=Buffer.concat([u32(0x04034b50),u16(20),u16(0),u16(method),
      u16(0),u16(0),u32(crc),u32(zipped.length),u32(payload.length),
      u16(name.length),u16(0),name,zipped]);
    local.push(loc);
    const cen=Buffer.concat([u32(0x02014b50),u16(0x0314),u16(20),u16(0),
      u16(method),u16(0),u16(0),u32(crc),u32(zipped.length),
      u32(payload.length),u16(name.length),u16(0),u16(0),u16(0),
      u16(0),u32(obj.attrs??0x81a40000),u32(at),name]);
    central.push(cen);at+=loc.length;
  }
  const c=Buffer.concat(central);
  return Buffer.concat([...local,c,u32(0x06054b50),u16(0),u16(0),
    u16(items.length),u16(items.length),u32(c.length),u32(at),u16(0)]);
}
const sample=[
{name:'paragonie-sodium_compat-3246b368/LICENSE',text:'Synthetic ISC license (not real)'},
{name:'paragonie-sodium_compat-3246b368/autoload.php',text:'<?php // synthetic'}
];
const zip=makeZip(sample),read=readZipEntries(zip);
ok(read.entries.size===2&&read.totalUncompressed>40,
  'synthetic ZIP inflates bounded DEFLATE files correctly');
ok(read.archiveSha256===crypto.createHash('sha256').update(zip).digest('hex'),
  'archive integrity fingerprint from exact transport bytes');
reject('fake local source never passes 78 upstream Git blobs',
  ()=>verifyComposerZip(zip));
const zero=makeZip([{name:'paragonie-sodium_compat-3246b368/readme',text:'ok',method:0}]);
ok(readZipEntries(zero).entries.size===1,'valid stored ZIP compression mode');
reject('truncated central directory',()=>readZipEntries(zip.subarray(0,zip.length-5)));
reject('modified ZIP body detected via CRC',()=>{const bad=Buffer.from(zip);bad[61]^=1;return readZipEntries(bad)});
reject('duplicate file names',()=>readZipEntries(makeZip([...sample,sample[0]])));
reject('absolute path',()=>readZipEntries(makeZip([{name:'/etc/passwd',text:'bad'}])));
reject('dot-dot traversal',()=>readZipEntries(makeZip([{name:'../evil.php',text:'bad'}])));
reject('windows separator',()=>readZipEntries(makeZip([{name:'some\\evil.php',text:'bad'}])));
reject('special symlink file',()=>readZipEntries(makeZip([{...sample[0],attrs:0xa1ff0000}])));
reject('unbounded decompression',()=>readZipEntries(makeZip([{name:'repo/large',text:'A'.repeat(2*1024*1024+4)}])));
reject('missing first archive root in exact upstream',
  ()=>verifyComposerZip(makeZip([{name:'fake-owner-sodium_compat-3246b368/LICENSE',text:'fake'}])));
const mismatch=Buffer.from(zip);
const centralAt=mismatch.readUInt32LE(mismatch.length-6);
mismatch.writeUInt32LE(0x4b504321,centralAt);
reject('untrusted central directory marker',()=>readZipEntries(mismatch));
const misMethod=Buffer.from(zip);
misMethod.writeUInt16LE(0,8);
reject('central vs local compression method mismatch',()=>readZipEntries(misMethod));
const fakeResponse=(status,location,body)=>({status,headers:{get:()=>location},body});
const syntheticRedirect=async(url)=>fakeResponse(302,'https://evil.example/steal.zip');
const fakeHttp=async()=>fakeResponse(403,null);
await assert.rejects(fetchPublicZip(syntheticRedirect),/SODIUM_REAL_ZIP_REFUSED/);count++;
await assert.rejects(fetchPublicZip(fakeHttp),/SODIUM_REAL_ZIP_REFUSED/);count++;
assert.equal(count,17,'Expected 17 real ZIP path/bounds/policy adversarial assertions');
console.log('Real ZIP signed-tag source verification parser offline regression PASS '+count+' assertions; SYNTHETIC ZIP only, no upstream HTTPS request or source approval');
