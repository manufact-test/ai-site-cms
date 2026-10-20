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
bad({results:[{vulns:{}},{}]},'malformed vulnerability body');
bad({results:[{vulns:[{id:'GHSA-A'}, {id:'GHSA-A'}]},{}]},'duplicate advisory');
bad({results:[{vulns:[{id:'<script>'}]},{}]},'invalid advisory ID');
bad({results:'untrusted'},'unexpected type');
console.log('OSV strict-response fixture PASS '+count+' cases, no network or false online coverage');
