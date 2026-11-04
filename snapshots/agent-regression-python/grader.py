"""Run behavioral tests in a bounded process and return semantic per-task results."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET

TASKS = {'TestValidation': 'input-validation', 'TestAllocation': 'exact-allocation', 'TestLedger': 'idempotent-ledger'}
PYTHON = '/opt/render/fixtures/repo-ready-python/.venv/bin/python'


def failed_execution(reason):
    return {'schemaVersion':1,'gradingError':reason,
            'tasks':[{'id':identifier,'passed':False,'tests':4,'testsPassed':0,
                      'failedTests':[reason]} for identifier in TASKS.values()],
            'totalTasks':3,'tasksPassed':0,'totalTests':12,'testsPassed':0}


def grade(candidate, tests):
    with tempfile.TemporaryDirectory(prefix='python-grade-') as temporary:
        xml = Path(temporary)/'tests.xml'
        env = {**os.environ, 'CANDIDATE_SOURCE': str(candidate), 'PYTEST_DISABLE_PLUGIN_AUTOLOAD': '1',
               'PYTHONDONTWRITEBYTECODE': '1', 'PYTHONHASHSEED': '0', 'PYTEST_ADDOPTS': '', 'PYTEST_PLUGINS': ''}
        try:
            result = subprocess.run([PYTHON, '-I', '-m', 'pytest', '-q', '-c', '/dev/null',
                                 '--confcutdir='+str(tests.parent), '--import-mode=importlib',
                                 '-p', 'no:cacheprovider', '--junitxml='+str(xml), str(tests)],
                                cwd=temporary, env=env, capture_output=True, text=True, timeout=25)
        except subprocess.TimeoutExpired:
            return failed_execution('timeout')
        if result.returncode not in [0, 1] or not xml.is_file():
            return failed_execution('collection-or-execution-error')
        cases = ET.parse(xml).getroot().findall('.//testcase')
        groups = {name: [] for name in TASKS}
        for case in cases:
            class_name = case.attrib.get('classname', '').split('.')[-1]
            if class_name not in groups:
                raise RuntimeError('Unexpected or uncollected grading case')
            groups[class_name].append({'name': case.attrib['name'],
                                     'passed': not any(case.find(tag) is not None for tag in ['failure','error','skipped'])})
        if any(len(cases) != 4 or len({case['name'] for case in cases}) != 4 for cases in groups.values()):
            raise RuntimeError('Missing or duplicate grading tests')
        tasks = [{'id': TASKS[name], 'passed': all(case['passed'] for case in cases),
                  'tests': 4, 'testsPassed': sum(case['passed'] for case in cases),
                  'failedTests': [case['name'] for case in cases if not case['passed']]}
                 for name, cases in groups.items()]
        return {'schemaVersion': 1, 'tasks': tasks, 'totalTasks': 3,
                'tasksPassed': sum(task['passed'] for task in tasks), 'totalTests':12,
                'testsPassed':sum(task['testsPassed'] for task in tasks)}


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('grader.py CANDIDATE_SOURCE TEST_FILE')
    print(json.dumps(grade(Path(sys.argv[1]), Path(sys.argv[2])), sort_keys=True))
