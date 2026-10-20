#!/usr/bin/env python3
"""Stage2-only, offline upload-archive boundary checker.

Check exactly what the GitHub artifact upload will read: the already prepared
offweb directory. Never reads secrets, contacts hosts, deploys or signs files.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import zipfile

MAX_FILES = 1200
MAX_SIZE = 180_000_000
REL = re.compile(r"\A[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*\Z")
FORBIDDEN = re.compile(
    r"(?:^|/)(?:\.git|\.github|\.ssh|\.env(?:\..*)?|\.npmrc|"
    r"node_modules|\.build|secrets?|storage)(?:/|$)", re.I
)


def validate(upload: Path) -> tuple[dict[str, bytes], str]:
    # Preserve a plain known basename, not a path inside a webroot.
    if (upload.name != "private-runtime" or upload.is_symlink() or upload.parent.is_symlink()
            or not upload.is_dir()):
        raise ValueError("INVALID_PRIVATE_UPLOAD_ROOT")
    if upload.parent.name == "public_html" or "public_html" in upload.parts[-3:]:
        raise ValueError("WEBROOT_UPLOAD_REFUSED")
    manifest_file = upload / "private" / "package-manifest.json"
    if (manifest_file.is_symlink() or not manifest_file.is_file()
            or manifest_file.stat().st_nlink != 1
            or not 100 <= manifest_file.stat().st_size <= 250_000):
        raise ValueError("MISSING_OR_UNSAFE_MANIFEST")
    raw = manifest_file.read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    m = json.loads(raw)
    if (m.get("format") != "ai-site-cms-internal-stage2-v2"
            or m.get("stage") != 2 or m.get("productionReady") is not False
            or m.get("isSigned") is not False
            or m.get("documentRoot") != "public"
            or m.get("hostingComposerOrNodeRequired") is not False):
        raise ValueError("STAGE2_ONLY_MANIFEST_REQUIRED")
    declared = m.get("files")
    if not isinstance(declared, list) or not 450 <= len(declared) <= MAX_FILES:
        raise ValueError("INVALID_FILES_COUNT")
    expected = {}
    for item in declared:
        if not isinstance(item, dict) or set(item) != {"path", "bytes", "sha256"}:
            raise ValueError("INVALID_MANIFEST_RECORD")
        p, length, sha = item["path"], item["bytes"], item["sha256"]
        if (not isinstance(p, str) or not REL.fullmatch(p)
                or FORBIDDEN.search(p) or p.startswith("/")
                or p in expected or p == "private/package-manifest.json"
                or not isinstance(length, int) or isinstance(length, bool)
                or not 0 <= length <= 8_388_608
                or not isinstance(sha, str)
                or not re.fullmatch(r"[a-f0-9]{64}", sha)):
            raise ValueError("INVALID_OR_DUPLICATE_MANIFEST_PATH")
        expected[p] = (length, sha)
    essentials = {
        "public/.htaccess",
        "public/index.php",
        "bin/hostinger-stage2-once.php",
        "bin/hostinger-stage2-preflight.php",
        "private/compliance/THIRD_PARTY_NOTICES.txt",
        "vendor/autoload.php",
    }
    if not essentials <= expected.keys():
        raise ValueError("ESSENTIAL_OFFWEB_FILES_MISSING")
    actual = {}
    total = 0
    for parent, dirs, names in os.walk(upload, topdown=True, followlinks=False):
        for d in dirs:
            folder = Path(parent) / d
            if folder.is_symlink() or not folder.is_dir():
                raise ValueError("UNSAFE_DIRECTORY")
        for name in names:
            file = Path(parent) / name
            if file.is_symlink() or not file.is_file() or file.stat().st_nlink != 1:
                raise ValueError("UNSAFE_FILE")
            rel = file.relative_to(upload).as_posix()
            if not REL.fullmatch(rel) or FORBIDDEN.search(rel):
                raise ValueError("UNSAFE_ARCHIVE_FILENAME")
            data = file.read_bytes()
            total += len(data)
            if total > MAX_SIZE or len(actual) >= MAX_FILES + 1:
                raise ValueError("EXCESSIVE_UPLOAD")
            actual[rel] = data
    if set(actual) != set(expected) | {"private/package-manifest.json"}:
        raise ValueError("MISSING_OR_EXTRA_UPLOAD_FILES")
    for rel, (length, sha) in expected.items():
        data = actual[rel]
        if len(data) != length or hashlib.sha256(data).hexdigest() != sha:
            raise ValueError("PACKAGE_FILE_HASH_MISMATCH")
    if actual["private/package-manifest.json"] != raw:
        raise ValueError("MANIFEST_CHANGED_DURING_SCAN")
    if (len(actual) != len(expected)+1
            or "cms-stage2-local/once.json" in actual
            or "public/receipt.json" in actual):
        raise ValueError("OFFWEB_UPLOAD_CONTAINS_OPERATOR_STATE")
    return actual, digest


def archive_rehearsal(files: dict[str, bytes], digest: str) -> None:
    # Reproducible ZIP extraction rehearsal, including hidden .htaccess.
    # The GitHub uploader packages the same validated directory afterward.
    def make_zip(path: Path) -> None:
        with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED,
                             compresslevel=7, strict_timestamps=True) as z:
            for rel, data in sorted(files.items()):
                zi = zipfile.ZipInfo(rel, (1980, 1, 1, 0, 0, 0))
                zi.compress_type = zipfile.ZIP_DEFLATED
                zi.external_attr = 0o100644 << 16
                z.writestr(zi, data, compress_type=zipfile.ZIP_DEFLATED,
                           compresslevel=7)
    with tempfile.TemporaryDirectory(prefix="stage2-offweb-upload-ci-") as td:
        a, b = Path(td) / "first.zip", Path(td) / "second.zip"
        make_zip(a)
        make_zip(b)
        if a.read_bytes() != b.read_bytes():
            raise ValueError("NONDETERMINISTIC_ZIP")
        with zipfile.ZipFile(a) as z:
            names = z.namelist()
            if (len(names) != len(files) or set(names) != set(files)
                    or "public/.htaccess" not in names
                    or z.testzip() is not None):
                raise ValueError("INCOMPLETE_ARCHIVE")
            for rel in names:
                if z.read(rel) != files[rel]:
                    raise ValueError("ARCHIVE_BYTES_CHANGED")
        print(f"Stage2 offweb upload ZIP rehearsal PASS: {len(files)} exact files; "
              f"manifest SHA256 {digest}; no credentials or host operations")


def main() -> int:
    if len(sys.argv) != 2:
        print("OFFWEB_UPLOAD_ARGUMENT_REFUSED", file=sys.stderr)
        return 3
    try:
        files, digest = validate(Path(sys.argv[1]).absolute())
        archive_rehearsal(files, digest)
        return 0
    except (OSError, ValueError, TypeError, KeyError, zipfile.BadZipFile) as exc:
        print("OFFWEB_UPLOAD_REFUSED: " + type(exc).__name__, file=sys.stderr)
        return 3


if __name__ == "__main__":
    raise SystemExit(main())
