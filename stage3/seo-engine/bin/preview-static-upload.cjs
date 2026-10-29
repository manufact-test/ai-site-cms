#!/usr/bin/env node
'use strict';
// Browse an already staged upload without deploying it. HTTP loopback ONLY.
const PREVIEW=require('../lib/static-host-preview.cjs');
function parse(args){
 if(!Array.isArray(args)||args.length!==4||
    args[0]!=='--bundle'||!args[1]||
    args[2]!=='--port'||!/^[0-9]{4,5}$/.test(args[3]))
  throw Error('Usage: node stage3/seo-engine/bin/preview-static-upload.cjs --bundle /ABS/new-upload-folder --port 8844');
 return {bundle:args[1],port:Number(args[3])};
}
function main(argv){
 const args=parse(argv),{server,loaded}=PREVIEW.listen(args.bundle,args.port);
 server.on('listening',()=>process.stdout.write(
  'LOCAL STATIC PREVIEW: http://127.0.0.1:'+args.port+
  '/ ; verified files '+loaded.files.size+' ; expected 301 '+loaded.redirects.size+
  ' ; external deployment NOT performed\n'));
 server.on('error',e=>process.stderr.write('Local static preview listener error: '+e.message+'\n'));
 return server;
}
if(require.main===module)
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write('Local preview refused: '+e.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,main});
