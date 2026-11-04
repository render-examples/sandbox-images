"""Shared filesystem recipe lifecycle; workload contexts contain pathlib.Path values."""
import hashlib
import importlib.util
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

OUTPUT = Path('/workspace/output')
RECEIPT = OUTPUT / 'verification.json'

def require(condition, message):
    if not condition:
        raise ValueError(message)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def read(path):
    return json.loads(path.read_text())

def write(path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True, allow_nan=False) + '\n')

def hashes(directory):
    require(directory.is_dir() and not directory.is_symlink(), 'Inputs must be a directory')
    result = {}
    for path in sorted(directory.rglob('*')):
        require(not path.is_symlink(), 'Prepared inputs cannot contain symlinks')
        if path.is_dir():
            continue
        require(path.is_file(), 'Prepared inputs must be regular files')
        result[path.relative_to(directory).as_posix()] = digest(path.read_bytes())
    return result

def main():
    action = sys.argv[1]
    smoke = action == 'smoke'
    if smoke:
        config = {'imageSlug': sys.argv[2], 'scenario': sys.argv[3], 'slug': sys.argv[3]}
        config_bytes = json.dumps(config).encode()
    else:
        config_path = Path(sys.argv[2]).resolve()
        config_bytes = config_path.read_bytes()
        config = json.loads(config_bytes)
    for key in ('imageSlug', 'scenario', 'slug'):
        require(isinstance(config.get(key), str) and re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', config[key]), 'Invalid identity')
    require('localModule' not in config or config['localModule'] is True, 'Invalid localModule')
    module_path = (config_path.parent / 'workload.py') if config.get('localModule') else Path('/opt/render/fixtures') / config['imageSlug'] / 'workload.py'
    require(module_path.is_file() and not module_path.is_symlink(), 'Invalid workload module')
    spec = importlib.util.spec_from_file_location('recipe_workload', module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    scenario = module.SCENARIOS[config['scenario']]
    expected = scenario['expectedSummary']
    artifacts = scenario['artifacts']
    require(isinstance(expected, dict) and expected, 'Expected summary must be nonempty')
    require(isinstance(artifacts, list) and artifacts and len(set(artifacts)) == len(artifacts), 'Invalid artifacts')
    for name in artifacts:
        require(re.fullmatch(r'[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+', name) and name not in ('summary.json', 'verification.json'), 'Invalid artifact name')
    for name in ('prepare', 'run', 'verify'):
        require(callable(scenario[name]), 'Missing workload function')
    names = ['summary.json', *artifacts]
    Path('/workspace').mkdir(exist_ok=True)
    root = Path(tempfile.mkdtemp(prefix='image-workload-', dir='/workspace')) if smoke else Path('/workspace') / config['slug']
    # Smoke owns an isolated output tree and never removes existing recipe results.
    OUTPUT = root / 'output' if smoke else Path('/workspace/output')
    RECEIPT = OUTPUT / 'verification.json'
    inputs, work, baseline_path = root / 'input', root / 'work', root / 'baseline.json'
    context = {'inputDir': inputs, 'workDir': work, 'outputDir': OUTPUT}
    identity = {'schemaVersion': 1, 'imageSlug': config['imageSlug'], 'scenario': config['scenario'], 'expectedSummary': expected,
                'configSha256': digest(config_bytes), 'moduleSha256': digest(module_path.read_bytes())}
    def baseline():
        actual = hashes(inputs)
        require(actual, 'Workload must prepare concrete inputs')
        require(read(baseline_path) == {**identity, 'inputSha256': actual}, 'Prepared input or workload identity changed')
    def prepare():
        require(not inputs.exists() and not baseline_path.exists(), 'Refusing to overwrite prepared state')
        inputs.mkdir(parents=True)
        scenario['prepare'](inputs)
        write(baseline_path, {**identity, 'inputSha256': hashes(inputs)})
        baseline()
        require(not work.exists(), 'Preparation must leave execution work absent')
        for name in [*names, 'verification.json']:
            require(not (OUTPUT / name).exists(), 'Preparation must not create workload outputs')
    def verify(require_receipt=True):
        previous = RECEIPT.read_bytes() if RECEIPT.exists() else None
        RECEIPT.unlink(missing_ok=True)
        baseline()
        for name in names:
            path = OUTPUT / name
            require(path.is_file() and not path.is_symlink(), 'Outputs must be regular files')
        require(read(OUTPUT / 'summary.json') == expected, 'Unexpected stored summary')
        actual = scenario['verify'](context)
        baseline()
        require(actual == expected, 'Semantic verification did not match expected results')
        receipt = {'passed': True, 'summary': actual, 'outputSha256': {name: digest((OUTPUT / name).read_bytes()) for name in names}}
        if require_receipt:
            require(previous is not None and json.loads(previous) == receipt, 'Missing receipt or changed artifact hashes')
        write(RECEIPT, receipt)
        return actual
    def analyze():
        RECEIPT.unlink(missing_ok=True)
        baseline()
        OUTPUT.mkdir(parents=True, exist_ok=True)
        if work.exists():
            shutil.rmtree(work)
        work.mkdir(parents=True)
        for name in names:
            (OUTPUT / name).unlink(missing_ok=True)
        actual = scenario['run'](context)
        baseline()
        require(actual == expected, 'Unexpected workload result')
        write(OUTPUT / 'summary.json', actual)
        return verify(False)
    def test():
        verify()
        first_input = next(iter(hashes(inputs)))
        for path in [baseline_path, inputs / first_input, *(OUTPUT / name for name in names)]:
            saved = path.read_bytes()
            try:
                path.write_text('corrupted fixture\n')
                rejected = False
                try:
                    verify()
                except Exception:
                    rejected = True
                require(rejected and not RECEIPT.exists(), 'Corruption accepted or stale receipt retained')
            finally:
                path.write_bytes(saved)
            verify(False)
        for name in [*names, 'verification.json']:
            (OUTPUT / name).unlink(missing_ok=True)
        analyze()
        verify()
        print(config['slug'] + ': input/baseline/artifact corruption and regeneration passed')
    try:
        if smoke:
            prepare()
            result = analyze()
            verify()
            Path('/workspace/image-smoke').mkdir(exist_ok=True)
            write(Path('/workspace/image-smoke/result.json'), {'status': 'passed', **result})
        elif action == 'prepare':
            prepare()
        elif action == 'analyze':
            analyze()
        elif action == 'verify':
            verify()
        elif action == 'test':
            test()
        else:
            raise ValueError('Expected prepare|analyze|verify|test|smoke')
    finally:
        if smoke:
            shutil.rmtree(root)
            for name in [*names, 'verification.json']:
                (OUTPUT / name).unlink(missing_ok=True)

if __name__ == '__main__':
    try:
        main()
        print(sys.argv[1] + ': passed')
    except Exception:
        if len(sys.argv) < 2 or sys.argv[1] != 'smoke':
            RECEIPT.unlink(missing_ok=True)
        raise
