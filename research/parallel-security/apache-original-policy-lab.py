#!/usr/bin/env python3
"""Manual, isolated Apache HTTP reproduction from two genuine original-main .htaccess files.
No Hostinger, PHP execution, outside network, or change to source repository.
Requires Linux Apache 2.4, mod_mpm_event, mod_authz_core, mod_dir, mod_rewrite,
mod_alias, mod_mime, port bind on loopback, Python 3 and (as root) www-data.
Run: python3 research/parallel-security/apache-original-policy-lab.py /trusted/main-checkout
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
from urllib.request import build_opener, ProxyHandler
from urllib.error import HTTPError, URLError

POLICIES = {
    "public": ("cms/public/.htaccess", "bd73a9fddfb4ff793118974887b0eac36528cc44"),
    "hostinger-readonly": ("cms/hosting/hostinger-readonly/.htaccess", "9dcddcb6d2ee1cd265f795e88b9fe7f226fa2227"),
}
MARKERS = {
    ".git/config": "synthetic-git-only",
    ".github/workflows/build.yml": "synthetic-workflow-only",
    ".env": "synthetic-env-only",
    "secret.sql": "synthetic-sql-only",
    "private/info.txt": "synthetic-ordinary-file",
    "index.php": "synthetic-index-no-php-interpreter",
}
URLS = ("/.git/config", "/.github/workflows/build.yml", "/.env",
        "/secret.sql", "/private/info.txt", "/synthetic-missing")
MODULES = ("mpm_event", "authz_core", "dir", "rewrite", "alias", "mime")
OPENER = build_opener(ProxyHandler({}))

def require(condition, message):
    if not condition:
        raise RuntimeError(message)

def git_blob_digest(raw):
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()

def load_source(root, rel, sha):
    candidate = root / rel
    stat = candidate.lstat()
    require(candidate.is_file() and not candidate.is_symlink()
            and stat.st_nlink == 1 and 100 <= stat.st_size <= 16384,
            "original source is missing or not a regular isolated file: " + rel)
    raw = candidate.read_bytes()
    require(len(raw) == stat.st_size and git_blob_digest(raw) == sha,
            "original-main Git blob mismatch: " + rel)
    return raw.decode("utf-8")

def port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]

def apache_binary():
    executable = shutil.which("apache2")
    require(executable is not None, "Apache binary not installed; no positive proof")
    module_dir = Path("/usr/lib/apache2/modules")
    for module in MODULES:
        require((module_dir / ("mod_" + module + ".so")).is_file(),
                "missing local Apache module: " + module)
    return executable, module_dir

def run_case(apache, module_dir, label, policy):
    with tempfile.TemporaryDirectory(prefix="cms-research-apache-") as tmp_str:
        tmp = Path(tmp_str)
        tmp.chmod(0o755)
        root = tmp / "www"
        root.mkdir(mode=0o755)
        for rel, text in MARKERS.items():
            dest = root / rel
            dest.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
            dest.write_text(text, encoding="utf-8")
        (root / ".htaccess").write_text(policy, encoding="utf-8")
        selected_port = port()
        mods = "\n".join(
            "LoadModule " + m + "_module " + str(module_dir / ("mod_" + m + ".so"))
            for m in MODULES
        )
        identity = "User www-data\nGroup www-data\n" if os.geteuid() == 0 else ""
        conf = tmp / "httpd.conf"
        conf.write_text(
            "ServerRoot \"" + str(tmp) + "\"\n"
            "ServerName 127.0.0.1\nListen 127.0.0.1:" + str(selected_port) + "\n"
            "PidFile \"" + str(tmp / "pid") + "\"\n"
            "ErrorLog \"" + str(tmp / "error.log") + "\"\n"
            "LogLevel warn\n" + mods + "\n" + identity +
            "TypesConfig /etc/mime.types\n"
            "<Directory \"" + str(root) + "\">\n"
            "AllowOverride All\nRequire all granted\n</Directory>\n"
            "DocumentRoot \"" + str(root) + "\"\nDirectoryIndex index.php\n",
            encoding="utf-8",
        )
        syntax = subprocess.run([apache, "-t", "-f", str(conf)],
                                capture_output=True, text=True, timeout=8)
        require(syntax.returncode == 0, "Apache config syntax failed: " + syntax.stderr[:280])
        proc = subprocess.Popen([apache, "-X", "-f", str(conf)],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            alive = False
            for _ in range(50):
                if proc.poll() is not None:
                    break
                try:
                    response = OPENER.open("http://127.0.0.1:" + str(selected_port) +
                                           "/private/info.txt", timeout=0.5)
                    response.close()
                    alive = True
                    break
                except HTTPError:
                    alive = True
                    break
                except (OSError, URLError):
                    time.sleep(0.08)
            require(alive, "local Apache could not start; no simulated HTTP proof")
            requests = {}
            for url in URLS:
                try:
                    with OPENER.open("http://127.0.0.1:" + str(selected_port) + url,
                                     timeout=3) as response:
                        status, payload = response.status, response.read(256).decode(errors="replace")
                except HTTPError as e:
                    status, payload = e.code, e.read(256).decode(errors="replace")
                requests[url] = {
                    "httpStatus": status,
                    "markerDisclosed": payload.strip() in MARKERS.values(),
                }
            log = (tmp / "error.log").read_text(errors="replace")
            return {"case": label, "apacheSyntaxOK": True, "responses": requests,
                    "rewritePreconditionAH00670": "AH00670" in log,
                    "phpInterpreterUsed": False, "hostingerContacted": False}
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=4)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=4)

def check(results):
    by = {case["case"]: case for case in results}
    def status(case, url):
        return by[case]["responses"][url]["httpStatus"]
    for case in by:
        require(by[case]["apacheSyntaxOK"], "syntax false")
        require(not by[case]["hostingerContacted"] and not by[case]["phpInterpreterUsed"],
                "untrusted proof scope")
    for url in ("/.git/config", "/.github/workflows/build.yml"):
        require(status("original-public", url) == 200
                and by["original-public"]["responses"][url]["markerDisclosed"],
                "original public conditional disclosure no longer reproduced")
        require(status("synthetic-public-redirectmatch", url) == 403,
                "synthetic Apache dotpath denial failed")
        require(status("original-hostinger-readonly", url) == 403,
                "original host denial changed")
        require(status("synthetic-hostinger-options", url) == 403,
                "synthetic host dotpath denial failed")
    for case in by:
        require(status(case, "/.env") == 403 and status(case, "/secret.sql") == 403,
                "sensitive-file denial failed: " + case)
    for case in ("original-public", "synthetic-public-redirectmatch", "synthetic-hostinger-options"):
        require(status(case, "/private/info.txt") == 200
                and status(case, "/synthetic-missing") == 200,
                "positive-control routing failed: " + case)
    require(status("original-hostinger-readonly", "/private/info.txt") == 403
            and status("original-hostinger-readonly", "/synthetic-missing") == 403
            and by["original-hostinger-readonly"]["rewritePreconditionAH00670"],
            "expected rewrite precondition failure absent")
    for case in ("original-public", "synthetic-public-redirectmatch", "synthetic-hostinger-options"):
        require(not by[case]["rewritePreconditionAH00670"], "unexpected AH00670: " + case)

def main():
    require(len(sys.argv) == 2, "Usage: apache-original-policy-lab.py /trusted/main-checkout")
    root = Path(sys.argv[1]).resolve(strict=True)
    require(root.is_dir(), "source checkout directory required")
    originals = {
        kind: load_source(root, rel, digest)
        for kind, (rel, digest) in POLICIES.items()
    }
    apache, modules = apache_binary()
    # Both alternatives are research-only synthetic examples, NOT approved fixes.
    patched_public = originals["public"] + '\nRedirectMatch 403 "(^|/)\\."\n'
    original_options = "Options -Indexes -MultiViews -FollowSymLinks\n"
    require(originals["hostinger-readonly"].count(original_options) == 1,
            "original host options unexpectedly changed")
    patched_host = originals["hostinger-readonly"].replace(
        original_options,
        "Options -Indexes -MultiViews -FollowSymLinks +SymLinksIfOwnerMatch\n",
    )
    cases = [
        run_case(apache, modules, "original-public", originals["public"]),
        run_case(apache, modules, "synthetic-public-redirectmatch", patched_public),
        run_case(apache, modules, "original-hostinger-readonly", originals["hostinger-readonly"]),
        run_case(apache, modules, "synthetic-hostinger-options", patched_host),
    ]
    check(cases)
    print(json.dumps({
        "schema": "ai-site-cms-local-apache-original-git-blob-proof-v1",
        "originalSourceGitBlobSha1": {k: sha for k, (_, sha) in POLICIES.items()},
        "serverVersion": subprocess.run([apache, "-v"], capture_output=True,
                                        text=True, timeout=6).stdout.splitlines()[0],
        "cases": cases,
        "originalSourceChecksPassed": True,
        "syntheticVariantApprovedForProduction": False,
        "actualApacheHttpObserved": True,
        "hostingerTested": False, "productionApproved": False,
    }, ensure_ascii=False, separators=(",", ":")))
    print("ORIGINAL APACHE LOCAL HTTP REPRO PASS 4 variants; not Hostinger or production acceptance")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("APACHE_LOCAL_REPRO_REFUSED " + str(e)[:600], file=sys.stderr)
        sys.exit(1)
