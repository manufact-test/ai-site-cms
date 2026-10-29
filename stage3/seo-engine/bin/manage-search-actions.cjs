#!/usr/bin/env node
'use strict';
/* Human-only SEO task acceptance and review, pinned to private historical observations. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const PRIVATE=require('../lib/private-output-policy.cjs');
const LEDGER=require('../lib/search-action-ledger.cjs');
const HELP='Usage: node stage3/seo-engine/bin/manage-search-actions.cjs template --history /ABS/search-history.json --out /ABS/NEW-private-dir [--previous-history /ABS/old-history.json --previous-ledger /ABS/old-ledger.json]\nOR: node stage3/seo-engine/bin/manage-search-actions.cjs review --history /ABS/search-history.json --ledger /ABS/edited-action-ledger.json --out /ABS/NEW-private-dir';
function args(argv){
 if(argv.length===1&&argv[0]==='--help')return null;
 const [command,...rest]=argv;
 if(!['template','review'].includes(command)||rest.length%2)throw Error(HELP);
 const flags={};
 for(let i=0;i<rest.length;i+=2){
  const key=rest[i].replace(/^--/,'');
  if(!rest[i].startsWith('--')||!['history','ledger','out','previous-history','previous-ledger'].includes(key)||
     flags[key]||!path.isAbsolute(rest[i+1]||''))throw Error('Unexpected, repeated or non-absolute path '+rest[i]);
  flags[key]=rest[i+1];
 }
 if(!flags.history||!flags.out||
  (command==='review'&&(!flags.ledger||flags['previous-ledger']||flags['previous-history']))||
  (command==='template'&&(flags.ledger||!!flags['previous-history']!==!!flags['previous-ledger'])))
  throw Error(HELP);
 return {command,flags};
}
function read(file){
 const s=fs.lstatSync(file);
 if(!s.isFile()||s.isSymbolicLink()||s.size<10||s.size>4500000)
  throw Error('Invalid or over-large private SEO report/ledger file');
 const buf=fs.readFileSync(file);
 return {json:JSON.parse(buf.toString('utf8')),
  sha256:crypto.createHash('sha256').update(buf).digest('hex')};
}
function writeFolder(folder,contents){
 if(fs.existsSync(folder))throw Error('Never overwrite an existing private action folder');
 fs.mkdirSync(folder,{mode:0o700,recursive:false});
 for(const [name,body] of Object.entries(contents)){
  const fd=fs.openSync(path.join(folder,name),'wx',0o600);
  try{fs.writeFileSync(fd,body);}finally{fs.closeSync(fd);}
 }
}
function main(argv){
 const f=args(argv);
 if(!f){process.stdout.write(HELP+'\n');return;}
 const hist=read(f.flags.history),dest=PRIVATE.privateOutput(f.flags.out);
 if(f.command==='template'){
  let old=null;
  if(f.flags['previous-history']){
   const previous=read(f.flags['previous-history']);
   const ledger=read(f.flags['previous-ledger']);
   LEDGER.review(previous.json,previous.sha256,ledger.json);
   if(previous.json.siteId!==hist.json.siteId||
      previous.json.blueprintSha256!==hist.json.blueprintSha256||
      previous.json.declaredSearchContext?.comparabilityKey!==hist.json.declaredSearchContext?.comparabilityKey||
      previous.json.periods.at(-1).period.end>=hist.json.periods.at(-1).period.end)
    throw Error('Cannot carry previous decisions from another site/approved plan/filter or newer period');
   old=ledger.json;
  }
  const t=LEDGER.template(hist.json,hist.sha256,old);
  writeFolder(dest,{
   'search-actions-template.json':JSON.stringify(t,null,2)+'\n',
   'PRIVATE-README.txt':'Edit a COPY of the action template. Human work statuses are declarations, not CMS approval. Keep outside Git and public ZIP.\n'
  });
  process.stdout.write('Created private template for '+t.actions.length+' search operations: '+dest+'\n');
 }else{
  const ledger=read(f.flags.ledger);
  const r=LEDGER.review(hist.json,hist.sha256,ledger.json);
  writeFolder(dest,{
   'search-action-review.json':JSON.stringify(r,null,2)+'\n',
   'search-action-review.md':LEDGER.markdown(r),
   'PRIVATE-README.txt':'Human decision review only; completed-reported is NOT a verified SEO outcome or CMS release.\n'
  });
  process.stdout.write('Reviewed '+r.summary.total+' human SEO decisions; '+r.summary.manualWorkQueue+' active, '+
   r.summary.awaitingHumanReview+' unreviewed; output '+dest+'\n');
 }
}
if(require.main===module){
 try{main(process.argv.slice(2));}catch(e){process.stderr.write('SEO operations: '+e.message+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({main,args});
