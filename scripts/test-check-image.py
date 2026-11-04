"""Keep local recipe inputs aligned with the live runner's declared uploads."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

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


class NativeRestoreTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        (self.directory / "recipe.sh").write_text("#!/bin/sh\nset -eu\n")
        (self.directory / "recipe.json").write_text(json.dumps({
            "slug": "synthetic-workload", "scenario": "synthetic-workload", "imageSlug": "typescript-data"}))
        self.execution = {"files": ["recipe.sh", "recipe.json"]}
        self.image = "sha256:" + "a" * 64

    def check(self):
        return checker.check_native_restore(self.directory, self.execution, self.image, "synthetic-workload")

    def test_restore_uses_two_isolated_containers_and_preserves_tar_bytes(self):
        calls = []
        archive = b"synthetic tar bytes including numeric owners and symlink metadata"

        def run(command, **kwargs):
            calls.append(command)
            self.assertTrue(kwargs["check"])
            self.assertEqual(command[:3], ["docker", "run", "--rm"])
            for option, value in (("--network", "none"), ("--memory", "2g"),
                                  ("--cpus", "2"), ("--platform", "linux/amd64")):
                self.assertEqual(command[command.index(option) + 1], value)
            self.assertIn(self.image, command)
            self.assertEqual(command[-7:-1], ["timeout", "-k", "5", "120", "bash", "-ec"])
            if len(calls) == 1:
                mount = command[command.index("--mount") + 1]
                staged = Path(mount.split("src=", 1)[1].split(",dst=", 1)[0])
                self.assertTrue(mount.endswith(",readonly"))
                for name in self.execution["files"]:
                    self.assertEqual((staged / name).stat().st_mode & 0o777, 0o600)
                script = command[-1]
                self.assertLess(script.index("mkdir -p /workspace/synthetic-workload"), script.index("bash recipe.sh prepare"))
                self.assertIn("bash recipe.sh prepare >&2", script)
                self.assertIn("tar --numeric-owner -C /workspace -cpf - .", script)
                self.assertNotIn("--dereference", script)
                self.assertNotIn("stdin", kwargs)
                kwargs["stdout"].write(archive)
            else:
                self.assertIn("--interactive", command)
                self.assertNotIn("--mount", command)
                self.assertEqual(kwargs["stdin"].read(), archive)
                script = command[-1]
                self.assertIn("tar --numeric-owner --same-owner", script)
                self.assertIn("test ! -e work", script)
                self.assertLess(script.index("if bash recipe.sh verify"), script.index("bash recipe.sh analyze"))
                self.assertIn("test ! -e /workspace/output/verification.json", script)
                self.assertIn("sha256sum -c .restore-baseline.sha256", script)
                self.assertIn("readlink /workspace/node_modules", script)

        with patch.object(checker.subprocess, "run", side_effect=run):
            self.assertTrue(self.check())
        self.assertEqual(len(calls), 2)

    def test_prepare_failure_does_not_attempt_restore(self):
        with patch.object(checker.subprocess, "run", side_effect=subprocess.CalledProcessError(1, "prepare")) as run:
            with self.assertRaises(subprocess.CalledProcessError):
                self.check()
        self.assertEqual(run.call_count, 1)

    def test_existing_recipe_contracts_are_skipped(self):
        with patch.object(checker.subprocess, "run") as run:
            self.assertFalse(checker.check_native_restore(self.directory, {"files": ["recipe.sh"]}, self.image, "synthetic-workload"))
            (self.directory / "recipe.json").write_text('{"slug":"synthetic-workload"}')
            self.assertFalse(self.check())
        run.assert_not_called()

    def test_rejects_unmatched_slug_and_mutable_image_tag(self):
        with patch.object(checker.subprocess, "run") as run:
            with self.assertRaisesRegex(ValueError, "slug"):
                checker.check_native_restore(self.directory, self.execution, self.image, "other-workload")
            with self.assertRaisesRegex(ValueError, "immutable"):
                checker.check_native_restore(self.directory, self.execution, "example:latest", "synthetic-workload")
        run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
