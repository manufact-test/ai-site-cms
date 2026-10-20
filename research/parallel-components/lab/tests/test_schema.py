"""Standalone draft-2020-12 schema fixture evaluation; python -m pip install jsonschema>=4 for dev."""
import copy
import json
import unittest
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2] / "fixtures"

def load(name):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))

class CandidateContractTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.schema = load("editor-properties.candidate.schema.json")
        cls.good = load("editor-properties.valid.json")
        cls.validator = Draft202012Validator(cls.schema)
        Draft202012Validator.check_schema(cls.schema)

    def test_valid_fixture(self):
        self.assertEqual(list(self.validator.iter_errors(self.good)), [])

    def test_invalid_fixture(self):
        self.assertGreaterEqual(len(list(self.validator.iter_errors(load("editor-properties.invalid.json")))), 4)

    def test_closed_top_level_and_nested(self):
        for path in [[], ["content"], ["style"], ["layout"], ["media"], ["action"], ["responsive"], ["behavior"]]:
            obj = self.schema
            for name in path:
                obj = obj["properties"][name]
            self.assertFalse(obj["additionalProperties"], path)

    def test_reject_unsafe_and_unrelated_properties(self):
        for key, value in [("style", {"rawCss": "display:none"}), ("action", {"javascript": "alert(1)"}),
                           ("behavior", {"closeOnEscape": False}), ("responsive", {"desktopColumns": 999})]:
            bad = copy.deepcopy(self.good)
            bad[key].update(value)
            self.assertTrue(list(self.validator.iter_errors(bad)), (key, value))

    def test_note_url_semantic_validation_is_separate(self):
        # JSON Schema's generic string/format cannot enforce same-origin safe href policy.
        # The contract proposal REQUIRES URL parsing/allowlisting in trusted server adapters.
        bad = copy.deepcopy(self.good)
        bad["action"]["href"] = "javascript:alert(1)"
        self.assertEqual(list(self.validator.iter_errors(bad)), [], "A documented gap, not a safe link")

if __name__ == "__main__":
    unittest.main()
