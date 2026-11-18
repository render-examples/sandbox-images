"""Verify the real scanner still detects credentials beside harmless SDK examples."""
import json
import os
import re
from pathlib import Path
import subprocess
import tempfile
import unittest


class SecretScannerTests(unittest.TestCase):
    def test_singleton_example_is_allowed_but_credential_objects_still_block(self):
        scanner = os.environ['TRIVY_BIN']
        config = Path(__file__).resolve().parents[1] / 'security/trivy-secret.yaml'
        identity = {'type': '_'.join(['service', 'account'])}
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'example.py').write_text('"""Use `' + json.dumps(identity) + '` as the default."""')
            # Synthetic credential-shaped objects; no private key or usable credential.
            (root / 'credential.json').write_text(json.dumps({**identity, 'project_id': 'security-regression-fixture'}, indent=2))
            (root / 'same-file.py').write_text('"""Use `' + json.dumps(identity) + '` as the default."""\ncredentials = ' + json.dumps({**identity, 'project_id': 'security-regression-fixture'}))
            report = root / 'scan.json'
            subprocess.run([scanner, 'fs', '--scanners', 'secret', '--secret-config', str(config), '--format', 'json', '--output', str(report), str(root)], check=True, capture_output=True, timeout=60)
            results = json.loads(report.read_text()).get('Results', [])
            findings = {Path(row['Target']).name: row.get('Secrets', []) for row in results}
            self.assertFalse(findings.get('example.py'))
            for name in ['credential.json', 'same-file.py']:
                self.assertEqual([x['RuleID'] for x in findings[name]], ['gcp-service-account'])


    def test_checksum_exceptions_are_limited_to_exact_values_and_report_paths(self):
        scanner = os.environ['GITLEAKS_BIN']
        config = Path(__file__).resolve().parents[1] / '.gitleaks.toml'
        checksums = re.findall(r'[a-f0-9]{64}', config.read_text())
        self.assertEqual(len(checksums), 2)
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'docs').mkdir()
            for date in ['04', '18']:
                (root / f'docs/catalog-live-validation-2026-11-{date}.json').write_text(
                    '\n'.join(json.dumps({'api-results.json': value}) for value in checksums))
            # The same digest in another file, a future report, or another value
            # beside an allowed checksum must still be reported.
            (root / 'outside.json').write_text(json.dumps({'api-results.json': checksums[0]}))
            (root / 'docs/catalog-live-validation-2026-11-19.json').write_text(json.dumps({'api-results.json': checksums[0]}))
            changed = ('a' if checksums[0][0] != 'a' else 'b') + checksums[0][1:]
            with (root / 'docs/catalog-live-validation-2026-11-18.json').open('a') as output:
                output.write('\n' + json.dumps({'api-results.json': changed}))
            report = root / 'findings.json'
            scan = subprocess.run([scanner, 'dir', '--redact', '--config', str(config), '--report-format', 'json', '--report-path', str(report), str(root)], capture_output=True, timeout=60)
            self.assertEqual(scan.returncode, 1)
            findings = json.loads(report.read_text())
            self.assertEqual(len(findings), 3, [row["File"] for row in findings])
            self.assertEqual({Path(row['File']).name for row in findings}, {'outside.json', 'catalog-live-validation-2026-11-19.json', 'catalog-live-validation-2026-11-18.json'})


if __name__ == '__main__':
    unittest.main()
