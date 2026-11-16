"""Independent task fixtures and output checks; no network or model calls."""
import json
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any
INVOICE={'currency':'USD','lines':[{'quantity':2,'unitCents':1250},{'quantity':1,'unitCents':750}]}
BUG='def discounted_cents(cents, percent):\n    return cents * (100 - percent) // 100\n'
FIX='def discounted_cents(cents, percent):\n    return (cents * (100 - percent) + 50) // 100\n'
def read(path: Path) -> Any:
    return json.loads(path.read_text())
def write(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value,indent=2,sort_keys=True,allow_nan=False)+'\n')
def prepare(path: Path, repair: bool=False) -> None:
    (path/'TASK.md').write_text('Fix pricing.py so integer discounts round half cents up.' if repair else 'Read invoice.json and write answer.json with exactly currency USD and totalCents as the sum of quantity times unitCents.')
    if repair: (path/'pricing.py').write_text(BUG)
    else: write(path/'invoice.json',INVOICE)
def grade(path: Path, repair: bool=False) -> dict[str,int]:
    if repair:
        code="""import importlib.util
s=importlib.util.spec_from_file_location('candidate','pricing.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
for c in range(1,202,2):
 for p in [0,1,25,50,75,99,100]:
  assert m.discounted_cents(c,p)==(c*(100-p)+50)//100,(c,p)
print('707 cases passed')
"""
        result=subprocess.run([sys.executable,'-I','-c',code],cwd=path,capture_output=True,text=True,timeout=15,check=True)
        assert '707 cases passed' in result.stdout
        return {'casesPassed':707}
    assert read(path/'answer.json')=={'currency':'USD','totalCents':3250}
    return {'totalCents':3250}
def copy_project(ctx: dict[str,Path]) -> Path:
    p=ctx['workDir']/'project';shutil.copytree(ctx['inputDir'],p);return p
