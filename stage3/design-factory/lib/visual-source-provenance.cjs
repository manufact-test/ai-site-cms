'use strict';
// Binds each D7 screenshot to immutable generated HTML and CSS bytes.
// A content hash is not browser attestation or human approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const MAX_SOURCE_BYTES=2*1024*1024;
function sourcePaths(image){
 if(typeof image!=='string')throw Error('Expected D7 screenshot path');
 let base,html,css,href;
 if(/^screenshots\/42-compositions-(desktop|tablet|mobile)\.png$/.test(image)){
  html='showcase/index.html';css='showcase/showcase.css';href='showcase.css';
 }else{
  const theme=/^screenshots\/theme-([a-z0-9-]+)-(desktop|tablet|mobile)\.png$/.exec(image);
  const sector=/^screenshots\/sector-([a-z0-9-]+)-(ru|en)-(home|services|approach|contact)-(desktop|tablet|mobile)\.png$/.exec(image);
  if(theme)base='sites/theme-'+theme[1];
  else if(sector)base='sites/sector-'+sector[1]+'-'+sector[2];
  else throw Error('Unknown screenshot source route: '+image);
  if(sector&&sector[3]!=='home'){
   html=base+'/'+sector[3]+'/index.html';href='../assets/preview.css';
  }else{html=base+'/index.html';href='assets/preview.css';}
  css=base+'/assets/preview.css';
 }
 return Object.freeze({html,css,href});
}
function readSource(root,relative){
 const base=path.resolve(root),baseStat=fs.lstatSync(base);
 if(baseStat.isSymbolicLink()||!baseStat.isDirectory()||fs.realpathSync(base)!==base)
  throw Error('Visual source root must be canonical');
 const file=path.join(base,...relative.split('/')),before=fs.lstatSync(file);
 if(before.isSymbolicLink()||!before.isFile()||before.size>MAX_SOURCE_BYTES||
  fs.realpathSync(file)!==file||!file.startsWith(base+path.sep))
  throw Error('Unsafe generated source: '+relative);
 const bytes=fs.readFileSync(file),after=fs.lstatSync(file);
 if(!after.isFile()||after.isSymbolicLink()||bytes.length!==after.size||
    ['dev','ino','size','mtimeMs','ctimeMs'].some(k=>before[k]!==after[k]))
  throw Error('Generated source changed during capture: '+relative);
 return bytes;
}
function sourceIdentity(root,image){
 const src=sourcePaths(image),html=readSource(root,src.html),css=readSource(root,src.css);
 const text=html.toString('utf8');
 if(!/^<!doctype html>/i.test(text)||Buffer.byteLength(text,'utf8')!==html.length||
    text.split('<link rel="stylesheet" href="'+src.href+'">').length!==2)
  throw Error('Generated page stylesheet contract mismatch: '+src.html);
 return Object.freeze({html:src.html,htmlSha256:sha(html),css:src.css,cssSha256:sha(css)});
}
function assertSourceIdentity(root,image,claimed){
 const actual=sourceIdentity(root,image);
 if(!claimed||typeof claimed!=='object'||Array.isArray(claimed)||
    Object.keys(claimed).sort().join(',')!=='css,cssSha256,html,htmlSha256'||
    claimed.html!==actual.html||claimed.css!==actual.css||
    claimed.htmlSha256!==actual.htmlSha256||claimed.cssSha256!==actual.cssSha256)
  throw Error('Visual source bytes or identity mismatch: '+image);
 return actual;
}
module.exports=Object.freeze({sourcePaths,sourceIdentity,assertSourceIdentity});
