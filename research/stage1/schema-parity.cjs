/* Stage 1: identical fixtures through RJSF AJV8 validator, no CMS code. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const mod=require('@rjsf/validator-ajv8');
const Ajv2020Module=require('ajv/dist/2020');
const Ajv2020=Ajv2020Module.default||Ajv2020Module;
const validator=mod.customizeValidator({AjvClass:Ajv2020});
const schema=JSON.parse(fs.readFileSync(path.join(__dirname,'typed-manifest.schema.json'),'utf8'));
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'schema-parity-fixtures.json'),'utf8'));
let passed=0;
for(const test of fixtures.cases){
 const outcome=validator.validateFormData(test.instance,schema);
 const actual=outcome.errors.length===0;
 console.log('RJSF_SCHEMA_PARITY '+JSON.stringify({name:test.name,expected:test.valid,actual,errorCount:outcome.errors.length}));
 assert.equal(actual,test.valid,'RJSF AJV8 divergence: '+test.name+': '+JSON.stringify(outcome.errors));
 passed++;
}
console.log('STAGE1_RJSF_SCHEMA_PARITY=PASS '+passed+' cases, RJSF @rjsf/validator-ajv8 6.11.0');
