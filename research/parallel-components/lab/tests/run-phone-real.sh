#!/usr/bin/env bash
# Developer opt-in only. Disposable dependency install OUTSIDE the repository.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
command -v php >/dev/null || { echo PHP_REQUIRED >&2; exit 2; }
command -v composer >/dev/null || { echo COMPOSER_REQUIRED >&2; exit 2; }
php -r 'exit(extension_loaded("mbstring") ? 0 : 2);' || { echo MBSTRING_REQUIRED >&2; exit 2; }
tmp="$(mktemp -d -t cms-phone-real-XXXXXXXX)"
trap 'rm -rf "$tmp"' EXIT
(
  cd "$tmp"
  composer require --no-interaction --no-plugins --no-scripts --prefer-dist --no-progress \
    'giggsey/libphonenumber-for-php-lite:9.0.41'
)
LAB_PHONE_AUTOLOAD="$tmp/vendor/autoload.php" php "$here/phone-real-integration.php"
