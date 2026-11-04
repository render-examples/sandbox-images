"""Deterministic API fix plus real database migration, captured at a clean baseline."""
import difflib
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET

import psycopg

sys.path.insert(0, '/opt/render/examples/python-api-postgres')
from database import Database

ROOT = Path('/workspace/fullstack-fastapi-postgres')
PROJECT = ROOT / 'project'
FIXTURE = Path('/opt/render/fixtures/fullstack-fastapi-postgres')
OUTPUT = Path('/workspace/output')
DB = Database(ROOT / 'database')
INPUTS = ['app.py', 'test_app.py', 'seed.sql', 'upgrade.sql', 'downgrade.sql', '.gitignore', 'TASK.md']
OUTPUTS = ['summary.json', 'tests.xml', 'regression.xml', 'api-results.json', 'migration.json', 'change.patch']
EXPECTED_ROWS = [(1, 'Acme', 2500), (2, 'Orbit', 750), (3, 'Penny', 101)]
EXPECTED = {'baselineTests': 4, 'testsPassed': 7, 'regressionFailuresBeforeFix': 1,
            'seedRows': 3, 'totalCents': 3351, 'roundedCents': 51,
            'migrationUpgradePassed': True, 'migrationDowngradePassed': True,
            'dataPreserved': True, 'changedFiles': 2}
BUG = 'discounted = cents * (100 - discount_percent) // 100'
FIX = 'discounted = (cents * (100 - discount_percent) + 50) // 100'
REGRESSION = '''

def test_half_cent_rounds_up():
    assert get('/orders/3/quote?discount_percent=50').json() == {'id': 3, 'discounted_cents': 51}


def test_no_discount():
    assert get('/orders/3/quote?discount_percent=0').json() == {'id': 3, 'discounted_cents': 101}


def test_full_discount():
    assert get('/orders/3/quote?discount_percent=100').json() == {'id': 3, 'discounted_cents': 0}
'''


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads(path.read_text())


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def connect():
    return psycopg.connect(host=str(DB.socket), port=5432, user='postgres', dbname='postgres',
                           connect_timeout=5, options='-c statement_timeout=10000')


def rows(connection):
    return connection.execute('SELECT id,customer,total_cents FROM orders ORDER BY id').fetchall()


def check_database(connection):
    assert rows(connection) == EXPECTED_ROWS, 'Seeded database rows changed'
    assert connection.execute('SHOW listen_addresses').fetchone() == ('',)
    columns = connection.execute("SELECT column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' ORDER BY ordinal_position").fetchall()
    assert columns == [('id','integer','NO'),('customer','text','NO'),('total_cents','integer','NO')], 'Database schema changed'
    constraints = connection.execute("SELECT contype,pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='orders'::regclass AND contype IN ('p','c') ORDER BY contype").fetchall()
    assert constraints == [('c','CHECK ((total_cents >= 0))'),('p','PRIMARY KEY (id)')], 'Database constraints changed'


def counts(path):
    suite = ET.parse(path).getroot().find('testsuite')
    assert suite is not None
    return {key: int(suite.attrib[key]) for key in ['tests', 'failures', 'errors', 'skipped']}


def pytest(output, expected_failures=0):
    result = subprocess.run(['python', '-m', 'pytest', '-q', f'--junitxml={output}'],
                            cwd=PROJECT, env=DB.env, capture_output=True, text=True, timeout=45)
    assert result.returncode == (1 if expected_failures else 0), result.stdout + result.stderr
    stats = counts(output)
    assert stats['failures'] == expected_failures and stats['errors'] == stats['skipped'] == 0
    return stats['tests']


def patch():
    return ''.join(''.join(difflib.unified_diff((FIXTURE/name).read_text().splitlines(keepends=True),
                                               (PROJECT/name).read_text().splitlines(keepends=True),
                                               fromfile='a/'+name, tofile='b/'+name))
                   for name in ['app.py', 'test_app.py'])


def baseline():
    expected = {'fixture': 'fullstack-fastapi-postgres-v1', 'expectedSummary': EXPECTED,
                'inputSha256': {name: sha((FIXTURE/name).read_bytes()) for name in INPUTS}}
    assert read_json(ROOT/'baseline.json') == expected, 'Prepared baseline changed'
    for name in INPUTS:
        if name not in ['app.py', 'test_app.py']:
            assert (PROJECT/name).read_bytes() == (FIXTURE/name).read_bytes(), f'Input changed: {name}'
    return expected


def prepare():
    if any(path.exists() for path in [PROJECT, ROOT/'database', ROOT/'baseline.json']):
        raise RuntimeError('Refusing to overwrite existing prepared state')
    ROOT.mkdir(parents=True, exist_ok=True)
    shutil.copytree(FIXTURE, PROJECT)
    DB.init()
    with DB.running(), connect() as connection:
        connection.execute((PROJECT/'seed.sql').read_text())
        connection.commit()
        assert rows(connection) == EXPECTED_ROWS
        assert pytest(ROOT/'baseline-tests.xml') == 4
    write_json(ROOT/'baseline.json', {'fixture': 'fullstack-fastapi-postgres-v1', 'expectedSummary': EXPECTED,
               'inputSha256': {name: sha((FIXTURE/name).read_bytes()) for name in INPUTS}})
    assert not (DB.data/'postmaster.pid').exists()


def analyze():
    (OUTPUT/'verification.json').unlink(missing_ok=True)
    baseline()
    OUTPUT.mkdir(exist_ok=True, parents=True)
    # Reset only the two owned task files. Uploaded recipe files remain read-only inputs.
    original = (FIXTURE/'app.py').read_text()
    (PROJECT/'app.py').write_text(original)
    (PROJECT/'test_app.py').write_text((FIXTURE/'test_app.py').read_text()+REGRESSION)
    with DB.running(), connect() as connection:
        assert rows(connection) == EXPECTED_ROWS, 'Seed data changed before workload'
        assert connection.execute('SHOW listen_addresses').fetchone() == ('',)
        assert not connection.execute("SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='priority'").fetchall()
        assert pytest(OUTPUT/'regression.xml', expected_failures=1) == 7
        assert original.count(BUG) == 1
        (PROJECT/'app.py').write_text(original.replace(BUG, FIX))
        assert pytest(OUTPUT/'tests.xml') == 7
        api = subprocess.run(['python', '-c', "import json; from test_app import get; print(json.dumps({'orders':get('/orders').json(),'rounded':get('/orders/3/quote?discount_percent=50').json()}))"],
                             cwd=PROJECT, env=DB.env, capture_output=True, text=True, check=True, timeout=30)
        api_results = json.loads(api.stdout)
        assert api_results['rounded'] == {'id': 3, 'discounted_cents': 51}
        before = rows(connection)
        connection.execute((PROJECT/'upgrade.sql').read_text())
        connection.commit()
        assert connection.execute('SELECT id,priority FROM orders ORDER BY id').fetchall() == [(1,'urgent'),(2,'normal'),(3,'normal')]
        # A failed CHECK-constraint write must roll back and preserve original rows.
        try:
            with connection.transaction():
                connection.execute("UPDATE orders SET priority='invalid' WHERE id=1")
        except psycopg.errors.CheckViolation:
            constraint_rejected = True
        else:
            raise AssertionError('Migration constraint accepted invalid priority')
        assert rows(connection) == before == EXPECTED_ROWS
        connection.execute((PROJECT/'downgrade.sql').read_text())
        connection.commit()
        assert not connection.execute("SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='priority'").fetchall()
        assert rows(connection) == before
        write_json(OUTPUT/'api-results.json', api_results)
        write_json(OUTPUT/'migration.json', {'upgrade': True, 'downgrade': True, 'constraintRejected': constraint_rejected,
                   'rowsBefore': [list(row) for row in before], 'rowsAfter': [list(row) for row in rows(connection)]})
    write_json(OUTPUT/'summary.json', EXPECTED)
    (OUTPUT/'change.patch').write_text(patch())
    verify(check_receipt=False)


def verify(check_receipt=True):
    receipt_path = OUTPUT/'verification.json'
    previous = receipt_path.read_bytes() if receipt_path.exists() else None
    receipt_path.unlink(missing_ok=True)
    baseline()
    assert not (DB.data/'postmaster.pid').exists(), 'Postgres must be stopped between recipe steps'
    with DB.running(), connect() as connection:
        check_database(connection)
    assert (PROJECT/'app.py').read_text() == (FIXTURE/'app.py').read_text().replace(BUG,FIX)
    assert (PROJECT/'test_app.py').read_text() == (FIXTURE/'test_app.py').read_text()+REGRESSION
    assert read_json(OUTPUT/'summary.json') == EXPECTED
    assert counts(OUTPUT/'tests.xml') == {'tests':7,'failures':0,'errors':0,'skipped':0}
    assert counts(OUTPUT/'regression.xml') == {'tests':7,'failures':1,'errors':0,'skipped':0}
    api = read_json(OUTPUT/'api-results.json')
    assert api == {'orders':[{'id':i,'customer':c,'total_cents':t} for i,c,t in EXPECTED_ROWS], 'rounded':{'id':3,'discounted_cents':51}}
    assert read_json(OUTPUT/'migration.json') == {'upgrade':True,'downgrade':True,'constraintRejected':True,
           'rowsBefore':[list(row) for row in EXPECTED_ROWS], 'rowsAfter':[list(row) for row in EXPECTED_ROWS]}
    assert (OUTPUT/'change.patch').read_text() == patch() and FIX in patch()
    receipt = {'passed':True,'summary':EXPECTED,'outputSha256':{name:sha((OUTPUT/name).read_bytes()) for name in OUTPUTS}}
    if check_receipt:
        assert previous is not None and json.loads(previous) == receipt
    write_json(receipt_path, receipt)


def test():
    verify()
    for path, changed in [(ROOT/'baseline.json','{}'),(PROJECT/'upgrade.sql','SELECT 1;'),
                          (OUTPUT/'summary.json','{}'),(OUTPUT/'change.patch','corrupt patch')]:
        original=path.read_bytes()
        try:
            path.write_text(changed)
            try:
                verify()
            except (AssertionError, KeyError, ValueError):
                pass
            else:
                raise AssertionError(f'Corruption accepted: {path}')
        finally:
            path.write_bytes(original)
        verify(check_receipt=False)
    with DB.running(), connect() as connection:
        connection.execute('UPDATE orders SET total_cents=0 WHERE id=3')
    for operation in [verify, analyze]:
        try:
            operation()
        except AssertionError:
            pass
        else:
            raise AssertionError('Corrupt database accepted')
    assert not (DB.data/'postmaster.pid').exists(), 'Failure left a database running'
    with DB.running(), connect() as connection:
        connection.execute('UPDATE orders SET total_cents=101 WHERE id=3')
    for name in [*OUTPUTS,'verification.json']:
        (OUTPUT/name).unlink(missing_ok=True)
    analyze()
    verify()
    print('Baseline, migration input, summary, patch and database corruption rejected; outputs regenerated')


if __name__ == '__main__':
    commands={'prepare':prepare,'analyze':analyze,'verify':verify,'test':test}
    if len(sys.argv)!=2 or sys.argv[1] not in commands:
        raise SystemExit('Expected prepare|analyze|verify|test')
    commands[sys.argv[1]]()
    print('fullstack-fastapi-postgres '+sys.argv[1]+': passed')
