#!/usr/bin/env bash
set -euo pipefail

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required for this macOS install." >&2
  exit 1
fi

if ! command -v clamscan >/dev/null 2>&1; then
  brew install clamav
fi

if ! command -v freshclam >/dev/null 2>&1; then
  echo "ClamAV installed without freshclam; update the signature database before scanning." >&2
  exit 1
fi

config_dir="$(brew --prefix)/etc/clamav"
database_dir="$(brew --prefix)/var/lib/clamav"
certs_dir="$config_dir/certs"
mkdir -p "$config_dir" "$database_dir"

ensure_config() {
  local name="$1"
  local sample="$config_dir/$name.sample"
  local config="$config_dir/$name"
  if [[ ! -f "$config" ]]; then
    if [[ ! -f "$sample" ]]; then
      echo "Missing ClamAV sample config: $sample" >&2
      return 1
    fi
    sed '/^[[:space:]]*Example[[:space:]]*$/d' "$sample" > "$config"
  fi
  if grep -q '^[[:space:]]*Example[[:space:]]*$' "$config"; then
    local cleaned="$config.tmp.$$"
    sed '/^[[:space:]]*Example[[:space:]]*$/d' "$config" > "$cleaned"
    mv "$cleaned" "$config"
  fi
  if ! grep -q '^DatabaseDirectory[[:space:]]' "$config"; then
    printf '\nDatabaseDirectory %s\n' "$database_dir" >> "$config"
  fi
  if [[ -d "$certs_dir" ]] && ! grep -q '^CVDCertsDirectory[[:space:]]' "$config"; then
    printf 'CVDCertsDirectory %s\n' "$certs_dir" >> "$config"
  fi
}

ensure_config freshclam.conf
ensure_config clamd.conf
if ! grep -q '^TCPSocket[[:space:]]' "$config_dir/clamd.conf"; then
  printf 'TCPSocket 3310\n' >> "$config_dir/clamd.conf"
fi
if ! grep -q '^TCPAddr[[:space:]]' "$config_dir/clamd.conf"; then
  printf 'TCPAddr 127.0.0.1\n' >> "$config_dir/clamd.conf"
fi

freshclam
echo "ClamAV CLI and signatures are ready. Start the daemon with: $(brew --prefix clamav)/sbin/clamd --foreground"
echo "ProofLens is configured for the local daemon at 127.0.0.1:3310; restart the backend after starting it."
