"""Prepare and verify a synthetic Python Git repository without runtime downloads."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

ROOT = Path("/workspace/repo-ready-python")
REPO = ROOT / "repo"
FIXTURE = Path("/opt/render/fixtures/repo-ready-python")
OUTPUT = Path("/workspace/output")
INPUTS = ["pyproject.toml", "uv.lock", ".gitignore", "TASK.md", "src/pricing.py", "tests/test_pricing.py"]
OUTPUTS = ["summary.json", "tests.xml", "tests.txt", "regression.xml", "lint.json", "change.patch"]
EXPECTED = {"baselineTests": 3, "regressionFailuresBeforeFix": 1, "testsPassed": 5,
            "totalCents": 3250, "discountedCents": 2600, "roundedCents": 51, "changedFiles": 2}
BUG = "return cents * (100 - percent) // 100"
FIX = "return (cents * (100 - percent) + 50) // 100"
REGRESSION = '''

def test_half_cent_rounds_up():
    assert discounted_cents(101, 50) == 51
    assert discounted_cents(103, 50) == 52


def test_zero_and_full_discounts():
    assert discounted_cents(101, 0) == 101
    assert discounted_cents(101, 100) == 0
'''


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads(path.read_text())


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


def run(*args, success=True, env=None):
    result = subprocess.run(args, cwd=REPO, text=True, capture_output=True, timeout=45, env=env)
    if success and result.returncode != 0:
        raise RuntimeError(f"Command failed: {args}\n{result.stdout}\n{result.stderr}")
    return result


def uv(*args, **kwargs):
    return run("uv", "run", "--frozen", "--offline", "--no-sync", "python", *args, **kwargs)


def test_counts(path):
    suite = ET.parse(path).getroot().find("testsuite")
    if suite is None:
        raise RuntimeError("Missing pytest suite")
    return {field: int(suite.attrib[field]) for field in ["tests", "failures", "errors", "skipped"]}


def check_baseline():
    baseline = read_json(ROOT / "baseline.json")
    assert baseline["fixture"] == "repo-ready-python-v1"
    assert baseline["expectedSummary"] == EXPECTED
    assert run("git", "rev-parse", "HEAD").stdout.strip() == baseline["gitHead"]
    for name in INPUTS:
        pinned = (FIXTURE / name).read_bytes()
        tracked = run("git", "show", f"HEAD:{name}").stdout.encode()
        assert digest(pinned) == baseline["inputSha256"][name], f"Pinned input changed: {name}"
        assert digest(tracked) == baseline["inputSha256"][name], f"Git input changed: {name}"
        if name not in ["src/pricing.py", "tests/test_pricing.py"]:
            assert (REPO / name).read_bytes() == pinned, f"Working input changed: {name}"
    # The prepared environment is tested via its own interpreter after relocation.
    versions = uv("-c", "import importlib.metadata as m,json; print(json.dumps({p:m.version(p) for p in ['pytest','ruff']}))")
    assert json.loads(versions.stdout) == {"pytest": "9.2.0", "ruff": "0.17.3"}
    return baseline


def prepare():
    if REPO.exists():
        raise RuntimeError("Refusing to overwrite an existing prepared repository")
    ROOT.mkdir(parents=True, exist_ok=True)
    shutil.copytree(FIXTURE, REPO, symlinks=True)
    run("git", "init", "--quiet", "--initial-branch=main")
    run("git", "config", "user.name", "Render Example")
    run("git", "config", "user.email", "example@example.invalid")
    run("git", "add", ".")
    run("git", "commit", "--quiet", "-m", "Prepared synthetic Python pricing fixture",
        env={**os.environ, "GIT_AUTHOR_DATE": "2026-01-01T00:00:00Z", "GIT_COMMITTER_DATE": "2026-01-01T00:00:00Z"})
    uv("-m", "pytest", "-q", f"--junitxml={ROOT / 'baseline-tests.xml'}")
    assert test_counts(ROOT / "baseline-tests.xml") == {"tests": 3, "failures": 0, "errors": 0, "skipped": 0}
    uv("-m", "ruff", "check", "src", "tests")
    write_json(ROOT / "baseline.json", {"fixture": "repo-ready-python-v1", "expectedSummary": EXPECTED,
        "gitHead": run("git", "rev-parse", "HEAD").stdout.strip(),
        "inputSha256": {name: digest((REPO / name).read_bytes()) for name in INPUTS}})


def analyze():
    check_baseline()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # Reset only the two controlled demonstration files, then prove the regression.
    original = (FIXTURE / "src/pricing.py").read_text()
    (REPO / "src/pricing.py").write_text(original)
    (REPO / "tests/test_pricing.py").write_text((FIXTURE / "tests/test_pricing.py").read_text() + REGRESSION)
    regression = uv("-m", "pytest", "-q", f"--junitxml={OUTPUT / 'regression.xml'}", success=False)
    assert regression.returncode == 1, "Regression must fail before the fix"
    assert test_counts(OUTPUT / "regression.xml") == {"tests": 5, "failures": 1, "errors": 0, "skipped": 0}
    assert original.count(BUG) == 1
    (REPO / "src/pricing.py").write_text(original.replace(BUG, FIX))
    results = uv("-m", "pytest", "-q", f"--junitxml={OUTPUT / 'tests.xml'}")
    (OUTPUT / "tests.txt").write_text(results.stdout)
    lint = uv("-m", "ruff", "check", "--output-format=json", "src", "tests")
    (OUTPUT / "lint.json").write_text(lint.stdout)
    values = uv("-c", "import sys,json; sys.path.insert(0,'src'); from pricing import total_cents,discounted_cents; print(json.dumps([total_cents([(1250,2),(750,1)]),discounted_cents(3250,20),discounted_cents(101,50)]))")
    total, discounted, rounded = json.loads(values.stdout)
    summary = {**EXPECTED, "totalCents": total, "discountedCents": discounted, "roundedCents": rounded,
               "changedFiles": len(run("git", "diff", "--name-only").stdout.splitlines())}
    write_json(OUTPUT / "summary.json", summary)
    (OUTPUT / "change.patch").write_text(run("git", "diff", "--binary").stdout)
    verify(check_receipt=False)


def verify(check_receipt=True):
    check_baseline()
    assert (REPO / "src/pricing.py").read_text() == (FIXTURE / "src/pricing.py").read_text().replace(BUG, FIX)
    assert (REPO / "tests/test_pricing.py").read_text() == (FIXTURE / "tests/test_pricing.py").read_text() + REGRESSION
    assert read_json(OUTPUT / "summary.json") == EXPECTED
    assert test_counts(OUTPUT / "tests.xml") == {"tests": 5, "failures": 0, "errors": 0, "skipped": 0}
    assert test_counts(OUTPUT / "regression.xml") == {"tests": 5, "failures": 1, "errors": 0, "skipped": 0}
    assert "5 passed" in (OUTPUT / "tests.txt").read_text()
    assert read_json(OUTPUT / "lint.json") == []
    patch = (OUTPUT / "change.patch").read_text()
    assert patch == run("git", "diff", "--binary").stdout and FIX in patch
    hashes = {name: digest((OUTPUT / name).read_bytes()) for name in OUTPUTS}
    receipt = {"passed": True, "summary": EXPECTED, "outputSha256": hashes}
    if check_receipt:
        assert read_json(OUTPUT / "verification.json") == receipt
    else:
        write_json(OUTPUT / "verification.json", receipt)


def test_corruption():
    verify()
    mutations = [
        (ROOT / "baseline.json", json.dumps({"fixture": "tampered"})),
        (REPO / "pyproject.toml", (REPO / "pyproject.toml").read_text() + "\n# modified input\n"),
        (OUTPUT / "summary.json", json.dumps({**EXPECTED, "roundedCents": 50})),
        (OUTPUT / "change.patch", (OUTPUT / "change.patch").read_text().replace(FIX, BUG)),
    ]
    for path, changed in mutations:
        original = path.read_bytes()
        try:
            path.write_text(changed)
            try:
                verify()
            except (AssertionError, KeyError, ValueError, RuntimeError):
                pass
            else:
                raise RuntimeError(f"Corruption escaped verification: {path}")
        finally:
            path.write_bytes(original)
    verify()
    print("Four baseline, input, result and patch corruption checks passed")


if __name__ == "__main__":
    commands = {"prepare": prepare, "analyze": analyze, "verify": verify, "test": test_corruption}
    if len(sys.argv) != 2 or sys.argv[1] not in commands:
        raise SystemExit("Expected prepare, analyze, verify, or test")
    commands[sys.argv[1]]()
    print(f"repo-ready-python {sys.argv[1]}: passed")
