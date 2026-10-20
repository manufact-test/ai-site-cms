"""Actual Composer-numbering-metadata verification, NEVER a protocol-double PASS.

Runs only against a disposable out-of-repository Composer installation. GitHub's
PHP 8.3 Components runner includes Composer; if the required PHP extension is
absent this is explicitly SKIPPED, never marked "real integration passed".
"""
import shutil
import subprocess
import unittest
from pathlib import Path

RUNNER = Path(__file__).with_name("run-phone-real.sh")

class RealPhoneMetadata(unittest.TestCase):
    def test_actual_composer_lite_metadata(self):
        if shutil.which("composer") is None:
            self.skipTest("REAL_PHONE_NOT_EXECUTED: Composer unavailable (not a PASS)")
        if shutil.which("php") is None:
            self.skipTest("REAL_PHONE_NOT_EXECUTED: PHP unavailable (not a PASS)")
        mb = subprocess.run(["php", "-r",
            'exit(extension_loaded("mbstring") ? 0 : 2);'],
            capture_output=True, text=True, timeout=10)
        if mb.returncode != 0:
            self.skipTest("REAL_PHONE_NOT_EXECUTED: PHP mbstring unavailable (not a PASS)")
        result = subprocess.run(["bash", str(RUNNER)], capture_output=True,
            text=True, timeout=120, cwd=str(RUNNER.parent))
        detail = (result.stdout + "\n" + result.stderr)[-3500:]
        self.assertEqual(result.returncode, 0, "Genuine Composer integration failed:\n" + detail)
        self.assertIn("PHONE_REAL_INTEGRATION_PASSED: 13 genuine metadata assertions", detail)
        self.assertIn("lite 9.0.41", detail)

if __name__ == "__main__":
    unittest.main()
