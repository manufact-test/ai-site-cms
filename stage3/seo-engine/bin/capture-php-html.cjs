#!/usr/bin/env node
'use strict';
// Writes only a new local evidence directory. Requires lead-integrated checkout.
const CAP=require('../lib/php-html-capture.cjs');
function main(argv){
 if(argv.length!==6||argv[0]!=='--approved-site'||argv[2]!=='--origin'||argv[4]!=='--output')
  throw Error('Usage: node stage3/seo-engine/bin/capture-php-html.cjs --approved-site /ABS/sealed --origin http://127.0.0.1:PORT/published/SITE-ID/ --output /ABS/new-evidence-folder');
 return CAP.capture(argv[1],argv[3],argv[5]);
}
if(require.main===module)
 main(process.argv.slice(2))
  .then(x=>process.stdout.write('LOCAL PHP HTML CAPTURE: '+JSON.stringify(x)+'\n'))
  .catch(e=>{process.stderr.write('SEO Engine: '+e.message+'\n');process.exitCode=1;});
module.exports=Object.freeze({main});
