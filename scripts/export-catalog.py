#!/usr/bin/env python3
"""Export source manifests for the global registry. Never infer verification."""
import argparse
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def validate(asset: dict) -> None:
    if asset.get("schemaVersion") != 1 or asset.get("status") not in {"draft", "verified"}:
        raise ValueError("Expected schemaVersion 1 and explicit draft/verified status")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", asset["slug"]):
        raise ValueError("Invalid asset slug")
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?", asset["version"]):
        raise ValueError("Invalid independent version")
    if asset["platform"] != "linux/amd64" or not asset["capabilities"]:
        raise ValueError("Expected linux/amd64 and at least one capability")
    for field in ("name", "description", "stack", "tags", "verification", "source"):
        if field not in asset:
            raise ValueError(f"Missing {field}")
    source = asset["source"]
    if not re.fullmatch(r"https://github\.com/[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+", source["repository"]):
        raise ValueError("Invalid source repository")
    if not re.fullmatch(r"[a-zA-Z0-9_/-]+", source["path"]) or source["path"].startswith("/") or ".." in source["path"].split("/"):
        raise ValueError("Invalid repository-relative source path")
    if source["revision"] is not None and not re.fullmatch(r"[a-f0-9]{40}", source["revision"]):
        raise ValueError("Source revision must be a full commit SHA or null")
    image = asset.get("image")
    if image:
        if not re.fullmatch(r"ghcr\.io/[a-z0-9][a-z0-9._/-]+", image["repository"]):
            raise ValueError("Invalid GHCR image repository")
        if image["tag"] != asset["version"] and asset["kind"] == "sandbox-image":
            raise ValueError("Image release tag must match its independent version")
        if image["digest"] is not None and not re.fullmatch(r"sha256:[a-f0-9]{64}", image["digest"]):
            raise ValueError("Invalid image digest")
    if asset["kind"] == "sandbox-image":
        if not image or "recipe" in asset:
            raise ValueError("Image metadata required; recipe metadata forbidden")
    elif asset["kind"] == "snapshot-recipe":
        recipe = asset["recipe"]
        if recipe["kind"] not in {"filesystem", "runtime"} or recipe["groupScoped"] is not True:
            raise ValueError("Snapshots must declare their kind and group scope")
    else:
        raise ValueError("Unknown asset kind")
    verification = asset["verification"]
    if verification["status"] not in {"unverified", "passed"}:
        raise ValueError("Unknown verification status")
    if asset["status"] == "verified":
        if not source["revision"] or not image or not image["digest"]:
            raise ValueError("Verified assets require immutable source and image digests")
        if verification["status"] != "passed" or not all(verification.get(k) for k in ("verifiedAt", "evidenceUrl", "clientVersion", "computePlan")):
            raise ValueError("Verified assets require dated Render evidence and client/plan metadata")
        if not verification["evidenceUrl"].startswith("https://"):
            raise ValueError("Verification evidence must use HTTPS")


def build(root: Path = ROOT) -> dict:
    assets = []
    for category in ("images", "variants", "snapshots"):
        for path in sorted((root / category).glob("*/manifest.json")):
            asset = json.loads(path.read_text())
            validate(asset)
            if asset["source"]["path"] != str(path.parent.relative_to(root)):
                raise ValueError(f"Source path does not match manifest location: {path}")
            readme = path.parent / "README.md"
            if readme.exists():
                asset["readme"] = readme.read_text()
            assets.append(asset)
    by_slug = {a["slug"]: a for a in assets}
    if len(by_slug) != len(assets):
        raise ValueError("Asset slugs must be unique")
    for asset in assets:
        if asset["kind"] == "snapshot-recipe":
            parent = by_slug.get(asset["recipe"]["imageSlug"])
            if not parent or parent["kind"] != "sandbox-image":
                raise ValueError(f"Missing image dependency for {asset['slug']}")
            if asset["status"] == "verified" and (parent["status"] != "verified" or parent["image"]["digest"] != asset["image"]["digest"] or parent["image"]["repository"] != asset["image"]["repository"]):
                raise ValueError("Verified snapshots must use their verified parent image digest")
    return {"schemaVersion": 1, "assets": assets}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    content = json.dumps(build(), indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(content)
    else:
        print(content, end="")
