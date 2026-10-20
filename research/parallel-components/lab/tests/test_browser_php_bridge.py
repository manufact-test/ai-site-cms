"""Real Chromium DOM + real PHP POST/session bridge in network-isolated developer sandboxes.

The page is injected offline; browser fetch is deliberately transported via a Playwright
Python binding to the actual local PHP endpoint. No external mail or real browser TCP claim.
This tests code and responses from CURRENT checkout, not canned JSON response stubs.
"""
import http.cookiejar
import json
import os
import socket
import subprocess
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPCookieProcessor, urlopen

from playwright.sync_api import sync_playwright

PUBLIC = Path(__file__).resolve().parents[1] / 'public'

class BrowserPhpBridge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        cls.origin = f'http://127.0.0.1:{port}'
        env = os.environ.copy()
        env['LAB_PUBLIC_ORIGIN'] = cls.origin
        for key in ('LAB_FORM_RECIPIENT_EMAIL', 'LAB_FORM_SENDER_EMAIL',
                    'LAB_PHONE_AUTOLOAD', 'LAB_ABUSE_DIR', 'LAB_ABUSE_SECRET'):
            env.pop(key, None)
        cls.server = subprocess.Popen(
            ['php', '-S', f'127.0.0.1:{port}', '-t', str(PUBLIC)],
            env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                urlopen(cls.origin, timeout=.2).read()
                break
            except Exception:
                time.sleep(.1)
        else:
            raise RuntimeError('PHP server unavailable')
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(
            headless=True, executable_path='/usr/bin/chromium',
            args=['--no-sandbox', '--disable-dev-shm-usage'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.terminate()
        cls.server.wait(timeout=5)

    def setUp(self):
        self.opener = build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        html = self.opener.open(self.origin, timeout=5).read().decode('utf-8')
        self.assertIn('name="csrf"', html)
        self.page = self.browser.new_page(viewport={'width':375, 'height':740})
        self.responses = []
        self.force_duplicate = False

        def call_php(source, action, payload):
            if not isinstance(action, str) or not action.endswith('/submit-html.php'):
                raise RuntimeError('Unexpected browser action: fail closed')
            if not isinstance(payload, str) or len(payload.encode('utf-8')) > 10000:
                raise RuntimeError('Unexpected payload: fail closed')
            if self.force_duplicate:
                payload += '&name=duplicate'
            req = Request(self.origin + '/submit-html.php', data=payload.encode('utf-8'),
                method='POST', headers={
                    'Origin': self.origin,
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                    'Accept': 'application/json'})
            try:
                response = self.opener.open(req, timeout=5)
            except HTTPError as exc:
                response = exc
            with response:
                raw = response.read()
                self.assertIn('application/json', response.headers.get('Content-Type', ''))
                decoded = json.loads(raw.decode('utf-8'))
                self.responses.append((response.status, decoded['code']))
                return decoded

        self.page.expose_binding('phpBridge', call_php)
        html = html.replace('<link rel="stylesheet" href="/assets/style.css">', '')
        html = html.replace('<script src="/assets/ui.js" defer></script>', '')
        self.page.set_content(html)
        self.page.add_style_tag(content=(PUBLIC/'assets/style.css').read_text())
        self.page.evaluate("""() => {
          window.fetch = async (action, options) => ({
            json: async () => window.phpBridge(String(action), options.body.toString())
          });
        }""")
        self.page.add_script_tag(content=(PUBLIC/'assets/ui.js').read_text())

    def tearDown(self):
        self.page.close()

    def prepare_valid_form(self):
        self.page.locator('#name').fill('Мария')
        self.page.locator('#email').fill('maria@example.test')
        self.page.locator('#wizard-next').click()
        self.assertFalse(self.page.locator('#wizard-message').is_hidden())
        self.page.locator('#message').fill('Настоящий сервер проверяет сообщение полностью.')
        # The real PHP handler retains the two-second honeypot timer.
        time.sleep(2.1)

    def test_real_server_configuration_response(self):
        self.prepare_valid_form()
        self.page.locator('#form-submit').click()
        self.page.wait_for_function(
            "document.querySelector('#form-status').textContent.includes('CONFIGURATION_REQUIRED')")
        self.assertEqual(self.responses, [(503, 'CONFIGURATION_REQUIRED')])
        self.assertFalse(self.page.locator('#form-submit').is_disabled())
        self.assertIn('не отправлена', self.page.locator('#form-status').inner_text())

    def test_php_only_email_validation_rewinds_wizard(self):
        self.page.locator('#name').fill('Мария')
        # HTML5 considers a@b syntactically valid. PHP FILTER_VALIDATE_EMAIL rejects it.
        self.page.locator('#email').fill('a@b')
        self.assertTrue(self.page.locator('#email').evaluate('(el) => el.validity.valid'))
        self.page.locator('#wizard-next').click()
        self.page.locator('#message').fill('Server and browser validation boundaries.')
        time.sleep(2.1)
        self.page.locator('#form-submit').click()
        self.page.wait_for_function(
            "document.querySelector('#form-status').textContent.includes('VALIDATION_ERROR')")
        self.assertEqual(self.responses, [(422, 'VALIDATION_ERROR')])
        self.assertFalse(self.page.locator('#wizard-identity').is_hidden())
        self.assertTrue(self.page.locator('#email').evaluate(
            '(el) => el === document.activeElement'))
        self.assertEqual(self.page.locator('#email').get_attribute('aria-invalid'), 'true')

    def test_server_rejects_browser_side_duplicate_injection(self):
        self.prepare_valid_form()
        self.force_duplicate = True
        self.page.locator('#form-submit').click()
        self.page.wait_for_function(
            "document.querySelector('#form-status').textContent.includes('MALFORMED_FORM')")
        self.assertEqual(self.responses, [(422, 'MALFORMED_FORM')])
        self.assertFalse(self.page.locator('#form-submit').is_disabled())

    def test_real_phone_validator_refusal(self):
        self.prepare_valid_form()
        self.page.locator('#phone_region').select_option('DE')
        self.page.locator('#phone').fill('+49 151 23456789')
        self.page.locator('#form-submit').click()
        self.page.wait_for_function(
            "document.querySelector('#form-status').textContent.includes('PHONE_VALIDATOR_REQUIRED')")
        self.assertEqual(self.responses, [(503, 'PHONE_VALIDATOR_REQUIRED')])
        self.assertFalse(self.page.locator('#form-submit').is_disabled())

if __name__ == '__main__':
    unittest.main()
