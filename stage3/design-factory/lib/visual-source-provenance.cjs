'use strict';
// Binds each D7 screenshot to immutable generated HTML and CSS bytes.
// A content hash is not browser attestation or human approval.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const MAX_SOURCE_BYTES=2*1024*1024;
const {compositions}=require('../catalog/compositions.cjs');
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

function assertOfflineNavigation(root,htmlPath,html){
 // This is a static link reachability audit, not JavaScript execution.
 // Check local anchors and every linked route, not only pages with screenshots.
 const links=[...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gi)];
 if(links.length>500)throw Error('Generated preview has too many navigation links: '+htmlPath);
 const group=htmlPath.startsWith('showcase/')?'showcase/':
  'sites/'+htmlPath.split('/')[1]+'/';
 for(const match of links){
  const href=match[1];
  if(typeof href!=='string'||!href||!/^([a-zA-Z0-9._/-]*)(?:#([a-zA-Z0-9_-]+))?$/.test(href))
   throw Error('External or unsafe preview navigation: '+href);
  const [route,fragment]=href.split('#');
  if(route&&(!/^(?:[.][.]\/)?(?:[a-z0-9-]+\/)*index[.]html$/.test(route)||route.includes('//')))
   throw Error('Unsupported generated preview route: '+href);
  const target=route?path.posix.normalize(path.posix.join(path.posix.dirname(htmlPath),route)):htmlPath;
  if(!target.startsWith(group)||!target.endsWith('/index.html'))
   throw Error('Preview navigation leaves its own site: '+href);
  const page=target===htmlPath?html:readSource(root,target).toString('utf8');
  if(fragment&&!page.includes('id="'+fragment+'"'))
   throw Error('Preview anchor target is missing: '+href);
 }
 return links.length;
}

function assertShowcaseCoverage(html){
 const ids=[...html.matchAll(/<article class="pattern [^"]+" id="([a-z0-9-]+)">/g)].map(row=>row[1]);
 const expected=compositions.map(c=>c.id);
 if(ids.length!==42||JSON.stringify(ids)!==JSON.stringify(expected))
  throw Error('The full showcase must contain all 42 canonical composition cards in catalog order');
 const anchors=new Set(ids);
 if(anchors.size!==42)throw Error('Duplicate showcase composition anchor');
 return ids;
}
function sourceIdentity(root,image){
 const src=sourcePaths(image),html=readSource(root,src.html),css=readSource(root,src.css);
 const text=html.toString('utf8');
 if(!/^<!doctype html>/i.test(text)||Buffer.byteLength(text,'utf8')!==html.length||
    text.split('<link rel="stylesheet" href="'+src.href+'">').length!==2)
  throw Error('Generated page stylesheet contract mismatch: '+src.html);
 assertOfflineNavigation(root,src.html,text);
 if(src.html==='showcase/index.html')assertShowcaseCoverage(text);
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
module.exports=Object.freeze({sourcePaths,sourceIdentity,assertSourceIdentity,assertOfflineNavigation,assertShowcaseCoverage});
