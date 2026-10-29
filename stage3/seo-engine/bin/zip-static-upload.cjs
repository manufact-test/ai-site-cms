#!/usr/bin/env node
'use strict';
// Convert a complete, independently SHA256-verified public upload directory
// into a reproducible ZIP. Does NOT deploy, call CMS or put secrets in ZIP.
const path=require('node:path');
const ZIP=require('../lib/static-upload-zip.cjs');
function parse(argv){
 if(!Array.isArray(argv)||argv.length!==4||
    argv[0]!=='--bundle'||!argv[1]||argv[2]!=='--out'||!argv[3]||
    !path.isAbsolute(argv[1])||!path.isAbsolute(argv[3]))
  throw Error('Usage: node stage3/seo-engine/bin/zip-static-upload.cjs --bundle /ABS/private-static-upload --out /ABS/NEW-public-site.zip');
 if(!argv[3].endsWith('.zip'))throw Error('Output must be a new .zip file');
 return {bundle:argv[1],out:argv[3]};
}
function main(argv){
 const o=parse(argv);return ZIP.zip(o.bundle,o.out);
}
if(require.main===module)
 try{process.stdout.write('STATIC SITE VERIFIED ZIP: '+JSON.stringify(main(process.argv.slice(2)))+'\n');}
 catch(error){process.stderr.write('Static ZIP refused: '+error.message+'\n');process.exitCode=1;}
module.exports=Object.freeze({parse,main});
