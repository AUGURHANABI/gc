#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --frozen-lockfile 2>&1 || pnpm install 2>&1

echo "Building the Next.js project..."
pnpm next build

echo "Build completed successfully!"
