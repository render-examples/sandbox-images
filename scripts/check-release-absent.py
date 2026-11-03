#!/usr/bin/env python3
"""Fail closed unless authenticated GHCR explicitly reports a missing manifest."""
import argparse
import base64
import json
import os
import re
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


def is_missing_manifest(status: int, body: bytes) -> bool:
    if status != 404:
        return False
    try:
        errors = json.loads(body)["errors"]
        return bool(errors) and all(e.get("code") in {"MANIFEST_UNKNOWN", "NAME_UNKNOWN"} for e in errors)
    except (ValueError, KeyError, TypeError, AttributeError):
        return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("reference")
    args = parser.parse_args()
    match = re.fullmatch(r"ghcr\.io/([a-z0-9][a-z0-9._/-]+):([a-zA-Z0-9_.-]+)", args.reference)
    if not match:
        raise SystemExit("Expected an explicit GHCR image tag")
    repository, tag = match.groups()
    actor, token = os.environ.get("GITHUB_ACTOR"), os.environ.get("GITHUB_TOKEN")
    if not actor or not token:
        raise SystemExit("GITHUB_ACTOR and GITHUB_TOKEN are required for the registry check")
    opener = build_opener(NoRedirect())
    auth = base64.b64encode(f"{actor}:{token}".encode()).decode()
    url = "https://ghcr.io/token?" + urlencode({"service": "ghcr.io", "scope": f"repository:{repository}:pull,push"})
    try:
        with opener.open(Request(url, headers={"Authorization": f"Basic {auth}"}), timeout=30) as response:
            bearer = json.load(response).get("token")
        if not bearer:
            raise SystemExit("GHCR did not issue a registry token; publication stopped")
        request = Request(f"https://ghcr.io/v2/{repository}/manifests/{tag}", headers={
            "Authorization": f"Bearer {bearer}",
            "Accept": ", ".join(["application/vnd.oci.image.index.v1+json", "application/vnd.oci.image.manifest.v1+json",
                                  "application/vnd.docker.distribution.manifest.list.v2+json", "application/vnd.docker.distribution.manifest.v2+json"]),
        })
        try:
            with opener.open(request, timeout=30):
                raise SystemExit("Release tag already exists; increment the version instead")
        except HTTPError as error:
            if not is_missing_manifest(error.code, error.read()):
                raise SystemExit(f"Registry availability check failed (HTTP {error.code}); publication stopped") from None
        print("GHCR confirms the requested release manifest is absent")
    except HTTPError as error:
        raise SystemExit(f"GHCR authentication failed (HTTP {error.code}); publication stopped") from None


if __name__ == "__main__":
    main()
