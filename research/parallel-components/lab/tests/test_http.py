"""Real PHP built-in HTTP boundary integration, no browser or external service."""
import http.cookiejar
import json
import os
import re
import socket
import subprocess
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import build_opener, HTTPCookieProcessor, Request
# Shared CI still names this legacy suite explicitly; imported cases add real HTML and CSP endpoint coverage.
from test_nojs import NativeFormHttp
from test_preview_http import PreviewHttp

PUBLIC = Path(__file__).resolve().parents[1] / 'public'
class HttpBoundary(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
        cls.url=f'http://127.0.0.1:{port}'
        env=os.environ.copy()
        env.pop('LAB_FORM_RECIPIENT_EMAIL',None)
        env.pop('LAB_FORM_SENDER_EMAIL',None)
        env['LAB_PUBLIC_ORIGIN']=cls.url
        cls.server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(PUBLIC)],
                                    stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,env=env)
        for _ in range(40):
            try:
                import urllib.request
                urllib.request.urlopen(cls.url,timeout=.2);break
            except Exception:time.sleep(.1)
        else:raise RuntimeError('PHP server failed to start')

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate();cls.server.wait(timeout=5)

    def submit(self, opener, payload, headers=None):
        request=Request(self.url+'/submit.php',data=urlencode(payload).encode(),method='POST',
                        headers={'Content-Type':'application/x-www-form-urlencoded', 'Origin': self.url,**(headers or {})})
        try: response=opener.open(request,timeout=3)
        except HTTPError as err:response=err
        with response:
            return response.status,json.loads(response.read().decode())

    def setup_session(self):
        opener=build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        html=opener.open(self.url).read().decode()
        token=re.search(r'name="csrf" value="([0-9a-f]{64})"',html)
        self.assertIsNotNone(token)
        return opener,token.group(1)

    def test_ssr_native_form_remains_valid_without_script(self):
        opener, token = self.setup_session()
        with opener.open(self.url, timeout=4) as response:
            html=response.read().decode('utf-8')
            self.assertIn('no-store', response.headers.get('Cache-Control',''))
        self.assertIn('<form id="contact" action="/submit-html.php" method="post">',html)
        self.assertIn('name="csrf"',html)
        self.assertIn('id="nav-toggle"',html)
        self.assertIn('aria-controls="site-nav" hidden',html)
        self.assertIn('aria-label="Среда сайта" hidden',html)
        self.assertIn('id="dialog-nojs"',html)
        self.assertNotIn('id="panel-react" role="tabpanel" aria-labelledby="tab-react" tabindex="0" hidden',html)

    def test_post_and_configuration_gate(self):
        opener,token=self.setup_session()
        payload={'csrf':token,'company_site':'','name':'Alex','email':'alex@example.test',
                 'phone':'','message':'Testing a real PHP handler endpoint.'}
        time.sleep(2.05)
        code,data=self.submit(opener,payload)
        self.assertEqual((code,data['code']),(503,'CONFIGURATION_REQUIRED'))
        self.assertIn('не отправлена',data['message'])

    def test_raw_parameter_pollution_is_refused(self):
        opener,token=self.setup_session()
        import urllib.parse
        data={'csrf':token,'company_site':'','name':'Alex','email':'alex@example.test',
              'phone':'','message':'Testing all server-side fields and protections'}
        raw=urllib.parse.urlencode(data)
        for attack in [raw+'&name=Administrator',raw+'&unknown=1',raw+'&name%5B0%5D=foo',
                       raw.replace('email=alex%40example.test','email=%FF')]:
            req=Request(self.url+'/submit.php', data=attack.encode(), method='POST',headers={
                'Origin':self.url,'Content-Type':'application/x-www-form-urlencoded'})
            with self.assertRaises(HTTPError) as raised:opener.open(req)
            self.assertEqual(raised.exception.code,422)
            self.assertEqual(json.loads(raised.exception.read())['code'],'MALFORMED_FORM')
        # Client step flag is not trusted as proof of completing steps.
        self.assertEqual(self.submit(opener,{**data,'wizard_complete':'true'})[1]['code'],'MALFORMED_FORM')
        time.sleep(2.05)
        self.assertEqual(self.submit(opener,{**data,'message':'short'})[1]['code'],'VALIDATION_ERROR')

    def test_security_boundary(self):
        opener,token=self.setup_session()
        base={'csrf':'bad','company_site':'','name':'Alex','email':'alex@example.test',
              'phone':'','message':'Testing an invalid token.'}
        self.assertEqual(self.submit(opener,base)[1]['code'],'CSRF_INVALID')
        base['csrf']=token
        self.assertEqual(self.submit(opener,base,{'Origin':'https://another.example'})[1]['code'],'ORIGIN_INVALID')
        self.assertEqual(self.submit(opener,base,{'Origin':'null'})[1]['code'],'ORIGIN_INVALID')
        self.assertEqual(self.submit(opener,base,{'Origin':self.url, 'Host':'evil.test'})[1]['code'],'HOST_INVALID')
        self.assertEqual(self.submit(opener,base,{'Sec-Fetch-Site':'cross-site'})[1]['code'],'ORIGIN_INVALID')
        self.assertEqual(self.submit(opener,base,{'Origin':''})[1]['code'],'ORIGIN_INVALID')
        time.sleep(2.05)
        self.assertEqual(self.submit(opener,base,{'Origin':self.url, 'X-Forwarded-Host':'evil.test'})[1]['code'],'CONFIGURATION_REQUIRED')
        req=Request(self.url+'/submit.php',method='GET')
        try:opener.open(req)
        except HTTPError as error:self.assertEqual(error.code,405)
        else:self.fail('GET accepted by POST handler')

if __name__=='__main__':unittest.main()
