#!/usr/bin/env python3
"""Stage2 integrator-owned real Apache 2.4 HTTP regression for both distributed
policies. Loopback ONLY; synthetic markers, no PHP execution, target hosting,
secrets or Stage2 acceptance. Unlike the research reproduction, this tests the
FIXED main policies and the ACTUAL staged distributable public .htaccess.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, build_opener

CMS = Path(__file__).resolve().parents[1]
STAGE = CMS / ".build/internal-stage2-package"
POLICIES = {
    "packaged-public": CMS / "public/.htaccess",
    "readonly-preflight": CMS / "hosting/hostinger-readonly/.htaccess",
}
MARKERS = {
    ".git/config": "synthetic-git-sensitive-marker",
    ".github/workflows/build.yml": "synthetic-actions-sensitive-marker",
    ".env": "synthetic-env-sensitive-marker",
    "secret.sql": "synthetic-sql-sensitive-marker",
    "nested/.private/config.txt": "synthetic-nested-hidden-marker",
    ".well-known/.git/config": "synthetic-nested-wellknown-marker",
    ".well-known/security.txt": "synthetic-safe-wellknown",
    "ordinary/info.txt": "synthetic-safe-ordinary",
    "tools/run.phtml": "synthetic-executable-marker",
    "index.php": "synthetic-safe-fallback-NO-PHP",
}
DENY = (
    "/.git/config", "/.github/workflows/build.yml", "/.env",
    "/secret.sql", "/nested/.private/config.txt",
    "/.well-known/.git/config", "/tools/run.phtml",
    "/%2egit/config", "/.gi%74/config", "/.github/%77orkflows/build.yml",
)
ALLOW = {
    "/ordinary/info.txt": "synthetic-safe-ordinary",
    "/.well-known/security.txt": "synthetic-safe-wellknown",
    "/__stage2/host": "synthetic-safe-fallback-NO-PHP",
    "/__stage2/rewrite/proof": "synthetic-safe-fallback-NO-PHP",
    "/api/health": "synthetic-safe-fallback-NO-PHP",
    "/absent-route": "synthetic-safe-fallback-NO-PHP",
}
MODULES = ("mpm_event", "authz_core", "dir", "alias", "mime")
OPENER = build_opener(ProxyHandler({}))
counter = 0

def check(condition, why):
    global counter
    if not condition:
        raise RuntimeError("APACHE_STAGE2_SECURITY_REFUSED: " + why)
    counter += 1

def available_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]

def query(port, uri):
    url = "http://127.0.0.1:" + str(port) + uri
    try:
        with OPENER.open(url, timeout=3) as response:
            return response.status, response.read(512).decode(errors="replace")
    except HTTPError as error:
        return error.code, error.read(512).decode(errors="replace")

def verify_shipped_public():
    manifest_path = STAGE / "private/package-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    rows = [r for r in manifest["files"] if r["path"].startswith("public/")]
    actual = sorted(p.relative_to(STAGE / "public").as_posix()
                    for p in (STAGE / "public").rglob("*") if p.is_file())
    check(sorted(r["path"] for r in rows) ==
          ["public/.htaccess", "public/index.php"],
          "public package manifest ships more than two vetted files")
    check(actual == [".htaccess", "index.php"],
          "actual shipped public tree contains unlisted or hidden paths")
    source = POLICIES["packaged-public"].read_bytes()
    shipped = (STAGE / "public/.htaccess").read_bytes()
    check(source == shipped, "distributed .htaccess differs from current source")
    check(any(r["path"] == "public/.htaccess"
              and r["bytes"] == len(shipped)
              and r["sha256"] == hashlib.sha256(shipped).hexdigest()
              for r in rows), "manifest digest disagrees with protected public rules")
    for part in (".git", ".github", ".env", ".well-known", ".ssh", ".user.ini"):
        check(not (STAGE / "public" / part).exists(),
              "hidden/unapproved public path shipped: " + part)

def case(apache, label, source):
    with tempfile.TemporaryDirectory(prefix="cms-stage2-apache-security-") as tmp:
        base = Path(tmp)
        base.chmod(0o755)
        root = base / "public"
        root.mkdir(mode=0o755)
        shutil.copyfile(source, root / ".htaccess")
        check((root / ".htaccess").read_bytes() == source.read_bytes(),
              "tested Apache policy differs from source: " + label)
        for rel, marker in MARKERS.items():
            file = root / rel
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(marker)
        private = base / "offweb-secret.txt"
        private.write_text("synthetic-offweb-NEVER-DISCLOSE")
        (root / "private-pointer.txt").symlink_to(private)
        port = available_port()
        moddir = Path("/usr/lib/apache2/modules")
        for module in MODULES:
            check((moddir / ("mod_" + module + ".so")).is_file(),
                  "missing actual Apache module: " + module)
        modules = "\n".join("LoadModule " + m + "_module " +
                            str(moddir / ("mod_" + m + ".so")) for m in MODULES)
        config = base / "httpd.conf"
        config.write_text(
            'ServerRoot "/etc/apache2"\n'
            'ServerName 127.0.0.1\n'
            'Listen 127.0.0.1:' + str(port) + "\n"
            'PidFile "' + str(base / "apache.pid") + '"\n'
            'ErrorLog "' + str(base / "error.log") + '"\n'
            "LogLevel warn\n" + modules + "\n"
            "TypesConfig /etc/mime.types\n"
            '<Directory />\nRequire all denied\n</Directory>\n'
            'DocumentRoot "' + str(root) + '"\n'
            '<Directory "' + str(root) + '">\n'
            "Options -Indexes -MultiViews -FollowSymLinks -SymLinksIfOwnerMatch\n"
            "AllowOverride All\nRequire all granted\n</Directory>\n")
        syntax = subprocess.run([apache, "-t", "-f", str(config)],
                                text=True, capture_output=True, timeout=10)
        check(syntax.returncode == 0, "Apache syntax: " + syntax.stderr[:150])
        proc = subprocess.Popen([apache, "-X", "-f", str(config)],
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL)
        try:
            ready = False
            for _ in range(50):
                if proc.poll() is not None:
                    break
                try:
                    status, body = query(port, "/ordinary/info.txt")
                    if status == 200 and body == MARKERS["ordinary/info.txt"]:
                        ready = True
                        break
                except (OSError, URLError):
                    pass
                time.sleep(.08)
            check(ready, "Apache not healthy for benign static request: " + label)
            for uri in DENY:
                code, body = query(port, uri)
                check(code in (403, 404), label + " failed to deny " + uri +
                      " status=" + str(code))
                check(not any(marker in body for marker in MARKERS.values()),
                      label + " disclosed synthetic secret marker at " + uri)
            for uri, marker in ALLOW.items():
                code, body = query(port, uri)
                check(code == 200 and body == marker,
                      label + " blocked legitimate static/fallback request " + uri +
                      " status=" + str(code))
            code, body = query(port, "/private-pointer.txt")
            check("synthetic-offweb-NEVER-DISCLOSE" not in body,
                  label + " Apache served private symlink target")
            check(code in (403, 404), label + " symlink did not fail closed")
            error = (base / "error.log").read_text(errors="replace")
            check("AH00670" not in error,
                  label + " Apache rewrites conflict with disabled symlinks")
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=5)

def main():
    check(os.environ.get("CI") == "true" and
          os.environ.get("GITHUB_ACTIONS") == "true",
          "real Apache regression only allowed in disposable GitHub Actions CI")
    check(len(sys.argv) == 1, "no network endpoints or user arguments accepted")
    apache = shutil.which("apache2")
    check(apache is not None, "require real Apache 2.4 to test HTTP")
    verify_shipped_public()
    for name, file in POLICIES.items():
        case(apache, name,
             STAGE / "public/.htaccess" if name == "packaged-public" else file)
    print(json.dumps({
        "format": "ai-site-cms-stage2-apache-integrator-policy-regression-v1",
        "checks": counter,
        "realApacheLoopbackHttp": True, "bothPoliciesTested": True,
        "hiddenPathDataDisclosureBlocked": True,
        "legitimateWellKnownAndFallbackWorking": True,
        "symlinksStillDenied": True, "ah00670Seen": False,
        "actualHostingerContacted": False, "productionApproved": False,
        "stage2Accepted": False,
    }, separators=(",", ":")))

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("STAGE2_INTEGRATOR_APACHE_POLICY_REFUSED: " + str(exc)[:300],
              file=sys.stderr)
        sys.exit(1)
