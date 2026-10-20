#!/usr/bin/env bash
# Independent candidate lab runner. It does NOT install tools or connect to hosting.
set -euo pipefail
cd "$(dirname "$0")/../.."
command -v php >/dev/null || { echo 'PHP_REQUIRED' >&2; exit 2; }
command -v python >/dev/null || { echo 'PYTHON_REQUIRED' >&2; exit 2; }
command -v node >/dev/null || { echo 'NODE_FOR_SYNTAX_CHECK_REQUIRED' >&2; exit 2; }
for file in lab/src/*.php lab/public/*.php lab/tests/*.php; do
    php -l "$file" >/dev/null
done
for file in lab/tests/*-tests.php; do
    php "$file"
done
node --check lab/public/assets/ui.js
# Keep Chromium last: some shared sandboxes leak browser subprocess resources.
# A per-suite cap reports failure rather than hanging the pipeline indefinitely.
command -v timeout >/dev/null || { echo 'TIMEOUT_REQUIRED_ON_LINUX_RUNNER' >&2; exit 2; }
for file in lab/tests/test_*.py; do
    if [[ "$file" == *browser*.py ]]; then continue; fi
    timeout 40s python -m unittest discover -s lab/tests -p "$(basename "$file")" -q
done
# Run every actual Chromium suite at the end, after isolated HTTP sessions.
for file in lab/tests/test_*browser*.py; do
    # The bridge suite is deliberately imported by test_browser.py so that the
    # shared fixed-list GitHub workflow exercises it too. Avoid running twice.
    if [[ "$file" == *test_browser_php_bridge.py ]]; then continue; fi
    timeout 60s python -m unittest discover -s lab/tests -p "$(basename "$file")" -q
done
printf '%s\n' 'RESEARCH_LAB_TESTS_PASSED (NOT production, no real mail/phone/Next SSR)'
