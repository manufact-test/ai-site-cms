#!/usr/bin/env python3
"""Offline tests; optionally set CELIKOM_CAPTURE_ZIP to test owner's private archive."""
import copy
import json
import os
import sys
import unittest
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory
from bs4 import BeautifulSoup
sys.path.insert(0,str(Path(__file__).parent))
from bridge import make_edit_workspace,build,apply_values,digest,secure_extract

def fixture(root):
    basename='CELIKOM — то самое звучание'
    parts=['<!DOCTYPE html><html><head><title>Исходное название</title><meta name="description" content="Исходное описание"></head><body>']
    for name in ('top','features','how','sound','player','contribute','transparency','faq','rewards','install','closing'):
        parts.append(f'<section id="{name}"><h1>Первый <span>экран</span></h1>' if name=='top' else f'<section id="{name}"><h2>Заголовок {name}</h2>')
        parts.append('<p class="hero-lead">Текст первого экрана</p>' if name=='top' else '<p class="section-body">Описание секции</p>')
        if name=='faq':
            for k in range(1,29):
                parts.append(f'<details class="faq-item" data-category="start" id="faq-question-{k:02d}"><summary><span>Вопрос {k}?</span><svg viewBox="0 0 10 10"></svg></summary><div class="answer"><p>Ответ {k}</p></div></details>')
        parts.append('</section>')
    parts.append(f'<script src="./{basename}_files/a.js"></script><audio src="/?demo_audio=service"></audio><audio src="/?demo_audio=restored"></audio></body></html>')
    zip_path=root/'fixture.zip'
    with zipfile.ZipFile(zip_path,'w') as z:
        z.writestr(basename+'.html',''.join(parts))
        z.writestr(basename+'_files/a.js','console.log("test")')
        z.writestr(basename+'_files/mark.svg','<svg/>')
    return zip_path

class TestBridge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=TemporaryDirectory()
        cls.root=Path(cls.temp.name)
        file=Path(os.environ['CELIKOM_CAPTURE_ZIP']) if os.getenv('CELIKOM_CAPTURE_ZIP') else fixture(cls.root)
        cls.work=cls.root/'work'
        cls.info=make_edit_workspace(file,cls.work)
        cls.original=(cls.work/'source'/cls.info['source_html']).read_bytes()
        cls.values=json.loads((cls.work/'values.json').read_text())
    @classmethod
    def tearDownClass(cls):cls.temp.cleanup()
    def test_sections_faq(self):
        self.assertEqual(self.info['sections'],11)
        self.assertEqual(self.info['faq'],28)
        self.assertGreaterEqual(self.info['editable_keys'],75)
    def test_unedited_html_and_resource_bytes(self):
        out=self.root/'preview'
        result=build(self.work,out)
        self.assertEqual(result['changed_fields'],0)
        for name,sha in self.info['sha256'].items():
            if name.endswith('.html'):continue
            self.assertEqual(digest((out/self.info['resources_directory']/Path(name).name).read_bytes()),sha)
        self.assertEqual(len(BeautifulSoup((out/'index.html').read_text(),'html.parser').select('details.faq-item')),28)
    def test_edit_preserves_11_sections_and_28_faq(self):
        vals=copy.deepcopy(self.values)
        vals['fields']['seo.description']='Новое описание'
        vals['fields']['top.heading.1']='Новый заголовок'
        vals['fields']['faq.faq-question-01.question']='Новый вопрос?'
        html,count=apply_values(self.original,vals)
        doc=BeautifulSoup(html,'html.parser')
        self.assertEqual(count,3)
        self.assertEqual(len(doc.select('section[id]')),11)
        self.assertEqual(len(doc.select('details.faq-item')),28)
        self.assertEqual(doc.select_one('meta[name=description]').get('content'),'Новое описание')
        self.assertEqual(doc.select_one('#faq-question-01 summary span').text,'Новый вопрос?')
    def test_xss_escaped(self):
        vals=copy.deepcopy(self.values)
        vals['fields']['faq.faq-question-01.answer']='<script>alert(1)</script>'
        html,count=apply_values(self.original,vals)
        self.assertNotIn('<script>alert(1)</script>',html)
        self.assertIn('&lt;script&gt;alert(1)&lt;/script&gt;',html)
    def test_hash_mismatch_and_unknown_key_blocked(self):
        vals=copy.deepcopy(self.values)
        vals['source_sha256']='0'*64
        with self.assertRaises(ValueError):apply_values(self.original,vals)
        vals=copy.deepcopy(self.values)
        vals['fields']['extra']='bad'
        with self.assertRaises(ValueError):apply_values(self.original,vals)
    def test_zip_traversal_blocked(self):
        name=self.root/'unsafe.zip'
        with zipfile.ZipFile(name,'w') as z:z.writestr('../evil.html','bad')
        with self.assertRaises(ValueError):secure_extract(name,self.root/'extract')
    def test_no_overwrite(self):
        with self.assertRaises(ValueError):build(self.work,self.work)

if __name__=='__main__': unittest.main(verbosity=2)
