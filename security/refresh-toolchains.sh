#!/bin/sh
set -eu
if command -v npm >/dev/null 2>&1; then
  npm ci --prefix /opt/render/security/npm --ignore-scripts --no-audit --no-fund
  rm -rf /usr/local/lib/node_modules/npm
  mv /opt/render/security/npm/node_modules/npm /usr/local/lib/node_modules/npm
  rm -rf /root/.npm
  test "$(npm --version)" = 11.21.2
fi
if command -v python >/dev/null 2>&1; then
  python -m pip install --no-cache-dir --only-binary=:all: --require-hashes --no-deps -r /opt/render/security/python-packaging.lock
  python -m pip check
fi
# LangChain uses an isolated Python environment; update its pip separately.
if [ -x /opt/render/python/bin/python ]; then
  /opt/render/python/bin/python -m pip install --no-cache-dir --only-binary=:all: --require-hashes --no-deps -r /opt/render/security/python-packaging.lock
  /opt/render/python/bin/python -m pip check
fi
# The digest-pinned base must contain the APT security update before release.
case "$(. /etc/os-release; echo "$VERSION_CODENAME")" in
  bookworm) minimum=2.6.2 ;;
  trixie) minimum=3.0.4 ;;
  *) echo 'Unsupported Debian release for security baseline' >&2; exit 1 ;;
esac
dpkg --compare-versions "$(dpkg-query -W -f='${Version}' apt)" ge "$minimum"

# Patch libraries newer than the upstream image's last build, without a broad upgrade.
if dpkg-query -W -f='${Version}' libpq5 2>/dev/null | grep -q '^15\.'; then
  apt-get update
  apt-get install -y --no-install-recommends libpq5=15.20-0+deb12u1 libpq-dev=15.20-0+deb12u1
  rm -rf /var/lib/apt/lists/*
fi
if [ "$(. /etc/os-release; echo "$VERSION_CODENAME")" = trixie ]; then
  apt-get update
  apt-get install -y --no-install-recommends zlib1g=1:1.3.dfsg+really1.3.1-1+deb13u1
  rm -rf /var/lib/apt/lists/*
fi

# Database fixtures use Debian's runuser; remove the unused upstream Go helper.
if [ -e /usr/local/bin/gosu ]; then
  command -v runuser >/dev/null
  rm /usr/local/bin/gosu
fi
