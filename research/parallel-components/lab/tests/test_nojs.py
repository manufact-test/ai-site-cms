"""True HTTP submission: native no-JS HTML fallback runs the same PHP POST backend."""
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
from urllib.request import Request, build_opener, HTTPCookieProcessor, urlopen

PUBLIC = Path(__file__).resolve().parents[1] / 'public'

class NativeFormHttp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port=sock.getsockname()[1]
        cls.origin=f'http://127.0.0.1:{port}'
        env=os.environ.copy()
        env['LAB_PUBLIC_ORIGIN']=cls.origin
        env.pop('LAB_FORM_RECIPIENT_EMAIL',None)
        env.pop('LAB_FORM_SENDER_EMAIL',None)
        cls.server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(PUBLIC)],
            env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                urlopen(cls.origin,timeout=.2).read()
                break
            except Exception: time.sleep(.1)
        else:raise RuntimeError('no PHP HTTP server')

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)

    def session(self):
        opener=build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        page=opener.open(self.origin).read().decode()
        self.assertIn('action="/submit-html.php"',page)
        token=re.search(r'name="csrf" value="([a-f0-9]{64})"',page)
        self.assertIsNotNone(token)
        return opener,token.group(1)

    def request(self,opener,fields,accept='text/html',raw=None):
        data=urlencode(fields).encode() if raw is None else raw.encode()
        req=Request(self.origin+'/submit-html.php',data=data,method='POST',headers={
            'Content-Type':'application/x-www-form-urlencoded','Origin':self.origin,'Accept':accept})
        try:response=opener.open(req,timeout=5)
        except HTTPError as ex:response=ex
        with response:
            return response.status,response.headers,response.read().decode()

    def test_nojs_validation_and_retry_then_configuration(self):
        opener,token=self.session()
        fields={'csrf':token,'company_site':'','name':'<b>Alice</b>','email':'alice@example.test',
            'phone':'','phone_region':'DE','message':'short'}
        time.sleep(2.05)
        status,headers,page=self.request(opener,fields)
        self.assertEqual(status,422)
        self.assertIn('text/html',headers['Content-Type'])
        self.assertIn("form-action 'self'",headers['Content-Security-Policy'])
        self.assertIn('no-store',headers['Cache-Control'])
        self.assertIn('VALIDATION_ERROR',page)
        self.assertIn('&lt;b&gt;Alice&lt;/b&gt;',page)
        self.assertNotIn('<b>Alice</b>',page)
        self.assertIn('name="csrf" value="'+token+'"',page)
        self.assertIn('id="field-message"',page)
        self.assertIn('aria-invalid="true"',page)
        self.assertIn('autofocus',page)
        self.assertIn('value="DE" selected',page)
        fields['message']='A new sufficiently long message, tested with real HTTP.'
        status,headers,page=self.request(opener,fields)
        self.assertEqual(status,503)
        self.assertIn('CONFIGURATION_REQUIRED',page)
        self.assertNotIn('<form ',page)
        self.assertIn('не отправлена',page)

    def test_malformed_and_csrf_prohibit_retry(self):
        opener,token=self.session()
        fields={'csrf':token,'company_site':'','name':'Alex','email':'alex@example.test',
            'phone':'','message':'Long enough value for this request'}
        status,_,page=self.request(opener,fields,raw=urlencode(fields)+'&name=evil')
        self.assertEqual(status,422)
        self.assertIn('MALFORMED_FORM',page)
        self.assertNotIn('<form ',page)
        fields['csrf']='bad'
        status,_,page=self.request(opener,fields)
        self.assertEqual(status,403)
        self.assertIn('CSRF_INVALID',page)
        self.assertNotIn('<form ',page)

    def test_json_transport_stays_unmodified(self):
        opener,token=self.session()
        fields={'csrf':token,'company_site':'','name':'Alex','email':'alex@example.test',
            'phone':'','message':'Long enough value for this request'}
        time.sleep(2.05)
        status,headers,body=self.request(opener,fields,accept='application/json')
        self.assertEqual(status,503)
        self.assertIn('application/json',headers['Content-Type'])
        self.assertEqual(json.loads(body)['code'],'CONFIGURATION_REQUIRED')
        self.assertEqual(json.loads(body)['errors'], {})
        self.assertIn('"errors":{}', body)


    def test_invalid_phone_region_focuses_native_select(self):
        opener,token=self.session()
        fields={'csrf':token,'company_site':'','name':'Alice','email':'alice@example.test',
            'phone':'','phone_region':'AA','message':'Valid message for invalid-country test.'}
        time.sleep(2.05)
        status,_,page=self.request(opener,fields)
        self.assertEqual(status,422)
        self.assertIn('VALIDATION_ERROR',page)
        self.assertIn('href="#field-phone_region"',page)
        self.assertIn('name="phone_region" aria-invalid="true"',page)
        self.assertIn('error-phone_region',page)
        self.assertNotIn('value="AA" selected',page)
        self.assertIn('autofocus',page)

    def test_accept_quality_prefers_json_when_html_denied(self):
        opener,token=self.session()
        fields={'csrf':token,'company_site':'','name':'Alex','email':'alex@example.test',
            'phone':'','phone_region':'ZZ','message':'A full message for accept negotiation.'}
        status,headers,body=self.request(opener,fields,accept='application/json,text/html;q=0')
        self.assertEqual(status,422)  # too-fast pre-delivery gate
        self.assertIn('application/json',headers['Content-Type'])
        self.assertIsInstance(json.loads(body),dict)
        status,headers,body=self.request(opener,fields,accept='text/html;q=0.9,application/json;q=0.8')
        self.assertIn('text/html',headers['Content-Type'])
        self.assertIn('<html',body)

    def test_native_html_origin_and_payload_security(self):
        opener,token=self.session()
        fields={'csrf':token,'company_site':'','name':'Alice','email':'alice@example.test',
            'phone':'','phone_region':'ZZ','message':'This field has a valid message.'}
        req=Request(self.origin+'/submit-html.php',data=urlencode(fields).encode(),method='POST',headers={
            'Content-Type':'application/x-www-form-urlencoded','Accept':'text/html'})
        with self.assertRaises(HTTPError) as raised:opener.open(req,timeout=4)
        self.assertEqual(raised.exception.code,403)
        self.assertIn('ORIGIN_INVALID',raised.exception.read().decode())
        status,headers,page=self.request(opener,fields,raw=urlencode(fields)+'&name=duplicate')
        self.assertEqual(status,422)
        self.assertIn('MALFORMED_FORM',page)
        self.assertNotIn('<form ',page)
        status,_,page=self.request(opener,fields,raw=urlencode(fields)+'&message='+'x'*9000)
        self.assertEqual(status,415)
        self.assertIn('UNSUPPORTED_REQUEST',page)
        self.assertNotIn('<form ',page)

if __name__=='__main__':unittest.main()
