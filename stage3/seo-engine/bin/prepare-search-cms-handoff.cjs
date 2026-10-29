#!/usr/bin/env node
'use strict';
/* Safe read-only handoff from human-confirmed SEO tasks to current CMS field review. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {checkBlueprint}=require('../lib/blueprint.cjs');
const {auditSite}=require('../lib/analyze.cjs');
const LEDGER=require('../lib/search-action-ledger.cjs');
const BRIDGE=require('../lib/search-cms-handoff.cjs');
const PRIVATE=require('../lib/private-output-policy.cjs');
const HELP='Usage: node stage3/seo-engine/bin/prepare-search-cms-handoff.cjs --blueprint /ABS/approved-blueprint.json --site /ABS/current-owner-published-site-v1.json --history /ABS/search-history.json --ledger /ABS/edited-ledger.json --out /ABS/NEW-private-cms-ops [--manifests /ABS/component-manifests]';
function args(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 if(argv.length%2)throw Error(HELP);
 const flags={};
 for(let i=0;i<argv.length;i+=2){
  const name=argv[i]?.replace(/^--/,'');
  if(!argv[i]?.startsWith('--')||!['blueprint','site','history','ledger','out','manifests'].includes(name)||
   !path.isAbsolute(argv[i+1]||'')||flags[name])throw Error('Invalid SEO CMS handoff flag '+argv[i]);
  flags[name]=argv[i+1];
 }
 if(['blueprint','site','history','ledger','out'].some(k=>!flags[k]))throw Error(HELP);
 return flags;
}
function file(p,max){
 const stat=fs.lstatSync(p);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size<10||stat.size>max)throw Error('Invalid/oversized private handoff input');
 const buf=fs.readFileSync(p);
 return {json:JSON.parse(buf.toString('utf8')),
  sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
function main(argv){
 const f=args(argv);
 if(!f){process.stdout.write(HELP+'\n');return;}
 const bp=file(f.blueprint,2500000),plan=checkBlueprint(bp.json);
 const site=file(f.site,2500000);
 const hist=file(f.history,4500000),ledger=file(f.ledger,4500000);
 if(hist.json.blueprintSha256!==bp.sha256||hist.json.siteId!==plan.siteId)
  throw Error('Historical SEO actions do not match exact approved Blueprint bytes and siteId');
 const registryFolder=f.manifests||path.resolve(__dirname,'../../components');
 const manifests=fs.readdirSync(registryFolder).filter(n=>n.endsWith('.json')).map(name=>
  JSON.parse(fs.readFileSync(path.join(registryFolder,name),'utf8')));
 auditSite(site.json,manifests,plan);
 const ownerReview=LEDGER.review(hist.json,hist.sha256,ledger.json);
 const packet=BRIDGE.build(site.json,manifests,plan,hist.json,ownerReview,hist.sha256);
 packet.inputs={blueprintSha256:bp.sha256,siteSha256:site.sha256,
  searchHistorySha256:hist.sha256,actionLedgerSha256:ledger.sha256};
 const output=PRIVATE.privateOutput(f.out);
 fs.mkdirSync(output,{mode:0o700,recursive:false});
 const write=(name,data)=>{
  const fd=fs.openSync(path.join(output,name),'wx',0o600);
  try{fs.writeFileSync(fd,data);}finally{fs.closeSync(fd);}
 };
 write('cms-search-work-packets.json',JSON.stringify(packet,null,2)+'\n');
 write('cms-search-work-packets.md',BRIDGE.markdown(packet));
 write('PRIVATE-README.txt','Private search/CMS owner data. Non-executable, no Save, Publish, customer acceptance or deploy. Never commit this directory.\n');
 process.stdout.write('Manual SEO → CMS packets: '+packet.summary.activeWorkPackets+' active, '+
  packet.summary.reportedCompleteNeedsVerification+' claimed done, '+
  packet.summary.blockedForCurrentSiteDrift+' blocked. Output: '+output+'\n');
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){process.stderr.write('SEO CMS handoff: '+e.message+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({main,args});
