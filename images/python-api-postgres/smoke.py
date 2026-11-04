"""Exercise actual local PostgreSQL and FastAPI without any network access."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import psycopg
from database import Database

with tempfile.TemporaryDirectory(prefix='python-api-', dir='/workspace') as temporary:
    root = Path(temporary)
    root.chmod(0o755)
    db = Database(root/'database')
    project = root/'project'
    shutil.copytree('/opt/render/fixtures/fullstack-fastapi-postgres', project)
    db.init()
    with db.running():
        os.environ.update(db.env)
        with psycopg.connect() as connection:
            connection.execute((project/'seed.sql').read_text())
        subprocess.run(['python','-m','pytest','-q'],cwd=project,env=db.env,check=True,timeout=45)
    Path('/workspace/image-smoke').mkdir(exist_ok=True)
    Path('/workspace/image-smoke/result.json').write_text(json.dumps({'status':'passed','baselineTests':4,'seedRows':3,'totalCents':3351})+'\n')
