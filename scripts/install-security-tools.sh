#!/bin/sh
set -eu
# Pinned upstream release archives. This installer is for GitHub's Linux x64 runner.
test "$(uname -s)" = Linux
test "$(uname -m)" = x86_64
destination="${1:?Usage: install-security-tools.sh DESTINATION}"
mkdir -p "$destination"
destination=$(cd "$destination" && pwd)
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT HUP INT TERM
curl --fail --show-error --location --proto '=https' --tlsv1.2 https://github.com/aquasecurity/trivy/releases/download/v0.76.2/trivy_0.76.2_Linux-64bit.tar.gz --output "$temporary/trivy.tar.gz"
printf '%s  %s\n' bc0fc726e017b8927a62b2d3531d7a84ee01769daf5c99ed866dced54089fdbf "$temporary/trivy.tar.gz" | sha256sum --check
curl --fail --show-error --location --proto '=https' --tlsv1.2 https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz --output "$temporary/gitleaks.tar.gz"
printf '%s  %s\n' 551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb "$temporary/gitleaks.tar.gz" | sha256sum --check
tar -xzf "$temporary/trivy.tar.gz" -C "$destination" trivy
tar -xzf "$temporary/gitleaks.tar.gz" -C "$destination" gitleaks
