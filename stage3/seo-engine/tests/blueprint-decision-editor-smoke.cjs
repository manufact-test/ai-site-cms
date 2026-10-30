'use strict';
/* Real offline editor JS executed against a minimal DOM; no external browser/network. */
const assert=require('node:assert/strict'),crypto=require('node:crypto'),
 fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const BP=require('../lib/blueprint.cjs');
const DIFF=require('../lib/blueprint-change-review.cjs');
const LEDGER=require('../lib/blueprint-change-decisions.cjs');
const EDIT=require('../lib/blueprint-decision-editor.cjs');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../fixtures/industrial.brief.json'),'utf8'));
const old=BP.compileBrief(fixture),next=JSON.parse(JSON.stringify(fixture));
next.pages[1].path='/new-contact/';
const comparison=DIFF.compare(old,BP.compileBrief(next));
const html=EDIT.render(comparison);
assert(html.includes('Private Blueprint Decision Desk'));
assert(html.includes('Save unfinished worksheet'));
assert(html.includes('Import existing decision draft'));
assert(html.includes('connect-src &#39;none&#39;'));
assert(!html.includes('fetch('));
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(js,'Needs a self-contained local browser script');
assert.equal(crypto.createHash('sha256').update(js).digest('base64'),
 html.match(/script-src &#39;sha256-([^']+)&#39;/)[1]);
assert.doesNotThrow(()=>new Function(js));
const elems=new Map(),downloads=[],blobs=[];
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.value='';this.textContent='';
  this.handlers={};this.open=false;this.hidden=false;this.files=[];}
 append(...args){this.children.push(...args);}
 replaceChildren(...args){this.children=args;}
 addEventListener(event,fn){this.handlers[event]=fn;}
 click(){if(this.tag==='a')downloads.push({filename:this.download,body:blobs.at(-1)?.[0]});
  else this.handlers.click?.();}
 remove(){}
 scrollIntoView(){}
}
const document={body:new Element('body'),createElement:t=>new Element(t),
 getElementById:id=>{if(!elems.has(id))elems.set(id,new Element('div'));return elems.get(id);}};
const $=id=>document.getElementById(id);
const source=LEDGER.template(comparison);
$('source-json').textContent=JSON.stringify({
 template:source,actions:comparison.actions.map(a=>({
  id:a.id,priority:a.priority,pageId:a.pageId,owner:a.owner,
  reason:a.reason,instruction:a.instruction,evidenceNeeded:a.evidenceNeeded
 }))});
$('priority').value='all';$('state').value='all';
vm.runInNewContext(js,{document,
 URL:{createObjectURL:blob=>{blobs.push(blob.content);return 'blob:local';},revokeObjectURL:()=>{}},
 Blob:class{constructor(content,options){this.content=content;this.options=options;}},
 setTimeout:fn=>fn()},{timeout:1500});
assert.equal($('actions').children.length,comparison.actions.length);
const first=$('actions').children[0].children[1].children[4];
const form=i=>first.children[i].children[1];
const set=(i,v,event='input')=>{form(i).value=v;form(i).handlers[event]();};
$('draft').click();
assert.equal(downloads.length,1);
assert(downloads[0].filename.startsWith('blueprint-decisions-draft-'));
set(0,'accepted','change');
$('export').click();
assert.equal(downloads.length,1,'Cannot export accepted decision without evidence');
set(1,'Lead operator');set(2,'2026-10-30');set(3,'private-evidence://approval');
$('export').click();
assert.equal(downloads.length,2);
const reviewed=JSON.parse(downloads[1].body);
assert.equal(LEDGER.evaluate(comparison,reviewed).counts.accepted,1);
assert.equal(LEDGER.evaluate(comparison,reviewed).releaseAuthorized,false);
$('search').value='never-matches-a-task';$('search').handlers.input();
assert($('actions').children.every(card=>card.hidden));
const broken=EDIT.render({...comparison,siteId:'site-a</script><script>alert(1)</script>'});
assert(!broken.includes('site-a</script><script>alert'));
assert(broken.includes('\\u003c/script'));
console.log('Blueprint Decision Desk browser, CSP, exact release and strict export smoke PASS.');
