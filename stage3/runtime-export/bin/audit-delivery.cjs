#!/usr/bin/env node
'use strict';
/** D5 human- and automation-friendly read-only preflight of a verified ZIP.
 * No remote checks: this does not certify DNS, TLS, hosting or collector.
 */
const path=require('node:path');
const {audit}=require('../lib/delivery-preflight.cjs');
try{
  const [filename,...options]=process.argv.slice(2);
  if(!path.isAbsolute(filename??'')||options.length>2
    ||options.some(x=>!x.startsWith('--expect-origin=')&&x!=='--fail-on-blockers'))
    throw Error('Usage: audit-delivery.cjs /ABS/site-delivery.zip [--expect-origin=https://host] [--fail-on-blockers]');
  const origin=options.find(x=>x.startsWith('--expect-origin='))?.slice('--expect-origin='.length)??null;
  const report=audit(filename,origin);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(options.includes('--fail-on-blockers')&&report.counts.blockers)process.exitCode=2;
}catch(e){console.error('D5 audit refused: '+e.message);process.exitCode=1;}
