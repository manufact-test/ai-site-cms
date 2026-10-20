"""Real asset decode/dimensions and media byte-budget smoke; Pillow test-only."""
from PIL import Image
import unittest
from pathlib import Path
PUBLIC=Path(__file__).resolve().parents[1]/'public'/'assets'/'media'
class MediaAssets(unittest.TestCase):
    def test_real_avif_webp_files(self):
        for fmt in ('avif','webp'):
            for width in (320,640,960):
                with self.subTest(fmt=fmt,width=width):
                    p=PUBLIC/f'workshop-{width}.{fmt}'
                    self.assertTrue(p.is_file())
                    self.assertLess(p.stat().st_size, 30000)
                    with Image.open(p) as image:
                        image.load()
                        self.assertEqual(image.size,(width,width*540//960))
                        self.assertEqual(image.format.lower(),fmt)

