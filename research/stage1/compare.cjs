/* AI Site CMS stage 1 RESEARCH ONLY: evaluate upstream packages, no CMS source. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { JSDOM } = require('jsdom');
const esbuild = require('esbuild');

const schema = {
  type: 'object',
  title: 'Hero section',
  additionalProperties: false,
  required: ['headline', 'fontSize', 'color', 'showBadge'],
  properties: {
    headline: { type: 'string', title: 'Headline', default: 'Welcome' },
    fontSize: { type: 'integer', title: 'Font size (px)', minimum: 12, maximum: 120, default: 64 },
    color: { type: 'string', title: 'Text color', pattern: '^#[0-9a-fA-F]{6}$', default: '#ffffff' },
    showBadge: { type: 'boolean', title: 'Show badge', default: true }
  }
};
const initial = { headline: 'Welcome', fontSize: 64, color: '#ffffff', showBadge: true };
const changed = { headline: 'AI first!', fontSize: 72, color: '#aabbcc', showBadge: false };
const results = {};
function run(label, fn) {
  try { const r = fn(); results[label] = { pass: true, ...r }; }
  catch (err) { results[label] = { pass: false, error: String(err.stack || err) }; }
}
run('jedison_dom', () => {
  const dom = new JSDOM('<!doctype html><html><body><main id="fields"></main></body></html>', { url: 'https://research.invalid/' });
  const keys = ['window','document','navigator','HTMLElement','Element','Node','Event','MutationObserver','CustomEvent'];
  const old = Object.fromEntries(keys.map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const k of keys) Object.defineProperty(globalThis, k, { configurable: true, writable: true, value: dom.window[k] });
  try {
    const Jedison = require('jedison');
    assert.equal(typeof Jedison.Create, 'function');
    const instance = new Jedison.Create({
      container: dom.window.document.getElementById('fields'), theme: new Jedison.Theme(), schema,
      data: initial, keepMissingSchemaFields: true
    });
    const inputs = [...dom.window.document.querySelectorAll('#fields input')];
    assert.ok(inputs.length >= 4, 'Expected at least 4 schema-driven inputs including possible hidden state input');
    const sourceValues = instance.getValue();
    assert.equal(sourceValues.headline, initial.headline);
    instance.setValue(changed);
    const newValues = instance.getValue();
    assert.equal(newValues.headline, changed.headline);
    assert.equal(newValues.fontSize, changed.fontSize);
    assert.equal(newValues.color, changed.color);
    assert.equal(newValues.showBadge, changed.showBadge);
    assert.equal(dom.window.document.getElementById('fields').textContent.includes('borderRadius'), false);
    instance.destroy();
    return { inputs: inputs.length, initial: sourceValues, changed: newValues, note: 'jsdom harness, not full Chromium browser' };
  } finally {
    for (const k of Object.keys(old)) { if (!old[k]) delete globalThis[k]; else Object.defineProperty(globalThis, k, old[k]); }
    dom.window.close();
  }
});
run('rjsf_server_render', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const mod = require('@rjsf/core');
  const Form = mod.default || mod;
  const valmod = require('@rjsf/validator-ajv8');
  const validator = valmod.default || valmod;
  const html = renderToStaticMarkup(React.createElement(Form, {
    schema, formData: initial, validator, children: React.createElement('button', { type: 'submit' }, 'Apply')
  }));
  assert.ok(html.includes('Headline'), 'Headline field was not rendered');
  assert.ok(html.includes('Font size'), 'Font size field was not rendered');
  assert.ok(!html.includes('borderRadius'), 'Unexpected field present');
  return { outputHtmlBytes: Buffer.byteLength(html), fieldsSeen: ['Headline','Font size','Text color','Show badge'].map(x=>({name:x,seen:html.includes(x)})), note: 'React server-side HTML generation only; client events are not tested' };
});
for (const [name, src] of [
  ['jedison', "import Jedison from 'jedison'; window.EditorUnderTest = Jedison;"],
  ['rjsf', "import React from 'react'; import Form from '@rjsf/core'; import validator from '@rjsf/validator-ajv8'; window.EditorUnderTest = {React, Form, validator};"]
]) {
  run('bundle_' + name, () => {
    const output = esbuild.buildSync({
      stdin: { contents: src, sourcefile: 'entry.js', resolveDir: __dirname, loader: 'js' },
      absWorkingDir: __dirname, bundle: true, minify: true, write: false,
      platform: 'browser', format: 'iife', target: ['chrome120'], logLevel: 'silent'
    });
    const js = output.outputFiles[0].contents;
    return { minifiedBytes: js.length, gzipBytes: zlib.gzipSync(js, { level: 9 }).length,
      note: 'Test entry import bundle, NOT final app size or measured transfer' };
  });
}
run('jedison_published_cjs', () => {
  const filename = require.resolve('jedison');
  const bytes = fs.readFileSync(filename);
  return { filename: path.relative(__dirname, filename), rawBytes: bytes.length, gzipBytes: zlib.gzipSync(bytes, { level: 9 }).length };
});
const mandatory = ['jedison_dom','rjsf_server_render','bundle_jedison','bundle_rjsf'];
console.log('STAGE1_RESEARCH_RESULTS=' + JSON.stringify(results));
const failed = mandatory.filter(n => !results[n]?.pass);
if (failed.length) { console.error('Research checks failed: ' + failed.join(', ')); process.exitCode = 1; }
