'use strict';
// Source-preserving rich-text edits: no silent loss of author-approved
// emphasis, colors or inline hyperlinks in the full-page Studio workflows.
const assert=require('node:assert/strict');
const R=require('../studio/rich-text-edit.cjs');
const source={id:'rich-title',type:'heading',level:1,text:'Монтаж и доставка',runs:[
 {text:'Монтаж ',strong:true,color:'@accent'},
 {text:'и доставка',italic:true,href:'/contact/'}
]};
const original=structuredClone(source);
const single=R.replaceLiteral(source,'Монтаж','Производство');
assert.equal(single.blocked,false);
assert.equal(single.after,'Производство и доставка');
assert.deepEqual(single.runTexts,['Производство ','и доставка']);
const edited=R.updateTexts(source,single.runTexts);
assert.equal(edited.text,'Производство и доставка');
assert.equal(edited.runs[0].strong,true);
assert.equal(edited.runs[0].color,'@accent');
assert.equal(edited.runs[1].italic,true);
assert.equal(edited.runs[1].href,'/contact/');
assert.deepEqual(source,original,'Source graph is never mutated by preview');
const styledChange=R.updateTexts(source,['Собственный ','брендовый текст']);
assert.equal(styledChange.runs[1].href,'/contact/');
assert.equal(styledChange.text,'Собственный брендовый текст');
const cross=R.replaceLiteral(source,'таж и до','замена');
assert.equal(cross.blocked,true,'Cross-style/link matches require manual editing');
assert.equal(cross.after,source.text);
assert.match(cross.reason,/границу/);
const erased=R.replaceLiteral(source,'Монтаж ','');
assert.equal(erased.blocked,true,'Cannot quietly remove a whole rich-text run');
assert.throws(()=>R.updateTexts(source,['','и доставка']),/1–1500/);
assert.throws(()=>R.updateTexts(source,['новый\x00текст','и доставка']),/1–1500/);
assert.throws(()=>R.updateTexts(source,['a'.repeat(1501),'b']),/1–1500/);
assert.throws(()=>R.updateTexts(source,['a'.repeat(1500),'b'.repeat(1501)]),/1–1500/);
const literal=R.replaceLiteral({type:'text',text:'Цена C++ (2026).'},'C++ (2026)','C#');
assert.equal(literal.after,'Цена C#.');
assert.equal(literal.blocked,false);
assert.deepEqual(R.replaceLiteral(source,'НЕСУЩЕСТВУЕТ','Другое').runTexts,source.runs.map(r=>r.text));
process.stdout.write('Rich Graph text editing PASS: run identities, emphasis, links, literal replacement and guarded cross-run matches.\n');
