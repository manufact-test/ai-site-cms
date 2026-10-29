#!/usr/bin/env node
'use strict';
/**
 * Convert a signed-by-content, immutable Stage3 STATIC PUBLISHED RELEASE into a
 * standalone visitor project. Never contacts hosting, CMS or a live database.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const {inspect} = require('../lib/verify.cjs');

const [release, target, destination] = process.argv.slice(2);
const supported = ['php','next-static','next-ssr'];
const fail = why => { throw new Error('Runtime build refused: ' + why); };
const exists = p => { try { fs.lstatSync(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
const put = (folder, file, data) => {
  const full = path.join(folder, file);
  fs.mkdirSync(path.dirname(full), {recursive:true});
  fs.writeFileSync(full, data, {flag:'wx'});
};
const copyTree = (from,to) => fs.cpSync(from,to,{recursive:true,errorOnExist:true,force:false});
const sourcePath = path.resolve(__dirname, '../templates');
function compile() {
  if (process.argv.length !== 5 || !supported.includes(target)
    || !path.isAbsolute(release ?? '') || !path.isAbsolute(destination ?? '')
    || destination.endsWith(path.sep) || exists(destination))
    fail('Usage: node build.cjs <ABSOLUTE-static-release> <php|next-static|next-ssr> <ABSOLUTE-new-output-dir>');
  const parent = fs.realpathSync(path.dirname(destination));
  if (!fs.statSync(parent).isDirectory() || path.basename(destination).startsWith('.stage3-build')) fail('unsafe destination');
  const inspected = inspect(release);
  const {manifest, sha256, pages, redirects} = inspected;
  const temp = fs.mkdtempSync(path.join(parent, '.stage3-build-'));
  try {
    copyTree(release, path.join(temp,'data'));
    if (target === 'php') {
      put(temp,'public/index.php',fs.readFileSync(path.join(sourcePath,'php/index.php')));
      put(temp,'public/.htaccess', [
        'Options -Indexes',
        'RewriteEngine On',
        'RewriteRule ^index\.php$ - [L]',
        'RewriteRule ^ index.php [L,QSA]',
        ''
      ].join('\n'));
      put(temp,'README.txt',[
        'Independent PHP visitor runtime; no CMS/DB/runtime secrets.',
        'Document root MUST be this package public/ directory (NOT package root).',
        'Requires PHP 8.1+ and Apache mod_rewrite or equivalent route-to-index.php.',
        'PHP built-in offline smoke: php -S 127.0.0.1:PORT -t public public/index.php',
        'All media/pages served from private data/; no direct file browsing.',
        'Forms (if present) use the explicit HTTPS collector baked into the published release.',
        'Export only, never a production deployment authorization.',''
      ].join('\n'));
    } else {
      const templates = path.join(sourcePath,'next');
      copyTree(path.join(templates,'lib'),path.join(temp,'lib'));
      copyTree(path.join(templates,'app'),path.join(temp,'app'));
      // Bind the Next visitor to the EXACT FIRST-PARTY published PHP form
      // wizard: release HTML is integrity-checked, but must never become an
      // unchecked executable script in an independent Next runtime.
      const publisher=fs.readFileSync(path.join(__dirname,'../../server/PublicRenderer.php'),'utf8');
      const matched=publisher.match(/public static function formStepsScript\(\): string[\s\S]*?return <<<'JS'\n([\s\S]*?)\nJS;/);
      if(!matched)fail('trusted publisher form wizard contract missing');
      const wizardHash=crypto.createHash('sha256').update(matched[1].trimEnd()).digest('hex');
      put(temp,'lib/wizard-contract.js','export const expectedWizardSha256='+JSON.stringify(wizardHash)+';\n');
      const publicDir = path.join(temp,'public');
      fs.mkdirSync(publicDir);
      // Identical public release identity on Next Static and SSR. No CMS
      // credentials, private host paths, collector secrets or draft data.
      put(temp,'public/_cms-connect.json',JSON.stringify({
        format:'manufact-ai-site-connection-v1',siteId:manifest.siteId,
        publishedVersion:manifest.publishedVersion,sourceRevision:manifest.sourceRevision,
        releaseManifestSha256:sha256
      },null,2)+'\n');
      for (const asset of manifest.assets) {
        const to = path.join(publicDir,asset.file);
        fs.mkdirSync(path.dirname(to),{recursive:true});
        fs.copyFileSync(path.join(release,asset.file),to,fs.constants.COPYFILE_EXCL);
      }
      for (const f of Object.keys(manifest.searchFiles || {}))
        fs.copyFileSync(path.join(release,f),path.join(publicDir,f),fs.constants.COPYFILE_EXCL);
      if (target === 'next-static') {
        fs.rmSync(path.join(temp,'app/[[...slug]]'),{recursive:true,force:true});
        // Materialize every published route and redirect into a real app-router page.
        for (const route of [...pages.keys(),...redirects.keys()]) {
          const segments = route.split('/').filter(Boolean);
          const component = segments.length ? segments.join('/')+'/page.jsx' : 'page.jsx';
          const prefix = '../'.repeat(segments.length+1);
          const source = [
            "import {renderPage,metadataFor} from '"+prefix+"lib/runtime.js';",
            'export const metadata=metadataFor('+JSON.stringify(route)+');',
            'export default function Page(){return renderPage('+JSON.stringify(route)+');}',
            ''
          ].join('\n');
          put(temp,'app/'+component,source);
        }
      } else {
        put(temp,'middleware.js',fs.readFileSync(path.join(templates,'middleware.js')));
      }
      put(temp,'package.json',JSON.stringify({
        name:'manufact-published-'+target,private:true,version:'1.0.0',
        scripts:{build:'next build',start:'next start'},
        dependencies:{next:'15.5.12',react:'19.1.1','react-dom':'19.1.1'}
      },null,2)+'\n');
      put(temp,'next.config.mjs',
        'export default '+JSON.stringify({
          ...(target==='next-static'?{output:'export'}:{}),
          trailingSlash:true,reactStrictMode:true,images:{unoptimized:true}
        },null,2)+';\n');
      put(temp,'README.txt',[
        'Independent Next.js published-site adapter. No CMS DB or editor runtime.',
        target==='next-static'
          ? 'Node.js is needed to BUILD; the resulting out/ is static HTML and can be hosted without Node.'
          : 'Node.js runtime is REQUIRED for Next SSR. PHP-only shared hosting cannot execute it.',
        'Run npm install then npm run build in an isolated trusted environment.',
        target==='next-ssr'?'SSR 301 redirects use middleware; direct page rendering is server-side.'
          :'Static redirects are HTML noindex fallbacks, NOT HTTP 301 (configure host rewrites separately).',
        'Form endpoint (if any) must remain separately accessible.',
        'Generated projects are unbuilt scaffolds until Next builds successfully.',
        'Export does not deploy, start a server or modify live sites.',''
      ].join('\n'));
    }
    put(temp,'runtime-build.json',JSON.stringify({
      format:'manufact-runtime-adapter-v1',technology:target,siteId:manifest.siteId,
      publishedVersion:manifest.publishedVersion,sourceRevision:manifest.sourceRevision,
      releaseManifestSha256:sha256,
      pages:[...pages.keys()],redirects:[...redirects.keys()],
      publicOrigin:manifest.publicOrigin??null,formCollector:manifest.formCollector??null
    },null,2)+'\n');
    if (exists(destination)) fail('destination appeared during build');
    fs.renameSync(temp,destination);
    process.stdout.write('Independent '+target+' visitor package: '+destination+'\n');
  } catch (error) {
    fs.rmSync(temp,{recursive:true,force:true});
    throw error;
  }
}
try { compile(); } catch (error) { console.error(error.message); process.exitCode=1; }
