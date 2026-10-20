#!/usr/bin/env python3
"""Host-free hostile fixtures for downloaded artifact return-trip; no secrets."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import shutil
import sys
import tempfile

if len(sys.argv) != 2:
    raise SystemExit("ROUNDTRIP_FIXTURE_ARGUMENT_REFUSED")

script = Path(__file__).with_name("test-stage2-upload-roundtrip.py")
spec = importlib.util.spec_from_file_location("stage2_roundtrip", script)
assert spec is not None and spec.loader is not None
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)
staged = Path(sys.argv[1]).absolute()
count = 0
def okay(condition, description):
    global count
    count += 1
    if not condition:
        raise AssertionError(description)

def refused(src, dest, description):
    try:
        validator.verify(src, dest)
    except (ValueError, OSError):
        okay(True, description)
    else:
        okay(False, description)

with tempfile.TemporaryDirectory(prefix="stage2-upload-return-fixtures-") as tmp:
    base = Path(tmp)
    received = base / "private-runtime"
    shutil.copytree(staged, received)
    evidence = validator.verify(staged, received)
    okay(evidence["filesComparedExactly"] >= 470
         and evidence["hiddenHtaccessPreserved"]
         and not evidence["stage2Accepted"]
         and not evidence["publisherSignatureVerified"],
         "actual recovered files roundtrip with honest security posture")
    refused(staged, staged, "cannot compare a directory with itself")
    original = received / "bin" / "hostinger-stage2-revoke.php"
    original_bytes = original.read_bytes()
    original.write_bytes(original_bytes + b"\n# injected modified CLI")
    refused(staged, received, "modified installed CLI rejected")
    original.write_bytes(original_bytes)
    hidden = received / "public" / ".htaccess"
    hidden_bytes = hidden.read_bytes()
    hidden.unlink()
    refused(staged, received, "lost Apache hidden file rejected")
    hidden.write_bytes(hidden_bytes)
    extra = received / "research" / "parallel-components"
    extra.mkdir(parents=True)
    (extra / "README.md").write_text("unexpected research leakage\n")
    refused(staged, received, "research subtree refused in published archive")
    shutil.rmtree(received / "research")
    receipt = received / "private" / "once.json"
    receipt.write_text('{"db_password":"MUST_NOT_LEAK"}\n')
    refused(staged, received, "unauthorized private credential rejected")
    receipt.unlink()
    manifest = received / "private" / "package-manifest.json"
    original_manifest = manifest.read_bytes()
    manifest.write_bytes(original_manifest + b"\n")
    refused(staged, received, "manifest byte drift rejected")
    manifest.write_bytes(original_manifest)
    alias = base / "upload_symlink"
    alias.symlink_to(received, target_is_directory=True)
    refused(staged, alias, "symlinked retrieved root refused")
    okay(validator.verify(staged, received)["manifestSha256"] == evidence["manifestSha256"],
         "restored correct artifact reproducibly accepted")
print(f"Stage2 uploaded artifact roundtrip hostile fixtures PASS: {count} checks; no real host")
