#!/usr/bin/env node
'use strict';
// Verify the self-declared D7 v3 receipt against 54 real PNGs + 42 pattern verdicts.
// This verifies evidence integrity, NOT reviewer identity, PHP parity or release rights.
const fs=require('node:fs');
const path=require('node:path');
const {verify}=require('../lib/visual-review.cjs');
try{
 if(process.argv.length!==4)throw Error('Usage: node bin/verify-visual-review.cjs EVIDENCE_DIR REVIEW_RECEIPT.json');
 const directory=path.resolve(process.argv[2]);
 const target=path.resolve(process.argv[3]);
 if(!fs.statSync(directory).isDirectory()||!fs.statSync(target).isFile())
  throw Error('Evidence directory and review receipt JSON must exist');
 if(fs.statSync(target).size>512*1024)throw Error('Oversized review receipt');
 const review=JSON.parse(fs.readFileSync(target,'utf8'));
 console.log(JSON.stringify(verify(directory,review),null,2));
}catch(error){
 console.error('DESIGN_FACTORY_D7_VISUAL_REVIEW FAIL: '+error.message);
 process.exitCode=2;
}
