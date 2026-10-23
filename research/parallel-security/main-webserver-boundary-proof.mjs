#!/usr/bin/env node
// Exact-original-main Apache/LiteSpeed .htaccess SOURCE contract.
// Static checked-in directives only; no webserver or Hostinger execution.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const expected={
  'cms/public/.htaccess':[
    'Options -Indexes -MultiViews -FollowSymLinks -SymLinksIfOwnerMatch',
    'DirectoryIndex index.php',
    'FallbackResource /index.php',
    '<FilesMatch "^\\.">',
    'Require all denied',
    '</FilesMatch>',
    '<FilesMatch "^(?!index\\.php$).+\\.(?:php|phtml|phar|cgi|pl)$">',
    'Require all denied',
    '</FilesMatch>',
    '<FilesMatch "\\.(?:sqlite|sqlite3|db|sql|bak|log|ini|env|pem|key|p12|pfx)$">',
    'Require all denied',
    '</FilesMatch>'
  ],
  'cms/hosting/hostinger-readonly/.htaccess':[
    'Options -Indexes -MultiViews -FollowSymLinks',
    'DirectoryIndex index.php',
    '<FilesMatch "^\\.">',
    'Require all denied',
    '</FilesMatch>',
    '<FilesMatch "^(?!index\\.php$).+\\.(?:php|phtml|phar|cgi|pl)$">',
    'Require all denied',
    '</FilesMatch>',
    '<FilesMatch "\\.(?:sql|bak|db|sqlite|ini|env|pem|key|log|p12|pfx)$">',
    'Require all denied',
    '</FilesMatch>',
    'RewriteEngine On',
    'RewriteRule (^|/)\\. - [F,L]',
    'RewriteCond %{REQUEST_FILENAME} !-f',
    'RewriteCond %{REQUEST_FILENAME} !-d',
    'RewriteRule ^ index.php [L]'
  ]
};
function checkPolicy(file,raw){
  if(typeof raw!=='string'||!raw.startsWith('#')||
    raw.length<100||raw.length>16384||/[\0\r]/.test(raw))
    throw Error('WEBSERVER_POLICY_REFUSED malformed policy '+file);
  // Comments on standalone lines are ignored; never infer effects from a
  // commented-out Require/Rewrite/Options directive.
  const active=raw.split('\n').map(s=>s.trim())
    .filter(s=>s.length>0&&!s.startsWith('#'));
  assert.deepEqual(active,expected[file],
    'WEBSERVER_POLICY_REFUSED unexpected active directives in '+file);
  return {file,activeDirectives:active.length,exactKnownSourcePolicy:true};
}
function verifiedSource(root,rel){
  const file=path.join(root,rel);
  const s=fs.lstatSync(file);
  if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||
     s.size<100||s.size>16384||fs.realpathSync(file)!==file)
    throw Error('WEBSERVER_POLICY_REFUSED nonregular source '+rel);
  const data=fs.readFileSync(file,'utf8');
  if(Buffer.byteLength(data)!==s.size)
    throw Error('WEBSERVER_POLICY_REFUSED partial source '+rel);
  return data;
}
function regression(){
  let assertions=0;
  for(const [rel,active] of Object.entries(expected)){
    const basic='# synthetic fixture, NOT an original Git file\n'+active.join('\n')+'\n';
    checkPolicy(rel,basic); assertions++;
    const unsafe=[
      basic.replace(active[0],active[0].replace('-Indexes','+Indexes')),
      basic.replace('Require all denied','Require all granted'),
      basic.replace('DirectoryIndex index.php','DirectoryIndex debug.php'),
      basic.replace('index\\.php$', 'index\\.php|debug\\.php$'),
      basic.replace(active[active.length-1],''),
      basic+'AddHandler application/x-httpd-php .phtml\n',
      basic.replace('<FilesMatch "^\\.">','# <FilesMatch "^\\.">'),
      basic.replace('Require all denied','# Require all denied')
    ];
    if(rel==='cms/public/.htaccess'){
      unsafe.push(basic.replace('FallbackResource /index.php','# FallbackResource /index.php'));
      unsafe.push(basic.replace('-FollowSymLinks','+FollowSymLinks'));
    }else{
      unsafe.push(basic.replace('RewriteEngine On','RewriteEngine Off'));
      unsafe.push(basic.replace('RewriteRule (^|/)\\. - [F,L]','# removed anti-dot rewrite'));
      unsafe.push(basic.replace('RewriteCond %{REQUEST_FILENAME} !-d','# removed directory exception'));
    }
    for(const [i,v] of unsafe.entries()){
      assert.throws(()=>checkPolicy(rel,v),
        undefined,'unsafe mutation accepted: '+rel+' '+i);
      assertions++;
    }
    checkPolicy(rel,basic+'# Require all granted; AddHandler php\n'); assertions++;
  }
  console.log('WEBSERVER_POLICY_SYNTHETIC_REGRESSION_PASS '+assertions+
    ' tests; fixtures only, never Hostinger semantics or real deployment');
}
try{
  if(process.argv.length===3&&process.argv[2]==='--self-test'){
    regression();
  }else if(process.argv.length===3){
    const root=fs.realpathSync(process.argv[2]);
    const entries=Object.keys(expected).map(rel=>
      checkPolicy(rel,verifiedSource(root,rel)));
    const result={
      schema:'ai-site-cms-original-main-webserver-static-policy-v1',
      files:entries,
      scopes:['cms/public','cms/hosting/hostinger-readonly'],
      originalGitBlobAttestationRequiredExternally:true,
      exactCheckedInDirectiveSetObserved:true,
      serverModulesOrAllowOverrideVerified:false,
      actualDocumentRootsVerified:false,
      requestRewriteOrDenyBehaviorObserved:false,
      extraPublicArtifactsOrFileHandlersExcludedFromProof:true,
      hostingerTested:false,productionApproved:false
    };
    console.log(JSON.stringify(result));
    console.log('ORIGINAL main static webserver document-root policy PASS 2 original files; NO Apache/LiteSpeed/Hostinger enforcement proof');
  }else throw Error('Usage: node main-webserver-boundary-proof.mjs <original-main-root>|--self-test');
}catch(error){
  console.error('WEBSERVER_POLICY_REFUSED '+String(error.message||error).slice(0,800));
  process.exitCode=1;
}
