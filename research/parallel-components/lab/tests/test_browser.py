"""Browser lab checks; requires optional dev-only Python playwright and Chromium installed."""
import contextlib
import os
import socket
import subprocess
import time
import unittest
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import HTTPError
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

PUBLIC = Path(__file__).resolve().parents[1] / 'public'

class BrowserLab(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sock = socket.socket(); sock.bind(('127.0.0.1',0)); cls.port = sock.getsockname()[1]; sock.close()
        cls.backend = f'http://127.0.0.1:{cls.port}'
        cls.base = 'http://lab.test'
        env = dict(os.environ)
        env.pop('LAB_FORM_RECIPIENT_EMAIL', None)
        env.pop('LAB_FORM_SENDER_EMAIL', None)
        cls.server = subprocess.Popen(['php','-S',f'127.0.0.1:{cls.port}','-t',str(PUBLIC)],
                                      stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)
        for _ in range(60):
            try:
                urlopen(cls.backend,timeout=.3).read(); break
            except Exception: time.sleep(.1)
        else: raise RuntimeError('PHP lab server did not start')
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop(); cls.server.terminate(); cls.server.wait(timeout=5)

    def new_page(self, **kwargs):
        page = self.browser.new_page(**kwargs)
        # Browser network is administratively blocked in this runner, including
        # loopback. PHP renders through Python only; Chromium tests actual DOM/JS.
        html = urlopen(self.backend, timeout=4).read().decode('utf-8')
        html = html.replace('<link rel="stylesheet" href="/assets/style.css">', '')
        html = html.replace('<script src="/assets/ui.js" defer></script>', '')
        page.set_content(html)
        page.add_style_tag(content=(PUBLIC/'assets/style.css').read_text())
        page.add_script_tag(content=(PUBLIC/'assets/ui.js').read_text())
        return page

    def test_desktop_keyboard_dialog_tabs_faq(self):
        page = self.new_page(viewport={'width':1280, 'height':800})
        errors=[]; external=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.on('request',lambda r: external.append(r.url) if not r.url.startswith(self.base) else None)
        page.locator('#faq summary').first.click()
        self.assertTrue(page.locator('#faq details').first.evaluate('(el)=>el.open'))
        page.locator('#tab-php').focus();page.keyboard.press('ArrowRight')
        self.assertEqual(page.locator('#tab-react').get_attribute('aria-selected'),'true')
        self.assertTrue(page.locator('#panel-php').is_hidden())
        page.keyboard.press('Home')
        self.assertEqual(page.locator('#tab-php').get_attribute('aria-selected'),'true')
        page.locator('#open-dialog').click()
        self.assertTrue(page.locator('#info-dialog').evaluate('(el)=>el.open'))
        self.assertTrue(page.locator('#close-dialog').evaluate('(el)=>document.activeElement === el'))
        page.keyboard.press('Escape')
        self.assertFalse(page.locator('#info-dialog').evaluate('(el)=>el.open'))
        self.assertTrue(page.locator('#open-dialog').evaluate('(el)=>document.activeElement === el'))
        self.assertEqual(errors,[])
        self.assertEqual(external,[])
        page.close()

    def test_mobile_menu_escape_and_no_overflow(self):
        page=self.new_page(viewport={'width':375,'height':812})
        self.assertFalse(page.locator('#site-nav').is_visible())
        page.locator('#nav-toggle').click()
        self.assertTrue(page.locator('#site-nav').is_visible())
        self.assertEqual(page.locator('#nav-toggle').get_attribute('aria-expanded'),'true')
        page.keyboard.press('Escape')
        self.assertFalse(page.locator('#site-nav').is_visible())
        self.assertTrue(page.locator('#nav-toggle').evaluate('(el)=>document.activeElement === el'))
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.close()

    def test_form_client_and_server_no_fake_success(self):
        page=self.new_page(viewport={'width':900,'height':800})
        page.locator('#form-submit').click()
        self.assertIn('Проверьте поля',page.locator('#form-status').inner_text())
        page.locator('#name').fill('Мария')
        page.locator('#email').fill('maria@example.test')
        page.locator('#message').fill('Сообщение для тестирования лабораторной формы.')
        # Time-based anti-bot requirement uses server-side issue time.
        page.wait_for_timeout(2300)
        page.evaluate('''() => {
          window.fetch = async () => ({json: async () => ({code:'CONFIGURATION_REQUIRED',
            message:'Отправка не настроена: получатель отсутствует. Заявка не отправлена.', errors:{}})});
        }''')
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#form-status').textContent.includes('CONFIGURATION_REQUIRED')")
        self.assertIn('Заявка не отправлена',page.locator('#form-status').inner_text())
        self.assertEqual(page.locator('#name').input_value(),'Мария')
        self.assertFalse(page.locator('#form-submit').is_disabled())
        page.close()

if __name__=='__main__': unittest.main()
