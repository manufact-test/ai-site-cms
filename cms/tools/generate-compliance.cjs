'use strict';
// CI/build-time compliance inventory. Lock metadata is evidence, NOT a legal opinion.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const allowed=new Set(['MIT','BSD-3-Clause','Apache-2.0']);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const readJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const exact=(value,pattern,why)=>{if(typeof value!=='string'||!pattern.test(value))throw Error(why);return value;};
function installedLicense(packageRoot){
  const entries=fs.readdirSync(packageRoot).filter(n=>/^(?:LICENSE|LICENCE|COPYING)(?:\.(?:md|txt|text))?$/i.test(n)).sort();
  if(!entries.length)throw Error('Missing installed upstream license file: '+packageRoot);
  const found=entries.map(name=>{
    const file=path.join(packageRoot,name),st=fs.lstatSync(file);
    if(!st.isFile()||st.isSymbolicLink()||st.size<20||st.size>100000)throw Error('Unsafe upstream license file: '+name);
    const content=fs.readFileSync(file,'utf8');
    if(content.includes('\u0000'))throw Error('Binary upstream license file');
    return {file:name,content};
  });
  return found[0];
}
// Preserve independent upstream NOTICE bodies, not just LICENSE texts.
// The two exact-pinned Opis Apache packages have mandatory root NOTICE files.
// Unknown extra NOTICE files are included, not silently discarded.
function installedNotices(packageRoot){
  const entries=fs.readdirSync(packageRoot)
    .filter(name=>/^NOTICE(?:\.(?:md|txt|text))?$/i.test(name)).sort();
  return entries.map(name=>{
    const file=path.join(packageRoot,name),st=fs.lstatSync(file);
    if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1
      ||st.size<10||st.size>100000){
      throw Error('Unsafe upstream NOTICE: '+name);
    }
    const content=fs.readFileSync(file,'utf8');
    if(content.includes('\u0000')||content.includes('\uFFFD')){
      throw Error('Non-text upstream NOTICE: '+name);
    }
    return {file:name,content};
  });
}
function generate(stage){
  const composer=readJson(path.join(ROOT,'composer.lock'));
  const npm=readJson(path.join(ROOT,'editor/package-lock.json'));
  if(!Array.isArray(composer.packages)||composer.packages.length!==14||composer['packages-dev']?.length||npm.lockfileVersion!==3||!npm.packages)throw Error('Unreviewed dependency lock layout');
  const components=[],noticeParts=[],names=new Set();
  const requiredNoticePackages=new Set(['opis/json-schema','opis/string']);
  const seenRequiredNotices=new Set();
  let composerNoticeFileCount=0;
  const legalHeader='AI Site CMS Stage2 third-party notices. Internal build only.\nEach copied text is from the installed upstream dependency; review before distribution.\n';
  for(const pkg of composer.packages){
    const name=exact(pkg.name,/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/,'Invalid Composer package name');
    const version=exact(pkg.version,/^\d+\.\d+(?:\.\d+)?(?:[.-][a-zA-Z0-9.-]+)?$/,'Invalid Composer version');
    if(names.has('composer:'+name))throw Error('Duplicate Composer component');
    names.add('composer:'+name);
    if(!Array.isArray(pkg.license)||pkg.license.length!==1||!allowed.has(pkg.license[0])||!pkg.source?.reference||!pkg.dist?.reference)throw Error('Unreviewed Composer license/provenance: '+name);
    const packageRoot=path.join(ROOT,'vendor',...name.split('/'));
    const upstream=installedLicense(packageRoot);
    noticeParts.push('\n===== composer '+name+' '+version+' ('+pkg.license[0]+') / '+upstream.file+' =====\n'+upstream.content+'\n');
    const notices=installedNotices(packageRoot);
    if(requiredNoticePackages.has(name)){
      if(pkg.license[0]!=='Apache-2.0'||notices.length<1){
        throw Error('Pinned Apache NOTICE unavailable: '+name);
      }
      seenRequiredNotices.add(name);
    }
    const properties=[
      {name:'ai-site-cms:scope',value:'php-runtime'},
      {name:'ai-site-cms:installed-license-sha256',value:hash(upstream.content)},
      {name:'ai-site-cms:source-ref',value:pkg.source.reference}
    ];
    for(const item of notices){
      composerNoticeFileCount++;
      noticeParts.push('\n===== composer '+name+' '+version+' ('+pkg.license[0]+') / '+item.file+' (UPSTREAM NOTICE) =====\n'+item.content+'\n');
      properties.push({
        name:'ai-site-cms:installed-notice',
        value:item.file+':sha256:'+hash(item.content)
      });
    }
    components.push({type:'library',name,version,
      purl:'pkg:composer/'+name+'@'+version,
      licenses:[{license:{id:pkg.license[0]}}],properties});
  }
  if(seenRequiredNotices.size!==requiredNoticePackages.size){
    throw Error('Pinned Apache NOTICE manifest incomplete');
  }
  const npmEntries=Object.entries(npm.packages).filter(([name])=>name).sort(([a],[b])=>a.localeCompare(b));
  if(npmEntries.length!==29)throw Error('Unreviewed npm lock count');
  for(const [key,info] of npmEntries){
    if(!key.startsWith('node_modules/')||!info.version||!info.integrity||!info.resolved||!allowed.has(info.license))throw Error('Unreviewed npm metadata: '+key);
    const name=key.slice('node_modules/'.length),version=info.version;
    if(names.has('npm:'+name))throw Error('Duplicate npm component');
    names.add('npm:'+name);
    const scope=name==='jedison'?'browser-runtime':(info.optional?'build-optional-platform':'build-and-test-only');
    const c={type:'library',name,version,purl:'pkg:npm/'+name.replace(/^@/,'%40').replace('/','%2F')+'@'+version,licenses:[{license:{id:info.license}}],properties:[{name:'ai-site-cms:scope',value:scope},{name:'ai-site-cms:lock-integrity',value:info.integrity}]};
    components.push(c);
  }
  // The compiled browser bundle includes Jedison but not 29 installed npm packages.
  // Literal upstream Jedison notice maintained with the browser bundle.
  const editorNotice=fs.readFileSync(path.join(stage,'private/editor/THIRD_PARTY_LICENSES.txt'),'utf8');
  if(!editorNotice.includes('German Bisurgi')||!editorNotice.includes('MIT License'))throw Error('Jedison literal notice missing');
  noticeParts.push('\n===== browser-runtime jedison 1.27.1 (MIT) =====\n'+editorNotice+'\n');
  const notices=legalHeader+noticeParts.join('');
  const sbom={bomFormat:'CycloneDX',specVersion:'1.5',version:1,metadata:{component:{type:'application',name:'ai-site-cms-stage2-internal-package',version:readJson(path.join(ROOT,'release.json')).version}},components:components.sort((a,b)=>a.purl.localeCompare(b.purl))};
  const dir=path.join(stage,'private/compliance');
  fs.mkdirSync(dir,{recursive:true,mode:0o700});
  fs.writeFileSync(path.join(dir,'sbom.cdx.json'),JSON.stringify(sbom,null,2)+'\n',{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(dir,'THIRD_PARTY_NOTICES.txt'),notices,{flag:'wx',mode:0o600});
  fs.writeFileSync(path.join(dir,'compliance-index.json'),JSON.stringify({format:'ai-site-cms-stage2-compliance-v1',composerRuntime:14,npmLocked:29,browserRuntime:['jedison@1.27.1'],noticeSha256:hash(notices),composerNoticeFiles:composerNoticeFileCount,
    requiredApacheNoticesPreserved:[...seenRequiredNotices].sort(),
    componentCount:components.length,attestation:'lock-metadata-and-installed-license-text-only; not signed; manual legal review remains required'},null,2)+'\n',{flag:'wx',mode:0o600});
  return {count:components.length,composer:14,npm:29};
}
if(require.main===module){const stage=path.join(ROOT,'.build/internal-stage2-package');console.log(generate(stage));}
module.exports={generate,installedLicense,installedNotices};
