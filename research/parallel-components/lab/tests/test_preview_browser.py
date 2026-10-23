"""Chromium layout smoke for PHP-rendered, script-free trusted preview markup."""
import subprocess
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright

LAB=Path(__file__).resolve().parents[1]
RESEARCH=LAB.parent

class BrowserPreview(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        php='''require $argv[1]; $r=json_decode(file_get_contents($argv[2]),true,512,JSON_THROW_ON_ERROR);
$p=['blockId'=>'hero-primary','expectedRevision'=>7,'changes'=>['layout.paddingPx'=>28]];
$res=PreviewLab::render($r,$p,'example.test');if($res['code']!=='PREVIEW_ONLY')exit(8);echo $res['html'];'''
        cls.markup=subprocess.check_output(['php','-r',php,str(LAB/'src/PreviewLab.php'),
            str(RESEARCH/'fixtures/visual-revision-candidates.research.json')],text=True,timeout=10)
        cls.play=sync_playwright().start()
        cls.browser=cls.play.chromium.launch(headless=True,executable_path='/usr/bin/chromium',
            args=['--no-sandbox','--disable-dev-shm-usage'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.play.stop()

    def test_mobile_320px_fixed_breakpoints_no_overflow(self):
        page=self.browser.new_page(viewport={'width':320,'height':720})
        page.set_content('<!doctype html><html><body style="margin:0">'+self.markup+'</body></html>')
        self.assertEqual(page.locator('#research-hero-preview').evaluate('(el)=>getComputedStyle(el).paddingLeft'),'12px')
        self.assertEqual(page.locator('#research-hero-preview').evaluate('(el)=>getComputedStyle(el).paddingTop'),'28px')
        self.assertFalse(page.evaluate('document.documentElement.scrollWidth > innerWidth'))
        self.assertEqual(page.locator('img').get_attribute('width'),'960')
        self.assertEqual(page.locator('.research-preview-action').get_attribute('data-preview-href'),'/contact')
        self.assertEqual(page.locator('#research-hero-preview a').count(),0)
        self.assertEqual(page.locator('#research-hero-preview [href]').count(),0)
        page.close()

    def test_action_is_text_only_and_cannot_be_triggered_by_keyboard(self):
        page=self.browser.new_page(viewport={'width':320,'height':720})
        page.set_content('<!doctype html><html><body>'+self.markup+'</body></html>')
        self.assertEqual(page.locator('.research-preview-action').get_attribute('role'),None)
        self.assertEqual(page.locator('.research-preview-action').get_attribute('tabindex'),None)
        self.assertEqual(page.locator('#research-hero-preview a').count(),0)
        self.assertEqual(page.locator('code').inner_text(),'/contact')
        page.locator('.research-preview-action').click()
        self.assertEqual(page.url,'about:blank')
        page.close()

    def test_tablet_and_desktop_padding(self):
        page=self.browser.new_page(viewport={'width':800,'height':650})
        page.set_content('<!doctype html><html><body>'+self.markup+'</body></html>')
        self.assertEqual(page.locator('#research-hero-preview').evaluate('(el)=>getComputedStyle(el).paddingLeft'),'20px')
        page.set_viewport_size({'width':1200,'height':760})
        self.assertEqual(page.locator('#research-hero-preview').evaluate('(el)=>getComputedStyle(el).paddingLeft'),'32px')
        self.assertEqual(page.locator('section').count(),1)
        self.assertEqual(page.locator('script').count(),0)
        page.close()


    def test_exact_csp_hash_allows_styles_but_wrong_hash_blocks(self):
        import base64
        import hashlib
        import re
        css=re.search(r'<style>([^<]*)</style>',self.markup).group(1)
        token=base64.b64encode(hashlib.sha256(css.encode()).digest()).decode()
        good='<meta http-equiv="Content-Security-Policy" content="default-src '+"'none'"+'; style-src '+"'sha256-"+token+"'"+'">'
        bad='<meta http-equiv="Content-Security-Policy" content="default-src '+"'none'"+'; style-src '+"'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='"+'">'
        page=self.browser.new_page(viewport={'width':320,'height':720})
        page.set_content('<!doctype html><html><head>'+good+'</head><body>'+self.markup+'</body></html>')
        self.assertEqual(page.locator('#research-hero-preview').evaluate('(el)=>getComputedStyle(el).paddingLeft'),'12px')
        page.close()
        blocked=self.browser.new_page(viewport={'width':320,'height':720})
        blocked.set_content('<!doctype html><html><head>'+bad+'</head><body>'+self.markup+'</body></html>')
        self.assertEqual(blocked.locator('#research-hero-preview').evaluate('(el)=>getComputedStyle(el).paddingLeft'),'0px')
        blocked.close()

if __name__=='__main__':unittest.main()
