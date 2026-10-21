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
# Also exercise the live PHP/session bridge when the shared CI runs this older entrypoint.
# unittest's standard class discovery includes this imported TestCase without workflow edits.
from test_browser_php_bridge import BrowserPhpBridge
from test_preview_browser import BrowserPreview

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



    def test_no_script_has_usable_nav_tabs_dialog_info_and_native_form_validation(self):
        html = urlopen(self.backend, timeout=5).read().decode('utf-8')
        self.assertNotIn('id="contact" action="/submit-html.php" method="post" novalidate', html)
        self.assertIn('id="panel-react"', html)
        css = (PUBLIC/'assets/style.css').read_text()
        # No-JS mode is actually Chromium with scripting disabled, not just a source-string check.
        context = self.browser.new_context(java_script_enabled=False,
                                           viewport={'width':320,'height':720})
        page = context.new_page()
        try:
            page.set_content(html.replace('</head>', '<style>'+css+'</style></head>', 1))
            self.assertFalse(page.locator('#nav-toggle').is_visible())
            self.assertTrue(page.locator('#site-nav').is_visible())
            self.assertTrue(page.locator('#site-nav a[href="#faq"]').is_visible())
            self.assertFalse(page.locator('[role="tablist"]').is_visible())
            self.assertTrue(page.locator('#panel-php').is_visible())
            self.assertTrue(page.locator('#panel-react').is_visible())
            self.assertEqual(page.locator('#panel-react h3').inner_text(),'React / Next')
            self.assertIsNone(page.locator('#panel-react').get_attribute('role'))
            self.assertFalse(page.locator('#open-dialog').is_visible())
            self.assertTrue(page.locator('#dialog-nojs').is_visible())
            self.assertIn('Исследовательский прототип',page.locator('#dialog-nojs').inner_text())
            self.assertTrue(page.locator('#wizard-identity').is_visible())
            self.assertTrue(page.locator('#wizard-message').is_visible())
            self.assertTrue(page.locator('#form-submit').is_visible())
            self.assertIsNone(page.locator('#contact').get_attribute('novalidate'))
            # Browser blocks an empty native submit locally; no network request is made.
            page.locator('#form-submit').click()
            self.assertTrue(page.locator('#name').evaluate('(el) => el === document.activeElement'))
            self.assertNotIn('submit-html.php',page.url)
        finally:
            context.close()

    def test_no_script_desktop_panels_not_hidden_and_controls_not_dead(self):
        html = urlopen(self.backend, timeout=5).read().decode('utf-8')
        context = self.browser.new_context(java_script_enabled=False,
                                           viewport={'width':1200,'height':840})
        page=context.new_page()
        try:
            page.set_content(html.replace('</head>',
                '<style>'+(PUBLIC/'assets/style.css').read_text()+'</style></head>',1))
            self.assertTrue(page.locator('#site-nav').is_visible())
            self.assertTrue(page.locator('#panel-php').is_visible())
            self.assertTrue(page.locator('#panel-react').is_visible())
            self.assertFalse(page.locator('[role="tablist"]').is_visible())
            self.assertTrue(page.locator('#faq details').first.is_visible())
        finally:
            context.close()

    def test_enhanced_page_initializes_controls_after_progressive_html(self):
        page=self.new_page(viewport={'width':375,'height':740})
        self.assertTrue(page.locator('#nav-toggle').is_visible())
        self.assertTrue(page.locator('#open-dialog').is_visible())
        self.assertTrue(page.locator('[role="tablist"]').is_visible())
        self.assertFalse(page.locator('#panel-php').is_hidden())
        self.assertTrue(page.locator('#panel-react').is_hidden())
        self.assertEqual(page.locator('[role="tab"][aria-selected="true"]').count(),1)
        self.assertEqual(page.locator('#panel-php').get_attribute('role'),'tabpanel')
        self.assertEqual(page.locator('#panel-php').get_attribute('aria-labelledby'),'tab-php')
        self.assertFalse(page.locator('#panel-php h3').is_visible())
        self.assertTrue(page.locator('#contact').evaluate('(el)=>el.noValidate'))
        page.close()

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

    def test_network_failure_blocks_duplicate_retry(self):
        page=self.new_page(viewport={'width':390,'height':844})
        page.locator('#name').fill('Мария')
        page.locator('#email').fill('maria@example.test')
        page.locator('#wizard-next').click()
        page.locator('#message').fill('Сообщение для тестирования лабораторной формы.')
        page.evaluate("() => {window.fetch = async () => {throw new Error('network after acceptance possible')};}")
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#form-status').textContent.includes('NETWORK_UNCONFIRMED')")
        self.assertTrue(page.locator('#form-submit').is_disabled())
        self.assertIn('Не повторяйте',page.locator('#form-status').inner_text())
        page.close()

    def test_transport_exception_blocks_retry(self):
        page=self.new_page(viewport={'width':390,'height':844})
        page.locator('#name').fill('Мария')
        page.locator('#email').fill('maria@example.test')
        page.locator('#wizard-next').click()
        page.locator('#message').fill('Сообщение для тестирования лабораторной формы.')
        page.evaluate("""window.fetch = async () => new Response(JSON.stringify({code:'DELIVERY_UNCONFIRMED',
          message:'Результат отправки неизвестен.',errors:{}}), {status:502, headers:{'Content-Type':'application/json; charset=utf-8'}})""")
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#form-status').textContent.includes('DELIVERY_UNCONFIRMED')")
        self.assertTrue(page.locator('#form-submit').is_disabled())
        page.close()

    def test_dialog_faq_explicit_focus_destination(self):
        page=self.new_page(viewport={'width':320,'height':568}, reduced_motion='reduce')
        page.locator('#open-dialog').click()
        page.locator('#dialog-faq').click()
        page.wait_for_function("document.activeElement.id === 'faq'")
        self.assertFalse(page.locator('#info-dialog').evaluate('(el)=>el.open'))
        self.assertFalse(page.locator('#open-dialog').evaluate('(el)=>document.activeElement === el'))
        page.locator('#open-dialog').click()
        page.keyboard.press('Escape')
        self.assertTrue(page.locator('#open-dialog').evaluate('(el)=>document.activeElement === el'))
        page.close()

    def test_unrecognized_backend_response_never_resends(self):
        page=self.new_page(viewport={'width':390,'height':760})
        page.locator('#name').fill('Мария')
        page.locator('#email').fill('maria@example.test')
        page.locator('#wizard-next').click()
        page.locator('#message').fill('A long message to check retry protection.')
        page.evaluate("""window.fetch=async()=>new Response(JSON.stringify({code:'SOMETHING_NEW',
            message:'Could be accepted by a transport',errors:{}}), {status:503, headers:{'Content-Type':'application/json; charset=utf-8'}})""")
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#form-status').textContent.includes('RESPONSE_UNCONFIRMED')")
        self.assertTrue(page.locator('#form-submit').is_disabled())
        self.assertTrue(page.locator('#wizard-next').is_disabled())
        self.assertTrue(page.locator('#wizard-prev').is_disabled())
        self.assertIn('Обновите страницу',page.locator('#form-status').inner_text())
        page.close()

    def test_malformed_form_reply_disables_resend(self):
        page=self.new_page(viewport={'width':390,'height':760})
        page.locator('#name').fill('Мария')
        page.locator('#email').fill('maria@example.test')
        page.locator('#wizard-next').click()
        page.locator('#message').fill('A long message to check malformed request.')
        page.evaluate("""window.fetch=async()=>new Response(JSON.stringify({code:'MALFORMED_FORM',
            message:'Unexpected submission shape',errors:{}}), {status:422, headers:{'Content-Type':'application/json; charset=utf-8'}})""")
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#form-status').textContent.includes('MALFORMED_FORM')")
        self.assertTrue(page.locator('#form-submit').is_disabled())
        page.close()

    def test_configuration_error_is_explicitly_safe_to_retry(self):
        page=self.new_page(viewport={'width':390,'height':760})
        page.locator('#name').fill('Мария')
        page.locator('#email').fill('maria@example.test')
        page.locator('#wizard-next').click()
        page.locator('#message').fill('A message prepared for local configuration failure.')
        page.evaluate("""window.fetch=async()=>new Response(JSON.stringify({code:'CONFIGURATION_REQUIRED',
            message:'No configured recipient',errors:{}}), {status:503, headers:{'Content-Type':'application/json; charset=utf-8'}})""")
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#form-status').textContent.includes('CONFIGURATION_REQUIRED')")
        self.assertFalse(page.locator('#form-submit').is_disabled())
        page.close()

    def test_duplicate_receipt_state_disables_resubmit(self):
        page=self.new_page(viewport={'width':390,'height':844})
        page.locator('#name').fill('Maria')
        page.locator('#email').fill('maria@example.test')
        page.locator('#wizard-next').click()
        page.locator('#message').fill('A meaningful inquiry for research only')
        page.evaluate("""window.fetch = async () => new Response(JSON.stringify({code:'DUPLICATE_REQUEST',
          message:'Previously attempted request, no new send.',errors:{}}), {status:409, headers:{'Content-Type':'application/json; charset=utf-8'}})""")
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#form-status').textContent.includes('DUPLICATE_REQUEST')")
        self.assertTrue(page.locator('#form-submit').is_disabled())
        page.close()

    def test_mobile_anchor_focus_and_fullsize_modal_trap(self):
        page=self.new_page(viewport={'width':320,'height':568}, reduced_motion='reduce')
        page.locator('#nav-toggle').click()
        page.locator('#site-nav a[href="#faq"]').click()
        self.assertEqual(page.locator('#nav-toggle').get_attribute('aria-expanded'),'false')
        page.wait_for_function("document.activeElement.id === 'faq'")
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.locator('#open-dialog').click()
        page.keyboard.press('Tab')
        self.assertTrue(page.locator('#info-dialog').evaluate('(el)=>el.contains(document.activeElement)'))
        page.keyboard.press('Escape')
        self.assertFalse(page.locator('#info-dialog').evaluate('(el)=>el.open'))
        page.close()

    def test_real_avif_and_webp_decode_offline(self):
        import base64
        page=self.browser.new_page()
        try:
            for fmt in ('avif','webp'):
                raw=(PUBLIC/f'assets/media/workshop-640.{fmt}').read_bytes()
                uri=f'data:image/{fmt};base64,'+base64.b64encode(raw).decode('ascii')
                result=page.evaluate("async uri => {const image=new Image();image.src=uri;await image.decode();return [image.naturalWidth,image.naturalHeight]}",uri)
                self.assertEqual(result,[640,360])
        finally:
            page.close()

    def test_media_semantics_and_phone_input(self):
        page=self.new_page(viewport={'width':320,'height':720}, reduced_motion='reduce')
        self.assertEqual(page.locator('picture source').count(),2)
        self.assertEqual(page.locator('picture source').first.get_attribute('type'),'image/avif')
        self.assertIn('320w',page.locator('picture source').first.get_attribute('srcset'))
        image=page.locator('.media-demo img')
        self.assertEqual(image.get_attribute('loading'),'eager')
        self.assertEqual(image.get_attribute('fetchpriority'),'high')
        self.assertEqual(image.get_attribute('width'),'960')
        self.assertEqual(image.get_attribute('height'),'540')
        self.assertTrue(image.get_attribute('alt'))
        self.assertEqual(page.locator('#phone_region option').count(),6)
        self.assertEqual(page.locator('#phone_region').input_value(),'ZZ')
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.close()

    def test_wizard_keyboard_back_next_and_server_error_rewinds(self):
        page=self.new_page(viewport={'width':320,'height':640}, reduced_motion='reduce')
        self.assertTrue(page.locator('#wizard-message').is_hidden())
        self.assertTrue(page.locator('#form-submit').is_hidden())
        page.locator('#wizard-next').click()
        self.assertEqual(page.locator('#name').get_attribute('aria-invalid'),'true')
        page.locator('#name').fill('Мария')
        page.locator('#email').fill('maria@example.test')
        page.locator('#wizard-next').click()
        self.assertFalse(page.locator('#wizard-message').is_hidden())
        self.assertTrue(page.locator('#message').evaluate('(el)=>document.activeElement===el'))
        page.locator('#wizard-prev').click()
        self.assertEqual(page.locator('#name').input_value(),'Мария')
        self.assertTrue(page.locator('#name').evaluate('(el)=>document.activeElement===el'))
        page.locator('#wizard-next').click()
        page.locator('#message').fill('An accessible message that is long enough')
        page.evaluate("""window.fetch=async()=>new Response(JSON.stringify({code:'VALIDATION_ERROR',
          message:'Проверьте поля формы.',errors:{name:'Сервер отклонил имя.'}}), {status:422, headers:{'Content-Type':'application/json; charset=utf-8'}})""")
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#name-error').textContent.includes('Сервер')")
        self.assertFalse(page.locator('#wizard-identity').is_hidden())
        self.assertTrue(page.locator('#name').evaluate('(el)=>document.activeElement===el'))
        self.assertTrue(page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.close()

    def test_invalid_error_clears_on_user_edit_and_stays_text_only(self):
        page=self.new_page(viewport={'width':375,'height':720})
        page.locator('#wizard-next').click()
        self.assertEqual(page.locator('#name').get_attribute('aria-invalid'),'true')
        page.locator('#name').fill('Мария')
        self.assertNotEqual(page.locator('#name').get_attribute('aria-invalid'),'true')
        self.assertEqual(page.locator('#name-error').inner_text(),'')
        page.locator('#email').fill('test@example.test')
        page.locator('#wizard-next').click()
        page.locator('#message').fill('too')
        page.locator('#form-submit').click()
        self.assertEqual(page.locator('#message').get_attribute('aria-invalid'),'true')
        page.locator('#message').fill('corrected sufficiently long message')
        self.assertEqual(page.locator('#message-error').inner_text(),'')
        self.assertNotEqual(page.locator('#message').get_attribute('aria-invalid'),'true')
        page.close()

    def test_phone_region_error_focus_and_change_clear(self):
        page=self.new_page(viewport={'width':390,'height':760})
        page.locator('#name').fill('Мария')
        page.locator('#email').fill('maria@example.test')
        page.locator('#wizard-next').click()
        page.locator('#message').fill('Server detects a forged phone-region selector.')
        page.evaluate("""window.fetch=async()=>new Response(JSON.stringify({code:'VALIDATION_ERROR',
            message:'Проверьте страну',errors:{phone_region:'Страна не разрешена'}}), {status:422, headers:{'Content-Type':'application/json; charset=utf-8'}})""")
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#phone_region-error').textContent.includes('Страна')")
        self.assertEqual(page.locator('#phone_region').get_attribute('aria-invalid'),'true')
        self.assertTrue(page.locator('#phone_region').evaluate('(el)=>document.activeElement===el'))
        page.locator('#phone_region').select_option('DE')
        self.assertEqual(page.locator('#phone_region-error').inner_text(),'')
        self.assertNotEqual(page.locator('#phone_region').get_attribute('aria-invalid'),'true')
        page.close()

    def test_wizard_no_script_progressive_enhancement(self):
        html=urlopen(self.backend,timeout=4).read().decode('utf-8')
        self.assertIn('id="wizard-identity"',html)
        self.assertIn('id="wizard-message"',html)
        self.assertIn('name="csrf"',html)
        self.assertIn('type="submit" id="form-submit"',html)
        self.assertNotIn('fieldset id="wizard-message" hidden',html)

    def test_form_client_and_server_no_fake_success(self):
        page=self.new_page(viewport={'width':900,'height':800})
        page.locator('#wizard-next').click()
        self.assertIn('Проверьте поля',page.locator('#form-status').inner_text())
        page.locator('#name').fill('Мария')
        page.locator('#email').fill('maria@example.test')
        page.locator('#wizard-next').click()
        page.locator('#message').fill('Сообщение для тестирования лабораторной формы.')
        # Time-based anti-bot requirement uses server-side issue time.
        page.wait_for_timeout(2300)
        page.evaluate('''() => {
          window.fetch = async () => new Response(JSON.stringify({code:'CONFIGURATION_REQUIRED',
            message:'Отправка не настроена: получатель отсутствует. Заявка не отправлена.', errors:{}}), {status:503, headers:{'Content-Type':'application/json; charset=utf-8'}});
        }''')
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#form-status').textContent.includes('CONFIGURATION_REQUIRED')")
        self.assertIn('Заявка не отправлена',page.locator('#form-status').inner_text())
        self.assertEqual(page.locator('#name').input_value(),'Мария')
        self.assertFalse(page.locator('#form-submit').is_disabled())
        page.close()


    def test_wizard_unicode_codepoint_limits(self):
        # PHP preg_match_all('/./us') counts code points, not JavaScript UTF-16 units.
        page=self.new_page(viewport={'width':375,'height':720})
        page.locator('#name').fill('😀'*60)
        self.assertEqual(page.locator('#name').input_value(),'😀'*60)
        page.locator('#email').fill('unicode@example.test')
        page.locator('#wizard-next').click()
        self.assertFalse(page.locator('#wizard-message').is_hidden())
        page.locator('#message').fill('🌿'*9)
        page.locator('#form-submit').click()
        self.assertTrue(page.locator('#message').get_attribute('aria-invalid')=='true')
        self.assertIn('от 10',page.locator('#message-error').inner_text())
        page.locator('#message').fill('🌿'*10)
        page.evaluate("""window.fetch=async()=>new Response(JSON.stringify({code:'CONFIGURATION_REQUIRED',
            message:'Получатель не настроен, отправка не выполнена.',errors:{}}), {status:503, headers:{'Content-Type':'application/json; charset=utf-8'}})""")
        page.locator('#form-submit').click()
        page.wait_for_function("document.querySelector('#form-status').textContent.includes('CONFIGURATION_REQUIRED')")
        self.assertFalse(page.locator('#form-submit').is_disabled())
        page.locator('#wizard-prev').click()
        page.locator('#name').fill('😀'*101)
        page.locator('#wizard-next').click()
        self.assertTrue(page.locator('#wizard-message').is_hidden())
        self.assertIn('от 2 до 100',page.locator('#name-error').inner_text())
        page.close()


    def protocol_page(self):
        page = self.new_page(viewport={'width':390,'height':760})
        page.locator('#name').fill('Мария')
        page.locator('#email').fill('maria@example.test')
        page.locator('#wizard-next').click()
        page.locator('#message').fill('Protocol-bound message for the local research lab.')
        return page

    def test_http_status_code_conflicts_fail_closed_even_if_body_claims_success(self):
        cases = [
            (202, 'CONFIGURATION_REQUIRED'), (503, 'QUEUED_UNCONFIRMED'),
            (200, 'QUEUED_UNCONFIRMED'), (503, 'VALIDATION_ERROR'),
            (422, 'CONFIGURATION_REQUIRED'), (201, 'QUEUED_UNCONFIRMED'),
            (503, 'SOMETHING_NEW')
        ]
        for status_code, code in cases:
            with self.subTest(status=status_code, code=code):
                page = self.protocol_page()
                try:
                    page.evaluate("""([status, code]) => {
                      let calls=0;
                      window.fetch=async()=>{
                        calls++;
                        return new Response(JSON.stringify({code, message:'Untrusted reply', errors:{}}),
                          {status, headers:{'Content-Type':'application/json'}});
                      };
                      window.__calls=()=>calls;
                    }""", [status_code, code])
                    page.locator('#form-submit').click()
                    page.wait_for_function("document.querySelector('#form-status').textContent.includes('RESPONSE_UNCONFIRMED')")
                    self.assertTrue(page.locator('#form-submit').is_disabled())
                    self.assertEqual(page.locator('#name').input_value(), 'Мария')
                    page.locator('#form-submit').evaluate('(button)=>button.click()')
                    self.assertEqual(page.evaluate('window.__calls()'), 1)
                finally:
                    page.close()

    def test_malformed_and_oversized_http_replies_never_reenable_form(self):
        cases = [
            ('text/html', '{"code":"CONFIGURATION_REQUIRED","message":"Hi","errors":{}}'),
            ('application/json; charset=latin1', '{"code":"CONFIGURATION_REQUIRED","message":"Hi","errors":{}}'),
            ('application/json', '<html>200 OK</html>'),
            ('application/json', '{"code":"CONFIGURATION_REQUIRED","message":"Hi"}'),
            ('application/json', '{"code":"CONFIGURATION_REQUIRED","message":"Hi","errors":[] }'),
            ('application/json', '{"code":"CONFIGURATION_REQUIRED","message":"Hi","errors":{"name":"bad"}}'),
            ('application/json', '{"code":"VALIDATION_ERROR","message":"Hi","errors":{"evil":"bad"}}'),
            ('application/json', '{"code":"QUEUED_UNCONFIRMED","message":"Hi","errors":{},"extra":1}'),
            ('application/json', '{"code":"CONFIGURATION_REQUIRED","message":"'+('x'*4500)+'","errors":{}}'),
            ('application/json', '')
        ]
        for content_type, payload in cases:
            with self.subTest(type=content_type, size=len(payload), excerpt=payload[:55]):
                page=self.protocol_page()
                try:
                    page.evaluate("""([type, payload]) => {
                      window.fetch=async()=>new Response(payload, {status:503,
                        headers:{'Content-Type':type}});
                    }""",[content_type, payload])
                    page.locator('#form-submit').click()
                    page.wait_for_function("document.querySelector('#form-status').textContent.includes('RESPONSE_UNCONFIRMED')")
                    self.assertTrue(page.locator('#form-submit').is_disabled())
                    self.assertFalse(page.locator('#form-status').inner_text().startswith('QUEUED_UNCONFIRMED'))
                finally:
                    page.close()

    def test_verified_http_error_allows_exactly_explicit_retry(self):
        page=self.protocol_page()
        try:
            page.evaluate("""() => {
              window.__calls=0;
              window.fetch=async()=>{
                window.__calls++;
                return new Response(JSON.stringify({code:'CONFIGURATION_REQUIRED',
                  message:'No recipient; no delivery.',errors:{}}),
                  {status:503,headers:{'Content-Type':'application/json; charset=UTF-8'}});
              };
            }""")
            page.locator('#form-submit').click()
            page.wait_for_function("document.querySelector('#form-status').textContent.includes('CONFIGURATION_REQUIRED')")
            self.assertFalse(page.locator('#form-submit').is_disabled())
            page.locator('#form-submit').click()
            page.wait_for_function("window.__calls===2")
            self.assertFalse(page.locator('#form-submit').is_disabled())
        finally:
            page.close()

    def test_oversized_declared_length_and_failed_utf8_decoding(self):
        for kind in ('length', 'utf8'):
            with self.subTest(kind=kind):
                page=self.protocol_page()
                try:
                    page.evaluate("""kind => {
                      window.fetch=async()=>{
                        if(kind==='length') return new Response(JSON.stringify({
                          code:'CONFIGURATION_REQUIRED',message:'Safe',errors:{}}),
                          {status:503,headers:{'Content-Type':'application/json',
                            'Content-Length':'999999'}});
                        return new Response(new Uint8Array([0xff,0xfe]),
                          {status:503,headers:{'Content-Type':'application/json'}});
                      };
                    }""",kind)
                    page.locator('#form-submit').click()
                    page.wait_for_function("document.querySelector('#form-status').textContent.includes('RESPONSE_UNCONFIRMED')")
                    self.assertTrue(page.locator('#form-submit').is_disabled())
                finally:
                    page.close()


    def test_keyboard_menu_tab_exit_and_desktop_resize_preserve_focus(self):
        page=self.new_page(viewport={'width':320,'height':650})
        try:
            page.locator('#nav-toggle').focus()
            page.keyboard.press('Enter')
            self.assertEqual(page.locator('#nav-toggle').get_attribute('aria-expanded'),'true')
            page.keyboard.press('Tab')
            self.assertTrue(page.locator('#site-nav').evaluate('(el)=>el.contains(document.activeElement)'))
            for _ in range(5): page.keyboard.press('Tab')
            page.wait_for_function("document.querySelector('#nav-toggle').getAttribute('aria-expanded')==='false'")
            self.assertFalse(page.locator('#site-nav').is_visible())
            page.locator('#nav-toggle').focus()
            page.keyboard.press('Enter')
            page.set_viewport_size({'width':900,'height':650})
            page.wait_for_function("document.activeElement.matches('#site-nav a')")
            self.assertEqual(page.locator('#nav-toggle').get_attribute('aria-expanded'),'false')
            self.assertTrue(page.locator('#site-nav').is_visible())
            page.set_viewport_size({'width':320,'height':650})
            self.assertFalse(page.locator('#site-nav').is_visible())
        finally: page.close()

    def test_rtl_keyboard_tabs_follow_visual_arrow_order(self):
        page=self.new_page(viewport={'width':375,'height':700})
        try:
            page.evaluate("document.documentElement.dir='rtl'")
            page.locator('#tab-php').focus()
            page.keyboard.press('ArrowLeft')
            self.assertEqual(page.locator('#tab-react').get_attribute('aria-selected'),'true')
            self.assertTrue(page.locator('#panel-php').is_hidden())
            page.keyboard.press('ArrowRight')
            self.assertEqual(page.locator('#tab-php').get_attribute('aria-selected'),'true')
            page.keyboard.press('End')
            self.assertEqual(page.locator('#tab-react').get_attribute('aria-selected'),'true')
            page.keyboard.press('Home')
            self.assertEqual(page.locator('#tab-php').get_attribute('aria-selected'),'true')
            self.assertEqual(page.locator('[role="tab"][tabindex="0"]').count(),1)
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        finally: page.close()

    def test_dialog_guard_against_reentry_and_missing_focus_destination(self):
        page=self.new_page(viewport={'width':320,'height':620},reduced_motion='reduce')
        try:
            page.locator('#open-dialog').click()
            page.evaluate("document.querySelector('#open-dialog').click()")
            self.assertTrue(page.locator('#info-dialog').evaluate('(el)=>el.open'))
            self.assertTrue(page.locator('#close-dialog').evaluate('(el)=>el===document.activeElement'))
            page.keyboard.press('Escape')
            page.wait_for_function("document.activeElement.id==='open-dialog'")
            page.locator('#open-dialog').click()
            page.locator('#dialog-faq').click()
            page.wait_for_function("document.activeElement.id==='faq'")
        finally: page.close()

    def test_error_summary_links_hidden_wizard_fields_and_clears_after_edit(self):
        page=self.new_page(viewport={'width':320,'height':690})
        try:
            page.locator('#wizard-next').click()
            self.assertTrue(page.locator('#form-errors').is_visible())
            self.assertIn('от 2 до 100', page.locator('#form-errors').inner_text())
            self.assertEqual(page.locator('#form-errors a[href="#name"]').count(),1)
            page.locator('#name').fill('Мария')
            self.assertEqual(page.locator('#form-errors a[href="#name"]').count(),0)
            page.locator('#email').fill('maria@example.test')
            page.locator('#wizard-next').click()
            page.locator('#message').fill('A sufficiently long message to submit.')
            page.evaluate("""() => {window.fetch=async()=>new Response(JSON.stringify({
              code:'VALIDATION_ERROR', message:'Проверьте поля.',
              errors:{name:'Серверная ошибка имени',message:'Серверная ошибка сообщения'}}),
              {status:422,headers:{'Content-Type':'application/json'}});}""")
            page.locator('#form-submit').click()
            page.locator('#form-errors a[href="#name"]').wait_for()
            # The summary link must switch back to identity step, not focus a hidden input.
            page.locator('#form-errors a[href="#message"]').click()
            self.assertFalse(page.locator('#wizard-message').is_hidden())
            self.assertTrue(page.locator('#message').evaluate('(el)=>el===document.activeElement'))
            page.locator('#form-errors a[href="#name"]').click()
            self.assertFalse(page.locator('#wizard-identity').is_hidden())
            self.assertTrue(page.locator('#name').evaluate('(el)=>el===document.activeElement'))
            page.locator('#name').fill('Мария Исправлено')
            self.assertEqual(page.locator('#form-errors a[href="#name"]').count(),0)
            page.locator('#wizard-next').click()
            page.locator('#message').fill('Fixed validation error and sufficiently long.')
            self.assertTrue(page.locator('#form-errors').is_hidden())
        finally: page.close()

    def test_font_enlargement_at_mobile_width_wraps_tabs_without_overflow(self):
        page=self.new_page(viewport={'width':320,'height':760},reduced_motion='reduce')
        try:
            page.evaluate("document.documentElement.style.fontSize='32px'")
            self.assertTrue(page.locator('#tab-php').is_visible())
            self.assertTrue(page.locator('#tab-react').is_visible())
            self.assertTrue(page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            page.locator('#tab-react').click()
            self.assertTrue(page.locator('#panel-php').is_hidden())
            self.assertTrue(page.locator('#panel-react').is_visible())
        finally: page.close()

if __name__=='__main__': unittest.main()
