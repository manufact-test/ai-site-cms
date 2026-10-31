#!/usr/bin/env node
'use strict';
/* Private visualization of already generated first-site and post-deploy reports. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const VIEW=require('../lib/first-site-launch-cockpit.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const HELP='Usage: node stage3/seo-engine/bin/build-first-site-cockpit.cjs --summary /ABS/first-site/summary.json [--bundle /ABS/first-site/bundle.json] [--post-deploy /ABS/post-deploy-summary.json] [--operator-review /ABS/first-site-operator-review.json] --out /ABS/NEW-PRIVATE-DIR';
function flags(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length%2)throw Error(HELP);
 const f={};
 for(let i=0;i<argv.length;i+=2){
  const k=argv[i].replace(/^--/,'');
  if(!argv[i].startsWith('--')||!['summary','bundle','post-deploy','operator-review','out'].includes(k)||f[k]||
   !path.isAbsolute(argv[i+1]||''))throw Error('Unsupported or repeated cockpit flag '+argv[i]);
  f[k]=argv[i+1];
 }
 if(!f.summary||!f.out)throw Error(HELP);
 return f;
}
function read(file,max){
 const st=fs.lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size<10||st.size>max)
  throw Error('Invalid or oversized private first-site report');
 const data=fs.readFileSync(file);
 return {json:JSON.parse(data.toString('utf8')),
  sha256:crypto.createHash('sha256').update(data).digest('hex')};
}
function main(argv){
 const f=flags(argv);
 if(!f){process.stdout.write(HELP+'\n');return;}
 const summary=read(f.summary,1500000),bundle=f.bundle?read(f.bundle,45000000):null,
  post=f['post-deploy']?read(f['post-deploy'],2500000):null;
 const operator=f['operator-review']?read(f['operator-review'],2000000):null;
 const report=VIEW.render(summary.json,bundle?.json||null,post?.json||null,operator?.json||null,summary.sha256);
 const folder=PRIVATE.privateOutput(f.out);
 fs.mkdirSync(folder,{recursive:false,mode:0o700});
 function write(file,body){
  const fd=fs.openSync(path.join(folder,file),'wx',0o600);
  try{fs.writeFileSync(fd,body);}finally{fs.closeSync(fd);}
 }
 write('index.html',report.html);
 write('cockpit-manifest.json',JSON.stringify({format:report.format,siteId:report.siteId,
  disposition:report.disposition,releaseAuthorized:false,readOnly:true,
  summary:report.summary,inputSHA256:{summary:summary.sha256,bundle:bundle?.sha256||null,postDeploy:post?.sha256||null,operatorReview:operator?.sha256||null}},null,2)+'\n');
 write('PRIVATE-README.txt','Local operator-only launch cockpit. NOT verified live launch or client signoff. Never copy to public CMS export, host, repository or ZIP.\n');
 process.stdout.write('PRIVATE FIRST SITE COCKPIT: '+report.disposition+'; local HTML '+path.join(folder,'index.html')+'\n');
}
if(require.main===module){try{main(process.argv.slice(2));}catch(e){process.stderr.write('First-site cockpit: '+e.message+'\n');process.exitCode=1;}}
module.exports=Object.freeze({flags,main});
