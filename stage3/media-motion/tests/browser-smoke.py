#!/usr/bin/env python3
"""Optional, no-install Chromium acceptance smoke. Requires preinstalled Playwright + Chromium.
Runs on file://, with synthetic images only. No network and no CMS staging environment.
"""
import io, json, hashlib, os, pathlib, re, struct, tempfile, zlib, zipfile
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]

def png(width=900, height=540, seed=4):
    raw = b''.join(b'\0' + b''.join(bytes(((x * 11 + y + seed) % 256, (y * 3 + seed) % 256, (x // 2 + y + seed) % 256, 255)) for x in range(width)) for y in range(height))
    def chunk(kind, data): return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>2I5B', width,height,8,6,0,0,0)) + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b'')

def offline_page(page):
    # The managed container's Chromium policy blocks all top-level navigation,
    # including file:// and loopback. Inject the exact checked-in page and JS
    # into an about:blank document to exercise the same production logic.
    html=(ROOT/'workbench/index.html').read_text()
    html=re.sub(r'<script src=\"[^\"]+\"></script>', '', html)
    page.set_content(html)
    page.add_style_tag(content=(ROOT/'workbench/styles.css').read_text())
    for path in ['lib/contract.cjs','lib/sha256.cjs','workbench/engine.js','workbench/app.js']:
        page.add_script_tag(content=(ROOT/path).read_text())

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'), args=['--no-sandbox','--disable-background-networking'])
    context=browser.new_context(accept_downloads=True, viewport={'width':1440,'height':900}, reduced_motion='no-preference')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda err: errors.append(str(err)))
    offline_page(page)
    page.locator('#file-input').set_input_files([
        {'name':'picture.png','mimeType':'image/png','buffer':png()},
        {'name':'picture-two.png','mimeType':'image/png','buffer':png(960,600,6)}
    ])
    page.wait_for_function("document.querySelector('#library-count').textContent === '2'")
    assert page.locator('#library-list .media-tile').count()==2
    page.locator('#media-alt').fill('Пейзаж для тестирования')
    page.locator('#media-alt').dispatch_event('change')
    page.locator('#ratio').select_option('4:3')
    page.locator('#rotate-right').click()
    page.locator('#crop-w').fill('76')
    page.locator('#crop-w').dispatch_event('change')
    page.locator('#format').select_option('image/webp')
    page.locator('#width').fill('500')
    page.locator('#width').dispatch_event('change')
    page.locator('#process-all').click()
    page.wait_for_function("document.querySelector('#cancel').disabled && document.querySelector('#ready-count').textContent !== '0'", timeout=30000)
    ready=int(page.locator('#ready-count').inner_text())
    assert ready>=4,ready
    page.locator('[data-layout="carousel"]').click()
    page.locator('#next-slide').click()
    page.locator('#motion-preset').select_option('slide-up')
    page.locator('#duration').fill('560')
    page.locator('#duration').dispatch_event('change')
    page.locator('#replay').click()
    page.locator('#video-provider').select_option('youtube')
    page.locator('#video-url').fill('https://www.youtube-nocookie.com/embed/ABCDEFGHIJK')
    page.locator('#video-url').dispatch_event('change')
    with page.expect_download() as artifact:
        page.locator('#export-zip').click()
    zip_download=artifact.value
    with tempfile.TemporaryDirectory() as tmp:
        destination=pathlib.Path(tmp)/'bundle.zip'
        zip_download.save_as(destination)
        with zipfile.ZipFile(destination,'r') as archive:
            entries=archive.namelist()
            assert 'bundle.json' in entries and 'motion.css' in entries,entries
            bundle=json.loads(archive.read('bundle.json'))
            assert bundle['format']=='media-motion-bundle-v1'
            assert bundle['galleries'][0]['layout']=='carousel'
            assert bundle['video']['provider']=='youtube'
            assert 'prefers-reduced-motion: reduce' in bundle['css']
            assert len(bundle['assets'])==2
            assert any(v['width']==500 for a in bundle['assets'] for v in a['variants']), 'manual resize target must produce real variant'
            checked=0
            for item in bundle['assets']:
                for variant in item['variants']:
                    payload=archive.read(variant['file'])
                    assert hashlib.sha256(payload).hexdigest()==variant['sha256']
                    assert len(payload)==variant['bytes'] and len(payload)<=450*1024
                    assert payload.startswith(b'RIFF') and payload[8:12]==b'WEBP'
                    checked+=1
            assert checked==ready,(checked,ready)
    # Confirm two more real browser encoders; export one converted image each.
    for mime,signature in [('image/jpeg',b'\xff\xd8'),('image/png',b'\x89PNG\r\n\x1a\n')]:
        page.locator('#format').select_option(mime)
        page.locator('#process-one').click()
        page.wait_for_function("document.querySelector('#cancel').disabled",timeout=30000)
        with page.expect_download() as raster_download:
            page.locator('#variant-list .variant-row button').first.click()
        with tempfile.TemporaryDirectory() as work:
            output=pathlib.Path(work)/'output'
            raster_download.value.save_as(output)
            assert output.read_bytes().startswith(signature)
            assert output.stat().st_size <= 450*1024
    with page.expect_download() as projectdownload:
        page.locator('#save-project').click()
    assert projectdownload.value.suggested_filename=='media-motion-project.json'
    page.locator('#undo').click()
    page.locator('#redo').click()
    for width,height in [(820,1024),(390,844)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.locator('#export-zip').is_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 4'), 'horizontal overflow'
    context.close()
    context=browser.new_context(accept_downloads=True, viewport={'width':390,'height':844}, reduced_motion='reduce')
    reduced=context.new_page()
    offline_page(reduced)
    assert reduced.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")
    assert 'prefers-reduced-motion: reduce' in reduced.locator('#motion-css').inner_text()
    assert not errors,errors
    browser.close()
    print(f'media-motion Chromium smoke: PASS (2 imported, {ready} converted/hashed images, ZIP, project, layouts, motion, 3 viewports, reduced motion)')
