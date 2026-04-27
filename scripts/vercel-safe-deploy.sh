#!/usr/bin/env bash
set -euo pipefail

EXPECTED_SCOPE="${VERCEL_SCOPE:-}"
EXPECTED_PROJECT="${VERCEL_PROJECT:-}"
EXPECTED_DOMAIN="${VERCEL_PROD_DOMAIN:-}"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Error: Vercel CLI not found. Install it first."
  exit 1
fi

if [[ -z "$EXPECTED_SCOPE" || -z "$EXPECTED_PROJECT" ]]; then
  echo "Error: set VERCEL_SCOPE and VERCEL_PROJECT."
  echo "Example: VERCEL_SCOPE=my-team VERCEL_PROJECT=podcast-stats bash scripts/vercel-safe-deploy.sh --prod"
  exit 1
fi

DEPLOY_MODE="preview"
if [[ "${1:-}" == "--prod" ]]; then
  DEPLOY_MODE="prod"
fi

if [[ ! -f ".vercel/project.json" ]]; then
  echo "Error: .vercel/project.json not found. Run 'vercel link --scope $EXPECTED_SCOPE' first."
  exit 1
fi

LOCAL_PROJECT="$(node -e "console.log(require('./.vercel/project.json').projectName || '')")"
if [[ "$LOCAL_PROJECT" != "$EXPECTED_PROJECT" ]]; then
  echo "Error: linked project mismatch."
  echo "  local:    $LOCAL_PROJECT"
  echo "  expected: $EXPECTED_PROJECT"
  echo "Run: vercel link --scope $EXPECTED_SCOPE"
  exit 1
fi

echo "Deploy target:"
echo "  scope:   $EXPECTED_SCOPE"
echo "  project: $EXPECTED_PROJECT"
echo "  mode:    $DEPLOY_MODE"

if [[ "$DEPLOY_MODE" == "preview" ]]; then
  DEPLOY_OUTPUT="$(vercel deploy --yes --scope "$EXPECTED_SCOPE")"
else
  DEPLOY_OUTPUT="$(vercel deploy --prod --yes --scope "$EXPECTED_SCOPE")"
fi

echo "$DEPLOY_OUTPUT"

DEPLOYMENT_URL="$(echo "$DEPLOY_OUTPUT" | grep -Eo 'https://[A-Za-z0-9.-]+\.vercel\.app' | tail -n1)"
if [[ -z "$DEPLOYMENT_URL" ]]; then
  echo "Error: could not detect deployment URL in Vercel output."
  exit 1
fi

if [[ "$DEPLOY_MODE" == "prod" && -n "$EXPECTED_DOMAIN" ]]; then
  echo "Assigning production domain: $EXPECTED_DOMAIN"
  vercel alias set "$DEPLOYMENT_URL" "$EXPECTED_DOMAIN" --scope "$EXPECTED_SCOPE"
fi

echo "Done: $DEPLOYMENT_URL"
