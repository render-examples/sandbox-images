#!/usr/bin/env python3
"""Copy canonical runtimes into recipes reusing previously published images."""
import argparse
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
for config_path in sorted((ROOT/'snapshots').glob('*/recipe.json')):
    config=json.loads(config_path.read_text())
    if not config.get('localModule'):continue
    name='python-recipe.py' if (config_path.parent/'workload.py').exists() else 'node-recipe.mjs'
    source=ROOT/'runtime'/name;target=config_path.parent/name
    if args.check:
        if not target.exists() or target.read_bytes()!=source.read_bytes():raise SystemExit(f'Stale generated runtime: {target.relative_to(ROOT)}')
    else:target.write_bytes(source.read_bytes())
