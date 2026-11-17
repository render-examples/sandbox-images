"""Build an explicitly versioned wheel with one audited dependency-metadata patch."""
from __future__ import annotations
import argparse
import base64
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import urllib.request
import zipfile


def patch_wheel(data: bytes, spec: dict[str, str]) -> tuple[str, bytes]:
    if hashlib.sha256(data).hexdigest() != spec['sha256']:
        raise ValueError('Upstream wheel checksum mismatch')
    name = spec['name'].replace('-', '_')
    version = spec['version']
    patched_version = version + '+render.1'
    prefix = f'{name}-{version}.dist-info/'
    patched_prefix = f'{name}-{patched_version}.dist-info/'
    with zipfile.ZipFile(io.BytesIO(data)) as source:
        entries = {entry.filename: (entry, source.read(entry)) for entry in source.infolist()}
        if len(entries) != len(source.infolist()):
            raise ValueError('Duplicate wheel entries')
    key = prefix + 'METADATA'
    metadata = entries[key][1].decode()
    expected = 'Requires-Dist: ' + spec['requiresDist']
    if metadata.splitlines().count(expected) != 1:
        raise ValueError('Upstream dependency metadata changed')
    if metadata.splitlines().count('Version: ' + version) != 1:
        raise ValueError('Upstream version metadata changed')
    metadata = metadata.replace(expected + '\n', 'Requires-Dist: ' + spec['replacement'] + '\n', 1)
    metadata = metadata.replace('Version: ' + version + '\n', 'Version: ' + patched_version + '\n', 1)
    entries[key] = (entries[key][0], metadata.encode())
    provenance = json.dumps(spec, sort_keys=True, indent=2).encode() + b'\n'
    entries[prefix + 'render-dependency-patch.json'] = (zipfile.ZipInfo(), provenance)
    output = io.BytesIO()
    records = []
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as target:
        for original, (entry, content) in sorted(entries.items()):
            if original in {prefix + 'RECORD', prefix + 'RECORD.jws', prefix + 'RECORD.p7s'}:
                continue
            destination = original.replace(prefix, patched_prefix, 1) if original.startswith(prefix) else original
            # Fixed timestamps and stable ordering make the patched wheel reproducible.
            info = zipfile.ZipInfo(destination, (1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = entry.external_attr
            target.writestr(info, content)
            digest = base64.urlsafe_b64encode(hashlib.sha256(content).digest()).decode().rstrip('=')
            records.append([destination, 'sha256=' + digest, str(len(content))])
        record = patched_prefix + 'RECORD'
        records.append([record, '', ''])
        text = io.StringIO(newline='')
        csv.writer(text, lineterminator='\n').writerows(records)
        target.writestr(zipfile.ZipInfo(record, (1980, 1, 1, 0, 0, 0)), text.getvalue())
    return spec['filename'].replace('-' + version + '-', '-' + patched_version + '-', 1), output.getvalue()


def patched_lock(text: str, spec: dict[str, str], wheel: Path, digest: str) -> str:
    pattern = re.compile(r'^' + re.escape(spec['name']) + r'==' + re.escape(spec['version']) + r' \\\n(?:    --hash=sha256:[0-9a-f]+(?: \\)?\n)+', re.MULTILINE)
    matches = list(pattern.finditer(text))
    if len(matches) != 1 or spec['sha256'] not in matches[0].group():
        raise ValueError('Upstream wheel is not hash-pinned in the lock')
    return pattern.sub(lambda _: f'{spec["name"]} @ {wheel.resolve().as_uri()} --hash=sha256:{digest}\n', text, count=1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package')
    parser.add_argument('lock', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    specs = json.loads(Path(__file__).with_name('python-wheel-patches.json').read_text())
    spec = next(item for item in specs if item['name'] == args.package)
    if not spec['url'].startswith('https://files.pythonhosted.org/'):
        raise ValueError('Expected official PyPI wheel URL')
    with urllib.request.urlopen(spec['url'], timeout=120) as response:
        original = response.read()
    filename, data = patch_wheel(original, spec)
    args.output.mkdir(parents=True, exist_ok=True)
    wheel = args.output / filename
    wheel.write_bytes(data)
    lock = patched_lock(args.lock.read_text(), spec, wheel, hashlib.sha256(data).hexdigest())
    (args.output / 'requirements.lock').write_text(lock)
    print(f'{spec["name"]}: {spec["version"]}+render.1; {spec["requiresDist"]} -> {spec["replacement"]}')


if __name__ == '__main__':
    main()
