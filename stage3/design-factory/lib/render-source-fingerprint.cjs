'use strict';
// Reproducible identity of all actual Design Factory renderers and read-only CMS
// contracts used for offline previews/Studio. It does not authenticate a reviewer.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const INPUTS=Object.freeze([
 'stage3/sdk/contract.cjs',
 ...['company-hero','contact-panel','cta-banner','faq-accordion','feature-highlights',
     'service-grid','media-story','photo-gallery'].map(x=>'stage3/components/'+x+'.json'),
 ...['catalog/themes.cjs','catalog/kits.cjs','catalog/compositions.cjs',
     'lib/compiler.cjs','lib/composition-adapter.cjs','lib/preview.cjs',
     'lib/showcase.cjs','lib/bridge.cjs',
     'studio/index.html','studio/studio.js','studio/studio.css',
     'studio/runtime.generated.js'].map(x=>'stage3/design-factory/'+x)
].sort());
function sourceFingerprint(repositoryRoot){
 const repo=fs.realpathSync(repositoryRoot);
 const hash=crypto.createHash('sha256');
 for(const rel of INPUTS){
  const absolute=path.join(repo,rel),stat=fs.lstatSync(absolute);
  if(!stat.isFile()||stat.isSymbolicLink()||
   fs.realpathSync(absolute)!==absolute)
   throw Error('Unsafe D7 render source file: '+rel);
  const data=fs.readFileSync(absolute),name=Buffer.from(rel),lengths=Buffer.alloc(8);
  if(name.length>0xffffffff||data.length>2*1024*1024)throw Error('Oversized D7 render source');
  lengths.writeUInt32BE(name.length,0);lengths.writeUInt32BE(data.length,4);
  hash.update(lengths);hash.update(name);hash.update(data);
 }
 return hash.digest('hex');
}
module.exports=Object.freeze({sourceFingerprint,INPUTS});
