"""Prepare a broken task suite; grade edits separately from the reference solution."""
import difflib
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path('/workspace/agent-regression-python')
REPO = ROOT/'repo'
EVALUATION = ROOT/'prepared-grader'
SOURCE = Path(__file__).resolve().parent
OUTPUT = Path('/workspace/output')
PYTHON = '/opt/render/fixtures/repo-ready-python/.venv/bin/python'
PINNED = {'fixture/tasks.py': '5971b8a3cd2991425ac7296543785e7afdbb9475c82b8b4cd3ae3ee9ae761d7b', 'reference.py': '1a7e89fea9d60e74c29367d64cf479caddcc351fdbc07fb174f426e5a66bc637', 'TASKS.json': '55b662174d134aabe4bdc4745ae4c9a03498a4e189f198189afa1efed34eb24f', 'evaluation/test_tasks.py': '3e982f747d95c8a4cc074113708518ebbe402a6c57c009bcc4634159b3006d9c', 'grader.py': 'f6cb711a186db2ba658fa36db07c947269de92ac3a3c081e479eb834283f68bf'}
SUITE = 'agent-regression-python-v1'
EXPECTED = {'totalTasks': 3, 'baselineTasksPassed': 0, 'baselineTestsPassed': 3,
            'tasksPassed': 3, 'testsPassed': 12, 'totalTests': 12}
OUTPUTS = ['summary.json','baseline-results.json','task-results.json','source.json','change.patch']


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value,indent=2,sort_keys=True)+'\n')


def read_json(path):
    return json.loads(path.read_text())


def invalidate():
    (OUTPUT/'verification.json').unlink(missing_ok=True)


def pinned():
    for path, digest in PINNED.items():
        assert sha((SOURCE/path).read_bytes()) == digest, 'Changed recipe input: '+path


def baseline():
    pinned()
    expected = {'schemaVersion':1,'suite':SUITE,'inputSha256':PINNED,
                'expectedBaseline':{'tasksPassed':0,'testsPassed':3,'totalTests':12}}
    assert read_json(ROOT/'baseline.json') == expected, 'Prepared baseline changed'
    for filename, source in [('test_tasks.py','evaluation/test_tasks.py'),('grader.py','grader.py')]:
        assert sha((EVALUATION/filename).read_bytes()) == PINNED[source], 'Changed grader: '+filename
    assert sha((REPO/'TASKS.json').read_bytes()) == PINNED['TASKS.json'], 'Changed task manifest'
    for name, pinned_name in [('src/tasks.py','fixture/tasks.py'),('TASKS.json','TASKS.json')]:
        tracked = subprocess.run(['git','show','HEAD:'+name],cwd=REPO,check=True,capture_output=True,timeout=10).stdout
        assert sha(tracked)==PINNED[pinned_name], 'Changed committed baseline: '+name
    versions = subprocess.run([PYTHON,'-I','-c',"import importlib.metadata as m; print(m.version('pytest'))"],
                              check=True,capture_output=True,text=True,timeout=10)
    assert versions.stdout.strip() == '9.2.0'


def run_grade(candidate):
    before = candidate.read_bytes()
    result = subprocess.run([PYTHON,'-I',str(EVALUATION/'grader.py'),str(candidate),str(EVALUATION/'test_tasks.py')],
                            check=True,capture_output=True,text=True,timeout=30)
    baseline()  # Reject a candidate that modified the task specification or grader files.
    assert candidate.read_bytes() == before, 'Candidate changed its own source during grading'
    return json.loads(result.stdout)


def patch():
    return ''.join(difflib.unified_diff((SOURCE/'fixture/tasks.py').read_text().splitlines(keepends=True),
                                       (REPO/'src/tasks.py').read_text().splitlines(keepends=True),
                                       fromfile='a/src/tasks.py',tofile='b/src/tasks.py'))


def prepare():
    pinned()
    if any(path.exists() for path in [REPO,EVALUATION,ROOT/'baseline.json']):
        raise RuntimeError('Refusing to replace prepared state')
    ROOT.mkdir(parents=True,exist_ok=True)
    (REPO/'src').mkdir(parents=True)
    EVALUATION.mkdir()
    shutil.copyfile(SOURCE/'fixture/tasks.py',REPO/'src/tasks.py')
    shutil.copyfile(SOURCE/'TASKS.json',REPO/'TASKS.json')
    shutil.copyfile(SOURCE/'evaluation/test_tasks.py',EVALUATION/'test_tasks.py')
    shutil.copyfile(SOURCE/'grader.py',EVALUATION/'grader.py')
    git_env = {**os.environ, 'GIT_AUTHOR_DATE':'2026-01-01T00:00:00Z', 'GIT_COMMITTER_DATE':'2026-01-01T00:00:00Z'}
    for args in [['init','--quiet','--initial-branch=main'],['config','user.name','Render Example'],
                 ['config','user.email','example@example.invalid'],['add','src/tasks.py','TASKS.json'],
                 ['commit','--quiet','-m','Prepared broken Python task baseline']]:
        subprocess.run(['git',*args],cwd=REPO,env=git_env,check=True,capture_output=True,timeout=10)
    write_json(ROOT/'baseline.json',{'schemaVersion':1,'suite':SUITE,'inputSha256':PINNED,
               'expectedBaseline':{'tasksPassed':0,'testsPassed':3,'totalTests':12}})
    result = run_grade(REPO/'src/tasks.py')
    assert result['tasksPassed']==0 and result['testsPassed']==3 and result['totalTests']==12
    write_json(ROOT/'baseline-results.json',result)
    # No /workspace/output artifact exists until a grading or reference run.


def assess(mode):
    invalidate()
    baseline()
    OUTPUT.mkdir(parents=True,exist_ok=True)
    original = run_grade(SOURCE/'fixture/tasks.py')
    assert original == read_json(ROOT/'baseline-results.json'), 'Changed baseline grading results'
    assert original['tasksPassed']==0 and original['testsPassed']==3
    candidate = REPO/'src/tasks.py'
    result = run_grade(candidate)
    summary = {'totalTasks':3,'baselineTasksPassed':original['tasksPassed'],
               'baselineTestsPassed':original['testsPassed'],'tasksPassed':result['tasksPassed'],
               'testsPassed':result['testsPassed'],'totalTests':result['totalTests']}
    write_json(OUTPUT/'summary.json',summary)
    write_json(OUTPUT/'baseline-results.json',original)
    write_json(OUTPUT/'task-results.json',{'mode':mode,'suite':SUITE,**result})
    write_json(OUTPUT/'source.json',{'path':'src/tasks.py','sha256':sha(candidate.read_bytes()),
               'baselineSha256':PINNED['fixture/tasks.py']})
    (OUTPUT/'change.patch').write_text(patch())
    return summary


def grade():
    summary = assess('candidate-evaluation')
    # Even a failing candidate gets per-task results. This command does not mark
    # the recipe verified or change candidate source.
    print(json.dumps(summary,sort_keys=True))


def analyze():
    invalidate()
    baseline()
    # Acceptance demonstration only. Use `grade` to evaluate arbitrary edits.
    shutil.copyfile(SOURCE/'reference.py',REPO/'src/tasks.py')
    assert assess('reference-acceptance') == EXPECTED
    verify(check_receipt=False)


def verify(check_receipt=True):
    receipt_path = OUTPUT/'verification.json'
    previous = receipt_path.read_bytes() if receipt_path.exists() else None
    invalidate()
    baseline()
    assert read_json(OUTPUT/'summary.json') == EXPECTED
    original = run_grade(SOURCE/'fixture/tasks.py')
    assert original == read_json(ROOT/'baseline-results.json') == read_json(OUTPUT/'baseline-results.json')
    actual = run_grade(REPO/'src/tasks.py')
    recorded = read_json(OUTPUT/'task-results.json')
    assert recorded['mode'] in ['reference-acceptance','candidate-evaluation']
    assert recorded == {'mode':recorded['mode'],'suite':SUITE,**actual}
    assert actual['tasksPassed']==3 and actual['testsPassed']==12
    assert read_json(OUTPUT/'source.json') == {'path':'src/tasks.py','sha256':sha((REPO/'src/tasks.py').read_bytes()),
           'baselineSha256':PINNED['fixture/tasks.py']}
    assert (OUTPUT/'change.patch').read_text() == patch() and patch()
    receipt = {'passed':True,'summary':EXPECTED,'outputSha256':{name:sha((OUTPUT/name).read_bytes()) for name in OUTPUTS}}
    if check_receipt:
        assert previous is not None and json.loads(previous)==receipt
    write_json(receipt_path,receipt)


def test():
    verify()
    # Prove equivalent solutions are graded behaviorally, not by source equality.
    candidate = REPO/'src/tasks.py'
    candidate.write_text(candidate.read_text().replace("return {'balance_cents': sum(seen.values()), 'applied_ids': list(seen)}",
                        "return dict(balance_cents=sum(seen.values()), applied_ids=[key for key in seen])"))
    assert assess('candidate-evaluation') == EXPECTED
    verify(check_receipt=False)
    verify()
    # Protect evaluator/test inputs and recorded results against corruption.
    for path, data in [(EVALUATION/'grader.py',b'print("{}")\n'),
                       (EVALUATION/'test_tasks.py',b'def test_nothing(): pass\n'),
                       (ROOT/'baseline.json',b'{}'),
                       (OUTPUT/'task-results.json',b'{}'),
                       (OUTPUT/'change.patch',b'fabricated patch')]:
        before = path.read_bytes()
        try:
            path.write_bytes(data)
            try:
                verify()
            except (AssertionError,KeyError,ValueError):
                pass
            else:
                raise AssertionError('Corrupt grader or results accepted')
            assert not (OUTPUT/'verification.json').exists(), 'Stale passed receipt survived'
        finally:
            path.write_bytes(before)
        verify(check_receipt=False)
    # The grading path preserves broken candidate code and reports failures.
    shutil.copyfile(SOURCE/'fixture/tasks.py',candidate)
    before = candidate.read_bytes()
    grade()
    assert candidate.read_bytes()==before
    failed = read_json(OUTPUT/'task-results.json')
    assert failed['mode']=='candidate-evaluation' and failed['tasksPassed']==0 and failed['testsPassed']==3
    assert not (OUTPUT/'verification.json').exists()
    candidate.write_text('def invalid(:\n')
    grade()
    invalid = read_json(OUTPUT/'task-results.json')
    assert invalid['tasksPassed']==0 and invalid['gradingError']=='collection-or-execution-error'
    assert candidate.read_text()=='def invalid(:\n' and not (OUTPUT/'verification.json').exists()
    analyze()
    verify()
    print('Equivalent solution accepted; baseline/grader/test/result/patch corruption rejected; failing candidate graded without edits')


if __name__ == '__main__':
    commands={'prepare':prepare,'grade':grade,'analyze':analyze,'verify':verify,'test':test}
    if len(sys.argv)!=2 or sys.argv[1] not in commands:
        raise SystemExit('Expected prepare|grade|analyze|verify|test')
    commands[sys.argv[1]]()
    print('agent-regression-python '+sys.argv[1]+': completed')
