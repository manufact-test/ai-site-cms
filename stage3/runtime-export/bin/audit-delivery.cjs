#!/usr/bin/env node
'use strict';
/** D5 human- and automation-friendly read-only preflight of a verified ZIP.
 * No remote checks: this does not certify DNS, TLS, hosting or collector.
 */
const path=require('node:path');
const {audit}=require('../lib/delivery-preflight.cjs');
try{
  const [filename,...options]=process.argv.slice(2);
  const allowed=options.every(x=>x.startsWith('--expect-origin=')
    ||x==='--fail-on-blockers'||x==='--fail-on-performance');
  if(!path.isAbsolute(filename??'')||options.length>3||!allowed
    ||new Set(options.map(x=>x.split('=')[0])).size!==options.length)
    throw Error('Usage: audit-delivery.cjs /ABS/site-delivery.zip [--expect-origin=https://host] [--fail-on-blockers] [--fail-on-performance]');
  const origin=options.find(x=>x.startsWith('--expect-origin='))?.slice('--expect-origin='.length)??null;
  const report=audit(filename,origin);
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(options.includes('--fail-on-blockers')&&report.counts.blockers)process.exitCode=2;
  else if(options.includes('--fail-on-performance')&&report.performance.findings.length)
    process.exitCode=3;
}catch(e){console.error('D5 audit refused: '+e.message);process.exitCode=1;}
