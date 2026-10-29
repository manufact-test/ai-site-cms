'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const safeRoute = /^\/(?:[a-z0-9-]+\/)*$/;
const safeAsset = /^assets\/[a-z][a-z0-9-]{2,79}\.(?:png|jpg|webp|mp4|woff2)$/;
const safeSearch = new Set(['robots.txt', 'sitemap.xml']);
const safeStyle = /^styles\/site-[a-f0-9]{64}\.css$/;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const insist = (truth, why) => { if (!truth) throw new Error('Runtime export rejected: ' + why); };

function inspect(root) {
  insist(path.isAbsolute(root), 'absolute release directory required');
  insist(fs.statSync(root).isDirectory() && !fs.lstatSync(root).isSymbolicLink(), 'invalid release directory');
  const manifestPath = path.join(root, 'release-manifest.json');
  insist(fs.existsSync(manifestPath) && fs.lstatSync(manifestPath).isFile(), 'missing release manifest');
  const raw = fs.readFileSync(manifestPath);
  insist(raw.length > 0 && raw.length <= 2_000_000, 'manifest size');
  const m = JSON.parse(raw.toString('utf8'));
  insist(m.format === 'manufact-ai-static-site-v1' && /^[a-z][a-z0-9-]{2,79}$/.test(m.siteId)
    && Number.isSafeInteger(m.publishedVersion) && m.publishedVersion > 0
    && Number.isSafeInteger(m.sourceRevision) && m.sourceRevision > 0, 'not a published Stage3 release');
  insist(Array.isArray(m.pages) && m.pages.length > 0 && m.pages.length <= 500
    && Array.isArray(m.redirects) && m.redirects.length <= 500
    && Array.isArray(m.assets) && m.assets.length <= 3000, 'unexpected collection');
  const files = new Set(['release-manifest.json']);
  const routeSet = new Set();
  const pages = new Map();
  const redirects = new Map();
  let byteTotal = raw.length;

  function verifyFile(relative, digest) {
    insist(typeof relative === 'string' && relative.length < 240 && !files.has(relative)
      && !relative.startsWith('/') && !relative.includes('\\')
      && !relative.split('/').some(x => x === '..' || x === '.' || x === ''), 'unsafe or duplicate file');
    insist(typeof digest === 'string' && /^[a-f0-9]{64}$/.test(digest), 'invalid SHA256');
    const f = path.join(root, relative);
    insist(fs.existsSync(f) && fs.lstatSync(f).isFile() && !fs.lstatSync(f).isSymbolicLink(), 'missing or linked file: ' + relative);
    const bytes = fs.readFileSync(f);
    byteTotal += bytes.length;
    insist(bytes.length <= 125_000_000 && byteTotal <= 500_000_000, 'release size limit');
    insist(sha(bytes) === digest, 'content checksum mismatch: ' + relative);
    files.add(relative);
    return bytes;
  }
  for (const page of m.pages) {
    insist(page && typeof page.path === 'string' && safeRoute.test(page.path)
      && !routeSet.has(page.path), 'invalid or duplicated page route');
    const expected = page.path.slice(1) + 'index.html';
    insist(page.file === expected, 'page file differs from route');
    const bytes = verifyFile(page.file, page.sha256);
    insist(bytes.toString('utf8').startsWith('<!doctype html>'), 'page is not HTML');
    routeSet.add(page.path);
    pages.set(page.path, bytes.toString('utf8'));
  }
  insist(pages.has('/'), 'home page missing');
  for (const redirect of m.redirects) {
    insist(redirect && typeof redirect.from === 'string' && safeRoute.test(redirect.from)
      && redirect.from !== '/' && !routeSet.has(redirect.from), 'conflicting redirect route');
    insist(typeof redirect.to === 'string' && redirect.to.startsWith('/') && !redirect.to.startsWith('//')
      && !/[\\\r\n]/.test(redirect.to), 'invalid redirect target');
    const url = new URL(redirect.to, 'https://local.invalid');
    insist(url.origin === 'https://local.invalid' && safeRoute.test(url.pathname)
      && url.pathname !== redirect.from && pages.has(url.pathname), 'redirect target not a live page');
    insist(redirect.file === redirect.from.slice(1) + 'index.html', 'redirect file differs from route');
    verifyFile(redirect.file, redirect.sha256);
    routeSet.add(redirect.from);
    redirects.set(redirect.from, redirect.to);
  }
  for (const asset of m.assets) {
    insist(asset && safeAsset.test(asset.file) && typeof asset.id === 'string'
      && asset.file.startsWith('assets/' + asset.id + '.'), 'unsafe media file');
    verifyFile(asset.file, asset.sha256);
  }
  if (m.stylesheets !== undefined) {
    insist(Array.isArray(m.stylesheets) && m.stylesheets.length===1,
      'expected one immutable base stylesheet');
    for (const style of m.stylesheets) {
      insist(style && typeof style.file==='string' && safeStyle.test(style.file)
        && style.file==='styles/site-'+style.sha256+'.css',
        'invalid content-addressed global CSS');
      verifyFile(style.file,style.sha256);
      for(const [route,html] of pages)
        insist(html.includes('<link rel="stylesheet" href="/'+style.file+'">'),
          'stylesheet missing from route '+route);
    }
  }
  if (m.searchFiles !== undefined) {
    insist(m.searchFiles && typeof m.searchFiles === 'object' && !Array.isArray(m.searchFiles), 'invalid search metadata');
    for (const [name, digest] of Object.entries(m.searchFiles)) {
      insist(safeSearch.has(name), 'unrecognized search file');
      verifyFile(name, digest);
    }
  }
  if (m.publicOrigin !== null && m.publicOrigin !== undefined) {
    insist(typeof m.publicOrigin === 'string' && /^https:\/\/[a-z0-9.-]+(?::\d{2,5})?$/i.test(m.publicOrigin), 'public origin');
  }
  if (m.formCollector !== null && m.formCollector !== undefined) {
    insist(typeof m.formCollector === 'string', 'invalid form collector');
    const endpoint = new URL(m.formCollector);
    const localOnly = endpoint.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname);
    insist(!endpoint.username && !endpoint.password && (endpoint.protocol === 'https:' || localOnly),
      'form collector must be HTTPS outside loopback isolation');
  }
  function walk(dir, rel = '') {
    for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
      const name = rel ? rel + '/' + entry.name : entry.name;
      insist(!entry.isSymbolicLink(), 'symlink in release: ' + name);
      if (entry.isDirectory()) walk(path.join(dir, entry.name), name);
      else insist(entry.isFile() && files.has(name), 'unlisted release file: ' + name);
    }
  }
  walk(root);
  return {manifest:m, pages, redirects, files, sha256:sha(raw)};
}
module.exports = {inspect};
