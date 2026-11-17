"""Verify the real scanner still detects credentials beside harmless SDK examples."""
import json
import os
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


if __name__ == '__main__':
    unittest.main()
