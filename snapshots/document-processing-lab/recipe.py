"""Prepare and validate the pinned document workload inside its parent image."""
import argparse
import json
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, "/opt/render/examples/document-extraction")
from workload import analyze, prepare, verify


def corruption_tests():
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory) / "fixture"
        output = Path(directory) / "output"
        prepare(root)
        analyze(root, output)
        for target in (root / "input/invoice.pdf", output / "tables.csv", output / "extracted.json"):
            original = target.read_bytes()
            try:
                if target.name == "extracted.json":
                    altered = json.loads(original)
                    altered["documents"][1]["page"] = 2
                    target.write_text(json.dumps(altered))
                elif target.name == "tables.csv":
                    target.write_bytes(original.replace(b"120.00", b"999.00"))
                else:
                    target.write_bytes(original + b"\ncorrupted")
                try:
                    verify(root, output)
                except (ValueError, OSError):
                    pass
                else:
                    raise AssertionError(f"Corruption was accepted: {target.name}")
            finally:
                target.write_bytes(original)
        verify(root, output)
    print("Passed three input/output corruption checks")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("stage", choices=["prepare", "analyze", "verify", "test"])
    args = parser.parse_args()
    root = Path("/workspace/document-processing-lab")
    output = Path("/workspace/output")
    if args.stage == "prepare":
        prepare(root)
    elif args.stage == "analyze":
        analyze(root, output)
    elif args.stage == "verify":
        verify(root, output)
    else:
        corruption_tests()
