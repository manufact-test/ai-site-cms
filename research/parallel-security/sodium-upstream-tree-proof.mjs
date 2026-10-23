#!/usr/bin/env node
// Exact Git-object provenance check against a REAL GitHub-verified upstream tag.
// Reconstruct every Git tree object from 211 recursive Git entries independently.
// Does not import PGP publisher keys, re-download Composer ZIP or approve release.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const RECORD=path.join(here,'fixtures/upstream-sodium-compat-v2.5.2-git.json');
export const ANCHOR=Object.freeze({
 repo:'https://github.com/paragonie/sodium_compat',
 tag:'v2.5.2',
 tagObject:'5cbae9d0ad987e0104e390d74cca92a128777aa8',
 commit:'3246b36803c177847e677862fedeb7f937869adb',
 tree:'d940270053129b9a11fe78388278e45c62b92bb4',
 entries:211,files:78,
 license:'5729115bff0e9a5c03750f39f6c50b7a90c508a9',
 autoload:'c1ea727fb27fbf14baf4a9b4490e2f1ea1d6758e',
 composer:'f4b6fab66175b7c259250fdfda8ecde404a99163',
 crypto:'aee5b0e30e3d2b3acbb62cb2dd52f6290bccdd7d'
});
const IGNORED=[
  '.gitattributes','.gitignore','.github','infection.json.dist','fuzzing',
  'phpunit.xml.dist','phpstan.neon.dist','tests','build-phar.sh',
  'appveyor.yml','dist','autoload-phpunit.php','autoload-pedantic.php',
  'autoload-fast.php'
];
const sha1=x=>crypto.createHash('sha1').update(x).digest('hex');
const gitBlob=bytes=>sha1(Buffer.concat([
  Buffer.from('blob '+bytes.length),Buffer.from([0]),bytes
]));
const check=(cond,reason)=>{if(!cond)throw Error('UPSTREAM_SODIUM_GIT_PROVENANCE_FAIL: '+reason)};
function gitTree(entries){
  const ordered=[...entries].sort((a,b)=>Buffer.compare(
    Buffer.from(a.basename+(a.type==='tree'?'/':'')),
    Buffer.from(b.basename+(b.type==='tree'?'/':''))));
  const chunks=[];
  for(const e of ordered){
    chunks.push(Buffer.from((e.type==='tree'?'40000':e.mode)+' '+e.basename+'\0'));
    chunks.push(Buffer.from(e.sha,'hex'));
  }
  const body=Buffer.concat(chunks);
  return sha1(Buffer.concat([Buffer.from('tree '+body.length),Buffer.from([0]),body]));
}
function safeRelative(s){
  return typeof s==='string'&&s.length>0&&s.length<=300&&
    !s.includes('\0')&&!s.includes('\\')&&!s.startsWith('/')&&
    !s.split('/').some(p=>!p||p==='.'||p==='..')&&
    Buffer.from(s,'utf8').toString('utf8')===s;
}
function isExported(name,excluded=IGNORED,prefix='psalm'){
  const first=name.split('/')[0];
  return !excluded.includes(first)&&!first.startsWith(prefix);
}
function same(actual,expected,reason){check(actual===expected,reason)}
export function checkUpstreamTranscript(data){
  check(data&&typeof data==='object'&&!Array.isArray(data),'missing upstream record');
  same(data.schema,'ai-site-cms-upstream-sodium-compat-git-tag-identity-v1','schema');
  same(data.sourceRepository,ANCHOR.repo,'upstream GitHub origin');
  const signed=data.tag;
  same(signed?.name,ANCHOR.tag,'annotated tag name');
  same(signed?.objectSha,ANCHOR.tagObject,'annotated tag object ID');
  same(signed?.targetCommit,ANCHOR.commit,'signed tag wrong target');
  same(signed?.githubVerified,true,'GitHub has not reported valid PGP signed tag');
  same(signed?.githubReason,'valid','GitHub tag verification status');
  same(signed?.signerFingerprintNotIndependentlyTrusted,true,'unearned signer identity trust');
  same(signed?.payload,
    'object '+ANCHOR.commit+'\ntype commit\ntag '+ANCHOR.tag+
    '\ntagger Paragon Initiative Enterprises <security@paragonie.com> 1787096834 -0400\n\nVersion 2.5.2\n',
    'signed tag immutable Git payload');
  check(typeof signed.signature==='string'&&
    /^-----BEGIN PGP SIGNATURE-----\n/.test(signed.signature)&&
    signed.signature.includes('-----END PGP SIGNATURE-----\n'),
    'archived upstream signature envelope missing');
  same(data.commit?.sha,ANCHOR.commit,'source commit identity');
  same(data.commit?.treeSha,ANCHOR.tree,'commit tree identity');
  same(data.commit?.githubVerified,false,'commit verification classification; signed TAG, unsigned commit');
  same(data.commit?.githubReason,'unsigned','commit classification');
  const cls=data.classification||{};
  const expectedFlags={
    tagReportedSignatureVerifiedByGitHub:true,
    tagPgpSignatureIndependentlyVerifiedAgainstTrustedKey:false,
    actualComposerZipContentsReDownloaded:false,actualVendorTreeVerified:false,
    authorOrPublisherIdentityIndependentlyVetted:false,cryptographyReviewed:false,
    licenseDistributionApproved:false,stage2Accepted:false,productionApproved:false
  };
  same(JSON.stringify(Object.keys(cls).sort()),JSON.stringify(Object.keys(expectedFlags).sort()),
    'classification field set');
  for(const [key,v] of Object.entries(expectedFlags))same(cls[key],v,'classification '+key);
  same(data.git?.count,ANCHOR.entries,'recursive tree count');
  same(data.git?.truncated,false,'incomplete recursive upstream Git tree');
  same(JSON.stringify(data.archiveExportIgnoreRoot),JSON.stringify(IGNORED),'export-ignore root rules');
  same(data.archiveExportIgnorePrefix,'psalm','export-ignore wildcard');
  const entries=data.git.entries;
  check(Array.isArray(entries)&&entries.length===ANCHOR.entries,'missing any Git tree entries');
  const seen=new Set(),dirs=new Map();
  dirs.set('',[]);
  const getParent=name=>{const slash=name.lastIndexOf('/');return slash<0?'':name.slice(0,slash)};
  for(const e of entries){
    check(e&&typeof e==='object'&&safeRelative(e.path)&&
      /^[a-f0-9]{40}$/.test(e.sha),'unsafe Git tree record path/object');
    check(!seen.has(e.path),'duplicate Git tree path');
    seen.add(e.path);
    check((e.type==='tree'&&e.mode==='040000'&&!Object.hasOwn(e,'size'))||
      (e.type==='blob'&&e.mode==='100644'&&
      Number.isSafeInteger(e.size)&&e.size>=0&&e.size<=2*1024*1024),
      'unsupported Git mode, symlink, executable, submodule or oversized blob');
    if(e.type==='tree')dirs.set(e.path,[]);
  }
  const expectedObjectIds=new Map([
    ['LICENSE',ANCHOR.license],['autoload.php',ANCHOR.autoload],
    ['composer.json',ANCHOR.composer],['src/Compat.php',ANCHOR.crypto]
  ]);
  for(const e of entries){
    const parent=getParent(e.path),basename=e.path.slice(parent?parent.length+1:0);
    check(dirs.has(parent),'tree entry with absent parent '+e.path);
    dirs.get(parent).push({basename,sha:e.sha,mode:e.mode,type:e.type});
    if(expectedObjectIds.has(e.path))same(e.sha,expectedObjectIds.get(e.path),'critical upstream '+e.path);
  }
  for(const [pathName,items] of dirs){
    const computed=gitTree(items);
    const expected=pathName===''?ANCHOR.tree:entries.find(e=>e.path===pathName&&e.type==='tree')?.sha;
    same(computed,expected,'Git tree hash differs at '+(pathName||'/'));
  }
  const exported=entries.filter(e=>e.type==='blob'&&isExported(e.path));
  same(exported.length,ANCHOR.files,'exported Composer dist file count');
  for(const filename of expectedObjectIds.keys())
    check(exported.some(x=>x.path===filename),'missing critical shipped source '+filename);
  return {schema:'ai-site-cms-upstream-signed-tag-anchored-git-tree-v1',
    sourceCommit:ANCHOR.commit,tagObject:ANCHOR.tagObject,gitTree:ANCHOR.tree,
    realGitEntriesVerified:entries.length,gitTreeObjectsChecked:dirs.size,
    exportedGitBlobIds:exported.length,githubReportsTagPgpValid:true,
    localPgpSignatureIndependentlyChecked:false,sourceVendorBytesVerified:false,
    hostRuntimeTested:false,licenseReviewed:false,productionApproved:false};
}
function fileWalk(root){
  const observed=new Map(),dirs=[['',root]];
  while(dirs.length){
    const [rel,absolute]=dirs.pop();
    for(const f of fs.readdirSync(absolute,{withFileTypes:true})){
      const r=rel?rel+'/'+f.name:f.name,full=path.join(absolute,f.name);
      check(safeRelative(r),'invalid source path');
      const st=fs.lstatSync(full);
      check(!st.isSymbolicLink(),'linked upstream source: '+r);
      if(st.isDirectory()){dirs.push([r,full]);continue;}
      check(st.isFile()&&st.nlink===1&&st.size<=2*1024*1024,
        'unsafe external archive file '+r);
      observed.set(r,{path:full,stat:st});
      check(observed.size<=512,'oversized external archive package');
    }
  }
  return observed;
}
export function checkInstalledGitSource(root,archive){
  check(typeof root==='string'&&path.isAbsolute(root)&&fs.realpathSync(root)===root,
    'installed source root not canonical absolute folder');
  check(fs.lstatSync(root).isDirectory(),'expected actual installed source directory');
  checkUpstreamTranscript(archive);
  const desired=new Map(archive.git.entries
    .filter(e=>e.type==='blob'&&isExported(e.path)).map(e=>[e.path,e]));
  const actual=fileWalk(root);
  same(actual.size,desired.size,'source archive has extra/missing files');
  let bytes=0;
  for(const [relative,upstream] of desired){
    const found=actual.get(relative);
    check(!!found,'missing Git-source object '+relative);
    const raw=fs.readFileSync(found.path),last=fs.lstatSync(found.path);
    check(raw.length===found.stat.size&&
      last.dev===found.stat.dev&&last.ino===found.stat.ino&&
      last.size===found.stat.size&&
      last.mtimeMs===found.stat.mtimeMs&&last.ctimeMs===found.stat.ctimeMs,
      'installed file changed while verifying '+relative);
    same(gitBlob(raw),upstream.sha,'installed file differs from signed-tag commit '+relative);
    bytes+=raw.length;
  }
  return {upstreamGitBlobFilesVerified:desired.size,bytes,
    sourceBytesMatchSignedTagGitCommit:true,
    separatelyVettedPgpKey:false,trueNoSodiumReexecuted:false,
    licenseApproved:false,productionApproved:false};
}
export const loadUpstream=()=>JSON.parse(fs.readFileSync(RECORD,'utf8'));
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(process.argv.length===2){
      const result=checkUpstreamTranscript(loadUpstream());
      console.log(JSON.stringify(result));
      console.log('REAL upstream signed-tag anchored Git provenance PASS 211 recursive entries and 78 exportable source blobs; GitHub PGP verified, local publisher trust NOT established');
    }else if(process.argv.length===4&&process.argv[2]==='--verify-installed'){
      const root=process.argv[3];
      const result=checkInstalledGitSource(root,loadUpstream());
      console.log(JSON.stringify(result));
      console.log('REAL upstream signed-tag Git blob local archive source comparison PASS 78 source files; NOT independent PGP signer custody, vulnerability, license or production approval');
    }else{
      console.error('Usage: node sodium-upstream-tree-proof.mjs [--verify-installed /absolute/independent/sodium_compat]');
      process.exitCode=2;
    }
  }catch(e){console.error(String(e.message||e));process.exitCode=3;}
}
