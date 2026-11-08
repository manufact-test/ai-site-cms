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
from bridge import (digest, discover_fields, make_edit_workspace,
                    normalize_local_links, source_inventory)
from finalize_static import RENAMES

FORMAT = 'manufact-celikom-preserved-source-v1'
PINNED_SOURCE_ZIP = 'f998e96ccc9393dfe958a51d144be10d5fb1f1d068721d163ff40048077104aa'
MIME = {'.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml',
        '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
        '.webp':'image/webp', '.woff2':'font/woff2', '.mp3':'audio/mpeg',
        '.ogg':'audio/ogg', '.wav':'audio/wav'}


def make_package(archive: Path, target: Path, expected_sha: str = PINNED_SOURCE_ZIP):
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
        template = normalize_local_links(str(soup))
        # Only same-page original origin links are adapted; all visible styling stays intact.
        template = template.replace('https://lemonchiffon-narwhal-791953.hostingersite.com/', '/')
        resource_ref = re.escape(resources.name) + '/'
        template, count = re.subn(r'(?:\./)?' + resource_ref,
                                  '/celikom-original-assets/', template)
        if count < 1:
            raise ValueError('Original resource URLs not found in HTML')
        for old, new in RENAMES.items():
            if old not in template:
                raise ValueError('Original resource not referenced: ' + old)
            template = template.replace(old, new)
        for key in values:
            if template.count('{{CELIKOM:' + key + '}}') != 1:
                raise ValueError('Ambiguous editable field in template: ' + key)
        if re.search(r'{{CELIKOM:[^}]+}}', template) is None:
            raise ValueError('No actual content markers generated')
        target.mkdir(parents=True)
        try:
            (target / 'assets').mkdir()
            assets = {}
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
                shutil.copyfile(file, destination)
                data = destination.read_bytes()
                if data != file.read_bytes():
                    raise ValueError('Original static asset bytes changed')
                assets[name] = {'mime': mime, 'sha256': digest(data)}
            if len(assets) < 10:
                raise ValueError('Missing static CELIKOM assets')
            shutil.copyfile(archive, target / 'source-archive.zip')
            (target / 'template.html').write_text(template, encoding='utf-8')
            manifest = {
                'format': FORMAT, 'source_zip_sha256': expected_sha,
                'source_html_sha256': digest(html),
                'template_sha256': digest(template.encode('utf-8')),
                'fields': limits, 'assets': assets,
                'missing_assets': ['demo_audio=service', 'demo_audio=restored',
                                   'Manrope WOFF2 (4 files)']
            }
            state = {'format': FORMAT, 'revision': 1,
                     'revisions': {'1': values}, 'releases': {}}
            for name, data in [('manifest.json', manifest), ('state.json', state)]:
                (target / name).write_text(json.dumps(data, ensure_ascii=False,
                                separators=(',', ':')) + '\n', encoding='utf-8')
            (target / 'state.lock').touch(mode=0o600)
            return {'source_zip_sha256': expected_sha, 'assets': len(assets),
                    'fields': len(values), 'sections': source_info['sections'],
                    'faq': source_info['faq']}
        except Exception:
            shutil.rmtree(target, ignore_errors=True)
            raise


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('owner_zip', type=Path)
    parser.add_argument('private_destination', type=Path)
    args = parser.parse_args()
    print(json.dumps(make_package(args.owner_zip, args.private_destination),
                     ensure_ascii=False, indent=2))
