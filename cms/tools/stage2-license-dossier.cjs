'use strict';
/*
 * Offline Stage2 owner/legal-review dossier, generated from the ACTUAL assembled
 * empty-CMS package. Not a license opinion, legal approval, signature, or a
 * production deployment artifact. No network and no host access.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {STAGE,verify}=require('./build-internal-package.cjs');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'.build','stage2-owner-review');
const FORMAT='ai-site-cms-stage2-license-review-v1';
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const stable=x=>JSON.stringify(x,null,2)+'\n';
const safeText=x=>String(x).replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[c]);
function read(root,relative,max=2097152) {
  const absolute=path.join(root,...relative.split('/'));
  const stat=fs.lstatSync(absolute);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1
    ||stat.size<2||stat.size>max)throw Error('Unsafe Stage2 review source');
  return fs.readFileSync(absolute);
}
function json(root,relative,max) {
  const v=JSON.parse(read(root,relative,max).toString('utf8'));
  if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid review metadata');
  return v;
}
function props(component) {
  const mapped=new Map();
  for(const prop of component.properties||[]){
    if(!prop||typeof prop.name!=='string'||typeof prop.value!=='string'
      ||mapped.has(prop.name))throw Error('Unreviewed component properties');
    mapped.set(prop.name,prop.value);
  }
  return mapped;
}
function permittedLicense(license){
  return ['MIT','BSD-3-Clause','Apache-2.0'].includes(license);
}
function validateUrl(u){
  if(typeof u!=='string'||u.length>500)throw Error('Unreviewed source reference');
  const parsed=new URL(u);
  if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.hash||
    parsed.search||!parsed.hostname||parsed.hostname==='localhost')
    throw Error('Unreviewed source URL');
  return u;
}
function createDossier(stage=STAGE){
  // Verifier covers manifest, symlinks, unlisted files, and entire package bytes.
  if(path.resolve(stage)!==STAGE)throw Error('Dossier requires canonical built package');
  const packaged=verify();
  const manifestBytes=read(stage,'private/package-manifest.json',250000);
  const index=json(stage,'private/compliance/compliance-index.json',16384);
  const sbom=json(stage,'private/compliance/sbom.cdx.json',524288);
  const composer=json(stage,'composer.lock');
  const npm=json(stage,'private/compliance/npm-package-lock.json');
  const notice=read(stage,'private/compliance/THIRD_PARTY_NOTICES.txt');
  const originalEditorNotice=read(stage,'private/editor/THIRD_PARTY_LICENSES.txt');
  const allowedNotices=notice.toString('utf8');
  if(sbom.bomFormat!=='CycloneDX'||sbom.specVersion!=='1.5'
    ||index.format!=='ai-site-cms-stage2-compliance-v1'
    ||index.componentCount!==43||index.composerRuntime!==14||index.npmLocked!==29
    ||!Array.isArray(sbom.components)||sbom.components.length!==43
    ||!Array.isArray(composer.packages)||composer.packages.length!==14
    ||!npm.packages||Object.keys(npm.packages).length-1!==29
    ||index.noticeSha256!==digest(notice)
    ||!Array.isArray(packaged.files)||packaged.files.length<400
    ||!allowedNotices.includes(originalEditorNotice.toString('utf8')))
    throw Error('Stage2 locked review inventory mismatch');
  const manifest=JSON.parse(manifestBytes);
  if(sbom.metadata?.component?.version!==manifest.releaseVersion)
    throw Error('Manifest/review version mismatch');
  const components=new Map();
  for(const c of sbom.components){
    if(!c||typeof c.purl!=='string'||components.has(c.purl))
      throw Error('Duplicated SBOM component');
    components.set(c.purl,c);
  }
  const items=[];
  for(const pkg of composer.packages){
    const purl='pkg:composer/'+pkg.name+'@'+pkg.version;
    const c=components.get(purl);
    if(!c||!Array.isArray(pkg.license)||pkg.license.length!==1
      ||!permittedLicense(pkg.license[0])
      ||c.licenses?.[0]?.license?.id!==pkg.license[0])
      throw Error('Composer lock/SBOM mismatch');
    const scope=props(c);
    if(scope.get('ai-site-cms:scope')!=='php-runtime'
      ||scope.get('ai-site-cms:source-ref')!==pkg.source?.reference)
      throw Error('Composer provenance not pinned');
    const folder=path.join('vendor',...pkg.name.split('/'));
    const upstream=fs.readdirSync(path.join(stage,folder))
      .filter(n=>/^(?:LICENSE|LICENCE|COPYING)(?:\.(?:md|txt|text))?$/i.test(n)).sort();
    if(!upstream.length)throw Error('Missing legal source');
    const licenseBytes=read(stage,folder.replaceAll(path.sep,'/')+'/'+upstream[0],100000);
    if(digest(licenseBytes)!==scope.get('ai-site-cms:installed-license-sha256')
      ||!allowedNotices.includes(
        '===== composer '+pkg.name+' '+pkg.version+' ('+pkg.license[0]+') / '+upstream[0]+' =====\n'+licenseBytes.toString('utf8')+'\n'))
      throw Error('Bundled composer license differs from NOTICE');
    items.push({
      name:pkg.name,version:pkg.version,ecosystem:'composer',scope:'php-runtime',
      declaredLicense:pkg.license[0],sourceUrl:validateUrl(pkg.source.url),
      sourceReference:pkg.source.reference,
      installedLicenseSha256:digest(licenseBytes),
      noticeIncluded:true,bundledInDistribution:true,
      manuallyApproved:false
    });
    components.delete(purl);
  }
  for(const [npmPath,pkg] of Object.entries(npm.packages)){
    if(!npmPath)continue;
    if(!npmPath.startsWith('node_modules/'))throw Error('Invalid npm package path');
    const name=npmPath.slice('node_modules/'.length);
    const purl='pkg:npm/'+name.replace(/^@/,'%40').replace('/','%2F')+'@'+pkg.version;
    const c=components.get(purl);
    if(!c||!permittedLicense(pkg.license)
      ||c.licenses?.[0]?.license?.id!==pkg.license)throw Error('npm SBOM mismatch');
    const scope=props(c);
    const mode=name==='jedison'?'browser-runtime'
      :pkg.optional?'build-optional-platform':'build-and-test-only';
    if(scope.get('ai-site-cms:scope')!==mode
      ||scope.get('ai-site-cms:lock-integrity')!==pkg.integrity)
      throw Error('npm lock integrity mismatch');
    items.push({
      name,version:pkg.version,ecosystem:'npm',scope:mode,
      declaredLicense:pkg.license,
      lockIntegrity:pkg.integrity,
      resolvedRegistryUrl:validateUrl(pkg.resolved),
      noticeIncluded:mode==='browser-runtime',
      bundledInDistribution:mode==='browser-runtime',
      manuallyApproved:false
    });
    components.delete(purl);
  }
  if(items.length!==43||components.size||items.filter(x=>x.bundledInDistribution).length!==15)
    throw Error('Unexpected distribution inventory scope');
  items.sort((a,b)=>a.ecosystem.localeCompare(b.ecosystem)||a.name.localeCompare(b.name));
  const dossier={
    format:FORMAT,scope:'offline-internal-stage2-legal-review-input',
    packageVersion:manifest.releaseVersion,
    packageManifestSha256:digest(manifestBytes),
    noticeSha256:digest(notice),
    editorUpstreamNoticeSha256:digest(originalEditorNotice),
    componentCount:items.length,
    phpRuntimeComponentCount:14,
    browserRuntimeComponentCount:1,
    buildAndOptionalComponents:28,
    packageFilesChecked:packaged.files.length,
    components:items,
    requiredHumanReview:[
      'Independently review original upstream licenses and attribution obligations',
      'Verify dependencies, security advisories and current license terms at decision date',
      'Approve proprietary distribution and all legally required NOTICE material',
      'Confirm actual target hosting, owner architecture decision and separate access/install consents',
      'Record explicit Stage2 acceptance; this dossier cannot grant it'
    ],
    independentLegalApproval:false,
    actualTargetHostTested:false,
    stage2Accepted:false,stage3Authorized:false,productionReady:false
  };
  return dossier;
}
function renderHtml(d){
  const rows=d.components.map(c=>'<tr><td>'+safeText(c.ecosystem)+'</td><td>'+
    safeText(c.name)+'</td><td>'+safeText(c.version)+'</td><td>'+
    safeText(c.scope)+'</td><td>'+safeText(c.declaredLicense)+'</td><td>'+
    (c.noticeIncluded?'Included':'Not in runtime')+'</td></tr>').join('\n');
  return '<!doctype html><html lang="en"><meta charset="utf-8">'+
    '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;; base-uri &#39;none&#39;; form-action &#39;none&#39;">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>AI Site CMS — Stage 2 dependency review</title>'+
    '<style>body{font:16px/1.6 system-ui,sans-serif;max-width:1100px;margin:3rem auto;padding:0 1.5rem;color:#20272c}h1{line-height:1.2}'+
    'table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:.55rem;border-bottom:1px solid #ccc;text-align:left;overflow-wrap:anywhere}'+
    'th{background:#f1f3f4}code{overflow-wrap:anywhere}ul{padding-left:1.5rem}p{max-width:75ch}</style>'+
    '<main><h1>Stage 2 — dependency review</h1>'+
    '<p><strong>Not a legal approval, release certificate or Stage 2 acceptance.</strong> Offline snapshot of the verified internal package; all judgments remain manual.</p>'+
    '<p>Package: <code>'+safeText(d.packageVersion)+'</code>; '+d.componentCount+
    ' locked dependencies (14 PHP runtime, 1 browser runtime, 28 build/test/optional). '+d.packageFilesChecked+' package files checked.</p>'+
    '<p>Package manifest SHA-256: <code>'+safeText(d.packageManifestSha256)+'</code><br>Upstream notices SHA-256: <code>'+
    safeText(d.noticeSha256)+'</code></p><h2>Human review needed</h2><ul>'+
    d.requiredHumanReview.map(x=>'<li>'+safeText(x)+'</li>').join('')+'</ul>'+
    '<h2>Locked component inventory</h2><table><thead><tr><th>Type</th><th>Package</th><th>Version</th><th>Usage</th><th>Declared license</th><th>Bundled NOTICE</th></tr></thead><tbody>'+
    rows+'</tbody></table><p>Details, hashes and locked source references: <code>stage2-license-dossier.json</code>. This HTML has no scripts, external requests or approval actions.</p></main></html>\n';
}
function build(){
  const data=createDossier();
  fs.mkdirSync(OUT,{recursive:true,mode:0o700});
  const reportPath=path.join(OUT,'stage2-license-dossier.json');
  const htmlPath=path.join(OUT,'stage2-license-dossier.html');
  fs.writeFileSync(reportPath,stable(data),{mode:0o600});
  fs.writeFileSync(htmlPath,renderHtml(data),{mode:0o600});
  process.stdout.write('Stage2 offline legal-review dossier: '+data.componentCount+
    ' locked components, '+data.packageFilesChecked+
    ' package files; human legal decision REQUIRED, not production-approved.\n');
  return {data,reportPath,htmlPath};
}
if(require.main===module){
  if(process.argv.length!==3||process.argv[2]!=='--build'){
    process.stderr.write('STAGE2_OFFLINE_REVIEW_REFUSED\n');process.exitCode=3;
  }else{try{build();}catch(e){
    process.stderr.write('STAGE2_OFFLINE_REVIEW_FAILED\n');process.exitCode=4;
  }}
}
module.exports={createDossier,renderHtml,build,stable,OUT,digest};
