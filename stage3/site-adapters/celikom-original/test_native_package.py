#!/usr/bin/env python3
"""Synthetic offline package test: no owner source enters the repository."""
import json
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from zipfile import ZipFile
from bridge import digest
import native_package
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
        html.append('<audio id="celikom-demo-service" src="/?demo_audio=service"></audio>')
        html.append('<audio id="celikom-demo-restored" src="/?demo_audio=restored"></audio>')
        html.append('</body></html>')
        archive = root / 'source.zip'
        # Synthetic JS reproduces only the first-frame volume bug.
        original_player_js = """const token=1;
const fade=(audio,from,to,ms,stamp,done)=>{
 const start=performance.now();
 function next(now){
  if(token!==stamp)return;
  const t=Math.min(1,(now-start)/ms);
  audio.volume=from+(to-from)*t;
  if(t<1)requestAnimationFrame(next);
  else if(done)done()
 }
 requestAnimationFrame(next)
};
const sourceReady=()=>true;
"""
        with ZipFile(archive,'w') as z:
            z.writestr('owner.html',''.join(html))
            z.writestr(f'{folder}/original.css','html{background:#111}')
            for i in range(9):
                z.writestr(f'{folder}/original-{i}.css',f'.demo-{i}{{color:red}}')
            for name in ('faq.js.Без названия','owner-sound-player.js.Без названия',
                         'owner-v10-motion.js.Без названия'):
                z.writestr(f'{folder}/{name}',
                           original_player_js if name.startswith('owner-sound-player') else
                           f'window.demo_{len(name)}=1;')
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
        # Synthetic stand-ins never ship to the website or public release.
        service=root/'synthetic-service.mp3'; restored=root/'synthetic-restored.mp3'
        service.write_bytes(b'A'*1536); restored.write_bytes(b'B'*1536)
        original_hashes=native_package.AUDIO_SHA256
        original_js_hash=native_package.OWNER_SOUND_JS_SHA256
        native_package.AUDIO_SHA256={
            'service':digest(service.read_bytes()),'restored':digest(restored.read_bytes())
        }
        native_package.OWNER_SOUND_JS_SHA256=digest(original_player_js.encode('utf-8'))
        try:
            paired=root/'with-paired-audio'
            paired_result=make_package(archive,paired,expected_sha=digest(archive.read_bytes()),
                                       service_mp3=service,restored_mp3=restored)
            assert paired_result['audio_paired'] is True
            paired_manifest=json.loads((paired/'manifest.json').read_text())
            assert paired_manifest['assets']['service.mp3']['sha256']==digest(service.read_bytes())
            assert paired_manifest['assets']['restored.mp3']['sha256']==digest(restored.read_bytes())
            assert paired_manifest['assets']['celikom-player-center-fix.css']['mime']=='text/css'
            paired_html=(paired/'template.html').read_text()
            assert '/celikom-original-assets/service.mp3' in paired_html
            assert '/celikom-original-assets/restored.mp3' in paired_html
            assert '/celikom-original-assets/celikom-player-center-fix.css' in paired_html
            assert (paired/'source-archive.zip').read_bytes()==archive.read_bytes()
            assert (paired/'assets/faq.js').read_bytes()==b'window.demo_19=1;'
            with ZipFile(archive) as z:
                original_in_zip=z.read(f'{folder}/owner-sound-player.js.Без названия')
            assert original_in_zip==original_player_js.encode('utf-8')
            runtime_js=(paired/'assets/owner-sound-player.js').read_bytes()
            assert runtime_js!=original_in_zip
            assert b'Math.max(0,Math.min(1,(now-start)/ms))' in runtime_js
            assert b'Math.max(0,Math.min(1,from+(to-from)*t))' in runtime_js
            assert b'Math.min(1,(now-start)/ms);' not in runtime_js
            assert paired_manifest['reviewed_runtime_fixes']['owner-sound-player.js']=={
                'source_sha256':digest(original_in_zip),
                'runtime_sha256':digest(runtime_js),
                'fix':'clamp-fade-progress-and-volume-v1'
            }
            regression=subprocess.run(
                ['node',str(Path(__file__).with_name('test_player_fade.cjs')),
                 str(paired/'assets/owner-sound-player.js')],
                capture_output=True,text=True,check=False
            )
            assert regression.returncode==0, regression.stderr
            print(regression.stdout.strip())
            service.write_bytes(b'TAMPERED'*192)
            try:
                make_package(archive,root/'reject-audio',expected_sha=digest(archive.read_bytes()),
                             service_mp3=service,restored_mp3=restored)
            except ValueError:
                pass
            else:
                raise AssertionError('Modified A/B clip accepted')
        finally:
            native_package.AUDIO_SHA256=original_hashes
            native_package.OWNER_SOUND_JS_SHA256=original_js_hash
        try:
            make_package(archive,root/'rejected',expected_sha='0'*64)
        except ValueError:
            pass
        else:
            raise AssertionError('Unapproved source hash was allowed')
        print('PASS CELIKOM source package: source integrity, 11 sections, 28 FAQ, 99 fields, 14 original assets, paired private audio and visual correction')

if __name__=='__main__':
    test()
