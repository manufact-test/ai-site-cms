'use strict';
// An out-of-band operator scope restriction for a FUTURE permissioned host check.
// This is NOT a digital signature and cannot establish who granted access.
// No host access is performed by this module. Default CLI must remain dormant.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const FORMAT='ai-site-cms-stage2-readonly-host-scope-v1';
const KEYS=['format','repository','scope','cmsOrigin','siteOrigin','reference','issuedAt','expiresAt'];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function exact(o,keys) {
  if(!o||typeof o!=='object'||Array.isArray(o))return false;
  return Object.keys(o).sort().join('|')===keys.slice().sort().join('|');
}
function parseTime(s) {
  if(typeof s!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(s))
    throw Error('invalid_scope_time');
  const ms=Date.parse(s);
  if(!Number.isFinite(ms)||new Date(ms).toISOString()!==s.replace('Z','.000Z'))
    throw Error('invalid_scope_time');
  return ms;
}
function inspectScope(obj,origins,now=Date.now()){
  if(!exact(obj,KEYS)||obj.format!==FORMAT
    ||obj.repository!=='manufact-test/ai-site-cms'
    ||obj.scope!=='target-readonly-https-get'
    ||typeof obj.reference!=='string'
    ||!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{5,95}$/.test(obj.reference)
    ||typeof obj.cmsOrigin!=='string'||typeof obj.siteOrigin!=='string')
    throw Error('invalid_scope_schema');
  const issued=parseTime(obj.issuedAt),expires=parseTime(obj.expiresAt);
  if(expires<=issued||expires-issued>86400000||now<issued||now>=expires
    ||!origins||obj.cmsOrigin!==origins.cmsOrigin||
    obj.siteOrigin!==origins.siteOrigin)
    throw Error('expired_or_mismatched_scope');
  return Object.freeze({
    scopeReferenceSha256:hash(obj.reference),
    scopeExpiresAt:obj.expiresAt,
    originPairSha256:hash(JSON.stringify([obj.cmsOrigin,obj.siteOrigin])),
    operatorScopeRecordSha256:hash(JSON.stringify(KEYS.map(k=>obj[k]))),
    operatorRecordIsIndependentOwnerProof:false
  });
}
function readScope(file,origins,now=Date.now()){
  if(typeof file!=='string'||file.length>4096||!path.isAbsolute(file)
    ||file.includes('\0')||file.includes('\\')
    ||path.normalize(file)!==file)throw Error('unsafe_scope_path');
  const parent=path.dirname(file);
  const ps=fs.lstatSync(parent),st=fs.lstatSync(file);
  if(!ps.isDirectory()||ps.isSymbolicLink()
    ||fs.realpathSync(parent)!==parent||(ps.mode&0o077)!==0
    ||!st.isFile()||st.isSymbolicLink()||st.nlink!==1
    ||(st.mode&0o077)!==0||st.size<100||st.size>4096
    ||fs.realpathSync(file)!==file)throw Error('unsafe_scope_file');
  const bytes=fs.readFileSync(file);
  if(bytes.length!==st.size||bytes.includes(0))throw Error('invalid_scope_file');
  const parsed=JSON.parse(bytes.toString('utf8'));
  const result=inspectScope(parsed,origins,now);
  return result;
}
function operatorEnabled(env=process.env){
  return env.CMS_ENV!=='test'&&
    env.CMS_STAGE2_OWNER_READONLY_PERMISSION==='owner-grant-recorded-read-only';
}
module.exports={FORMAT,KEYS,inspectScope,readScope,operatorEnabled,hash};
