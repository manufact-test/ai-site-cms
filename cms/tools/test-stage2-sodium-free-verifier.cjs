'use strict';
// One disposable GitHub-hosted runner only. Never install polyfill on Hostinger
// or change production composer.lock without the independent license review.
const fs=require('node:fs');
const crypto=require('node:crypto');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'cms-stage2-sodium-'));
try{
  const source=path.resolve(__dirname,'..');
  const manifest={name:'manufact/stage2-ephemeral-crypto-candidate',
    require:{'paragonie/sodium_compat':'2.5.2'},
    config:{'allow-plugins':false,'secure-http':true}};
  fs.writeFileSync(path.join(folder,'composer.json'),JSON.stringify(manifest)+'\n',{mode:0o600});
  execFileSync('composer',['install','--working-dir='+folder,
    '--no-interaction','--no-plugins','--no-scripts','--prefer-dist','--no-progress'],
    {stdio:'inherit',timeout:90000});
  const lock=JSON.parse(fs.readFileSync(path.join(folder,'composer.lock'),'utf8'));
  const packages=lock.packages||[];
  if(packages.length!==1||packages[0].name!=='paragonie/sodium_compat'||
     packages[0].version!=='v2.5.2'||!packages[0].license.includes('ISC'))
    throw Error('Pinned sodium_compat candidate/license mismatch (not approved for distribution)');
  const [pub,priv]=crypto.generateKeyPairSync('ed25519');
  const other=crypto.generateKeyPairSync('ed25519').publicKey;
  const b64=x=>Buffer.from(x).toString('base64');
  const msg=Buffer.from('AI-SITE-CMS-STAGE2-POLYFILL-CROSS-RUNTIME-V1\0signed');
  const payload={message:b64(msg),signature:b64(crypto.sign(null,msg,priv)),
    publicKey:b64(pub.export({format:'der',type:'spki'}).subarray(-32)),
    wrongPublicKey:b64(other.export({format:'der',type:'spki'}).subarray(-32))};
  const vector=path.join(folder,'vector.json');
  fs.writeFileSync(vector,JSON.stringify(payload),{mode:0o600});
  execFileSync('php',['-n',path.join(source,'tests/stage2-polyfill-ed25519.php'),vector,folder],
    {stdio:'inherit',timeout:30000});
  process.stdout.write('Pinned 2.5.2 ISC candidate only; 43-component product legal review not amended.\n');
}finally{
  fs.rmSync(folder,{recursive:true,force:true});
}
