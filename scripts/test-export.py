"""Check publication gates, rather than merely snapshotting generated JSON."""
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("exporter", ROOT / "scripts/export-catalog.py")
exporter = importlib.util.module_from_spec(spec)
spec.loader.exec_module(exporter)


class PublicationGateTests(unittest.TestCase):
    def setUp(self):
        self.asset = json.loads((ROOT / "images/python-analysis/manifest.json").read_text())
        # Exercise a draft fixture even after the real manifest is promoted.
        # Otherwise a legitimate metadata-only release commit would fail CI.
        self.asset["status"] = "draft"
        self.asset["source"]["revision"] = None
        self.asset["image"]["digest"] = None
        self.asset["verification"] = {"status": "unverified"}

    def test_draft_has_no_invented_evidence(self):
        exporter.validate(self.asset)
        self.assertIsNone(self.asset["image"]["digest"])

    def test_changing_status_cannot_publish_unverified_asset(self):
        self.asset["status"] = "verified"
        with self.assertRaises(ValueError):
            exporter.validate(self.asset)

    def test_local_image_digest_is_not_render_verification(self):
        self.asset["status"] = "verified"
        self.asset["source"]["revision"] = "a" * 40
        self.asset["image"]["digest"] = "sha256:" + "b" * 64
        with self.assertRaises(ValueError):
            exporter.validate(self.asset)

    def test_group_scope_is_required(self):
        self.asset["kind"] = "snapshot-recipe"
        self.asset["recipe"] = {"kind": "filesystem", "imageSlug": "python-analysis", "groupScoped": False}
        with self.assertRaises(ValueError):
            exporter.validate(self.asset)

    def test_metadata_can_pin_an_earlier_verified_build_commit(self):
        self.asset["status"] = "verified"
        self.asset["source"]["revision"] = "a" * 40
        self.asset["image"]["digest"] = "sha256:" + "b" * 64
        self.asset["verification"] = {
            "status": "passed", "verifiedAt": "2026-11-03T12:00:00Z",
            "evidenceUrl": "https://example.com/test-evidence",
            "clientVersion": "test-client", "computePlan": "test-plan",
        }
        exporter.validate(self.asset)


if __name__ == "__main__":
    unittest.main()
