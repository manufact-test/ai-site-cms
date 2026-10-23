#!/usr/bin/env node
// Deterministic shape/security checks; NO OSV internet calls or fake "0 CVE" assertion.
import assert from 'node:assert/strict';
import {evaluateBatch} from './osv-strict-snapshot.mjs';
const rows=[{ecosystem:'Packagist',name:'vendor/one',version:'1.0.0'},
            {ecosystem:'npm',name:'editor-test',version:'2.0.0'}];
let count=0;
function good(response,name){
  const data=evaluateBatch(rows,response);
  assert.equal(data.length,2);
  count++;console.log('PASS '+name);
  return data;
}
function bad(response,name){
  assert.throws(()=>evaluateBatch(rows,response),/OSV_INCOMPLETE/);
  count++;console.log('PASS '+name+' rejected');
}
const empty=()=>({results:[{},{}]});
assert.deepEqual(good(empty(),'full empty response').map(x=>x.count),[0,0]);
assert.equal(good({results:[{vulns:[{id:'GHSA-aaaa-bbbb-cccc'}]},{}]},
  'full response with advisory')[0].advisoryIds[0],'GHSA-aaaa-bbbb-cccc');
bad({results:[{}]},'incomplete response count');
bad({results:[{vulns:[]}, {},{}]},'unexpected extra responses');
bad({results:[null,{}]},'missing OSV object');
bad({results:[{next_page_token:'unread'},{}]},'unconsumed pagination');
bad({results:[{next_page_token:''},{}]},'present but empty pagination token');
bad({results:[{vulns:{}},{}]},'malformed vulnerability body');
bad({results:[{vulns:[{id:'GHSA-A'}, {id:'GHSA-A'}]},{}]},'duplicate advisory');
bad({results:[{vulns:[{id:'<script>'}]},{}]},'invalid advisory ID');
bad({results:'untrusted'},'unexpected type');
console.log('OSV strict-response fixture PASS '+count+' cases, no network or false online coverage');

// Exercise the actual querybatch transport and stream handling with a fake
// Response-like object. This never calls fetch() or contacts OSV.
import {makeRows, snapshot} from './osv-strict-snapshot.mjs';
const encoder=new TextEncoder();
const jsonBytes=x=>encoder.encode(JSON.stringify(x));
function fakePost(bytes,{ok=true,status=200,body=true,inspect=true}={}){
  return async (url,options)=>{
    if(inspect){
      assert.equal(url,'https://api.osv.dev/v1/querybatch');
      assert.equal(options.method,'POST');
      assert.equal(options.headers['content-type'],'application/json');
      assert.equal(options.headers.accept,'application/json');
      assert.equal(options.signal.aborted,false);
      const query=JSON.parse(options.body).queries;
      assert.deepEqual(query,[
        {package:{ecosystem:'Packagist',name:'vendor/one'},version:'1.0.0'},
        {package:{ecosystem:'npm',name:'editor-test'},version:'2.0.0'}
      ]);
    }
    return {ok,status,body:body?new ReadableStream({start(c){
      c.enqueue(bytes);c.close();
    }}):null};
  };
}
async function transportAccept(bytes,name){
  const result=await snapshot(rows,fakePost(bytes));
  assert.equal(result.length,2);
  count++;console.log('PASS '+name);
  return result;
}
async function transportReject(bytes,name,options={}){
  await assert.rejects(snapshot(rows,fakePost(bytes,options)),/OSV_INCOMPLETE/);
  count++;console.log('PASS '+name+' rejected');
}
await transportAccept(jsonBytes(empty()),'correct querybatch POST contract');
await transportAccept(jsonBytes({results:[{vulns:[{id:'GHSA-aaaa-bbbb-cccc'}]},{}]}),
  'advisory retained by streaming transport');
await transportReject(jsonBytes(empty()),'non-2xx transport',{ok:false,status:503});
await transportReject(jsonBytes(empty()),'missing stream',{body:false});
await transportReject(new Uint8Array([32]),'empty stream');
await transportReject(encoder.encode('{'),'truncated JSON stream');
await transportReject(new Uint8Array([255,254]),'invalid UTF-8 stream');
await transportReject(jsonBytes({results:[{}]}),'stream with missing package result');
await transportReject(jsonBytes({results:[{next_page_token:'more'},{}]}),'stream with unread page');
await transportReject(new Uint8Array(4*1024*1024+1),'over-limit streaming response');

// Independently exercise lock inventory input guards without any online lookup.
const packages=Array.from({length:14},(_,i)=>({
  name:"vendor/p"+i,version:'1.0.0',source:{reference:'a'.repeat(40)},
  dist:{reference:'a'.repeat(40)}
}));
const composer={packages,'packages-dev':[]};
const npm={lockfileVersion:3,packages:Object.fromEntries(
  Array.from({length:29},(_,i)=>["node_modules/npm-test-"+i,
    {version:'1.0.0',integrity:'sha512-'+'A'.repeat(86)+'=='}])
)};
function validLock(name){
  const actual=makeRows(composer,npm);
  assert.equal(actual.length,43);
  assert.equal(actual.filter(x=>x.ecosystem==='Packagist').length,14);
  count++;console.log('PASS '+name);
}
function rejectLock(name,mutate){
  const c=structuredClone(composer),n=structuredClone(npm);
  mutate(c,n);
  assert.throws(()=>makeRows(c,n),/OSV_INCOMPLETE/);
  count++;console.log('PASS '+name+' rejected');
}
validLock('complete synthetic 14+29 pinned inventory');
rejectLock('unreviewed Composer dev package',(c)=>c['packages-dev'].push({name:'rogue'}));
rejectLock('missing Composer source pin',(c)=>delete c.packages[0].source);
rejectLock('mismatched Composer dist pin',(c)=>c.packages[0].dist.reference='b'.repeat(40));
rejectLock('duplicate Composer package name',(c)=>c.packages[1].name=c.packages[0].name);
rejectLock('missing npm SHA512 integrity',(_,n)=>delete n.packages['node_modules/npm-test-0'].integrity);
rejectLock('invalid npm inventory path',(_,n)=>n.packages['invalid-entry']=n.packages['node_modules/npm-test-0']);
rejectLock('incomplete npm inventory',(_,n)=>delete n.packages['node_modules/npm-test-0']);
rejectLock('incomplete Composer inventory',(c)=>c.packages.pop());
console.log('OSV strict-response + transport + lock fixture PASS '+count+' cases; no live network or 43/43 online claim');
