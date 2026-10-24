'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const FORMAT = 'manufact-ai-static-site-v1';
const ROUTE = /^\/(?:[a-z0-9][a-z0-9-]*\/)*$/;
const ID = /^[a-z][a-z0-9-]{2,79}$/;
const SHA = /^[a-f0-9]{64}$/;
const MIME = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
const DEFAULT_MAX = 16 * 1024 * 1024;
const MAX_ITEMS = 5000;
const PHASES = ['filesystem', 'manifest', 'integrity', 'links', 'seo', 'security'];

function decodeEntities(value) {
  return String(value).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (original, entity) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    const lower = entity.toLowerCase();
    if (Object.hasOwn(named, lower)) return named[lower];
    const numeric = lower.startsWith('#x') ? parseInt(lower.slice(2), 16) : parseInt(lower.slice(1), 10);
    return numeric > 0 && numeric <= 0x10ffff && !(numeric >= 0xd800 && numeric <= 0xdfff)
      ? String.fromCodePoint(numeric) : original;
  });
}

// A quote-aware lexical scanner, NOT a standards-compliant HTML DOM/parser.
// It skips comments and raw style/script bodies; caller rejects script elements.
function tags(html) {
  const result = [];
  let i = 0;
  while (i < html.length) {
    const start = html.indexOf('<', i);
    if (start < 0) break;
    if (html.startsWith('<!--', start)) {
      const end = html.indexOf('-->', start + 4);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    const match = /^<\s*(\/?)\s*([a-z][a-z0-9:-]*)\b/i.exec(html.slice(start, start + 90));
    if (!match) { i = start + 1; continue; }
    let cursor = start + match[0].length;
    let quote = null;
    while (cursor < html.length) {
      const ch = html[cursor];
      if (quote) { if (ch === quote) quote = null; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '>') break;
      cursor++;
    }
    if (cursor === html.length) break;
    const name = match[2].toLowerCase();
    const closing = !!match[1];
    const attrs = Object.create(null);
    if (!closing) {
      const raw = html.slice(start + match[0].length, cursor);
      const attrRx = /([^\s=/'"<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      let attr;
      while ((attr = attrRx.exec(raw))) {
        const key = attr[1].toLowerCase();
        if (!Object.hasOwn(attrs, key)) attrs[key] = decodeEntities(attr[2] ?? attr[3] ?? attr[4] ?? '');
      }
    }
    result.push({ name, closing, attrs });
    i = cursor + 1;
    if (!closing && (name === 'style' || name === 'script')) {
      const end = html.toLowerCase().indexOf(`</${name}`, i);
      if (end >= 0) i = end;
    }
  }
  return result;
}

function audit(directory, options = {}) {
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX;
  if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes < 1 || maxFileBytes > 256 * 1024 * 1024)
    throw new TypeError('maxFileBytes must be an integer from 1 to 268435456');
  const root = path.resolve(directory);
  const report = {
    format: 'manufact-ai-release-audit-v1',
    checks: [], pages: [], assets: [], errors: [], warnings: [],
    summary: { ok: false, pages: 0, assets: 0, redirects: 0, errors: 0, warnings: 0 }
  };
  const issue = (severity, phase, code, file, message) => report[severity].push({ phase, code, file, message });
  const err = (phase, code, file, message) => issue('errors', phase, code, file, message);
  const warn = (phase, code, file, message) => issue('warnings', phase, code, file, message);
  const finish = () => {
    for (const id of PHASES) {
      const count = report.errors.filter(e => e.phase === id).length;
      report.checks.push({ id, status: count ? 'fail' : 'pass', errors: count,
        warnings: report.warnings.filter(w => w.phase === id).length });
    }
    report.summary = {
      ok: !report.errors.length, pages: report.pages.length, assets: report.assets.length,
      redirects: report.summary.redirects,
      errors: report.errors.length, warnings: report.warnings.length
    };
    return report;
  };
  const actual = new Set();
  try {
    const stat = fs.lstatSync(root);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('Audit root must be a real directory, not a symlink');
  } catch (e) {
    err('filesystem', 'ROOT_INVALID', '.', e.message);
    return finish();
  }
  let scanned = 0;
  function walk(base, depth) {
    if (depth > 32) { err('filesystem', 'DEPTH_LIMIT', base || '.', 'Directory depth exceeds 32'); return; }
    let names;
    try { names = fs.readdirSync(path.join(root, base)).sort(); }
    catch (e) { err('filesystem', 'READ_DIRECTORY', base || '.', e.message); return; }
    for (const name of names) {
      if (++scanned > 10000) { err('filesystem', 'ENTRY_LIMIT', '.', 'Maximum 10000 filesystem entries exceeded'); return; }
      const relative = base ? base + '/' + name : name;
      let stat;
      try { stat = fs.lstatSync(path.join(root, relative)); }
      catch (e) { err('filesystem', 'STAT_FAILED', relative, e.message); continue; }
      if (stat.isSymbolicLink()) { err('filesystem', 'SYMLINK', relative, 'Symbolic links are not allowed in the export'); continue; }
      if (stat.isDirectory()) { walk(relative, depth + 1); continue; }
      if (!stat.isFile()) { err('filesystem', 'SPECIAL_FILE', relative, 'Only regular files and directories are allowed'); continue; }
      actual.add(relative);
      if (stat.size > maxFileBytes) err('filesystem', 'FILE_TOO_LARGE', relative, `File exceeds ${maxFileBytes} bytes`);
      if (/\.(?:php\d*|phtml|phar|cgi|pl|sh|exe|htaccess)$/i.test(name) || /^\.env(?:\.|$)/i.test(name))
        err('security', 'EXECUTABLE_ARTIFACT', relative, 'Executable, environment or server-side artifact in static export');
    }
  }
  walk('', 0);
  const expected = new Set(['release-manifest.json']);
  const readFile = (file, phase) => {
    if (!safeFile(file)) { err(phase, 'UNSAFE_FILE_PATH', String(file), 'Not a safe relative file path'); return null; }
    if (!actual.has(file)) { err(phase, 'MISSING_FILE', file, 'Missing export file or inaccessible/symlinked file'); return null; }
    try {
      const full = path.join(root, ...file.split('/'));
      const stat = fs.lstatSync(full);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxFileBytes) {
        err(phase, 'UNSAFE_FILE', file, 'File is not regular or exceeds file-size limit'); return null;
      }
      const real = fs.realpathSync(full);
      if (!real.startsWith(root + path.sep)) { err(phase, 'PATH_ESCAPE', file, 'File escapes export root'); return null; }
      return fs.readFileSync(full);
    } catch (e) { err(phase, 'READ_FILE', file, e.message); return null; }
  };
  const safeFile = file => typeof file === 'string' && file.length <= 400 &&
    !file.includes('\\') && !file.includes('%') && !file.includes(':') && !file.includes('\0') &&
    !file.startsWith('/') && !file.includes('//') &&
    file.split('/').every(part => part !== '' && part !== '.' && part !== '..' && /^[a-zA-Z0-9._-]+$/.test(part)) &&
    path.posix.normalize(file) === file;
  const hashFile = (file, sha, phase) => {
    if (!SHA.test(sha ?? '')) { err('manifest', 'INVALID_SHA256', String(file), 'Expected a lowercase 64-character SHA256 digest'); return null; }
    const bytes = readFile(file, phase);
    if (bytes === null) return null;
    const found = crypto.createHash('sha256').update(bytes).digest('hex');
    if (found !== sha) err(phase, 'SHA256_MISMATCH', file, 'File does not match manifest SHA256');
    return bytes;
  };
  const manifestBytes = readFile('release-manifest.json', 'manifest');
  if (manifestBytes === null) return finish();
  let manifest;
  try { manifest = JSON.parse(manifestBytes.toString('utf8')); }
  catch (e) { err('manifest', 'INVALID_JSON', 'release-manifest.json', e.message); return finish(); }
  if (!manifest || Array.isArray(manifest) || typeof manifest !== 'object') {
    err('manifest', 'INVALID_OBJECT', 'release-manifest.json', 'Manifest must be a JSON object'); return finish();
  }
  if (manifest.format !== FORMAT) err('manifest', 'FORMAT', 'release-manifest.json', `Expected ${FORMAT}`);
  if (!ID.test(manifest.siteId ?? '')) err('manifest', 'SITE_ID', 'release-manifest.json', 'Invalid siteId');
  if (!Number.isSafeInteger(manifest.publishedVersion) || manifest.publishedVersion < 1)
    err('manifest', 'PUBLISHED_VERSION', 'release-manifest.json', 'publishedVersion must be a positive integer');
  if (!Array.isArray(manifest.pages) || !manifest.pages.length) err('manifest', 'PAGES', 'release-manifest.json', 'Nonempty pages array required');
  if (!Array.isArray(manifest.assets)) err('manifest', 'ASSETS', 'release-manifest.json', 'assets array required');
  if (!Array.isArray(manifest.redirects)) err('manifest', 'REDIRECTS', 'release-manifest.json', 'redirects array required');
  for (const key of ['pages', 'assets', 'redirects']) {
    if (Array.isArray(manifest[key]) && manifest[key].length > MAX_ITEMS) {
      err('manifest', 'MANIFEST_LIMIT', 'release-manifest.json', `${key} exceeds ${MAX_ITEMS} entries`);
      return finish();
    }
  }
  const origin = manifest.publicOrigin;
  if (origin != null && (typeof origin !== 'string' ||
      !/^https:\/\/[a-z0-9][a-z0-9.-]*(?::[0-9]{2,5})?$|^http:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]{2,5})?$/i.test(origin)))
    err('manifest', 'PUBLIC_ORIGIN', 'release-manifest.json', 'Unsupported publicOrigin');
  if (manifest.formCollector != null && (typeof manifest.formCollector !== 'string' ||
      !/^https:\/\/[a-z0-9.-]+(?::443)?$|^http:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]{2,5})?$/i.test(manifest.formCollector)))
    err('manifest', 'FORM_COLLECTOR', 'release-manifest.json', 'Unsupported formCollector origin');
  if (manifest.formCollector) warn('security', 'COLLECTOR_UNVERIFIED', 'release-manifest.json', 'Collector is configured; offline inspection cannot verify delivery or secret setup');
  const paths = new Map(), aliases = new Map(), assets = new Map(), files = new Set();
  const takeFile = (file, originLabel) => {
    if (!safeFile(file)) { err('manifest', 'UNSAFE_FILE_PATH', String(file), `Invalid path in ${originLabel}`); return false; }
    if (files.has(file)) { err('manifest', 'DUPLICATE_FILE', file, 'Multiple manifest entries refer to the same file'); return false; }
    files.add(file); expected.add(file); return true;
  };
  for (const entry of Array.isArray(manifest.pages) ? manifest.pages : []) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { err('manifest', 'PAGE_ENTRY', 'release-manifest.json', 'Invalid page entry'); continue; }
    const { path: route, file, sha256 } = entry;
    if (typeof route !== 'string' || !ROUTE.test(route)) { err('manifest', 'PAGE_ROUTE', String(route), 'Invalid page route'); continue; }
    if (paths.has(route)) err('manifest', 'DUPLICATE_ROUTE', route, 'Duplicate page route');
    else paths.set(route, file);
    if (file !== route.slice(1) + 'index.html') err('manifest', 'PAGE_FILE', String(file), `File does not correspond to page route ${route}`);
    const taken = takeFile(file, `page ${route}`);
    const bytes = taken ? hashFile(file, sha256, 'integrity') : null;
    report.pages.push({ path: route, file, sha256Verified: bytes !== null && SHA.test(sha256 ?? '') && crypto.createHash('sha256').update(bytes).digest('hex') === sha256 });
  }
  if (!paths.has('/')) err('manifest', 'MISSING_HOME', '/', 'Home route / must be present');
  for (const entry of Array.isArray(manifest.assets) ? manifest.assets : []) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { err('manifest', 'ASSET_ENTRY', 'release-manifest.json', 'Invalid asset entry'); continue; }
    const { id, file, mime, sha256 } = entry;
    if (!ID.test(id ?? '')) err('manifest', 'ASSET_ID', String(file), 'Asset ID is not allowed');
    if (assets.has(id)) err('manifest', 'DUPLICATE_ASSET', String(file), `Repeated asset ID: ${id}`);
    const ext = typeof file === 'string' ? file.split('.').at(-1) : '';
    if (!Object.hasOwn(MIME, ext) || file !== `assets/${id}.${ext}` || mime !== MIME[ext])
      err('manifest', 'ASSET_PATH_MIME', String(file), 'Asset path, extension, ID or MIME mismatch');
    const taken = takeFile(file, `asset ${id}`);
    const bytes = taken ? hashFile(file, sha256, 'integrity') : null;
    if (bytes && bytes.length > 450 * 1024) err('integrity', 'ASSET_LIMIT', file, 'Published image exceeds 450 KiB CMS media cap');
    if (bytes && Object.hasOwn(MIME, ext)) {
      const validMagic = ext === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : ext === 'jpg' ? bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
      if (!validMagic) err('integrity', 'ASSET_SIGNATURE', file, 'Image file signature does not match declared MIME');
    }
    const valid = bytes !== null && SHA.test(sha256 ?? '') && crypto.createHash('sha256').update(bytes).digest('hex') === sha256;
    report.assets.push({ id, file, mime, sha256Verified: valid });
    if (!assets.has(id)) assets.set(id, file);
  }
  for (const entry of Array.isArray(manifest.redirects) ? manifest.redirects : []) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { err('manifest', 'REDIRECT_ENTRY', 'release-manifest.json', 'Invalid redirect entry'); continue; }
    const { from, to, file, sha256 } = entry;
    if (!ROUTE.test(from ?? '') || !ROUTE.test(to ?? '') || from === to) err('manifest', 'REDIRECT_ROUTE', String(file), 'Redirect source/target must be distinct local routes');
    if (paths.has(from) || aliases.has(from)) err('manifest', 'DUPLICATE_REDIRECT', String(from), 'Redirect collides with page/another redirect');
    if (file !== String(from ?? '').slice(1) + 'index.html') err('manifest', 'REDIRECT_FILE', String(file), 'Redirect path and file disagree');
    if (ROUTE.test(from ?? '') && !aliases.has(from)) aliases.set(from, to);
    if (takeFile(file, `redirect ${from}`)) hashFile(file, sha256, 'integrity');
    report.summary.redirects++;
  }
  for (const [source, target] of aliases) {
    let step = target; const visited = new Set([source]);
    while (aliases.has(step) && !visited.has(step)) { visited.add(step); step = aliases.get(step); }
    if (visited.has(step)) err('manifest', 'REDIRECT_CYCLE', source, 'Circular redirect chain');
    else if (!paths.has(step)) err('manifest', 'REDIRECT_TARGET', source, 'Redirect does not terminate at an existing page');
  }
  if (origin != null) {
    if (!manifest.searchFiles || typeof manifest.searchFiles !== 'object' || Array.isArray(manifest.searchFiles))
      err('manifest', 'SEARCH_FILES', 'release-manifest.json', 'searchFiles required when publicOrigin exists');
    for (const file of ['sitemap.xml', 'robots.txt']) {
      expected.add(file);
      const value = manifest.searchFiles?.[file];
      hashFile(file, value, 'integrity');
    }
    if (manifest.searchFiles && Object.keys(manifest.searchFiles).some(key => !['sitemap.xml','robots.txt'].includes(key)))
      err('manifest', 'UNKNOWN_SEARCH_FILE', 'release-manifest.json', 'Unexpected searchFiles key');
  } else {
    if (manifest.searchFiles && Object.keys(manifest.searchFiles).length)
      err('manifest', 'SEARCH_WITHOUT_ORIGIN', 'release-manifest.json', 'Search files require publicOrigin');
  }
  for (const file of [...actual].sort()) if (!expected.has(file)) err('filesystem', 'UNLISTED_FILE', file, 'Export contains unlisted file');
  const pageIds = new Map(), parsedPages = new Map();
  for (const entry of report.pages) {
    const bytes = safeFile(entry.file) && actual.has(entry.file) ? readFile(entry.file, 'links') : null;
    if (!bytes) continue;
    const html = bytes.toString('utf8');
    const parsed = tags(html);
    parsedPages.set(entry.path, { html, tags: parsed });
    const ids = new Set();
    const anyIds = new Set();
    for (const tag of parsed) {
      if (tag.closing) continue;
      if (typeof tag.attrs.id === 'string') {
        if (anyIds.has(tag.attrs.id)) err('links', 'DUPLICATE_HTML_ID', entry.file, `Duplicate HTML ID ${tag.attrs.id}`);
        anyIds.add(tag.attrs.id);
        if (tag.name === 'section') ids.add(tag.attrs.id);
      }
    }
    pageIds.set(entry.path, ids);
  }
  const localUrl = (raw, current, file, kind) => {
    if (typeof raw !== 'string' || !raw.trim()) { err('links', 'EMPTY_URL', file, `Empty ${kind} URL`); return null; }
    const value = raw.trim();
    if (/^(?:mailto:|tel:)/i.test(value) && kind === 'link') return { external: true };
    if (/^(?:javascript:|data:|file:|vbscript:|blob:)/i.test(value) || /[\\\u0000-\u001f]/.test(value)) {
      err('security', 'UNSAFE_URL', file, `Unsafe ${kind} URL scheme or control character`); return null;
    }
    if (/(?:%2e|%2f|%5c)/i.test(value) || /(^|\/)\.\.?($|\/|[?#])/i.test(value) || /\/\//.test(value.replace(/^https?:\/\//i, ''))) {
      // Double slash at start is an ordinary protocol-relative external link; do not reject that case.
      if (!value.startsWith('//')) { err('security', 'URL_TRAVERSAL', file, `Unsafe path encoding or segments in ${kind}`); return null; }
    }
    let url;
    const base = (origin || 'https://audit.invalid') + current;
    try { url = new URL(value, base); }
    catch { err('links', 'BAD_URL', file, `Invalid ${kind} URL`); return null; }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') { err('security', 'URL_SCHEME', file, `Unexpected ${kind} scheme`); return null; }
    const localOrigin = origin ? new URL(origin).origin : 'https://audit.invalid';
    if (url.origin !== localOrigin) return { external: true, url };
    if (/^\/(?:api|admin|studio|server|published)(?:\/|$)/i.test(url.pathname)) {
      err('security', 'PRIVATE_ROUTE_LINK', file, `Link to CMS/internal route ${url.pathname}`); return null;
    }
    let anchor;
    try { anchor = decodeURIComponent(url.hash.slice(1)); }
    catch { err('links', 'BAD_ANCHOR_ENCODING', file, 'Invalid percent encoding in anchor'); return null; }
    return { external: false, route: url.pathname, anchor, url };
  };
  const checkLink = (raw, current, file, kind) => {
    const parsed = localUrl(raw, current, file, kind);
    if (!parsed || parsed.external) return parsed;
    if (kind === 'image') {
      if (![...assets.values()].includes(parsed.route.slice(1))) err('links', 'BROKEN_IMAGE', file, `Image not listed: ${parsed.route}`);
      return parsed;
    }
    if (kind === 'link') {
      const target = parsed.route;
      if (!paths.has(target) && !aliases.has(target)) err('links', 'BROKEN_LINK', file, `Unpublished route ${target}`);
      else if (parsed.anchor && paths.has(target) && !pageIds.get(target)?.has(parsed.anchor))
        err('links', 'BROKEN_ANCHOR', file, `Missing section ID ${parsed.anchor} on ${target}`);
    }
    return parsed;
  };
  const pageNoindex = new Map();
  let forms = 0;
  for (const entry of report.pages) {
    const data = parsedPages.get(entry.path);
    if (!data) continue;
    const { html, tags: elements } = data, file = entry.file;
    if (/<\?(?:php|=|\s)/i.test(html) || /\{\{\s*(?:secret|token|api[_-]?key|password)\b/i.test(html))
      err('security', 'RAW_TEMPLATE_OR_PHP', file, 'PHP or secret-like unresolved template in public HTML');
    const metas = elements.filter(t => !t.closing && t.name === 'meta');
    const links = elements.filter(t => !t.closing && t.name === 'link');
    const meta = (type, key) => metas.filter(t => (t.attrs[type] || '').toLowerCase() === key);
    const robot = meta('name', 'robots');
    if (robot.length > 1) err('seo', 'ROBOTS_DUPLICATED', file, 'Multiple robots meta tags');
    const noindex = robot.some(t => /(?:^|[,\s])noindex(?:[,\s]|$)/i.test(t.attrs.content || ''));
    if (robot.some(t => (t.attrs.content || '').trim().toLowerCase() !== 'noindex,follow'))
      err('seo', 'ROBOTS_META', file, 'Unsupported robots meta; renderer emits only noindex,follow or no robots tag');
    pageNoindex.set(entry.path, noindex);
    if (!/<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title>/i.test(html)) err('seo', 'MISSING_TITLE', file, 'Nonempty title tag required');
    if (!meta('charset', 'utf-8').length && !metas.some(t => (t.attrs.charset || '').toLowerCase() === 'utf-8'))
      err('seo', 'CHARSET', file, 'Expected UTF-8 charset');
    if (!meta('property', 'og:type').some(t => t.attrs.content === 'website')) err('seo', 'OG_TYPE', file, 'Missing og:type website');
    if (!meta('property', 'og:title').some(t => !!t.attrs.content?.trim())) err('seo', 'OG_TITLE', file, 'Missing og:title');
    const desc = meta('name', 'description');
    if (desc.some(t => !!t.attrs.content) && !meta('property', 'og:description').some(t => !!t.attrs.content))
      err('seo', 'OG_DESCRIPTION', file, 'Missing og:description for described page');
    const canonical = links.filter(t => (t.attrs.rel || '').toLowerCase().split(/\s+/).includes('canonical'));
    if (origin) {
      if (canonical.length !== 1 || canonical[0].attrs.href !== origin + entry.path)
        err('seo', 'CANONICAL', file, `Expected single canonical ${origin + entry.path}`);
      if (!meta('property', 'og:url').some(t => t.attrs.content === origin + entry.path))
        err('seo', 'OG_URL', file, 'og:url must match publicOrigin and page path');
    } else if (canonical.length) warn('seo', 'CANONICAL_WITHOUT_ORIGIN', file, 'Unexpected canonical without publicOrigin');
    for (const ogImage of meta('property', 'og:image')) {
      if (!origin) { warn('seo', 'OG_IMAGE_WITHOUT_ORIGIN', file, 'Cannot validate absolute og:image without configured origin'); continue; }
      checkLink(ogImage.attrs.content, entry.path, file, 'image');
    }
    for (const tag of elements) {
      if (tag.closing) continue;
      if (['script','iframe','object','embed','base'].includes(tag.name))
        err('security', 'ACTIVE_CONTENT', file, `Executable/embedded HTML element <${tag.name}> is not part of static renderer`);
      if (Object.keys(tag.attrs).some(name => /^on[a-z]+$/.test(name) || name === 'srcdoc'))
        err('security', 'EVENT_HANDLER', file, 'Inline JavaScript/event handler attribute in public HTML');
      if (tag.name === 'meta' && (tag.attrs['http-equiv'] || '').toLowerCase() === 'refresh')
        err('security', 'PAGE_REFRESH', file, 'Unexpected meta refresh in published page');
      if (tag.name === 'a' && tag.attrs.href != null) checkLink(tag.attrs.href, entry.path, file, 'link');
      if (tag.name === 'img' || tag.name === 'source') {
        if (tag.attrs.src != null) checkLink(tag.attrs.src, entry.path, file, 'image');
        if (tag.attrs.srcset != null) for (const item of tag.attrs.srcset.split(','))
          checkLink(item.trim().split(/\s+/)[0], entry.path, file, 'image');
      }
      if (tag.name === 'form') {
        forms++;
        if (!manifest.formCollector) err('security', 'UNCONFIGURED_FORM', file, 'Published form without formCollector');
        else {
          const result = localUrl(tag.attrs.action, entry.path, file, 'form');
          const action = result?.url;
          const section = action?.pathname.split('/').at(-1);
          if (!action || !/^https?:\/\/[a-z0-9.-]+(?::[0-9]{2,5})?$/i.test(manifest.formCollector) ||
              action.origin !== new URL(manifest.formCollector).origin ||
              !ID.test(manifest.siteId ?? '') || !ID.test(section ?? '') ||
              action.pathname !== `/forms/${manifest.siteId}/${section}` ||
              !pageIds.get(entry.path)?.has(section) ||
              (tag.attrs.method || '').toLowerCase() !== 'post')
            err('security', 'FORM_ACTION', file, 'Form action must be an explicitly configured collector POST /forms/siteId/sectionId');
        }
      }
      for (const key of ['href','src','action']) {
        const value = tag.attrs[key];
        if (typeof value === 'string' && /(?:\/api\/(?:sites|users|session|login|audit|backups)|\/studio\/|\/admin\/|\/server\/)/i.test(value))
          err('security', 'CMS_ARTIFACT_URL', file, 'Public HTML references private CMS endpoint');
      }
    }
  }
  if (manifest.formCollector && !forms) warn('security', 'UNUSED_COLLECTOR', 'release-manifest.json', 'formCollector configured but no form tags found');
  for (const entry of Array.isArray(manifest.redirects) ? manifest.redirects : []) {
    if (!entry || !safeFile(entry.file) || !actual.has(entry.file)) continue;
    const content = readFile(entry.file, 'integrity')?.toString('utf8');
    if (!content) continue;
    if (!/<meta\s+name="robots"\s+content="noindex,follow"\s*\/?\s*>/i.test(content))
      err('seo', 'REDIRECT_NOINDEX', entry.file, 'Static redirect fallback must be noindex');
    if (!content.includes(`content="0;url=${String(entry.to)}"`))
      err('seo', 'REDIRECT_REFRESH', entry.file, 'Redirect refresh target does not match manifest');
    if (/<script\b|<\?php/i.test(content)) err('security', 'REDIRECT_ACTIVE', entry.file, 'Active content in redirect fallback');
  }
  if (origin) {
    const sitemap = readFile('sitemap.xml', 'seo')?.toString('utf8') || '';
    const robots = readFile('robots.txt', 'seo')?.toString('utf8') || '';
    if (!/<urlset\b[^>]*>[\s\S]*<\/urlset>/i.test(sitemap)) err('seo', 'SITEMAP_XML', 'sitemap.xml', 'Invalid or absent sitemap urlset');
    const found = new Set();
    for (const match of sitemap.matchAll(/<loc\s*>([\s\S]*?)<\/loc\s*>/gi)) {
      const url = decodeEntities(match[1].trim());
      if (found.has(url)) err('seo', 'SITEMAP_DUPLICATE', 'sitemap.xml', `Duplicate sitemap URL ${url}`);
      found.add(url);
    }
    const indexed = [...paths.keys()].filter(route => pageNoindex.get(route) === false).map(route => origin + route);
    for (const url of indexed) if (!found.has(url)) err('seo', 'SITEMAP_MISSING', 'sitemap.xml', `Indexed page not in sitemap ${url}`);
    for (const url of found) if (!indexed.includes(url)) err('seo', 'SITEMAP_EXTRA', 'sitemap.xml', `Unpublished/noindex URL in sitemap ${url}`);
    if (!/^User-agent:\s*\*\s*$/im.test(robots) || !/^Allow:\s*\/\s*$/im.test(robots) ||
        !robots.split(/\r?\n/).includes(`Sitemap: ${origin}/sitemap.xml`) || /^Disallow:\s*\//im.test(robots))
      err('seo', 'ROBOTS', 'robots.txt', 'robots.txt must permit crawling and reference exact sitemap URL');
  } else warn('seo', 'NO_PUBLIC_ORIGIN', 'release-manifest.json', 'Canonical, og:url, sitemap and robots are intentionally absent without publicOrigin');
  return finish();
}

module.exports = { audit, DEFAULT_MAX };
