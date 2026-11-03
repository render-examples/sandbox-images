import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("release", Path(__file__).with_name("check-release-absent.py"))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class RegistryReleaseGateTests(unittest.TestCase):
    def test_only_explicit_missing_manifest_allows_publish(self):
        self.assertTrue(release.is_missing_manifest(404, b'{"errors":[{"code":"MANIFEST_UNKNOWN"}]}'))
        self.assertTrue(release.is_missing_manifest(404, b'{"errors":[{"code":"NAME_UNKNOWN"}]}'))

    def test_existing_manifest_never_allows_publish(self):
        self.assertFalse(release.is_missing_manifest(200, b'{"schemaVersion":2}'))

    def test_auth_and_transient_failures_block_publish(self):
        for status in (401, 403, 429, 500, 503):
            self.assertFalse(release.is_missing_manifest(status, b'{"errors":[{"code":"MANIFEST_UNKNOWN"}]}'))

    def test_generic_not_found_text_is_not_registry_absence(self):
        self.assertFalse(release.is_missing_manifest(404, b'<html>not found</html>'))
        self.assertFalse(release.is_missing_manifest(404, b'{"errors":[{"code":"DENIED"}]}'))
        self.assertFalse(release.is_missing_manifest(404, b'{"errors":[]}'))


if __name__ == "__main__":
    unittest.main()
