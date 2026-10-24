#!/usr/bin/env node
'use strict';
// Synthetic end-to-end fixture: no CMS, remote endpoint, dependency or real site.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { audit } = require('../lib/audit.cjs');
const bin = path.join(__dirname, '../bin/audit.cjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-audit-smoke-'));
const origin = 'https://example.org';
const sum = content => crypto.createHash('sha256').update(content).digest('hex');
const save = (root, name, body) => {
  const target = path.join(root, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
  return sum(body);
};
function fixture(name, opts = {}) {
  const root = path.join(temp, name);
  fs.mkdirSync(root);
  const configured = opts.origin !== false;
  const home = '/';
  const about = '/about/';
  const collector = opts.forms ? 'https://collector.example.org' : null;
  const page = (route, index) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${index ? 'Home' : 'About'}</title><meta name="description" content="Description"><meta property="og:type" content="website"><meta property="og:title" content="Test"><meta property="og:description" content="Description">${configured ? `<link rel="canonical" href="${origin + route}"><meta property="og:url" content="${origin + route}">` : ''}${index && configured ? `<meta property="og:image" content="${origin}/assets/photo-one.png">` : ''}${index ? '' : '<meta name="robots" content="noindex,follow">'}</head><body><header><nav><a href="/">Home</a><a href="/about/#team">About</a><a href="/old/">Old</a></nav></header><main>${index ? '<section id="hero"><img src="/assets/photo-one.png" alt="Test">' + (opts.forms ? '<form method="post" action="https://collector.example.org/forms/test-site/hero"><input type="hidden" name="_release" value="1"><input type="hidden" name="_token" value="faketoken"></form>' : '') : '<section id="team">'}<h1>Test</h1></section></main></body></html>`;
  const pages = [
    { path: home, file: 'index.html', sha256: save(root, 'index.html', page(home, true)) },
    { path: about, file: 'about/index.html', sha256: save(root, 'about/index.html', page(about, false)) }
  ];
  const assets = [{ id: 'photo-one', file: 'assets/photo-one.png', mime: 'image/png', sha256: save(root, 'assets/photo-one.png', Buffer.from([137,80,78,71,13,10,26,10])) }];
  const redirectHtml = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0;url=/about/"><title>Moved</title></head><body><a href="/about/">Go</a></body></html>';
  const redirects = [{ from: '/old/', to: '/about/', file: 'old/index.html', sha256: save(root, 'old/index.html', redirectHtml) }];
  const manifest = { format: 'manufact-ai-static-site-v1', siteId: 'test-site', publishedVersion: 1, sourceRevision: 1,
    pages, assets, redirects, formCollector: collector, publicOrigin: configured ? origin : null };
  if (configured) {
    manifest.searchFiles = {
      'sitemap.xml': save(root, 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${origin}/</loc></url>\n</urlset>\n`),
      'robots.txt': save(root, 'robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`)
    };
  }
  fs.writeFileSync(path.join(root, 'release-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { root, manifest };
}
function syncManifest(f) { fs.writeFileSync(path.join(f.root, 'release-manifest.json'), JSON.stringify(f.manifest, null, 2) + '\n'); }
function mutateFile(f, file, edit) {
  const target = path.join(f.root, file);
  fs.writeFileSync(target, edit(fs.readFileSync(target, 'utf8')));
  const group = [...f.manifest.pages, ...f.manifest.assets, ...f.manifest.redirects];
  const entry = group.find(e => e.file === file);
  if (entry) entry.sha256 = sum(fs.readFileSync(target));
  syncManifest(f);
}
function expectError(name, mutate, code) {
  const f = fixture(name);
  mutate(f);
  const report = audit(f.root);
  assert.equal(report.summary.ok, false, `${name} should fail`);
  assert.ok(report.errors.some(e => e.code === code), `${name}: missing ${code}; got ${report.errors.map(e => e.code)}`);
  process.stdout.write(`  rejection ${name}: ${code}\n`);
}
try {
  const good = fixture('good', { forms: true });
  const before = fs.readFileSync(path.join(good.root, 'release-manifest.json'));
  const valid = audit(good.root);
  assert.equal(valid.summary.ok, true, JSON.stringify(valid.errors));
  assert.deepEqual([valid.summary.pages, valid.summary.assets, valid.summary.redirects], [2, 1, 1]);
  assert.deepEqual(fs.readFileSync(path.join(good.root, 'release-manifest.json')), before, 'Auditor must be read-only');
  assert.deepEqual(audit(good.root), valid, 'Report must be deterministic');
  const cli = spawnSync(process.execPath, [bin, good.root, '--json'], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).summary.ok, true);
  const noOrigin = fixture('no-origin', { origin: false });
  assert.equal(audit(noOrigin.root).summary.ok, true, JSON.stringify(audit(noOrigin.root).errors));
  process.stdout.write('  valid: origin+collector, no-origin, CLI JSON, deterministic read-only\n');
  expectError('wrong-digest', f => { f.manifest.pages[0].sha256 = '0'.repeat(64); syncManifest(f); }, 'SHA256_MISMATCH');
  expectError('traversal', f => { f.manifest.assets[0].file = '../escape.png'; syncManifest(f); }, 'UNSAFE_FILE_PATH');
  expectError('missing-home', f => { f.manifest.pages.shift(); syncManifest(f); }, 'MISSING_HOME');
  expectError('broken-anchor', f => mutateFile(f, 'index.html', html => html.replace('/about/#team', '/about/#missing')), 'BROKEN_ANCHOR');
  expectError('broken-image', f => mutateFile(f, 'index.html', html => html.replace('src="/assets/photo-one.png"', 'src="/assets/missing.png"')), 'BROKEN_IMAGE');
  expectError('unlisted-php', f => { save(f.root, 'config.php', '<?php echo "hello";'); }, 'EXECUTABLE_ARTIFACT');
  expectError('active-script', f => mutateFile(f, 'index.html', html => html.replace('</body>', '<script>alert(1)</script></body>')), 'ACTIVE_CONTENT');
  expectError('noindex-sitemap', f => { f.manifest.searchFiles['sitemap.xml'] = save(f.root, 'sitemap.xml', `<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/about/</loc></url></urlset>`); syncManifest(f); }, 'SITEMAP_EXTRA');
  expectError('form-unconfigured', f => mutateFile(f, 'index.html', html => html.replace('</body>', '<form action="/api/sites" method="post"></form></body>')), 'UNCONFIGURED_FORM');
  if (process.platform !== 'win32') expectError('symlink', f => fs.symlinkSync('/etc/hosts', path.join(f.root, 'assets', 'escape.png')), 'SYMLINK');
  const badCli = spawnSync(process.execPath, [bin, fixture('cli-fail').root, '--max-file-bytes', '1', '--json'], { encoding: 'utf8' });
  assert.equal(badCli.status, 2);
  assert.equal(JSON.parse(badCli.stdout).summary.ok, false);
  process.stdout.write('release-audit smoke: PASS\n');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
