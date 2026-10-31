#!/usr/bin/env node
'use strict';
/* Read-only local audit of an already-created private first-client SEO packet.
 * SHA256 in a local unsigned manifest is only byte consistency, not provenance.
 */
const PACK=require('../lib/seo-private-lead-integrity.cjs');
const HELP='Usage: node stage3/seo-engine/bin/verify-seo-lead-packet.cjs --bundle /ABS/private/operator-workspace';
function main(argv){
 if(argv.length!==2||argv[0]!=='--bundle')
  throw Error(HELP);
 const report=PACK.verify(argv[1]);
 process.stdout.write('PRIVATE SEO LEAD PACKET BYTE CONSISTENCY: '+
  JSON.stringify(report)+'\n');
 return report;
}
if(require.main===module){
 try{main(process.argv.slice(2));}
 catch(e){process.stderr.write('Private SEO lead packet review REFUSED: '+
  String(e.message)+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({HELP,main});
