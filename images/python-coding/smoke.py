"""Exercise the pinned uv environment after copying it to a working directory."""
import json
from pathlib import Path
import shutil
import subprocess
import xml.etree.ElementTree as ET

root = Path("/workspace/image-smoke")
repo = root / "repo"
root.mkdir(parents=True, exist_ok=True)
if repo.exists():
    raise RuntimeError("Refusing to overwrite an existing smoke repository")
shutil.copytree("/opt/render/fixtures/repo-ready-python", repo, symlinks=True)
command = ["uv", "run", "--frozen", "--offline", "--no-sync", "python", "-m"]
subprocess.run(command + ["pytest", "-q", f"--junitxml={root / 'tests.xml'}"], cwd=repo,
               check=True, timeout=45)
suite = ET.parse(root / "tests.xml").getroot().find("testsuite")
if suite is None or int(suite.attrib["tests"]) != 3 or int(suite.attrib["failures"]) != 0:
    raise RuntimeError("Unexpected baseline test results")
subprocess.run(command + ["ruff", "check", "src", "tests"], cwd=repo, check=True, timeout=30)
(root / "result.json").write_text(json.dumps({"status": "passed", "baselineTests": 3}) + "\n")
print("Python coding smoke passed: copied uv environment, three tests and Ruff")
