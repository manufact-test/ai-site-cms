"""Real localhost HTTP gates with configured recipient; no mail transport configured."""
import http.cookiejar
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import tempfile
import time
import unittest
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPCookieProcessor

PUBLIC=Path(__file__).resolve().parents[1]/'public'
class ConfiguredHttp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
        cls.origin=f'http://127.0.0.1:{port}'
        cls.private=tempfile.TemporaryDirectory(prefix='cms-rate-lab-')
        os.chmod(cls.private.name,0o700)
        env=dict(os.environ)
        env['LAB_PUBLIC_ORIGIN']=cls.origin
        env['LAB_FORM_RECIPIENT_EMAIL']='target@example.test'
        env.pop('LAB_FORM_SENDER_EMAIL',None)
        env['LAB_ABUSE_DIR']=cls.private.name
        env['LAB_ABUSE_SECRET']='test-only-'+('x'*45)
        cls.server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(PUBLIC)],
                                    env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:
                from urllib.request import urlopen
                urlopen(cls.origin,timeout=.3).read();break
            except Exception:time.sleep(.1)
        else:raise RuntimeError('PHP not running')

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate();cls.server.wait(timeout=5);cls.private.cleanup()

    def request(self,opener,data):
        req=Request(self.origin+'/submit.php',data=urlencode(data).encode(),method='POST',headers={
            'Content-Type':'application/x-www-form-urlencoded','Origin':self.origin})
        try:r=opener.open(req,timeout=5)
        except HTTPError as err:r=err
        with r:return r.status,json.loads(r.read().decode())

    def token(self):
        opener=build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        html=opener.open(self.origin).read().decode()
        token=re.search(r'name="csrf" value="([a-f0-9]{64})"',html).group(1)
        return opener,token

    def test_without_shared_rate_gate_no_delivery_attempt(self):
        sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
        origin=f'http://127.0.0.1:{port}'
        env=dict(os.environ)
        env.update(LAB_PUBLIC_ORIGIN=origin, LAB_FORM_RECIPIENT_EMAIL='target@example.test')
        env.pop('LAB_ABUSE_DIR',None)
        env.pop('LAB_ABUSE_SECRET',None)
        child=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(PUBLIC)],
            env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            from urllib.request import urlopen
            for _ in range(40):
                try:
                    urlopen(origin,timeout=.3).read();break
                except Exception:time.sleep(.1)
            opener=build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
            html=opener.open(origin).read().decode()
            token=re.search(r'name="csrf" value="([a-f0-9]{64})"',html).group(1)
            request=Request(origin+'/submit.php',data=urlencode(dict(csrf=token,name='Alice',email='alice@example.test',
                phone='',company_site='',message='Long enough message text')).encode(),method='POST',headers={
                'Content-Type':'application/x-www-form-urlencoded','Origin':origin})
            with self.assertRaises(HTTPError) as raised:opener.open(request)
            self.assertEqual(raised.exception.code,503)
            self.assertEqual(json.loads(raised.exception.read().decode())['code'],'ANTI_SPAM_CONFIGURATION_REQUIRED')
        finally:
            child.terminate();child.wait(timeout=5)

    def test_phone_and_mail_fail_closed_with_real_http(self):
        opener,token=self.token()
        payload={'csrf':token,'company_site':'','name':'Alice','email':'alice@example.test',
                 'phone':'+4915123456789','phone_region':'DE',
                 'message':'Long enough text for server validation.'}
        time.sleep(2.05)
        code,body=self.request(opener,payload)
        self.assertEqual((code,body['code']),(503,'PHONE_VALIDATOR_REQUIRED'))
        payload['phone']=''
        code,body=self.request(opener,payload)
        self.assertEqual((code,body['code']),(502,'DELIVERY_FAILED'))
        code,body=self.request(opener,payload)
        self.assertEqual((code,body['code']),(403,'CSRF_INVALID'))
        # Independent cookie jar cannot reset the shared IP's throttle allowance.
        for _ in range(3):
            new_opener,new_token=self.token()
            payload['csrf']='invalid'
            code,body=self.request(new_opener,payload)
        self.assertEqual((code,body['code']),(429,'RATE_LIMITED'))
        self.assertFalse(any(p.name.endswith('.log') for p in Path(self.private.name).iterdir()))
