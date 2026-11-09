#!/usr/bin/env python3
"""Package the one approved saved CELIKOM for the private, first-party Studio adapter.

Offline/CLI only. Never runs on an HTTP upload, never pushes owner bytes to GitHub.
"""
import argparse
import hashlib
import json
import re
import shutil
from pathlib import Path
from tempfile import TemporaryDirectory

from bs4 import BeautifulSoup, NavigableString
from bridge import (digest, discover_fields, make_edit_workspace, source_inventory)
from finalize_static import RENAMES

FORMAT = 'manufact-celikom-preserved-source-v1'
PINNED_SOURCE_ZIP = 'f998e96ccc9393dfe958a51d144be10d5fb1f1d068721d163ff40048077104aa'
OWNER_SOURCE_V2_ZIP = 'f3ed9d1bdfeb4ddce1a94370b6f0f3675de2a505e527aa991cfa0a04e0f25001'
# Both source hashes identify genuinely owner-provided CELIKOM archives; never accept arbitrary uploads.
APPROVED_SOURCE_ZIPS = frozenset((PINNED_SOURCE_ZIP, OWNER_SOURCE_V2_ZIP))
AUDIO_SHA256 = {
    'service': 'db3de39f92642c82840b7693ea54fd6aabec1d1e66bbe3986d0213de815c9bce',
    'restored': '71915c26ffe83f946874e34dd23099e8192e902ffe3d8d9bd9d3f974bfd69c59',
}
# Preserve every original byte inside source-archive.zip; add scoped fixes only to the
# private runtime derivative (CSS centering and the vetted audio fade correction).
PLAYER_FIX_CSS = """
#sound #celikom-demo-play {
  box-sizing: border-box;
  display: grid;
  place-items: center;
  padding: 0 !important;
  font-size: 0 !important;
  line-height: 0;
  text-align: center;
}
#sound #celikom-demo-play::before {
  content: "";
  display: block;
  width: 18px;
  height: 20px;
  background: currentColor;
  -webkit-clip-path: polygon(0 0, 100% 50%, 0 100%);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
  transform: translateX(2px);
}
#sound #celikom-demo-play[aria-pressed="true"]::before {
  width: 16px;
  height: 19px;
  background: linear-gradient(to right, currentColor 0 34%, transparent 34% 66%, currentColor 66% 100%);
  -webkit-clip-path: none;
  clip-path: none;
  transform: none;
}
"""

# The owner ZIP is immutable. Only the private, explicitly verified runtime
# copy of the known CELIKOM player gets this narrowly scoped defect correction.
# A requestAnimationFrame timestamp may precede performance.now() recorded
# later in the same browser frame, producing a negative fade factor.
OWNER_SOUND_JS_SHA256 = '5ec3e84418de792a95a831ceefb8199fe35a92c32bc4268a4ce82772ca4e4b6f'
PLAYER_FADE_OLD = (
    '  const t=Math.min(1,(now-start)/ms);\\n'
    '  audio.volume=from+(to-from)*t;'
).replace('\\n', '\n')
PLAYER_FADE_NEW = (
    '  const t=Math.max(0,Math.min(1,(now-start)/ms));\\n'
    '  audio.volume=Math.max(0,Math.min(1,from+(to-from)*t));'
).replace('\\n', '\n')


def verified_player_fade_fix(source: bytes) -> bytes:
    if digest(source) != OWNER_SOUND_JS_SHA256:
        raise ValueError('CELIKOM player source fingerprint changed; manual review required')
    old = PLAYER_FADE_OLD.encode('utf-8')
    if source.count(old) != 1:
        raise ValueError('CELIKOM player fade function differs from reviewed original')
    patched = source.replace(old, PLAYER_FADE_NEW.encode('utf-8'), 1)
    if patched == source or patched.count(PLAYER_FADE_NEW.encode('utf-8')) != 1:
        raise ValueError('CELIKOM player correction was not applied exactly once')
    return patched


# Exact Git blob identities from manufact-test/nomusic, feature/api-range,
# website/public/assets/fonts/. Font files + complete SIL OFL license are
# supplied only to private offline packaging; no external runtime calls.
MANROPE_GIT_BLOBS = {
    'manrope-cyrillic-ext-wght-normal.woff2': '57c7c0eefb32d1c9cf8780f8c95020499bf06e9c',
    'manrope-cyrillic-wght-normal.woff2': '3a062296a1269ded5bf605334d18f3e43088c888',
    'manrope-latin-ext-wght-normal.woff2': 'bd24140af06f1b5897d3bbd6538a74b03748a21e',
    'manrope-latin-wght-normal.woff2': '71eb731d558046199aa7f985adbf812890a093a1',
}
MANROPE_LICENSE_GIT_BLOB = '462280f3e4037df1839fba6cdee11d0980d3f0a9'

def git_blob_id(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode('ascii') + b'\x00' + data).hexdigest()

def verified_manrope_dir(folder: Path | None) -> dict[str, bytes]:
    if folder is None:
        return {}
    if not folder.is_dir() or folder.is_symlink():
        raise ValueError('Manrope source must be an existing non-symlink directory')
    files = {**MANROPE_GIT_BLOBS, 'OFL-Manrope.txt': MANROPE_LICENSE_GIT_BLOB}
    verified = {}
    for name, expected in files.items():
        path = folder / name
        if not path.is_file() or path.is_symlink() or path.stat().st_size > 100000:
            raise ValueError('Missing, oversized or unsafe original Manrope file: ' + name)
        data = path.read_bytes()
        if git_blob_id(data) != expected:
            raise ValueError('Manrope fingerprint mismatch (nomusic Git blob): ' + name)
        if name.endswith('.woff2') and not data.startswith(b'wOF2'):
            raise ValueError('Invalid WOFF2 signature: ' + name)
        if name == 'OFL-Manrope.txt' and b'SIL OPEN FONT LICENSE Version 1.1' not in data:
            raise ValueError('Unrecognized Manrope license')
        verified[name] = data
    return verified

def reroute_manrope_urls(css_or_html: str, counts: dict[str, int]) -> str:
    for name in MANROPE_GIT_BLOBS:
        old = '/assets/fonts/' + name
        count = css_or_html.count(old)
        if count:
            counts[name] += count
            css_or_html = css_or_html.replace(old, '/celikom-original-assets/fonts/' + name)
    return css_or_html

MIME = {'.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml',
        '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
        '.webp':'image/webp', '.woff2':'font/woff2', '.mp3':'audio/mpeg',
        '.ogg':'audio/ogg', '.wav':'audio/wav'}


def make_package(archive: Path, target: Path, expected_sha: str | None = None,
                 service_mp3: Path | None = None, restored_mp3: Path | None = None,
                 manrope_dir: Path | None = None):
    manrope = verified_manrope_dir(manrope_dir)
    font_references = {name: 0 for name in MANROPE_GIT_BLOBS}
    actual_sha = digest(archive.read_bytes())
    # Injecting a non-owner hash is allowed only from local Python tests, not HTTP.
    if expected_sha is None:
        if actual_sha not in APPROVED_SOURCE_ZIPS:
            raise ValueError('Unapproved original CELIKOM ZIP SHA-256')
        expected_sha = actual_sha
    if (service_mp3 is None) != (restored_mp3 is None):
        raise ValueError('Both approved A/B audio clips are required together')
    owner_audio = {'service': service_mp3, 'restored': restored_mp3} if service_mp3 is not None else {}
    for label, file in owner_audio.items():
        if not isinstance(file, Path) or not file.is_file() or file.is_symlink():
            raise ValueError('Missing or unsafe original ' + label + ' MP3')
        if file.stat().st_size < 1000 or file.stat().st_size > 2097152:
            raise ValueError('Invalid A/B clip size')
        if digest(file.read_bytes()) != AUDIO_SHA256[label]:
            raise ValueError('Unapproved A/B clip fingerprint: ' + label)
    if target.exists():
        raise ValueError('Target exists; refusing to replace an existing source package')
    if digest(archive.read_bytes()) != expected_sha:
        raise ValueError('Owner archive SHA-256 mismatch; no native package created')
    with TemporaryDirectory(prefix='celikom-source-') as temp:
        work = Path(temp) / 'workspace'
        source_info = make_edit_workspace(archive, work)
        source, resources, html = source_inventory(work / 'source')
        soup = BeautifulSoup(html.decode('utf-8'), 'html.parser')
        fields = discover_fields(soup)
        values = {key: row['value'] for key, row in fields.items()}
        if len(values) != 99:
            raise ValueError(f'Expected 99 exact owner editing keys; got {len(values)}')
        limits = {}
        for key, row in fields.items():
            marker = '{{CELIKOM:' + key + '}}'
            node = row['node']
            if row['kind'] == 'fragment':
                node.replace_with(NavigableString(marker))
            elif row['kind'] == 'meta':
                node['content'] = marker
            else:
                node.clear()
                node.append(NavigableString(marker))
            limits[key] = {'max': row['max']}
        template = str(soup)
        if owner_audio:
            for label in ('service', 'restored'):
                original = 'src="/?demo_audio=' + label + '"'
                replacement = 'src="/celikom-original-assets/' + label + '.mp3"'
                if template.count(original) != 1:
                    raise ValueError('Expected exactly one original A/B audio URL: ' + label)
                template = template.replace(original, replacement)
            if template.count('</head>') != 1:
                raise ValueError('Expected one original HTML head')
            template = template.replace('</head>',
                '<link rel="stylesheet" href="/celikom-original-assets/celikom-player-center-fix.css"></head>', 1)
        # Only same-page anchor navigation is rewritten; canonical/SEO stays intact.
        template = template.replace('https://lemonchiffon-narwhal-791953.hostingersite.com/#', '#')
        resource_ref = re.escape(resources.name) + '/'
        template, count = re.subn(r'(?:\./)?' + resource_ref,
                                  '/celikom-original-assets/', template)
        if count < 1:
            raise ValueError('Original resource URLs not found in HTML')
        for old, new in RENAMES.items():
            if old not in template:
                raise ValueError('Original resource not referenced: ' + old)
            template = template.replace(old, new)
        if manrope:
            template = reroute_manrope_urls(template, font_references)
        for key in values:
            if template.count('{{CELIKOM:' + key + '}}') != 1:
                raise ValueError('Ambiguous editable field in template: ' + key)
        if re.search(r'{{CELIKOM:[^}]+}}', template) is None:
            raise ValueError('No actual content markers generated')
        target.mkdir(parents=True)
        try:
            (target / 'assets').mkdir()
            assets = {}
            derivative = {}
            for file in sorted(resources.rglob('*')):
                if not file.is_file():
                    continue
                rel = file.relative_to(resources)
                output_name = RENAMES.get(file.name, file.name)
                rel = rel.with_name(output_name)
                name = rel.as_posix()
                if not re.fullmatch(r'[A-Za-z0-9._/-]{1,180}', name) or '..' in name:
                    raise ValueError('Non-portable, unsafe asset path: ' + name)
                mime = MIME.get(rel.suffix.lower())
                if mime is None or name in assets:
                    raise ValueError('Unexpected or duplicated asset: ' + name)
                destination = target / 'assets' / rel
                destination.parent.mkdir(parents=True, exist_ok=True)
                source_data = file.read_bytes()
                if owner_audio and name == 'owner-sound-player.js':
                    data = verified_player_fade_fix(source_data)
                    derivative[name] = {
                        'source_sha256': digest(source_data),
                        'runtime_sha256': digest(data),
                        'fix': 'clamp-fade-progress-and-volume-v1'
                    }
                elif manrope and name.endswith('.css'):
                    css = reroute_manrope_urls(source_data.decode('utf-8'), font_references)
                    data = css.encode('utf-8')
                    if data != source_data:
                        derivative[name] = {
                            'source_sha256': digest(source_data),
                            'runtime_sha256': digest(data),
                            'fix': 'local-manrope-url-routing-v1'
                        }
                else:
                    data = source_data
                destination.write_bytes(data)
                if (name not in derivative and destination.read_bytes() != source_data) or (
                    name in derivative and digest(destination.read_bytes()) != derivative[name]['runtime_sha256']
                ):
                    raise ValueError('CELIKOM asset integrity mismatch')
                assets[name] = {'mime': mime, 'sha256': digest(data)}
            if owner_audio:
                # Owner audio is retained outside GitHub. Add it only to this private verified package.
                for label, file in owner_audio.items():
                    data = file.read_bytes()
                    if digest(data) != AUDIO_SHA256[label]:
                        raise ValueError('Owner audio changed during source packaging')
                    name = label + '.mp3'
                    (target / 'assets' / name).write_bytes(data)
                    assets[name] = {'mime': 'audio/mpeg', 'sha256': digest(data)}
                css_data = PLAYER_FIX_CSS.encode('utf-8')
                (target / 'assets' / 'celikom-player-center-fix.css').write_bytes(css_data)
                assets['celikom-player-center-fix.css'] = {
                    'mime': 'text/css', 'sha256': digest(css_data)
                }
            if manrope:
                if not all(font_references.values()):
                    raise ValueError('Approved CELIKOM source does not reference all four Manrope subsets')
                for name in MANROPE_GIT_BLOBS:
                    asset = 'fonts/' + name
                    if asset in assets:
                        raise ValueError('Manrope asset collides with original owner archive')
                    data = manrope[name]
                    (target / 'assets' / 'fonts').mkdir(exist_ok=True)
                    (target / 'assets' / asset).write_bytes(data)
                    assets[asset] = {'mime': 'font/woff2', 'sha256': digest(data)}
                license_target = target / 'licenses' / 'OFL-Manrope.txt'
                license_target.parent.mkdir()
                license_target.write_bytes(manrope['OFL-Manrope.txt'])
            if len(assets) < 10:
                raise ValueError('Missing static CELIKOM assets')
            shutil.copyfile(archive, target / 'source-archive.zip')
            (target / 'template.html').write_text(template, encoding='utf-8')
            manifest = {
                'format': FORMAT, 'source_zip_sha256': expected_sha,
                'source_html_sha256': digest(html),
                'template_sha256': digest(template.encode('utf-8')),
                'fields': limits, 'assets': assets,
                'reviewed_runtime_fixes': derivative,
                'manrope_license_sha256': digest(manrope['OFL-Manrope.txt']) if manrope else None,
                'missing_assets': ([] if owner_audio else ['demo_audio=service', 'demo_audio=restored']) +
                                  ([] if manrope else ['Manrope WOFF2 (4 files)'])
            }
            state = {'format': FORMAT, 'revision': 1,
                     'revisions': {'1': values}, 'releases': {}}
            for name, data in [('manifest.json', manifest), ('state.json', state)]:
                (target / name).write_text(json.dumps(data, ensure_ascii=False,
                                separators=(',', ':')) + '\n', encoding='utf-8')
            (target / 'state.lock').touch(mode=0o600)
            return {'source_zip_sha256': expected_sha, 'audio_paired': bool(owner_audio),
                    'reviewed_runtime_fixes': list(derivative), 'assets': len(assets),
                    'fields': len(values), 'sections': source_info['sections'],
                    'faq': source_info['faq'], 'fonts_paired': bool(manrope)}
        except Exception:
            shutil.rmtree(target, ignore_errors=True)
            raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('owner_zip', type=Path)
    parser.add_argument('private_destination', type=Path)
    parser.add_argument('--service-mp3', type=Path)
    parser.add_argument('--restored-mp3', type=Path)
    parser.add_argument('--manrope-dir', type=Path, help='Local nomusic/website/public/assets/fonts; verified Git blobs and OFL')
    args = parser.parse_args()
    print(json.dumps(make_package(args.owner_zip, args.private_destination,
                                   service_mp3=args.service_mp3, restored_mp3=args.restored_mp3,
                                   manrope_dir=args.manrope_dir),
                     ensure_ascii=False, indent=2))
