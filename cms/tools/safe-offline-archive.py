#!/usr/bin/env python3
"""Stage2 *lab-only* ZIP packing / secure extraction. Python stdlib, no network.
Caller MUST authenticate detached archive signature before invoking unpack.
Never use directly on a live site or run with privileged target roots.
"""
import os
import re
import stat
import sys
import zipfile
from pathlib import Path

MAX_ARCHIVE = 64 * 1024 * 1024
MAX_FILES = 2048
MAX_FILE = 8 * 1024 * 1024
MAX_TOTAL = 64 * 1024 * 1024
ALLOWED_NAME = re.compile(r"^[a-zA-Z0-9_./@+~\-]+$")
WINDOWS_RESERVED = {"con", "prn", "aux", "nul"} | {f"com{i}" for i in range(1, 10)} | {f"lpt{i}" for i in range(1, 10)}

def safe_rel(name):
    if (not isinstance(name, str) or len(name) > 240 or not ALLOWED_NAME.fullmatch(name)
            or name.startswith("/") or "\\" in name or ":" in name or name.endswith("/")):
        raise ValueError("Invalid ZIP member name")
    chunks = name.split("/")
    if any(s in ("", ".", "..") or s.endswith((".", " ")) or
           s.split(".")[0].casefold() in WINDOWS_RESERVED for s in chunks):
        raise ValueError("Unsafe ZIP member path")
    if chunks[0].casefold() in ("storage", ".git", ".github", ".build", "secrets", "node_modules"):
        raise ValueError("Forbidden ZIP top-level path")
    return chunks

def scan(zf):
    files = zf.infolist()
    if not files or len(files) > MAX_FILES:
        raise ValueError("Invalid ZIP member count")
    known = set()
    total = 0
    for entry in files:
        parts = safe_rel(entry.filename)
        key = entry.filename.casefold()
        if key in known:
            raise ValueError("Duplicate/case-colliding ZIP name")
        known.add(key)
        if entry.flag_bits & 1 or entry.file_size > MAX_FILE or entry.file_size < 0:
            raise ValueError("Encrypted or oversized ZIP entry")
        if entry.compress_size < 0 or (entry.compress_size and entry.file_size > entry.compress_size * 100):
            raise ValueError("Excessive ZIP compression ratio")
        mode = (entry.external_attr >> 16) & 0xFFFF
        kind = stat.S_IFMT(mode)
        if entry.is_dir() or kind not in (0, stat.S_IFREG):
            raise ValueError("ZIP entries must be regular files")
        total += entry.file_size
        if total > MAX_TOTAL:
            raise ValueError("Oversized uncompressed archive")
        for i in range(1, len(parts)):
            if "/".join(parts[:i]).casefold() in known:
                raise ValueError("File used as parent directory")
    for name in known:
        if any(name.startswith(other + "/") for other in known if other != name):
            raise ValueError("Parent file collision")
    return files

def pack(source, target):
    source = Path(source).resolve(strict=True)
    if not source.is_dir() or Path(target).exists():
        raise ValueError("Source missing or output already exists")
    members = []
    for current, dirs, files in os.walk(source, followlinks=False):
        for d in dirs:
            if (Path(current) / d).is_symlink():
                raise ValueError("Symlink directory prohibited")
        for f in files:
            p = Path(current) / f
            if p.is_symlink() or not p.is_file():
                raise ValueError("Nonregular/symlink packaging source")
            name = p.relative_to(source).as_posix()
            safe_rel(name)
            members.append((name, p))
    members.sort()
    if len(members) > MAX_FILES:
        raise ValueError("Too many package source files")
    try:
        with zipfile.ZipFile(target, "x", allowZip64=False) as zf:
            for name, p in members:
                if p.stat().st_size > MAX_FILE:
                    raise ValueError("File too large")
                info = zipfile.ZipInfo(name, date_time=(2020,1,1,0,0,0))
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                info.compress_type = zipfile.ZIP_STORED
                zf.writestr(info, p.read_bytes())
    except Exception:
        Path(target).unlink(missing_ok=True)
        raise

def extract(archive, target):
    if not Path(target).is_dir() or Path(target).is_symlink() or any(Path(target).iterdir()):
        raise ValueError("Extraction target must be a freshly empty real directory")
    if os.path.getsize(archive) > MAX_ARCHIVE:
        raise ValueError("ZIP archive size limit exceeded")
    with zipfile.ZipFile(archive, "r", allowZip64=False) as zf:
        entries = scan(zf)
        for entry in entries:
            parts = safe_rel(entry.filename)
            path = Path(target).joinpath(*parts)
            path.parent.mkdir(parents=True, exist_ok=True)
            flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            with os.fdopen(os.open(path, flags, 0o600), "wb") as out, zf.open(entry, "r") as inp:
                written = 0
                while True:
                    chunk = inp.read(65536)
                    if not chunk:
                        break
                    written += len(chunk)
                    if written > entry.file_size or written > MAX_FILE:
                        raise ValueError("ZIP decompression limit exceeded")
                    out.write(chunk)
                if written != entry.file_size:
                    raise ValueError("ZIP entry truncated")
            os.chmod(path, 0o600)

if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] not in ("pack", "extract"):
        sys.exit("Usage: safe-offline-archive.py pack|extract source target")
    try:
        if sys.argv[1] == "pack":
            pack(sys.argv[2], sys.argv[3])
        else:
            extract(sys.argv[2], sys.argv[3])
    except Exception as exc:
        print("Stage2 safe archive refused: " + str(exc), file=sys.stderr)
        sys.exit(2)
