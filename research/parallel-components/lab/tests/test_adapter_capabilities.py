"""Safety lint of proposed phone/media capability inventory, not editor integration."""
import json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
class AdapterProperties(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.blocks=json.loads((ROOT/'fixtures/phone-media-capabilities.research.json').read_text())['existingBlocks']
    def test_closed_editable_surface(self):
        self.assertEqual([b['id'] for b in self.blocks],['contact-form-phone','hero-image-primary'])
        for block in self.blocks:
            self.assertFalse(set(block['editable']) & set(block['immutableRuntime']))
            self.assertEqual(len(set(block['editable'])),len(block['editable']))
    def test_no_unsafe_handler_or_src_edit(self):
        for block in self.blocks:
            fields=set(block['editable'])
            self.assertFalse(fields & {'delivery.endpoint','delivery.recipient','media.src','media.srcset','security.csrf'})
            self.assertFalse(any('javascript' in x.lower() or 'css' in x.lower() for x in fields))
    def test_edit_fields_typed(self):
        for block in self.blocks:
            for value in block['editable'].values():
                self.assertIn(value['type'],('string','boolean'))
                if 'enum' in value:self.assertTrue(value['enum'])

# Imported into the workflow's existing fixed-list entrypoint without changing shared Actions.
from test_phone_real import RealPhoneMetadata
