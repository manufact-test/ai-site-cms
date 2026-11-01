#!/usr/bin/env node
'use strict';
/** Hostile-input-aware verifier for the isolated form collector ZIP. */
const fs=require('node:fs'),path=require('node:path');
const zip=require('../lib/delivery-zip.cjs');
const fail=m=>{throw Error('Collector verification failed: '+m);};
const REQUIRED_ENV=[
  'STAGE3_DSN','STAGE3_DB_USER','STAGE3_DB_PASSWORD',
  'STAGE3_FORM_SECRET','STAGE3_FORM_ORIGINS'
];
const EXPECTED_SERVER_PHP=[
  "AccessControl.php",
  "ApprovalEvidence.php",
  "ArchiveBundle.php",
  "ContractValidator.php",
  "CrossSiteCollections.php",
  "CrossSiteTransfer.php",
  "DesignGraph.php",
  "FlexForm.php",
  "FontGuard.php",
  "FormDelivery.php",
  "FormGateway.php",
  "FormRoutes.php",
  "LeadWorkflow.php",
  "Licenses.php",
  "LinkOperations.php",
  "MediaOperations.php",
  "PageHistory.php",
  "PublicRenderer.php",
  "SiteArchives.php",
  "SiteOperations.php",
  "SiteRepository.php",
  "SmtpTransport.php",
  "TechnologyHandoff.php",
  "VideoGuard.php",
  "VideoUploads.php",
  "VisualReview.php",
  "bootstrap.php"
];
const EXPECTED_COMPONENTS=[
  "adaptive-gallery.json",
  "company-hero.json",
  "comparison-matrix.json",
  "contact-panel.json",
  "content-switcher.json",
  "cta-banner.json",
  "custom-section.json",
  "faq-accordion.json",
  "feature-highlights.json",
  "image-showcase.json",
  "lead-form-flex.json",
  "lead-form.json",
  "media-story.json",
  "partner-logos.json",
  "photo-gallery.json",
  "pricing-plans.json",
  "process-timeline.json",
  "service-grid.json",
  "testimonials.json"
];

function inspect(file){
  if(!path.isAbsolute(file)||!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()
    ||!fs.statSync(file).isFile()||fs.realpathSync(file)!==file)
    fail('an ordinary canonical absolute ZIP file is required');
  const raw=fs.readFileSync(file),entries=zip.readArchive(raw);
  const manifestPath='collector/manifest.json';
  if(!entries.has(manifestPath))fail('missing collector manifest');
  let meta;
  try{meta=JSON.parse(entries.get(manifestPath).toString('utf8'));}catch(_){fail('invalid collector manifest JSON');}
  if(!meta||meta.format!=='manufact-form-collector-package-v1'||meta.version!==1
    ||meta.runtime!=='PHP 8.1+ with PDO and the configured database driver'
    ||meta.documentRoot!=='collector/server/collector-public'
    ||meta.entrypoint!=='collector/server/collector-public/index.php'
    ||meta.sharedDatabase!=='same dedicated Stage3 database used by the CMS inbox'
    ||JSON.stringify(meta.requiredEnvironment)!==JSON.stringify(REQUIRED_ENV)
    ||!Array.isArray(meta.files)||meta.files.length!==EXPECTED_SERVER_PHP.length+EXPECTED_COMPONENTS.length+3)
    fail('invalid collector package contract');
  const EXPECTED_PACKAGE_FILES=new Set([
    'collector/README.txt','collector/server/collector-public/index.php',
    'collector/server/collector-public/.htaccess',
    ...EXPECTED_SERVER_PHP.map(name=>'collector/server/'+name),
    ...EXPECTED_COMPONENTS.map(name=>'collector/components/'+name)
  ]);
  const listed=new Set([manifestPath]);let total=0;
  for(const item of meta.files){
    if(!item||typeof item!=='object'||!zip.nameOK(item.path)
      ||!EXPECTED_PACKAGE_FILES.has(item.path)||listed.has(item.path)
      ||!Number.isSafeInteger(item.bytes)||item.bytes<0
      ||!(/^[a-f0-9]{64}$/).test(item.sha256))fail('unsafe or duplicate file inventory');
    const segments=item.path.split('/');
    if(segments.some(s=>['.env','.git','node_modules','studio','data','public'].includes(s))
      ||/[.](?:sqlite|sqlite3|db|log|pem|key)$/i.test(item.path))
      fail('private data, credentials or unrelated runtime included: '+item.path);
    const bytes=entries.get(item.path);
    if(!bytes||bytes.length!==item.bytes||zip.hash(bytes)!==item.sha256)
      fail('missing, changed or corrupted file: '+item.path);
    listed.add(item.path);total+=bytes.length;
    if(total>150000000)fail('collector package size limit exceeded');
  }
  if(listed.size!==entries.size||[...EXPECTED_PACKAGE_FILES].some(name=>!listed.has(name)))
    fail('ZIP inventory differs from the exact collector allowlist');
  const publicPrefix='collector/server/collector-public/';
  const publicFiles=[...entries.keys()].filter(name=>name.startsWith(publicPrefix)).sort();
  if(JSON.stringify(publicFiles)!==JSON.stringify([
    'collector/server/collector-public/.htaccess',
    'collector/server/collector-public/index.php'
  ]))fail('public document root must contain exactly index.php and .htaccess');
  const phpFiles=[...entries.keys()].filter(name=>{
    const rest=name.startsWith('collector/server/')?name.slice('collector/server/'.length):'';
    return rest.endsWith('.php')&&!rest.includes('/');
  });
  if(JSON.stringify(phpFiles.sort())!==JSON.stringify(EXPECTED_SERVER_PHP.map(name=>'collector/server/'+name).sort()))
    fail('collector PHP runtime differs from the reviewed allowlist');
  if(entries.has('collector/server/Api.php'))fail('CMS admin API must not be packaged');
  const bootstrap=entries.get('collector/server/bootstrap.php').toString('utf8');
  if(bootstrap.includes("require_once __DIR__ . '/Api.php';"))fail('collector bootstrap must not load the CMS admin API');
  const dependencies=[...bootstrap.matchAll(/require_once __DIR__ [.] '[/]([^']+[.]php)'/g)]
    .map(m=>'collector/server/'+m[1]);
  if(dependencies.length<10)fail('could not read bootstrap dependency list');
  for(const name of dependencies)if(!entries.has(name))fail('bootstrap dependency missing: '+name);
  const components=[...entries.keys()].filter(name=>{
    const rest=name.startsWith('collector/components/')?name.slice('collector/components/'.length):'';
    return rest.endsWith('.json')&&!rest.includes('/');
  });
  if(JSON.stringify(components.sort())!==JSON.stringify(EXPECTED_COMPONENTS.map(name=>'collector/components/'+name).sort()))
    fail('component registry differs from the reviewed allowlist');
  for(const name of components){
    let component;
    try{component=JSON.parse(entries.get(name).toString('utf8'));}catch(_){fail('invalid component manifest: '+name);}
    if(component.format!=='manufact-ai-component-v1'
      ||component.id!==path.basename(name,'.json'))fail('component manifest identity mismatch: '+name);
  }
  const index=entries.get(publicPrefix+'index.php').toString('utf8');
  if(!index.includes("require dirname(__DIR__) . '/bootstrap.php';")
    ||!index.includes('FormGateway::respond')||index.includes('Api::'))
    fail('collector front controller is not isolated');
  const apache=entries.get(publicPrefix+'.htaccess').toString('utf8');
  if(!apache.includes('Options -Indexes')||!apache.includes('RewriteEngine On')
    ||!apache.includes('RewriteRule ^forms/')||!apache.includes('RewriteRule ^ - [R=404,L]'))
    fail('Apache collector route rules are incomplete');
  const readme=entries.get('collector/README.txt')?.toString('utf8')??'';
  for(const required of [
    'collector/server/collector-public','SAME dedicated Stage3 database',
    'STAGE3_FORM_SECRET','STAGE3_FORM_ORIGINS','STAGE3_FORM_ENDPOINT',
    'This detects accidental changes;','never deploys'
  ])if(!readme.includes(required))fail('operator instructions missing: '+required);
  if(/STAGE3_FORM_SECRET\s*=|bot\d+:[A-Za-z0-9_-]{20,}|BEGIN (?:RSA |EC )?PRIVATE KEY|sk-proj-[A-Za-z0-9_-]{20,}/i.test(readme))
    fail('secret-like value found in operator instructions');
  return {
    sha256:zip.hash(raw),format:meta.format,version:meta.version,
    documentRoot:meta.documentRoot,files:entries.size,bytes:raw.length,
    privatePhpFiles:phpFiles.length,componentManifests:components.length,
    secretsIncluded:false,databaseIncluded:false
  };
}
if(require.main===module)try{
  if(process.argv.length!==3)fail('Usage: verify-collector.cjs /ABSOLUTE/collector.zip');
  process.stdout.write(JSON.stringify(inspect(process.argv[2]),null,2)+'\n');
}catch(error){console.error(error.message);process.exitCode=1;}
module.exports={inspect};
