#!/usr/bin/env bash
set -euo pipefail

TARGET_SCOPE="${1:-}"

if [[ -z "$TARGET_SCOPE" ]]; then
  echo "Usage: bash scripts/use-vercel-scope.sh <scope>"
  echo "Example: bash scripts/use-vercel-scope.sh amladinovs-projects"
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Error: Vercel CLI not found. Install it first."
  exit 1
fi

echo "Switching Vercel link to scope: $TARGET_SCOPE"
rm -rf .vercel
vercel link --scope "$TARGET_SCOPE" --yes

echo "Done. Active account:"
vercel whoami
