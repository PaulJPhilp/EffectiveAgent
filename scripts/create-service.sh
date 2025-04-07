#!/bin/bash
base_dir="src/services"


# Function to create the standard structure for a service
create_service_structure() {
  local service_path="$1"
  local ServiceNamePascal="$2"
  local serviceName="$3"

  echo "    Scaffolding Service: $ServiceNamePascal ($service_path)"

  # --- DEBUGGING ---
  echo "    DEBUG: Inside function, service_path is: '$service_path'"
  if [ -z "$service_path" ]; then
      echo "    ERROR: service_path is empty inside function!"
      return 1 # Exit function if path is empty
  fi
  # --- END DEBUGGING ---

  if [ -d "$service_path" ]; then
      echo "      Warning: Service directory already exists, skipping creation: $service_path"
      return 0
  fi

  mkdir -p "$service_path/__tests__"
  mkdir -p "$service_path/docs"

  echo "      Creating types.ts..."
  # --- DEBUGGING ---
  echo "      DEBUG: Attempting to write to: '$service_path/types.ts'"
  # --- END DEBUGGING ---
  cat << 'EOF' > "$service_path/types.ts"
# ... content ...
EOF

  # Add similar debug echos before other 'cat' commands if needed

  # ... (rest of the function) ...

  echo "      Done."
}

# --- Main part of create-service.sh (if called directly) ---
# This part might not be strictly necessary if only called by create-project.sh,
# but it allows direct testing. Ensure it uses the function correctly.

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  # Script is being run directly, not sourced.
  if [ "$#" -ne 2 ]; then
      echo "Usage: $0 <category> <serviceName>"
      echo "Example: $0 capabilities skill"
      exit 1
  fi
  category_arg="$1"
  serviceName_arg="$2"
  ServiceNamePascal_arg=$(echo "$serviceName_arg" | sed -e 's/[-_]/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2); print}' OFS='')
  service_path_arg="$base_dir/$category_arg/$serviceName_arg"

  create_service_structure "$service_path_arg" "$ServiceNamePascal_arg" "$serviceName_arg"
  exit $? # Exit with the function's status
fi

# If sourced, the function is just defined.

