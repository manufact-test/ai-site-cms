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
  // Open with O_NOFOLLOW, then compare physical identity before/after the
  // read. An attacker must not replace a verified record with a different
  // inode between lstat() and read(). The canonical byte check rejects
  // duplicate JSON keys, whitespace aliases and invalid UTF-8.
  const fd=fs.openSync(file,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  let bytes;
  try {
    const before=fs.fstatSync(fd);
    if(!before.isFile()||before.nlink!==1||before.dev!==st.dev||
      before.ino!==st.ino||before.size!==st.size||
      (before.mode&0o077)!==0)throw Error('scope_inode_changed');
    bytes=fs.readFileSync(fd);
    const after=fs.fstatSync(fd);
    if(after.dev!==before.dev||after.ino!==before.ino||
      after.size!==before.size||after.mtimeMs!==before.mtimeMs||
      bytes.length!==before.size)throw Error('scope_changed_during_read');
  }finally{fs.closeSync(fd);}
  if(bytes.includes(0))throw Error('invalid_scope_file');
  const parsed=JSON.parse(bytes.toString('utf8'));
  if(!exact(parsed,KEYS)||Object.keys(parsed).join('|')!==KEYS.join('|')||
    !bytes.equals(Buffer.from(JSON.stringify(parsed),'utf8')))
    throw Error('noncanonical_scope_bytes');
  if(fs.realpathSync(parent)!==parent)throw Error('scope_parent_changed');
  return inspectScope(parsed,origins,now);
}
function operatorEnabled(env=process.env){
  return env.CMS_ENV!=='test'&&
    env.CMS_STAGE2_OWNER_READONLY_PERMISSION==='owner-grant-recorded-read-only';
}
module.exports={FORMAT,KEYS,inspectScope,readScope,operatorEnabled,hash};
