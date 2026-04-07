#!/usr/bin/env bash
# Pushes env vars to Vercel Production using the CLI (project must be linked: npx vercel link).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/.env.vercel}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Copy .env.vercel.example → .env.vercel and add your secrets, then run this script again."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

require() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Error: $name is empty in $ENV_FILE"
    exit 1
  fi
}

require DATABASE_URL
require COGNITO_REGION
require COGNITO_USER_POOL_ID
require COGNITO_CLIENT_ID

echo "Adding / updating Production env on Vercel project (linked from $ROOT)…"

npx vercel env add DATABASE_URL production --value "$DATABASE_URL" --yes --sensitive --force
npx vercel env add COGNITO_REGION production --value "$COGNITO_REGION" --yes --force
npx vercel env add COGNITO_USER_POOL_ID production --value "$COGNITO_USER_POOL_ID" --yes --force
npx vercel env add COGNITO_CLIENT_ID production --value "$COGNITO_CLIENT_ID" --yes --force

if [[ -n "${ACCESS_CAP:-}" ]]; then
  npx vercel env add ACCESS_CAP production --value "$ACCESS_CAP" --yes --force
else
  echo "Skipping ACCESS_CAP (unset — app default 1000)."
fi

echo "Done. Run: npx vercel --prod  (or redeploy from the Vercel dashboard)."
