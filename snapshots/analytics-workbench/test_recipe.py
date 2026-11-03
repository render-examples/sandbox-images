"""Workload regressions: known data answers and detection of broken restore state."""

import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path

import recipe


class AnalyticsRecipeTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "workspace"
        self.output = Path(self.temporary.name) / "output"
        with contextlib.redirect_stdout(io.StringIO()):
            recipe.prepare(self.root)

    def test_three_formats_clean_join_and_render_known_answers(self):
        with contextlib.redirect_stdout(io.StringIO()):
            recipe.analyze(self.root, self.output)
        summary = json.loads((self.output / "summary.json").read_text())
        self.assertEqual(summary["revenueCents"], 21200)
        self.assertEqual(summary["revenueByRegionCents"], {"east": 14100, "west": 7100})
        self.assertEqual(summary["duplicatesRemoved"], 1)
        self.assertEqual(summary["missingQuantitiesFilled"], 1)
        self.assertGreater((self.output / "revenue.png").stat().st_size, 1000)

    def test_changed_source_after_capture_is_rejected(self):
        orders = self.root / "input" / "orders.csv"
        orders.write_text(orders.read_text().replace("widget", "gadget", 1))
        with self.assertRaisesRegex(ValueError, "Input changed after preparation"):
            recipe.analyze(self.root, self.output)

    def test_incorrect_output_total_is_rejected(self):
        with contextlib.redirect_stdout(io.StringIO()):
            recipe.analyze(self.root, self.output)
        path = self.output / "summary.json"
        summary = json.loads(path.read_text())
        summary["revenueCents"] = 0
        path.write_text(json.dumps(summary))
        with self.assertRaisesRegex(ValueError, "Summary differs"):
            recipe.verify(self.root, self.output)


if __name__ == "__main__":
    unittest.main()
