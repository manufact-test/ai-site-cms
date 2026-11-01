#!/usr/bin/env node
'use strict';
/**
 * Build a separately deployable, collector-only PHP sidecar.
 * The package contains no database, credentials, Studio or public CMS API.
 * It never connects to a host and never deploys.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const zip=require('../lib/delivery-zip.cjs');
const {inspect}=require('./verify-collector.cjs');
const root=path.resolve(__dirname,'../../..');
const server=path.join(root,'stage3/server');
const components=path.join(root,'stage3/components');
const [target]=process.argv.slice(2);
const fail=m=>{throw Error('Collector packaging refused: '+m);};
const exists=p=>{try{fs.lstatSync(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const requiredEnvironment=[
  'STAGE3_DSN','STAGE3_DB_USER','STAGE3_DB_PASSWORD',
  'STAGE3_FORM_SECRET','STAGE3_FORM_ORIGINS'
];
// CMS-engine updater/control-plane code must never enter the independent form collector.
const EXCLUDED_ENGINE_CONTROL_PHP=new Set([
  'DatabaseSnapshot.php','EngineLifecycle.php','EngineReleaseVerifier.php','EngineRuntime.php'
]);
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
  "RuntimeConfig.php",
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
const apacheRules=[
  'Options -Indexes -MultiViews',
  'DirectoryIndex index.php',
  'RewriteEngine On',
  'RewriteRule ^index\\.php$ - [L]',
  'RewriteRule ^forms/[a-z][a-z0-9-]{2,79}/[a-z][a-z0-9-]{2,79}$ index.php [QSA,L]',
  'RewriteRule ^ - [R=404,L]',
  ''
].join('\n');
const readRegular=file=>{
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()||fs.realpathSync(file)!==file)
    fail('only canonical regular source files are allowed');
  if(st.size>125000000)fail('source file exceeds package limit');
  return fs.readFileSync(file);
};
function main(){
  if(process.argv.length!==3||!path.isAbsolute(target??'')||!target.endsWith('.zip')
    ||target.endsWith(path.sep)||exists(target))
    fail('Usage: package-collector.cjs /ABSOLUTE/NEW-collector.zip (destination must not exist)');
  const parent=path.dirname(target);
  if(!fs.existsSync(parent)||!fs.statSync(parent).isDirectory()
    ||fs.realpathSync(parent)!==parent)fail('destination parent must be an existing canonical directory');
  const entries=[];
  const add=(name,data)=>{
    if(!zip.nameOK(name)||entries.some(e=>e.name===name)||!Buffer.isBuffer(data))
      fail('unsafe or duplicate package path: '+name);
    entries.push({name,data});
  };
  const serverFiles=fs.readdirSync(server,{withFileTypes:true})
    .filter(de=>de.isFile()&&de.name.endsWith('.php')&&de.name!=='Api.php'&&!EXCLUDED_ENGINE_CONTROL_PHP.has(de.name))
    .map(de=>de.name).sort();
  if(!serverFiles.includes('bootstrap.php')||!serverFiles.includes('FormGateway.php')
    ||!serverFiles.includes('SiteRepository.php')||!serverFiles.includes('ContractValidator.php'))
    fail('collector runtime source set is incomplete');
  if(JSON.stringify(serverFiles)!==JSON.stringify(EXPECTED_SERVER_PHP))
    fail('collector PHP source allowlist changed; actual='+JSON.stringify(serverFiles)+' expected='+JSON.stringify(EXPECTED_SERVER_PHP));
  const sourceBootstrap=readRegular(path.join(server,'bootstrap.php')).toString('utf8');
  const apiRequire="require_once __DIR__ . '/Api.php';\n";
  if(!sourceBootstrap.includes(apiRequire))fail('admin API boundary cannot be isolated safely');
  const collectorBootstrap=Buffer.from(sourceBootstrap.replace(apiRequire,''),'utf8');
  for(const name of serverFiles){
    const bytes=name==='bootstrap.php'?collectorBootstrap:readRegular(path.join(server,name));
    add('collector/server/'+name,bytes);
  }
  const bootstrap=entries.find(e=>e.name==='collector/server/bootstrap.php').data.toString('utf8');
  const requiredPhp=[...bootstrap.matchAll(/require_once __DIR__ [.] '[/]([^']+[.]php)'/g)].map(m=>m[1]);
  if(requiredPhp.length<10)fail('could not read the collector bootstrap dependency list');
  for(const name of requiredPhp)if(!serverFiles.includes(name))
    fail('bootstrap dependency is missing: '+name);
  add('collector/server/collector-public/index.php',
    readRegular(path.join(server,'collector-public/index.php')));
  add('collector/server/collector-public/.htaccess',Buffer.from(apacheRules,'utf8'));
  const componentFiles=fs.readdirSync(components,{withFileTypes:true})
    .filter(de=>de.isFile()&&de.name.endsWith('.json'))
    .map(de=>de.name).sort();
  if(JSON.stringify(componentFiles)!==JSON.stringify(EXPECTED_COMPONENTS))
    fail('component manifest allowlist changed; review the collector package contract');
  for(const name of componentFiles){
    const bytes=readRegular(path.join(components,name));
    const manifest=JSON.parse(bytes.toString('utf8'));
    if(manifest.id!==name.slice(0,-5)||manifest.format!=='manufact-ai-component-v1')
      fail('component manifest identity mismatch: '+name);
    add('collector/components/'+name,bytes);
  }
  const readme=[
    'MANUFACT AI SITE CMS — FORM COLLECTOR SIDECAR',
    '',
    'Purpose: receive ordinary HTML form POSTs from an independently hosted published site.',
    'This is a collector-only runtime. It contains no Studio, login page, CMS admin API, database,',
    'credentials, mail provider secrets, customer content or deployment automation.',
    '',
    'DOCUMENT ROOT',
    'Set the web-server document root to collector/server/collector-public ONLY.',
    'The parent collector/server directory and collector/components must remain outside the web root.',
    'Never point the document root at the package root or collector/server.',
    'Only index.php and .htaccess belong in the public directory.',
    '',
    'DATABASE AND ENVIRONMENT',
    'STAGE3_DSN: connect to the SAME dedicated Stage3 database used by the CMS inbox.',
    'STAGE3_DB_USER and STAGE3_DB_PASSWORD: use the CMS database account or a least-privilege',
    'account with the reads/writes required by the existing Stage3 collector schema.',
    'STAGE3_FORM_SECRET: the same private 32+ character HMAC secret used by the CMS publisher.',
    'STAGE3_FORM_ORIGINS: comma-separated exact HTTPS origins allowed to submit forms, with no paths',
    'or trailing slash (for example https://www.example.com,https://example.com).',
    'Do not place values in this package or in a public file. Configure them privately in PHP-FPM',
    'or the hosting control panel. SQLite is for isolated CI/lab use; use the dedicated MySQL database',
    'for a real shared-hosting installation.',
    '',
    'CMS PUBLISHING',
    'Set STAGE3_FORM_ENDPOINT in the CMS to the collector HTTPS origin before exporting/publishing.',
    'The published form action includes the site and section IDs and an HMAC token bound to the',
    'immutable release. The CMS and collector must use the same STAGE3_FORM_SECRET.',
    '',
    'ROUTING',
    'Apache: enable mod_rewrite and allow the supplied .htaccess rules.',
    'Nginx/PHP-FPM example (replace the socket with the host PHP-FPM socket):',
    'location ~ ^/forms/[a-z][a-z0-9-]{2,79}/[a-z][a-z0-9-]{2,79}$ {',
    '  include fastcgi_params;',
    '  fastcgi_param SCRIPT_FILENAME $document_root/index.php;',
    '  fastcgi_pass unix:/run/php/php-fpm.sock;',
    '}',
    'location / { return 404; }',
    '',
    'OPERATIONS',
    'The collector validates origin, release, HMAC, required fields, conditional fields, consent,',
    'rate limits and the published form schema before storing a lead in the shared CMS database.',
    'It queues configured notifications through the existing Stage3 delivery outbox; it does not',
    'send email/Telegram messages itself. Configure and operate notification workers separately.',
    'Use HTTPS only. Verify a real submission on a staging site and confirm it appears in the CMS inbox.',
    '',
    'INTEGRITY',
    'manifest.json records SHA-256 hashes of every packaged file. This detects accidental changes;',
    'it is an integrity inventory, not a digital signature or proof of publisher identity.',
    'The package builder performs no network requests and never deploys or overwrites a destination.',
    ''
  ].join('\n');
  add('collector/README.txt',Buffer.from(readme,'utf8'));
  entries.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  let total=0;
  const files=entries.map(e=>{
    total+=e.data.length;
    if(total>150000000||entries.length>1500)fail('package size/count limit exceeded');
    return {path:e.name,bytes:e.data.length,sha256:zip.hash(e.data)};
  });
  const manifest={
    format:'manufact-form-collector-package-v1',
    version:1,
    runtime:'PHP 8.1+ with PDO and the configured database driver',
    documentRoot:'collector/server/collector-public',
    entrypoint:'collector/server/collector-public/index.php',
    sharedDatabase:'same dedicated Stage3 database used by the CMS inbox',
    requiredEnvironment,
    files
  };
  add('collector/manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n','utf8'));
  entries.sort((a,b)=>a.name.localeCompare(b.name,'en'));
  const bytes=zip.create(entries);
  const temp=path.join(parent,'.stage3-collector-'+process.pid+'-'+crypto.randomBytes(8).toString('hex')+'.zip');
  try{
    fs.writeFileSync(temp,bytes,{flag:'wx',mode:0o600});
    const verified=inspect(temp);
    if(verified.sha256!==zip.hash(bytes))fail('post-build checksum mismatch');
    if(exists(target))fail('destination changed; refusing to overwrite');
    fs.linkSync(temp,target); // atomic no-overwrite publication
    fs.rmSync(temp,{force:true});
    process.stdout.write(JSON.stringify({
      format:manifest.format,zip:target,sha256:verified.sha256,
      files:verified.files,bytes:verified.bytes,documentRoot:verified.documentRoot,
      secretsIncluded:false,databaseIncluded:false,deployed:false
    },null,2)+'\n');
  }finally{if(exists(temp))fs.rmSync(temp,{force:true});}
}
try{main();}catch(error){console.error(error.message);process.exitCode=1;}
