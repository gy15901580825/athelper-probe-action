#!/usr/bin/env bash
# Usage: threshold-gate.sh <threshold> <sarif-file>
# Exits 0 (pass) or 1 (block) based on the threshold mode.
set -euo pipefail

THRESHOLD="${1:-warn}"
SARIF="${2:-report.sarif}"

if [ ! -f "$SARIF" ]; then
  echo "threshold-gate: SARIF file $SARIF not found; treating as no findings." >&2
  exit 0
fi

# Require jq for SARIF parsing
if ! command -v jq >/dev/null 2>&1; then
  echo "threshold-gate: jq not found in PATH; cannot parse SARIF" >&2
  exit 0
fi

# Extract severity counts from SARIF properties.severity
declare -A counts
for sev in critical high medium low info; do
  counts[$sev]=$(jq --arg s "$sev" '[.runs[].results[]? | select(.properties.severity == $s)] | length' "$SARIF" 2>/dev/null || echo 0)
done

echo "ATHelper threshold gate: critical=${counts[critical]} high=${counts[high]} medium=${counts[medium]} low=${counts[low]} info=${counts[info]} (mode=$THRESHOLD)"

case "$THRESHOLD" in
  warn)
    exit 0
    ;;
  block-on-critical)
    if [ "${counts[critical]}" -gt 0 ]; then
      echo "::error title=ATHelper::Critical findings present; failing PR per threshold=block-on-critical"
      exit 1
    fi
    ;;
  block-on-high)
    if [ "${counts[critical]}" -gt 0 ] || [ "${counts[high]}" -gt 0 ]; then
      echo "::error title=ATHelper::High+ findings present; failing PR per threshold=block-on-high"
      exit 1
    fi
    ;;
  *)
    echo "::warning title=ATHelper::Unknown threshold $THRESHOLD; treating as warn" >&2
    ;;
esac
exit 0
