#!/bin/bash

# Script to create the initial project structure for EffectiveAgent services.
# Creates category directories, root files, rule structure, and scaffolds
# core, ai, capabilities, execution, and memory services using create-service.sh.
# IMPORTANT: Run this script from the project root directory.

# --- Configuration ---
base_dir="src/services" # Define base dir HERE
scripts_dir="scripts"
create_service_script="$scripts_dir/create-service.sh"

# --- Ensure create-service.sh exists and is executable ---
if [ ! -f "$create_service_script" ]; then
    echo "Error: Service creation script not found at $create_service_script"
    exit 1
fi
if [ ! -x "$create_service_script" ]; then
    echo "Error: Service creation script ($create_service_script) is not executable."
    exit 1
fi

# --- Create Base Structure ---
echo "--- Setting up Base Structure ---"
mkdir -p "$base_dir" # Use variable
touch "$base_dir/../errors.ts" # Go up one level for root files
touch "$base_dir/../index.ts"
touch "$base_dir/../schema.ts"
touch "$base_dir/../types.ts"
mkdir -p "$base_dir/docs"
touch "$base_dir/docs/OverallArchitecture.md"
touch "$base_dir/TECHNOLOGY_STACK.md"

# --- Create Rules Structure ---
echo "--- Setting up /rules Structure ---"
mkdir -p "rules/global"
mkdir -p "rules/meta"
touch "rules/global/clean-code.mdc"
touch "rules/global/coding-style.md"
touch "rules/global/typescript.md"
touch "rules/meta/ai-collaboration.md"
touch "rules/architecture.md"
touch "rules/effect-patterns.md"
touch "rules/testing.md"
touch "rules/tech-stack.md"
touch ".cursorrules"

# --- Create Category Directories ---
echo "--- Creating Service Categories ---"
mkdir -p "$base_dir/core"
mkdir -p "$base_dir/ai"
mkdir -p "$base_dir/capabilities"
mkdir -p "$base_dir/execution"
mkdir -p "$base_dir/memory"

# --- Scaffold Services using create-service.sh ---
# Call the script using 'bash' and pass arguments
# The create-service.sh script will internally prepend "src/services"

echo "--- Scaffolding Core Services ---"
bash "$create_service_script" core loader
bash "$create_service_script" core logging
bash "$create_service_script" core repository
bash "$create_service_script" core storage
bash "$create_service_script" core attachment
bash "$create_service_script" core tag

echo "--- Scaffolding AI Services ---"
bash "$create_service_script" ai prompt
bash "$create_service_script" ai model
bash "$create_service_script" ai provider

echo "--- Scaffolding Capabilities Services ---"
bash "$create_service_script" capabilities skill
bash "$create_service_script" capabilities tool
bash "$create_service_script" capabilities mcp
bash "$create_service_script" capabilities intelligence
bash "$create_service_script" capabilities persona

echo "--- Scaffolding Execution Services ---"
bash "$create_service_script" execution agent
bash "$create_service_script" execution thread
bash "$create_service_script" execution supervisor

echo "--- Scaffolding Memory Services ---"
bash "$create_service_script" memory chat
bash "$create_service_script" memory artifact
bash "$create_service_script" memory longterm

# --- Manual Adjustments Required ---
# ... (Keep the notes about manual adjustments) ...

echo "--------------------------------------------------"
echo "Project structure created successfully!"
echo "--------------------------------------------------"

exit 0
