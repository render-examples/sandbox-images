"""Download only pinned model files and verify SHA-256 before installation."""
from pathlib import Path
import hashlib,json,os,urllib.request
lock=json.loads(Path(__file__).with_name('model-lock.json').read_text())
target=Path(os.environ.get('RENDER_EMBED_MODEL_DIR','/opt/render/models/bge-small-en-v1.5'));target.mkdir(parents=True,exist_ok=True)
for item in lock['files']:
 path=target/item['name'];path.parent.mkdir(parents=True,exist_ok=True)
 if path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256']:continue
 request=urllib.request.Request('https://huggingface.co/'+lock['repository']+'/resolve/'+lock['revision']+'/'+item['name'])
 with urllib.request.urlopen(request,timeout=120) as source, path.with_suffix(path.suffix+'.partial').open('wb') as output:
  while chunk:=source.read(1024*1024):output.write(chunk)
 temporary=path.with_suffix(path.suffix+'.partial')
 if hashlib.sha256(temporary.read_bytes()).hexdigest()!=item['sha256']:raise ValueError('Model hash mismatch: '+item['name'])
 temporary.replace(path)
(target/'identity.json').write_text(json.dumps(lock,sort_keys=True)+'\n')
