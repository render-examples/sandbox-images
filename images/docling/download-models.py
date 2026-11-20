"""Install only reviewed model revisions with content-hash validation."""
from pathlib import Path
import hashlib,json,os,urllib.request
lock=json.loads(Path(__file__).with_name('model-lock.json').read_text())
root=Path(os.environ.get('DOCLING_ARTIFACTS_PATH','/opt/render/models/docling'))
for model in lock['models']:
 for item in model['files']:
  path=root/model['repository'].replace('/','--')/item['name'];path.parent.mkdir(parents=True,exist_ok=True)
  if path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256']:continue
  with urllib.request.urlopen('https://huggingface.co/'+model['repository']+'/resolve/'+model['revision']+'/'+item['name'],timeout=180) as source, path.with_suffix(path.suffix+'.partial').open('wb') as output:
   while chunk:=source.read(1024*1024):output.write(chunk)
  temporary=path.with_suffix(path.suffix+'.partial')
  if hashlib.sha256(temporary.read_bytes()).hexdigest()!=item['sha256']:raise ValueError('Model hash mismatch: '+item['name'])
  temporary.replace(path)
(root/'identity.json').write_text(json.dumps(lock,sort_keys=True)+'\n')
