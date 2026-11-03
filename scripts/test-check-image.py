"""Keep local recipe inputs aligned with the live runner's declared uploads."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("checker", ROOT / "scripts/check-image.py")
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class RecipeStagingTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.recipe = self.root / "recipe"
        self.recipe.mkdir()
        (self.recipe / "recipe.sh").write_text("set -eu\ncat fixture/input.txt\n")
        (self.recipe / "fixture").mkdir()
        (self.recipe / "fixture/input.txt").write_text("synthetic input\n")

    def stage(self, files, source=None, name="staged"):
        destination = self.root / name
        checker.stage_recipe_files(source or self.recipe, {"files": files}, destination)
        return destination

    def test_undeclared_dependency_fails_even_when_present_in_source(self):
        staged = self.stage(["recipe.sh"])
        result = subprocess.run(["bash", "recipe.sh"], cwd=staged, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((staged / "fixture/input.txt").exists())
        complete = self.stage(["recipe.sh", "fixture/input.txt"], name="complete")
        result = subprocess.run(["bash", "recipe.sh"], cwd=complete, capture_output=True, check=True)
        self.assertEqual(result.stdout, b"synthetic input\n")

    def test_rejects_unsafe_duplicate_or_missing_declared_files(self):
        for files in ([], ["../recipe.sh"], ["recipe.sh", "/etc/passwd"],
                      ["recipe.sh", "fixture/../recipe.sh"], ["recipe.sh", "./recipe.sh"],
                      ["recipe.sh", "fixture//input.txt"], ["recipe.sh", "recipe.sh"],
                      ["recipe.sh", "missing.txt"], ["recipe.sh", "fixture"]):
            with self.subTest(files=files), self.assertRaises(ValueError):
                self.stage(files)

    def test_rejects_symlinked_root_parent_and_file(self):
        (self.root / "linked-root").symlink_to(self.recipe, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "real directory"):
            self.stage(["recipe.sh"], source=self.root / "linked-root")
        (self.recipe / "linked-fixture").symlink_to(self.recipe / "fixture", target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "symlinks"):
            self.stage(["recipe.sh", "linked-fixture/input.txt"])
        (self.recipe / "linked.txt").symlink_to(self.recipe / "fixture/input.txt")
        with self.assertRaisesRegex(ValueError, "symlinks"):
            self.stage(["recipe.sh", "linked.txt"])

    def test_rejects_oversized_upload(self):
        (self.recipe / "large.bin").write_bytes(b"x" * 5_000_001)
        with self.assertRaisesRegex(ValueError, "per-file upload limit"):
            self.stage(["recipe.sh", "large.bin"])

    def test_staged_permissions_match_caller_owned_sdk_uploads(self):
        destination = self.root / "private-staging"
        destination.mkdir(mode=0o700)
        previous = os.umask(0o077)
        try:
            checker.stage_recipe_files(self.recipe, {"files": ["recipe.sh", "fixture/input.txt"]}, destination)
        finally:
            os.umask(previous)
        for directory in (destination, destination / "fixture"):
            self.assertEqual(directory.stat().st_mode & 0o777, 0o755)
        for file in (destination / "recipe.sh", destination / "fixture/input.txt"):
            self.assertEqual(file.stat().st_mode & 0o777, 0o600)


if __name__ == "__main__":
    unittest.main()
