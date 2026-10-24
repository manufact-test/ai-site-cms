#!/usr/bin/env node
'use strict';
const { audit, DEFAULT_MAX } = require('../lib/audit.cjs');

function usage() {
  process.stderr.write('Usage: node stage3/release-audit/bin/audit.cjs <export-directory> [--json] [--max-file-bytes N]\n');
  process.exitCode = 1;
}
const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) {
  usage();
} else {
  let json = false, maxFileBytes = DEFAULT_MAX, directory = null, invalid = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') json = true;
    else if (args[i] === '--max-file-bytes' && i + 1 < args.length) {
      maxFileBytes = Number(args[++i]);
    } else if (!args[i].startsWith('--') && directory === null) directory = args[i];
    else invalid = true;
  }
  if (!directory || invalid) usage();
  else {
    try {
      const result = audit(directory, { maxFileBytes });
      if (json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      else {
        process.stdout.write(`Static export: ${result.summary.ok ? 'PASS' : 'FAIL'}; pages=${result.summary.pages}; assets=${result.summary.assets}; redirects=${result.summary.redirects}; errors=${result.summary.errors}; warnings=${result.summary.warnings}\n`);
        for (const finding of [...result.errors, ...result.warnings])
          process.stdout.write(`${result.errors.includes(finding) ? 'ERROR' : 'WARN'} ${finding.code} ${finding.file}: ${finding.message}\n`);
      }
      if (!result.summary.ok) process.exitCode = 2;
    } catch (error) {
      if (json) process.stdout.write(JSON.stringify({ format: 'manufact-ai-release-audit-v1', checks: [], pages: [], assets: [], errors: [{phase: 'filesystem', code: 'AUDIT_FAILED', file: '.', message: error.message}], warnings: [], summary: { ok: false, pages: 0, assets: 0, redirects: 0, errors: 1, warnings: 0 }}, null, 2) + '\n');
      else process.stderr.write(`Audit failed: ${error.message}\n`);
      process.exitCode = 2;
    }
  }
}
