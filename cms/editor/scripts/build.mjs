import {build} from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const output = path.join(root, 'dist', 'editor.js');
await build({
  entryPoints: [path.join(root, 'src', 'index.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['chrome120', 'firefox120', 'safari17'],
  legalComments: 'none', // License/NOTICE is packaged separately; not removed from provenance.
  sourcemap: false,
  outfile: output,
  write: true,
  metafile: true,
  logLevel: 'warning'
}).then(async result => {
  const stat = fs.statSync(output);
  if (!stat.isFile() || stat.size < 1000 || stat.size > 1024*1024) {
    throw new Error('Editor output is absent or outside expected Stage2 bounds');
  }
  const metaPath = path.join(root, 'dist', 'meta.json');
  fs.writeFileSync(metaPath, JSON.stringify({
    stage: 2, editor: 'jedison', editorVersion: '1.27.1',
    entry: 'src/index.js',
    javascriptBytes: stat.size,
    sourceFiles: Object.keys(result.metafile.inputs).sort()
  }, null, 2)+'\n');
  console.log('Stage2 Jedison static browser entry built: '+stat.size+' bytes; no Node needed at runtime');
});
