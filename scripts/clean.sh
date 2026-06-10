#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rm -rf apps/website/.next apps/admin/dist services/api/dist
