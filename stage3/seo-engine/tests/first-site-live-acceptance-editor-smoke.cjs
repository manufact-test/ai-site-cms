'use strict';
/* Standalone offline editor rendering guardrails; no browser POST or internet. */
const assert=require('node:assert/strict');
const EDIT=require('../lib/first-site-live-acceptance-editor.cjs');
const FLOW=require('../lib/first-site-live-acceptance.cjs');
const z='a'.repeat(64);
const sample={format:FLOW.FORMAT,version:2,siteId:'site-1',
 pinned:{publishedVersion:4,sourceRevisionClaim:9,publicZipSha256:z,originalPhpReviewBundleSha256:z},
 required:{pages:['/','/contact/'],formOccurrencesByPage:{'/':0,'/contact/':2},
  formRefsByPage:{'/':[],'/contact/':['contact-first','contact-second']},
  observedPhpFormOccurrences:2},
 tasks:[{id:'page:/:desktop',kind:'browser',page:'/',viewport:'desktop',
  label:'Desktop visual check',state:'unreviewed',observedAt:null,checkedBy:'',evidenceRef:'',notes:''}],
 formTests:[]};
const html=EDIT.render(sample);
assert(html.startsWith('<!doctype html>'));
assert(html.includes('connect-src &#39;none&#39;'));
assert(html.includes('script-src &#39;sha256-'));
assert(html.includes('contact-first')&&html.includes('contact-second'));
assert(html.includes('Download private filled JSON'));
assert(!html.includes('https://')&&!html.includes('fetch('));
assert.throws(()=>EDIT.render({...sample,version:1}),/worksheet/);
assert.throws(()=>EDIT.render({...sample,formTests:[{page:'/contact/',formRef:'contact-first'}]}),/original unfilled/);
const injected=EDIT.render({...sample,siteId:'site-1</script><img src=x onerror=alert(1)>'});
assert(!injected.includes('</script><img'));
assert(injected.includes('\\u003c/script'));
console.log('Private offline evidence editor synthetic smoke PASS.');
