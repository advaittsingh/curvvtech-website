#!/usr/bin/env bash
set -euo pipefail
# Wire this to your host (Vercel, ECS, etc.). Default: build all workspace artifacts.
cd "$(dirname "$0")/.."
npm run build
