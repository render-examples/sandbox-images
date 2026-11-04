"""Check argument forwarding and resolver scope without launching an agent."""
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile

wrapper_source = Path(sys.argv[1]).read_text()
upstream = "/opt/cursor/2026.10.22-27dcf5f/cursor-agent"
assert wrapper_source.count(upstream) == 1
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    recorder = root / "upstream.py"
    recorder.write_text("import json, os, sys\nprint(json.dumps({'args': sys.argv[1:], 'resolver': os.environ.get('RES_OPTIONS')}))\n")
    wrapper = root / "agent"
    wrapper.write_text(wrapper_source.replace(upstream, f"{shlex.quote(sys.executable)} {shlex.quote(str(recorder))}"))
    base_env = dict(os.environ)
    base_env.pop("RES_OPTIONS", None)

    def check(arguments, resolver, expected):
        env = dict(base_env)
        if resolver is not None:
            env["RES_OPTIONS"] = resolver
        result = subprocess.run(["sh", str(wrapper), *arguments], env=env, capture_output=True, text=True, check=True, timeout=5)
        actual = json.loads(result.stdout)
        assert actual == {"args": ["--disable-auto-update", *arguments], "resolver": expected}, actual

    for flag in ["--version", "-v", "--help", "-h"]:
        check([flag], None, "attempts:1 timeout:1")
        check([flag], "rotate timeout:5", "rotate timeout:5 attempts:1 timeout:1")
    for arguments in [[], ["--print", "--output-format", "json", "--", "-a prompt with spaces"], ["login"], ["--help", "--print"], ["--", "--help"]]:
        check(arguments, None, None)
        check(arguments, "rotate timeout:5", "rotate timeout:5")
print("Cursor wrapper: 18 resolver-scope and argument-forwarding checks passed")
