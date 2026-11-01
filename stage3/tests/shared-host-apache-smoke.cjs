#!/usr/bin/env node
'use strict';

// Disposable Apache 2.4 + PHP 8.3 shared-host routing rehearsal.
// No public host, DNS, production database, customer data or real mail is contacted.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '../..');
const sourceStage3 = path.join(repoRoot, 'stage3');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'stage3-apache-smoke-'));
const stage3Copy = path.join(temporaryRoot, 'stage3');
const containerName = 'stage3-apache-smoke-' + process.pid;
const imageName = 'stage3-apache-smoke:' + process.pid;
const ownerPassword = 'Stage3-apache-smoke-owner-password-2026!';
const formSecret = 'stage3-apache-smoke-form-secret-0123456789-abcdefghijklmnopqrstuvwxyz';
let imageBuilt = false;
let containerStarted = false;

function docker(args) {
  const result = spawnSync('docker', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error('docker ' + args.join(' ') + ' failed (' + result.status + ')\n' +
      'STDOUT:\n' + (result.stdout || '') + '\nSTDERR:\n' + (result.stderr || ''));
  }
  return (result.stdout || '').trim();
}

function cleanupDocker(args) {
  try { spawnSync('docker', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 1024 * 1024 }); }
  catch (_) {}
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function pause(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  fs.chmodSync(temporaryRoot, 0o755);
  fs.mkdirSync(stage3Copy, { mode: 0o755 });
  for (const folder of ['components', 'media-motion', 'server', 'studio']) {
    fs.cpSync(path.join(sourceStage3, folder), path.join(stage3Copy, folder), { recursive: true });
  }
  fs.chmodSync(stage3Copy, 0o755);

  const publicRoot = path.join(stage3Copy, 'server', 'public');
  const publicEntries = fs.readdirSync(publicRoot).sort();
  assert.deepEqual(publicEntries, ['.htaccess', 'index.php'],
    'the committed Stage3 document root contains only the front controller and routing policy');

  // Deliberately add hostile files to the disposable copy to prove the policy blocks them.
  fs.writeFileSync(path.join(publicRoot, 'leak.php'), "<?php echo 'PUBLIC_PHP_LEAK';\n", { mode: 0o644 });
  fs.mkdirSync(path.join(publicRoot, 'listing-probe'));
  fs.writeFileSync(path.join(publicRoot, 'listing-probe', 'private.txt'), 'DIRECTORY_LISTING_SECRET');

  const port = await freePort();
  docker(['build', '--file', 'stage3/tests/apache-smoke/Dockerfile', '--tag', imageName, '.']);
  imageBuilt = true;

  const env = [
    'STAGE3_DSN=sqlite:/var/private/stage3/stage3.sqlite',
    'STAGE3_DB_USER=',
    'STAGE3_DB_PASSWORD=',
    'STAGE3_OWNER_USER=stage3owner',
    'STAGE3_OWNER_PASSWORD=' + ownerPassword,
    'STAGE3_FORM_SECRET=' + formSecret,
    'STAGE3_FORM_ORIGINS=https://staging.example.invalid',
    'STAGE3_FORM_ENDPOINT=',
    'STAGE3_PRIVATE_DIR=/var/private/stage3',
    'STAGE3_PUBLIC_ROOT=/var/www/stage3/server/public',
    'STAGE3_ALLOW_SQLITE_INSTALL=1',
    'CI=true'
  ];

  const runArgs = [
    'run', '--detach', '--rm', '--name', containerName,
    '--publish', '127.0.0.1:' + port + ':80',
    '--volume', stage3Copy + ':/source/stage3:ro'
  ];
  for (const value of env) runArgs.push('--env', value);
  runArgs.push(imageName, 'sh', '-c',
    'mkdir -p /var/www && cp -a /source/stage3 /var/www/stage3' +
    ' && chown -R www-data:www-data /var/www/stage3' +
    ' && mkdir -p /var/private/stage3' +
    ' && chown www-data:www-data /var/private/stage3' +
    ' && chmod 0700 /var/private/stage3' +
    ' && touch /var/private/stage3/stage3.sqlite' +
    ' && chown www-data:www-data /var/private/stage3/stage3.sqlite' +
    ' && chmod 0600 /var/private/stage3/stage3.sqlite' +
    ' && exec apache2-foreground'
  );
  docker(runArgs);
  containerStarted = true;

  const planRaw = docker(['exec', '--user', 'www-data', containerName, 'php',
    '/var/www/stage3/server/bin/install.php', '--plan']);
  const plan = JSON.parse(planRaw);
  assert.equal(plan.state, 'install_required');
  assert.equal(plan.applyAllowed, true);
  assert.deepEqual(plan.errors, []);
  assert.match(plan.token, /^[a-f0-9]{64}$/);

  const applyRaw = docker(['exec', '--user', 'www-data', containerName, 'php',
    '/var/www/stage3/server/bin/install.php', '--apply=' + plan.token]);
  const applied = JSON.parse(applyRaw);
  assert.equal(applied.state, 'installed');
  assert.equal(applied.deploymentPerformed, false);

  const base = 'http://127.0.0.1:' + port;
  let studioResponse = null;
  let studioBody = '';
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      studioResponse = await fetch(base + '/studio', { redirect: 'manual' });
      studioBody = await studioResponse.text();
      if (studioResponse.status === 200) break;
    } catch (_) {}
    await pause(250);
  }
  assert.ok(studioResponse && studioResponse.status === 200,
    'Apache/LiteSpeed-compatible mod_rewrite must route /studio to the Stage3 front controller; received ' +
    (studioResponse ? studioResponse.status + ' ' + studioBody.slice(0, 300) : 'no response'));
  assert.ok(studioBody.includes('data-stage3-mode="server"'), 'server-backed Studio HTML is served');

  for (const asset of ['/studio.css', '/bundle.js', '/hosted.js', '/access.js', '/media-motion-engine.js']) {
    const response = await fetch(base + asset, { redirect: 'manual' });
    const body = await response.text();
    assert.equal(response.status, 200, asset + ' must be routed through the front controller');
    assert.ok(body.length > 20, asset + ' must return its first-party asset bytes');
  }

  const sessionResponse = await fetch(base + '/api/session', { redirect: 'manual' });
  assert.equal(sessionResponse.status, 200, '/api/session must be routed to PHP');
  const session = await sessionResponse.json();
  assert.equal(session.authenticated, false);

  const anonymousSites = await fetch(base + '/api/sites', { redirect: 'manual' });
  assert.equal(anonymousSites.status, 401, '/api/sites must reach the auth gate, not Apache 404');

  const loginResponse = await fetch(base + '/api/login', {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/json', origin: base },
    body: JSON.stringify({ username: 'stage3owner', password: ownerPassword })
  });
  const loginRaw = await loginResponse.text();
  assert.equal(loginResponse.status, 200, 'owner login must work through Apache: ' + loginRaw.slice(0, 300));
  const login = JSON.parse(loginRaw);
  assert.equal(login.principal.role, 'owner');

  const cookieValues = typeof loginResponse.headers.getSetCookie === 'function'
    ? loginResponse.headers.getSetCookie()
    : [loginResponse.headers.get('set-cookie')].filter(Boolean);
  const cookie = cookieValues.map(value => value.split(';')[0]).filter(Boolean).join('; ');
  assert.ok(cookie.length > 0, 'Apache response must preserve the owner session cookie');

  const ownerSites = await fetch(base + '/api/sites', { headers: { cookie }, redirect: 'manual' });
  assert.equal(ownerSites.status, 200, 'authenticated owner site listing must work through Apache');

  const engineResponse = await fetch(base + '/api/engine', { headers: { cookie }, redirect: 'manual' });
  assert.equal(engineResponse.status, 200, 'owner engine status must work through Apache');
  const engine = await engineResponse.json();
  assert.equal(engine.status, 'ready', 'the stable loader must initialize a healthy legacy engine state');

  for (const route of ['/.env', '/.git/config']) {
    const response = await fetch(base + route, { redirect: 'manual' });
    assert.equal(response.status, 403, route + ' must be blocked by the hidden-path policy');
  }

  const leakedPhp = await fetch(base + '/leak.php', { redirect: 'manual' });
  assert.equal(leakedPhp.status, 403, 'stray PHP files in public_html must not execute');

  const listing = await fetch(base + '/listing-probe/', { redirect: 'manual' });
  const listingBody = await listing.text();
  assert.notEqual(listing.status, 200, 'directory indexes must remain disabled');
  assert.ok(!listingBody.includes('DIRECTORY_LISTING_SECRET'), 'directory contents must never be listed');

  const unknown = await fetch(base + '/__stage3_missing_route__', { redirect: 'manual' });
  assert.equal(unknown.status, 404, 'unknown paths must reach the CMS router and return its 404');

  process.stdout.write('PASS: Apache 2.4 + PHP 8.3, Stage3 CLI install, /studio, assets, API auth/session, engine status, hidden/PHP/dir protections.\n');
}

main().catch(error => {
  if (containerStarted) {
    const logs = spawnSync('docker', ['logs', containerName], { cwd: repoRoot, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    if (logs.stdout) process.stderr.write('\nApache smoke container stdout:\n' + logs.stdout);
    if (logs.stderr) process.stderr.write('\nApache smoke container stderr:\n' + logs.stderr);
  }
  process.stderr.write((error && error.stack) ? error.stack + '\n' : String(error) + '\n');
  process.exitCode = 1;
}).finally(() => {
  cleanupDocker(['rm', '--force', containerName]);
  if (imageBuilt) cleanupDocker(['image', 'rm', '--force', imageName]);
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
});
