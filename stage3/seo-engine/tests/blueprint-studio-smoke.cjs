'use strict';
/* Real compiler/Blueprint contract and browser payload guardrails; no CMS or network. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const BP=require('../lib/blueprint.cjs'),STUDIO=require('../lib/blueprint-studio.cjs');
const brief=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
const original=BP.compileBrief(brief);
const reconstructed=STUDIO.briefFromBlueprint(original);
assert.deepEqual(BP.compileBrief(reconstructed),original);
const second=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/community.blueprint.json'),'utf8'));
assert.deepEqual(BP.compileBrief(STUDIO.briefFromBlueprint(second)),second);
assert.deepEqual(STUDIO.starter('site-new-example').pages.map(x=>x.path),['/']);
assert.throws(()=>STUDIO.starter('Invalid Site ID'),/stable site ID/);
assert.throws(()=>STUDIO.render(STUDIO.starter('site-new-example')),/title|invalid text/);
const html=STUDIO.render(brief);
const draft=STUDIO.render(STUDIO.starter('site-new-example'),{allowIncomplete:true});
for(const label of ['Add page','Add section','Add fact','Add source','Export for SEO compiler',
 'Architecture intelligence','Orphan plan','Explicit edges',
 'Save editable draft','Import private draft','Canonical page path','Structured data candidates'])
 assert(html.includes(label),'Missing UI control: '+label);
assert(html.includes('connect-src &#39;none&#39;'));
assert(!html.includes('fetch(')&&!html.includes('https://cdn.'));
assert(html.includes('site-industrial-demo'));
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script,'Private HTML must include one UI script');
assert.doesNotThrow(()=>new Function(script));
const base64=crypto.createHash('sha256').update(script).digest('base64');
assert(html.includes('script-src &#39;sha256-'+base64+'&#39;'));
const input=html.match(/<script type="application\/json" id="source-json">([\s\S]*?)<\/script>/)?.[1];
assert(input);
assert.deepEqual(JSON.parse(input),brief);
assert(draft.includes('site-new-example'));
const dangerous=JSON.parse(JSON.stringify(brief));
dangerous.goal='This editor handles <script>alert(1)</script> safely';
assert.throws(()=>STUDIO.render(dangerous),/invalid text/);
const injection=STUDIO.render({...STUDIO.starter('site-new-example'),goal:'</script><img src=x onerror=alert(1)>'},
 {allowIncomplete:true});
assert(!injection.includes('</script><img'));
assert(injection.includes('\\u003c/script'));
assert.throws(()=>STUDIO.briefFromBlueprint({...original,version:2}),/unsupported version/);
console.log('Blueprint Studio compiler roundtrip, offline HTML and safe payload smoke PASS.');
