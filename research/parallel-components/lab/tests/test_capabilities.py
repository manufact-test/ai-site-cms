"""Research-only static invariants for a hand-curated existing-block registry."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]/'fixtures'

class CapabilityFixtures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.registry=json.loads((ROOT/'block-capabilities.research.json').read_text(encoding='utf-8'))

    def test_declared_examples_have_distinct_fields(self):
        blocks=self.registry['blocks']
        self.assertEqual(set(blocks),{'hero-primary','faq-delivery','contact-form'})
        self.assertNotIn('action.href',blocks['contact-form']['editable'])
        self.assertNotIn('media.assetId',blocks['faq-delivery']['editable'])

    def test_no_raw_execution_or_undeclared_rules(self):
        valid_types={'text','enum','boolean','asset','same-origin-link'}
        for block in self.registry['blocks'].values():
            for path,rule in block['editable'].items():
                self.assertEqual(path.count('.'),1)
                self.assertNotIn('css',path.lower())
                self.assertNotIn('js',path.lower())
                self.assertIn(rule['type'],valid_types)
                if rule['type']=='enum':
                    self.assertTrue(rule['values'])
                if rule['type']=='text':
                    self.assertLessEqual(rule['min'],rule['max'])

if __name__=='__main__': unittest.main()
