import base64
import csv
import hashlib
import importlib.util
import io
from pathlib import Path
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('wheel_patch', Path(__file__).resolve().parents[1] / 'security/patch-python-wheel.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class WheelPatchTests(unittest.TestCase):
    def fixture(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, 'w') as wheel:
            wheel.writestr('fixture/__init__.py', '# unchanged runtime\n')
            wheel.writestr('fixture-1.0.dist-info/METADATA', 'Name: fixture\nVersion: 1.0\nRequires-Dist: dependency<2\n')
            wheel.writestr('fixture-1.0.dist-info/RECORD', '')
            wheel.writestr('fixture-1.0.dist-info/licenses/LICENSE', 'upstream license\n')
        value = data.getvalue()
        patch = {'name': 'fixture', 'version': '1.0', 'filename': 'fixture-1.0-py3-none-any.whl', 'sha256': hashlib.sha256(value).hexdigest(), 'requiresDist': 'dependency<2', 'replacement': 'dependency>=2,<3'}
        return value, patch

    def test_reproducible_patch_preserves_runtime_license_and_valid_records(self):
        original, patch = self.fixture()
        filename, data = module.patch_wheel(original, patch)
        self.assertEqual((filename, data), module.patch_wheel(original, patch))
        self.assertEqual(filename, 'fixture-1.0+render.1-py3-none-any.whl')
        with zipfile.ZipFile(io.BytesIO(data)) as wheel:
            self.assertEqual(wheel.read('fixture/__init__.py'), b'# unchanged runtime\n')
            self.assertEqual(wheel.read('fixture-1.0+render.1.dist-info/licenses/LICENSE'), b'upstream license\n')
            self.assertIn(b'Requires-Dist: dependency>=2,<3', wheel.read('fixture-1.0+render.1.dist-info/METADATA'))
            for name, digest, size in csv.reader(io.StringIO(wheel.read('fixture-1.0+render.1.dist-info/RECORD').decode())):
                if digest:
                    content = wheel.read(name)
                    expected = base64.urlsafe_b64encode(hashlib.sha256(content).digest()).decode().rstrip('=')
                    self.assertEqual(digest, 'sha256=' + expected)
                    self.assertEqual(size, str(len(content)))

    def test_rejects_changed_upstream_bytes_or_metadata(self):
        data, patch = self.fixture()
        with self.assertRaises(ValueError):
            module.patch_wheel(data + b'x', patch)
        with self.assertRaises(ValueError):
            module.patch_wheel(data, {**patch, 'requiresDist': 'wrong'})

    def test_lock_replacement_requires_original_hash_and_leaves_other_packages(self):
        _, patch = self.fixture()
        original = 'fixture==1.0 \\\n    --hash=sha256:' + patch['sha256'] + '\nother==2.0\n'
        result = module.patched_lock(original, patch, Path('/tmp/patched.whl'), 'a' * 64)
        self.assertIn('fixture @ ' + Path('/tmp/patched.whl').resolve().as_uri() + ' --hash=sha256:' + 'a' * 64, result)
        self.assertTrue(result.endswith('other==2.0\n'))
        for bad in [original.replace(patch['sha256'], 'b' * 64), original * 2, '']:
            with self.assertRaises(ValueError):
                module.patched_lock(bad, patch, Path('/tmp/patched.whl'), 'a' * 64)


if __name__ == '__main__':
    unittest.main()
