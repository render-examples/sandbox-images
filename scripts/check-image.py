#!/usr/bin/env python3
"""Build and exercise one image without network access at execution time."""
import argparse
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def run(*command: str) -> None:
    subprocess.run(command, cwd=ROOT, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("slug", choices=[p.parent.name for p in (ROOT / "images").glob("*/manifest.json")])
    parser.add_argument("--skip-build", action="store_true")
    args = parser.parse_args()
    manifest = json.loads((ROOT / "images" / args.slug / "manifest.json").read_text())
    tag = f"render-sandbox-{args.slug}:{manifest['version']}"
    if not args.skip_build:
        # The CI Buildx driver is docker-container: explicitly load the one
        # architecture being tested rather than leaving its result in a cache.
        run("docker", "buildx", "build", "--load", "--provenance=false", "--platform", "linux/amd64", "-f", f"images/{args.slug}/Dockerfile", "-t", tag, ".")
    inspected = json.loads(subprocess.check_output(["docker", "image", "inspect", "--format", "{{json .}}", tag], cwd=ROOT, text=True))
    image_id = inspected["Id"]
    if not re.fullmatch(r"sha256:[a-f0-9]{64}", image_id):
        raise SystemExit("Docker did not return an immutable image ID")
    if (inspected["Os"], inspected["Architecture"]) != ("linux", "amd64"):
        raise SystemExit("The loaded image is not linux/amd64")
    # Classic Docker uses the config digest as Id. The containerd image store
    # uses the manifest digest and supplies the config digest in its descriptor.
    descriptor = inspected.get("Descriptor")
    config_digest = descriptor.get("annotations", {}).get("config.digest") if descriptor else image_id
    if not config_digest or not re.fullmatch(r"sha256:[a-f0-9]{64}", config_digest):
        raise SystemExit("Cannot establish the loaded image's configuration digest")
    # Run by ID, not by tag; retagging locally cannot silently change the image.
    run("docker", "run", "--rm", "--platform", "linux/amd64", "--network", "none", image_id, "sh", "-ec",
        'for tool in sh bash timeout cat mkdir mount pivot_root umount; do command -v "$tool" >/dev/null; done')
    run("docker", "run", "--rm", "--platform", "linux/amd64", "--network", "none", "--memory", "2g", "--cpus", "2", image_id,
        "timeout", "-k", "5", "120", "python", f"/opt/render/examples/{args.slug}/smoke.py")
    # A recipe's actual capture/restore happens on Render; this validates its
    # deterministic data and workload against the exact local image first.
    for path in sorted((ROOT / "snapshots").glob("*/manifest.json")):
        recipe = json.loads(path.read_text())
        if recipe["recipe"]["imageSlug"] != args.slug:
            continue
        script = path.parent / "recipe.py"
        if not script.is_file():
            raise SystemExit(f"Missing recipe.py for {path.parent.name}")
        run("docker", "run", "--rm", "--platform", "linux/amd64", "--network", "none", "--memory", "2g", "--cpus", "2",
            "--mount", f"type=bind,src={path.parent},dst=/opt/recipe,readonly", image_id,
            "timeout", "-k", "5", "120", "sh", "-ec",
            "python /opt/recipe/recipe.py prepare && python /opt/recipe/recipe.py analyze && python /opt/recipe/recipe.py verify && python /opt/recipe/test_recipe.py")
    artifacts = ROOT / "artifacts"
    artifacts.mkdir(exist_ok=True)
    (artifacts / f"checked-{args.slug}.json").write_text(json.dumps({
        "schemaVersion": 1, "slug": args.slug, "version": manifest["version"],
        "imageId": image_id, "configDigest": config_digest,
        "platform": "linux/amd64", "localChecksPassed": True,
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
