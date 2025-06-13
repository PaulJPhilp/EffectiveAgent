#!/usr/bin/env bash
# run-structure-output.sh  (Node-based)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Point agent runtime to the master config at project root
export MASTER_CONFIG_PATH="$PROJECT_ROOT/config/master-config.json"
export EFFECTIVE_AGENT_MASTER_CONFIG="$MASTER_CONFIG_PATH"
echo "[DEBUG] MASTER_CONFIG_PATH=$MASTER_CONFIG_PATH"
echo "[DEBUG] Config contents:"
cat "$MASTER_CONFIG_PATH"

# 1️⃣ build the CLI to plain JS (once per run)
bun build "$PROJECT_ROOT/src/ea-cli/src/index.ts" \
  --outfile "$PROJECT_ROOT/.tmp/cli.js" \
  --target node

# 2️⃣ execute the emitted JS with Node
node "$PROJECT_ROOT/.tmp/cli.js" structure-output \
  --input "$SCRIPT_DIR/fixtures/my-suite.json" \
  --output "$PROJECT_ROOT/results" \
  --models "gpt-4o,claude-3" \
  --runs 3 \
  structured-output