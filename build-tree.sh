#!/bin/bash

# Script to create the service directory structure for EffectiveAgent

# Base directory for services
base_dir="src/services"

# Function to create the standard structure for a service
# Usage: create_service_structure "path/to/service"
create_service_structure() {
  local service_path="$1"
  echo "Creating structure for: $service_path"
  mkdir -p "$service_path/__tests__"
  mkdir -p "$service_path/docs"
  touch "$service_path/configuration.ts"
  touch "$service_path/docs/Architecture.md"
  touch "$service_path/docs/PRD.md"
  touch "$service_path/errors.ts"
  touch "$service_path/index.ts"
  touch "$service_path/main.ts"
  touch "$service_path/schema.ts"
  touch "$service_path/types.ts"
  touch "$service_path/__tests__/configuration.test.ts"
  touch "$service_path/__tests__/main.test.ts"
}

# --- Create Base Structure ---
echo "Creating base services directory: $base_dir"
mkdir -p "$base_dir"
touch "$base_dir/errors.ts"
touch "$base_dir/index.ts"
touch "$base_dir/schema.ts"
touch "$base_dir/types.ts"
mkdir -p "$base_dir/docs"
touch "$base_dir/docs/OverallArchitecture.md" # Added a root doc file

# --- Create Category Directories ---
echo "Creating category directories..."
mkdir -p "$base_dir/core"
mkdir -p "$base_dir/ai"
mkdir -p "$base_dir/capabilities"
mkdir -p "$base_dir/execution"
mkdir -p "$base_dir/memory"

# --- Populate Core Services ---
echo "Populating core services..."
create_service_structure "$base_dir/core/attachment"
create_service_structure "$base_dir/core/configuration"
create_service_structure "$base_dir/core/logging"
create_service_structure "$base_dir/core/tag"

# Special structure for core/repository
echo "Creating structure for: $base_dir/core/repository"
mkdir -p "$base_dir/core/repository/__tests__"
mkdir -p "$base_dir/core/repository/base"
mkdir -p "$base_dir/core/repository/docs"
mkdir -p "$base_dir/core/repository/errors"
mkdir -p "$base_dir/core/repository/implementations/__tests__"
mkdir -p "$base_dir/core/repository/implementations/drizzle"
mkdir -p "$base_dir/core/repository/implementations/in-memory/__tests__"
mkdir -p "$base_dir/core/repository/implementations/sqlite/__tests__"
touch "$base_dir/core/repository/docs/Architecture.md"
touch "$base_dir/core/repository/docs/PRD.md"
touch "$base_dir/core/repository/errors/index.ts" # Example error file
touch "$base_dir/core/repository/implementations/drizzle/index.ts" # Placeholder
touch "$base_dir/core/repository/implementations/in-memory/index.ts" # Placeholder
touch "$base_dir/core/repository/implementations/sqlite/index.ts" # Placeholder
touch "$base_dir/core/repository/index.ts"
touch "$base_dir/core/repository/main.ts"
touch "$base_dir/core/repository/schema.ts"
touch "$base_dir/core/repository/types.ts"
touch "$base_dir/core/repository/base/index.ts" # Placeholder

# Special structure for core/storage
echo "Creating structure for: $base_dir/core/storage"
mkdir -p "$base_dir/core/storage/__tests__"
mkdir -p "$base_dir/core/storage/docs"
mkdir -p "$base_dir/core/storage/file" # Sub-service for file storage
touch "$base_dir/core/storage/docs/Architecture.md"
touch "$base_dir/core/storage/docs/PRD.md"
# Apply standard structure to core/storage/file
create_service_structure "$base_dir/core/storage/file"

# --- Populate AI Services ---
echo "Populating ai services..."
create_service_structure "$base_dir/ai/model"
create_service_structure "$base_dir/ai/prompt"
# Special structure for ai/provider
echo "Creating structure for: $base_dir/ai/provider"
mkdir -p "$base_dir/ai/provider/__tests__"
mkdir -p "$base_dir/ai/provider/docs"
mkdir -p "$base_dir/ai/provider/implementations/__tests__"
touch "$base_dir/ai/provider/configuration.ts" # Provider might need config
touch "$base_dir/ai/provider/docs/Architecture.md"
touch "$base_dir/ai/provider/docs/PRD.md"
touch "$base_dir/ai/provider/errors.ts"
touch "$base_dir/ai/provider/index.ts"
touch "$base_dir/ai/provider/main.ts"
touch "$base_dir/ai/provider/schema.ts"
touch "$base_dir/ai/provider/types.ts"
touch "$base_dir/ai/provider/__tests__/configuration.test.ts"
touch "$base_dir/ai/provider/__tests__/main.test.ts"
touch "$base_dir/ai/provider/implementations/index.ts" # Placeholder

# --- Populate Capabilities Services ---
echo "Populating capabilities services..."
create_service_structure "$base_dir/capabilities/skill"

# Special structure for capabilities/mcp
echo "Creating structure for: $base_dir/capabilities/mcp"
mkdir -p "$base_dir/capabilities/mcp/__tests__"
mkdir -p "$base_dir/capabilities/mcp/docs"
mkdir -p "$base_dir/capabilities/mcp/standardLibrary/__tests__"
# MCP might not need configuration.ts, but create for consistency? User can delete.
touch "$base_dir/capabilities/mcp/configuration.ts"
touch "$base_dir/capabilities/mcp/docs/Architecture.md"
touch "$base_dir/capabilities/mcp/docs/PRD.md"
touch "$base_dir/capabilities/mcp/errors.ts"
touch "$base_dir/capabilities/mcp/index.ts"
touch "$base_dir/capabilities/mcp/main.ts"
touch "$base_dir/capabilities/mcp/schema.ts"
touch "$base_dir/capabilities/mcp/types.ts"
touch "$base_dir/capabilities/mcp/__tests__/configuration.test.ts" # If config exists
touch "$base_dir/capabilities/mcp/__tests__/main.test.ts"
touch "$base_dir/capabilities/mcp/standardLibrary/index.ts" # Placeholder

# Special structure for capabilities/tool
echo "Creating structure for: $base_dir/capabilities/tool"
mkdir -p "$base_dir/capabilities/tool/__tests__"
mkdir -p "$base_dir/capabilities/tool/docs"
mkdir -p "$base_dir/capabilities/tool/errors"
mkdir -p "$base_dir/capabilities/tool/implementations/__tests__"
mkdir -p "$base_dir/capabilities/tool/implementations/standard-library/__tests__"
mkdir -p "$base_dir/capabilities/tool/implementations/standard-library/scheduling/__tests__"
mkdir -p "$base_dir/capabilities/tool/types"
touch "$base_dir/capabilities/tool/configuration.ts"
touch "$base_dir/capabilities/tool/docs/Architecture.md"
touch "$base_dir/capabilities/tool/docs/PRD.md"
touch "$base_dir/capabilities/tool/errors/index.ts" # Placeholder
touch "$base_dir/capabilities/tool/index.ts"
touch "$base_dir/capabilities/tool/main.ts"
touch "$base_dir/capabilities/tool/schema.ts"
touch "$base_dir/capabilities/tool/types/index.ts" # Placeholder
touch "$base_dir/capabilities/tool/__tests__/configuration.test.ts"
touch "$base_dir/capabilities/tool/__tests__/main.test.ts"
touch "$base_dir/capabilities/tool/base-tool.ts" # As per previous structure
touch "$base_dir/capabilities/tool/plan.txt" # As per previous structure
touch "$base_dir/capabilities/tool/tool-configuration-service.ts" # As per previous structure
touch "$base_dir/capabilities/tool/tool-service.ts" # As per previous structure
# Standard library tools
touch "$base_dir/capabilities/tool/implementations/standard-library/index.ts"
touch "$base_dir/capabilities/tool/implementations/standard-library/calculator.tool.ts"
touch "$base_dir/capabilities/tool/implementations/standard-library/date-time.tool.ts"
touch "$base_dir/capabilities/tool/implementations/standard-library/web-search.tool.ts"
touch "$base_dir/capabilities/tool/implementations/standard-library/scheduling/index.ts" # Placeholder

# --- Populate Execution Services ---
echo "Populating execution services..."
create_service_structure "$base_dir/execution/agent"
create_service_structure "$base_dir/execution/supervisor" # Assuming standard structure for now
create_service_structure "$base_dir/execution/thread"

# --- Populate Memory Services ---
echo "Populating memory services..."
create_service_structure "$base_dir/memory/artifact"
create_service_structure "$base_dir/memory/chat"
create_service_structure "$base_dir/memory/longterm"

echo "--- Structure Creation Complete ---"
echo "NOTE: Some services like mcp/tool/repository/storage have unique internal structures."
echo "NOTE: Placeholder files created. Populate them with actual code."

exit 0
