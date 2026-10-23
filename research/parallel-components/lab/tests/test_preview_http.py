"""PHP HTTP smoke: dynamic CSP style hash, static asset and read-only preview response."""
import base64
import hashlib
import re
import socket
import subprocess
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

PUBLIC = Path(__file__).resolve().parents[1] / 'public'

class PreviewHttp(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0))
            port=sock.getsockname()[1]
        cls.url=f'http://127.0.0.1:{port}'
        cls.server=subprocess.Popen(['php','-S',f'127.0.0.1:{port}','-t',str(PUBLIC)],
            stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(40):
            try:
                urlopen(cls.url,timeout=.2).read()
                break
            except Exception:time.sleep(.1)
        else:raise RuntimeError('PHP HTTP unavailable')
    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)
    def test_csp_exact_hash_and_image(self):
        with urlopen(self.url+'/preview.php',timeout=4) as response:
            self.assertEqual(response.status,200)
            self.assertIn('text/html',response.headers['Content-Type'])
            self.assertEqual(response.headers['X-Frame-Options'],'DENY')
            self.assertEqual(response.headers['Cache-Control'],'no-store')
            csp=response.headers['Content-Security-Policy']
            content=response.read().decode()
        self.assertIn("default-src 'none'",csp)
        self.assertIn("img-src 'self'",csp)
        self.assertIn("frame-ancestors 'none'",csp)
        self.assertNotIn('unsafe-inline',csp)
        match=re.search(r'<style>([^<]*)</style>',content)
        self.assertIsNotNone(match)
        token=base64.b64encode(hashlib.sha256(match.group(1).encode()).digest()).decode()
        self.assertIn("'sha256-"+token+"'",csp)
        self.assertIn('data-revision="8"',content)
        self.assertNotIn('<a href="/contact"',content)
        self.assertIn('data-preview-href="/contact"',content)
        self.assertIn('Адрес ссылки:',content)
        self.assertNotIn('<script',content)
        self.assertIn('width="960" height="540"',content)
        with urlopen(self.url+'/assets/media/workshop-960.webp',timeout=4) as image:
            self.assertEqual(image.status,200)
            self.assertGreater(len(image.read()),1000)
    def test_untrusted_query_parameters_and_methods_do_not_render(self):
        for suffix in ('?blockId=hero-primary', '?action.href=javascript%3Aalert(1)',
                       '?revision=7&changes%5B0%5D=malicious'):
            with self.subTest(suffix=suffix):
                with self.assertRaises(HTTPError) as fail:
                    urlopen(self.url+'/preview.php'+suffix,timeout=4)
                self.assertEqual(fail.exception.code,400)
                self.assertEqual(fail.exception.headers['Cache-Control'],'no-store')
                self.assertEqual(fail.exception.headers['X-Frame-Options'],'DENY')
                self.assertIn("default-src 'none'",fail.exception.headers['Content-Security-Policy'])
                self.assertEqual(fail.exception.read(),b'PREVIEW_PARAMETERS_NOT_ACCEPTED')

    def test_post_does_not_mutate_or_render(self):
        req=Request(self.url+'/preview.php',data=b'x=1',method='POST')
        with self.assertRaises(HTTPError) as failure:urlopen(req,timeout=4)
        self.assertEqual(failure.exception.code,405)
        self.assertEqual(failure.exception.headers['Allow'],'GET')

if __name__=='__main__':unittest.main()
