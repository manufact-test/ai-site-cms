#!/usr/bin/env python3
"""CI-only verify the *actual downloaded* GitHub Actions zip extraction.

Validates offweb layout twice and proves the downloaded artifact is bytewise
identical to the fully checked staging tree. Never reaches Hostinger, network,
database, SSH, secrets, private receipt, signed/production acceptance.
"""
from __future__ import annotations
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

def verify(staged: Path, downloaded: Path) -> dict:
    if staged.resolve() == downloaded.resolve():
        raise ValueError("SAME_DIRECTORY_NOT_A_ROUNDTRIP")
    if (staged.is_symlink() or downloaded.is_symlink()
            or staged.name != "private-runtime"
            or downloaded.name != "private-runtime"):
        raise ValueError("OFFWEB_ROUNDTRIP_ROOT_REFUSED")
    script = Path(__file__).with_name("test-stage2-offweb-upload.py")
    spec = importlib.util.spec_from_file_location("stage2_offweb_validator", script)
    if spec is None or spec.loader is None:
        raise ValueError("OFFWEB_VALIDATOR_NOT_FOUND")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    stage_files, stage_digest = module.validate(staged)
    downloaded_files, downloaded_digest = module.validate(downloaded)
    if stage_digest != downloaded_digest:
        raise ValueError("PUBLISHED_MANIFEST_CHANGED")
    if stage_files.keys() != downloaded_files.keys():
        raise ValueError("PUBLISHED_FILE_SET_CHANGED")
    for path in stage_files:
        if stage_files[path] != downloaded_files[path]:
            raise ValueError("PUBLISHED_FILE_BYTES_CHANGED")
    if "public/.htaccess" not in downloaded_files:
        raise ValueError("APACHE_HIDDEN_CONFIG_DROPPED")
    # Specific in-use offweb CLI security inventory, never a production marker.
    for name in ("hostinger-stage2-preflight.php", "hostinger-stage2-once.php",
                 "hostinger-stage2-revoke.php"):
        if "bin/" + name not in downloaded_files:
            raise ValueError("HOSTINGER_PRIVATE_CLI_MISSING")
        if "public/" + name in downloaded_files:
            raise ValueError("HOSTINGER_PRIVATE_CLI_EXPOSED")
    if any(x.startswith("research/") or "parallel-components/" in x
           or "parallel-security/" in x or x.startswith("cms-stage2-local/")
           for x in downloaded_files):
        raise ValueError("RESEARCH_OR_SECRETS_IN_DOWNLOADED_ARTIFACT")
    return {
        "format": "ai-site-cms-stage2-upload-roundtrip-evidence-v1",
        "scope": "offline-ci-downloaded-github-artifact-bytes-only",
        "stage2Accepted": False,
        "productionReady": False,
        "publisherSignatureVerified": False,
        "hostingTouched": False,
        "databaseTouched": False,
        "manifestSha256": stage_digest,
        "filesComparedExactly": len(stage_files),
        "totalBytesCompared": sum(len(x) for x in stage_files.values()),
        "payloadSha256": hashlib.sha256(
            b"".join(
                key.encode("ascii") + b"\x00"
                + str(len(stage_files[key])).encode("ascii") + b"\x00"
                + hashlib.sha256(stage_files[key]).digest()
                for key in sorted(stage_files)
            )
        ).hexdigest(),
        "hiddenHtaccessPreserved": True,
        "privateCliPresent": True,
        "researchAndOperatorStateAbsent": True,
        "result": "downloaded-artifact-exact-byte-match"
    }

def main():
    if len(sys.argv) != 3:
        print("STAGE2_ROUNDTRIP_ARGUMENT_REFUSED", file=sys.stderr)
        return 3
    try:
        output = verify(Path(sys.argv[1]).absolute(), Path(sys.argv[2]).absolute())
    except (OSError, TypeError, ValueError, KeyError) as exc:
        print("STAGE2_ROUNDTRIP_REFUSED_" + type(exc).__name__, file=sys.stderr)
        return 3
    print(json.dumps(output, indent=2, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
