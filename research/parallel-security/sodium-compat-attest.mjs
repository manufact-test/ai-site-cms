#!/usr/bin/env node
// Independent exact-source precondition for running a TRUE sodium-free PHP lab.
// Research-only: an operator must obtain a package-tree SHA-256 from independently
// reviewed source. An arbitrary Composer lock or local directory is NOT trust.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const PIN = '3246b36803c177847e677862fedeb7f937869adb';
const NAME = 'paragonie/sodium_compat';
const TRUSTED_SOURCE = 'https://github.com/paragonie/sodium_compat.git';
const TRUSTED_DIST = 'https://api.github.com/repos/paragonie/sodium_compat/zipball/' + PIN;
const MAX_LOCK_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 2000;
const MAX_BYTES = 64 * 1024 * 1024;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function requireEvidence(condition, reason) {
  if (!condition) throw Error('SODIUM_COMPAT_UNATTESTED: '+reason);
}
function strictFile(file, root = null) {
  const s = fs.lstatSync(file);
  requireEvidence(s.isFile() && !s.isSymbolicLink() && s.nlink === 1,
    'not an independent regular unlinked file: '+file);
  if (root) requireEvidence(path.dirname(fs.realpathSync(file)) === root,
    'autoloader resolved outside reviewed package root');
  return s;
}
function listFiles(root) {
  let totalBytes = 0;
  const files=[];
  function descend(rel) {
    const dir = path.join(root,rel);
    for (const ent of fs.readdirSync(dir,{withFileTypes:true})) {
      const relative = rel ? rel+'/'+ent.name : ent.name;
      const absolute = path.join(root,relative);
      const stat=fs.lstatSync(absolute);
      requireEvidence(!stat.isSymbolicLink(), 'symlinked package node: '+relative);
      if (stat.isDirectory()) {
        requireEvidence(!['.git','vendor','node_modules'].includes(ent.name),
          'nested mutable package tree: '+relative);
        descend(relative);
      } else {
        requireEvidence(stat.nlink === 1, 'hardlinked source file: '+relative);
        requireEvidence(stat.isFile() && stat.size>=0,
          'special file in source tree: '+relative);
        totalBytes += stat.size;
        files.push({relative,absolute,size:stat.size});
        requireEvidence(files.length<=MAX_FILES&&totalBytes<=MAX_BYTES,
          'package tree exceeds research limits');
      }
    }
  }
  descend('');
  requireEvidence(files.length>3,'missing source files');
  files.sort((a,b)=>Buffer.compare(Buffer.from(a.relative),Buffer.from(b.relative)));
  return {files,totalBytes};
}
// Composer metadata is not authority. Refuse a lockfile capable of bringing in
// unknown vendor packages or fetching the pinned ref from a substituted host.
// The reviewed 2.5.2 source tree SHA remains a SEPARATE trust prerequisite.
function strictIsolatedLock(lockPath, packageRoot) {
  requireEvidence(!lockPath.startsWith(packageRoot+path.sep) && lockPath!==packageRoot,
    'independent isolated composer.lock must be outside source package root');
  requireEvidence(fs.realpathSync(lockPath)===lockPath,
    'composer lock must be canonical with no symlink ancestors');
  const original=fs.lstatSync(lockPath);
  requireEvidence(original.isFile()&&!original.isSymbolicLink()&&original.nlink===1&&
    original.size>3&&original.size<=MAX_LOCK_BYTES,
    'isolated composer lock must be one bounded regular unlinked file');
  const fd=fs.openSync(lockPath,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW);
  let bytes,initial,last;
  try {
    initial=fs.fstatSync(fd);
    requireEvidence(initial.dev===original.dev&&initial.ino===original.ino&&
      initial.size===original.size&&initial.nlink===1,
      'composer lock replaced between open and read');
    bytes=fs.readFileSync(fd);
    last=fs.fstatSync(fd);
  } finally {fs.closeSync(fd);}
  const latest=fs.lstatSync(lockPath);
  requireEvidence(bytes.length===original.size&&latest.isFile()&&latest.nlink===1&&
    latest.dev===initial.dev&&latest.ino===initial.ino&&
    last.dev===initial.dev&&last.ino===initial.ino&&
    last.size===initial.size&&latest.size===initial.size&&
    last.mtimeMs===initial.mtimeMs&&latest.mtimeMs===initial.mtimeMs&&
    last.ctimeMs===initial.ctimeMs&&latest.ctimeMs===initial.ctimeMs,
    'composer lock changed during independent source attestation');
  let data;
  try{data=JSON.parse(bytes.toString('utf8'));}
  catch{throw Error('SODIUM_COMPAT_UNATTESTED: malformed isolated Composer lock JSON');}
  requireEvidence(data&&typeof data==='object'&&!Array.isArray(data)&&
    Array.isArray(data.packages)&&data.packages.length===1&&
    Array.isArray(data['packages-dev'])&&data['packages-dev'].length===0,
    'isolated Composer lock must contain precisely sodium_compat and no dev packages');
  return {data,digest:sha(bytes)};
}
export function attest(root, lockPath, expectedDigest) {
  requireEvidence(typeof root==='string'&&path.isAbsolute(root),'package root must be absolute');
  requireEvidence(typeof lockPath==='string'&&path.isAbsolute(lockPath),'isolated composer.lock path must be absolute');
  requireEvidence(typeof expectedDigest==='string'&&/^[a-f0-9]{64}$/.test(expectedDigest),
    'independently retained full-tree SHA-256 required');
  const dirStat=fs.lstatSync(root);
  requireEvidence(dirStat.isDirectory()&&!dirStat.isSymbolicLink(),
    'source root is not a regular directory');
  const canonical=fs.realpathSync(root);
  requireEvidence(canonical===root, 'source root must be canonical (no linked ancestors)');
  const {data:loaded,digest:lockSha256}=strictIsolatedLock(lockPath,root);
  const p=loaded.packages[0];
  requireEvidence(p?.name===NAME,'isolated Composer lock contains wrong package');
  requireEvidence(['v2.5.2','2.5.2'].includes(p.version),'incorrect sodium_compat version');
  requireEvidence(p.source?.type==='git'&&p.source?.url===TRUSTED_SOURCE&&
    p.source.reference===PIN&&p.dist?.reference===PIN&&
    p.dist?.type==='zip'&&p.dist?.url===TRUSTED_DIST,
    'Composer source/dist type, URL and revision must match reviewed 2.5.2 Git commit');
  const autoload=path.join(root,'autoload.php');
  strictFile(autoload,root);
  const metadata=JSON.parse(fs.readFileSync(path.join(root,'composer.json'),'utf8'));
  requireEvidence(metadata.name===NAME && metadata.license==='ISC' &&
    Array.isArray(metadata.autoload?.files) && metadata.autoload.files.includes('autoload.php') &&
    metadata.require?.php==='^8.1' && metadata.require?.['php-64bit']==='*',
    'unexpected upstream package name/license/autoload or runtime contract');
  strictFile(path.join(root,'composer.json'),root);
  strictFile(path.join(root,'LICENSE'),root);
  const {files,totalBytes}=listFiles(root);
  const digest=crypto.createHash('sha256');
  digest.update('AI-SITE-CMS-SODIUM-COMPAT-SOURCE-TREE-V1\n');
  for (const f of files) {
    const bytes=fs.readFileSync(f.absolute);
    requireEvidence(bytes.length===f.size,'source changed during snapshot: '+f.relative);
    digest.update(f.relative+'\0'+f.size+'\0'+sha(bytes)+'\n');
  }
  const observed=digest.digest('hex');
  requireEvidence(crypto.timingSafeEqual(Buffer.from(observed,'hex'),Buffer.from(expectedDigest,'hex')),
    'whole-tree source SHA-256 does not match independently reviewed evidence');
  return {schema:'ai-site-cms-sodium-compat-source-attestation-v1',
    name:NAME,version:'2.5.2',sourceCommit:PIN,treeSha256:observed,
    isolatedLockSha256:lockSha256,distUrl:TRUSTED_DIST,
    fileCount:files.length,totalBytes,sourceVerifiedAgainstExternalHash:true,
    genuineSodiumFreeRuntimeTested:false,productionApproved:false};
}
const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  if (process.argv.length !== 2) {
    console.error('Usage: SODIUM_COMPAT_AUTOLOAD=/absolute/vendor/.../autoload.php SODIUM_COMPAT_LOCK=/absolute/composer.lock SODIUM_COMPAT_TREE_SHA256=reviewed-digest node sodium-compat-attest.mjs');
    process.exitCode=2;
  } else {
    try {
      const auto=process.env.SODIUM_COMPAT_AUTOLOAD;
      requireEvidence(typeof auto==='string'&&path.isAbsolute(auto)&&path.basename(auto)==='autoload.php',
        'autoload path missing or not absolute');
      const out=attest(path.dirname(auto),process.env.SODIUM_COMPAT_LOCK,
        process.env.SODIUM_COMPAT_TREE_SHA256);
      console.log(JSON.stringify(out,null,2));
    } catch(e) {
      console.error('SODIUM_COMPAT_ATTESTATION_BLOCKED '+e.message);
      process.exitCode=3;
    }
  }
}
