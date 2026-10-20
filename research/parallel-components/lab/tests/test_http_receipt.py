"""Real PHP loopback HTTP duplicate claims (no mail transport, no fake send success)."""
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
from urllib.request import Request, build_opener, HTTPCookieProcessor, urlopen

PUBLIC=Path(__file__).resolve().parents[1]/'public'
class ReceiptHttp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
        cls.origin=f'http://127.0.0.1:{port}'
        cls.private=tempfile.TemporaryDirectory(prefix='cms-receipts-test-')
        os.chmod(cls.private.name,0o700)
        env=dict(os.environ)
        env.update(LAB_PUBLIC_ORIGIN=cls.origin, LAB_FORM_RECIPIENT_EMAIL='target@example.test',
                   LAB_ABUSE_DIR=cls.private.name,LAB_ABUSE_SECRET='local-only-'+('a'*48))
        env.pop('LAB_FORM_SENDER_EMAIL',None)
        cls.server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(PUBLIC)],env=env,
                                    stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(50):
            try:urlopen(cls.origin,timeout=.5).read();break
            except Exception:time.sleep(.1)
        else:raise RuntimeError('PHP server failed')
    @classmethod
    def tearDownClass(cls):
        cls.server.terminate();cls.server.wait(timeout=5);cls.private.cleanup()

    def session(self):
        opener=build_opener(HTTPCookieProcessor(http.cookiejar.CookieJar()))
        html=opener.open(self.origin).read().decode()
        token=re.search(r'name="csrf" value="([a-f0-9]{64})"',html).group(1)
        return opener,token
    def post(self, opener, data):
        req=Request(self.origin+'/submit.php',data=urlencode(data).encode(),method='POST',headers={
            'Origin':self.origin,'Content-Type':'application/x-www-form-urlencoded'})
        try:resp=opener.open(req,timeout=5)
        except HTTPError as err:resp=err
        with resp:return resp.status,json.loads(resp.read())

    def test_duplicate_across_new_browser_session_fails_closed(self):
        first,token=self.session()
        data=dict(name='Alex',email='a@example.test',phone='',phone_region='ZZ',
                  message='A request for duplicated retry protection',company_site='',csrf=token)
        second,token2=self.session()
        time.sleep(2.1)  # server-side human time trap, both tokens mature
        status,body=self.post(first,data)
        self.assertEqual((status,body['code']),(502,'DELIVERY_FAILED'))
        data['csrf']=token2
        status,body=self.post(second,data)
        self.assertEqual((status,body['code']),(409,'DUPLICATE_REQUEST'))
        self.assertNotIn('delivered',json.dumps(body).lower())
        status,body=self.post(second,data)
        self.assertEqual((status,body['code']),(403,'CSRF_INVALID'))
        self.assertGreaterEqual(len(list(Path(self.private.name).glob('*.claim'))),1)
        third,token3=self.session()
        data['csrf']=token3
        data['message']='Another independent request with different message text'
        time.sleep(2.1)
        status,body=self.post(third,data)
        self.assertEqual((status,body['code']),(502,'DELIVERY_FAILED'))
        self.assertFalse(any('a@example.test' in p.name for p in Path(self.private.name).iterdir()))

if __name__=='__main__':unittest.main()
