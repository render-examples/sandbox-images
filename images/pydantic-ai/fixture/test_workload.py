import tempfile
import unittest
from pathlib import Path
from workload import SCENARIOS
class WorkloadTests(unittest.TestCase):
    def test_outputs_and_corruption(self):
        for name,s in SCENARIOS.items():
            with self.subTest(name=name), tempfile.TemporaryDirectory() as root:
                ctx={k:Path(root)/v for k,v in [('inputDir','input'),('workDir','work'),('outputDir','output')]}
                for path in ctx.values():path.mkdir()
                s['prepare'](ctx['inputDir'])
                self.assertEqual(s['run'](ctx),s['expectedSummary'])
                self.assertEqual(s['verify'](ctx),s['expectedSummary'])
                (ctx['outputDir']/s['artifacts'][0]).write_text('broken')
                with self.assertRaises(Exception):self.assertEqual(s['verify'](ctx),s['expectedSummary'])
if __name__=='__main__':unittest.main()
