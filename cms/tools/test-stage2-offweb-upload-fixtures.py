#!/usr/bin/env python3
"""No-host Stage2 offweb upload path / tamper / symlink fixture tests."""
import importlib.util
from pathlib import Path
import shutil
import sys
import tempfile

if len(sys.argv) != 2:
    raise SystemExit("FIXTURE_ARGUMENTS_REFUSED")
script = Path(__file__).with_name("test-stage2-offweb-upload.py")
spec = importlib.util.spec_from_file_location("offweb_artifact", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
source = Path(sys.argv[1]).resolve()
original, digest = module.validate(source)
checks = 0
def ok(condition, description):
    global checks
    checks += 1
    if not condition:
        raise AssertionError(description)
def refused(root, reason):
    try:
        module.validate(root)
    except ValueError:
        ok(True, reason)
    else:
        ok(False, reason)
ok(len(original) >= 450 and len(original["public/.htaccess"]) > 20,
   "expected full offweb artifact and hidden Apache configuration")
with tempfile.TemporaryDirectory(prefix="stage2-offweb-zip-negative-") as temp:
    dest = Path(temp) / "private-runtime"
    shutil.copytree(source, dest)
    current, expected_digest = module.validate(dest)
    ok(current == original and expected_digest == digest, "copy produces identical evidence")
    changed = dest / "bin" / "hostinger-stage2-once.php"
    data = changed.read_bytes()
    changed.write_bytes(data + b"\n# malicious append")
    refused(dest, "changed operator code rejected")
    changed.write_bytes(data)
    extra = dest / "private" / "local-secrets.txt"
    extra.write_text("MUST_NOT_PACKAGE")
    refused(dest, "unlisted credential-like file rejected")
    extra.unlink()
    target = dest / "public" / "bad-key"
    target.symlink_to(dest / "public" / "index.php")
    refused(dest, "symlink in webroot rejected")
    target.unlink()
    hidden = dest / "public" / ".htaccess"
    old = hidden.read_bytes()
    hidden.unlink()
    refused(dest, "absent hidden Apache security rules rejected")
    hidden.write_bytes(old)
    (dest / "private" / ".env").write_text("unsafe=1")
    refused(dest, "hidden secret-bearing file rejected")
    (dest / "private" / ".env").unlink()
    ok(module.validate(dest)[1] == digest, "clean final artifact verified")
    web = Path(temp) / "public_html"
    web.mkdir()
    (web / "private-runtime").symlink_to(dest, target_is_directory=True)
    refused(web / "private-runtime", "public webroot symlink upload refused")
    ok(module.validate(dest)[1] == digest, "no host writes or changes from fixture")
    refused(Path(temp), "wrong upload root basename rejected")
print(f"Stage2 Hostinger upload hostile fixture PASS: {checks} checks; no host, secrets, SSH or DB")
