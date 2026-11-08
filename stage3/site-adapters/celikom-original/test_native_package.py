#!/usr/bin/env python3
"""Synthetic offline package test: no owner source enters the repository."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from bridge import digest
from native_package import make_package


def test():
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        folder = 'owner_files'
        section_names = ['hero','features','how','contribute','install',
                         'transparency','faq','pricing','demo','contact','footer']
        html = ['<!DOCTYPE html><html lang="ru"><head><title>CELIKOM</title>',
                '<meta name="description" content="Original description">',
                f'<link href="{folder}/original.css" rel="stylesheet">',
                '</head><body>']
        for section in section_names:
            if section == 'hero':
                heading = '<h1><span>Привет</span> CELIKOM</h1>'
            else:
                heading = f'<h2>Название {section}</h2>'
            html.append(f'<section id="{section}">{heading}<p class="section-body">Текст {section}</p>')
            if section == 'features':
                for i in range(9):
                    html.append(f'<h3>Заголовок {i}</h3><p>Описание {i}</p>')
            if section == 'faq':
                for i in range(28):
                    html.append(f'<details id="faq-{i+1:02}" class="faq-item"><summary><span>Вопрос {i+1}</span></summary><div class="answer"><p>Ответ {i+1}</p></div></details>')
            html.append('</section>')
        for name in ('faq.js.Без названия','owner-sound-player.js.Без названия',
                     'owner-v10-motion.js.Без названия'):
            html.append(f'<script src="{folder}/{name}"></script>')
        html.append(f'<img src="{folder}/saved_resource" alt="Демо">')
        html.append('</body></html>')
        archive = root / 'source.zip'
        with ZipFile(archive,'w') as z:
            z.writestr('owner.html',''.join(html))
            z.writestr(f'{folder}/original.css','html{background:#111}')
            for i in range(9):
                z.writestr(f'{folder}/original-{i}.css',f'.demo-{i}{{color:red}}')
            for name in ('faq.js.Без названия','owner-sound-player.js.Без названия',
                         'owner-v10-motion.js.Без названия'):
                z.writestr(f'{folder}/{name}',f'window.demo_{len(name)}=1;')
            z.writestr(f'{folder}/saved_resource',b'\x89PNG\r\n\x1a\n\x00')
        package = root / 'private'
        actual = make_package(archive, package, expected_sha=digest(archive.read_bytes()))
        assert (actual['sections'],actual['faq'],actual['fields'])==(11,28,99)
        manifest=json.loads((package/'manifest.json').read_text())
        assert manifest['source_zip_sha256']==digest(archive.read_bytes())
        assert manifest['template_sha256']==digest((package/'template.html').read_bytes())
        assert len(manifest['assets'])==14
        assert (package/'assets/faq.js').read_bytes()==b'window.demo_19=1;'
        html=(package/'template.html').read_text()
        assert html.count('{{CELIKOM:')==99
        assert '/celikom-original-assets/faq.js' in html
        assert '{{CELIKOM:seo.title}}' in html
        assert '{{CELIKOM:faq.faq-01.question}}' in html
        assert '<span>{{CELIKOM:hero.heading.1}}</span>' in html
        assert not (package/'assets/faq.js.Без названия').exists()
        try:
            make_package(archive,root/'rejected',expected_sha='0'*64)
        except ValueError:
            pass
        else:
            raise AssertionError('Unapproved source hash was allowed')
        print('PASS CELIKOM source package: 11 sections, 28 FAQ, 99 fields, 14 byte-preserved assets')

if __name__=='__main__':
    test()
