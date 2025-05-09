#!/bin/bash

# Function to process a file
fix_imports() {
    local file=$1
    
    # First remove any multiple .js extensions
    perl -pi -e 's/\\.js\\.js(\\.js)*/.js/g' "$file"
    
    # Fix @effect imports - these should not have .js extensions
    perl -pi -e 's/from ['\''"](@effect\/[^'\''"\\s]+)\.js['\''\"]/from "$1"/g' "$file"
    
    # Fix ImportedType imports
    perl -pi -e 's/import type \{ ImportedType \} from ['\''"]([^'\''"]+)['\''"]/import type { ImportedType } from "$1"/g' "$file"
    
    # Fix relative imports that don't have .js
    perl -pi -e 's/from ['\''\"](\.[^'\''"\\s]+)(?!\\.js)['\''\"]/from "$1.js"/g' "$file"
    perl -pi -e 's/from ['\''\"](\\.\\.[^'\''"\\s]+)(?!\\.js)['\''\"]/from "$1.js"/g' "$file"
    
    # Fix absolute imports that don't have .js
    perl -pi -e 's/from ['\''\"](@\/[^'\''"\\s]+)(?!\\.js)['\''\"]/from "$1.js"/g' "$file"
    
    # Fix effect.js imports
    perl -pi -e 's/from ['\''"]effect\.js['\''\"]/from "effect"/g' "$file"
    perl -pi -e 's/from ['\''"]effect\/([^'\''"\\s]+)\.js['\''\"]/from "effect\/$1"/g' "$file"
    
    # Fix @effect/platform-node.js imports
    perl -pi -e 's/from ['\''"]@effect\/platform-node\.js['\''\"]/from "@effect\/platform-node"/g' "$file"
    
    # Fix @effect/ai imports
    perl -pi -e 's/from ['\''"]@effect\/ai\/([^'\''"\\s]+)\.js['\''\"]/from "@effect\/ai\/$1"/g' "$file"
    
    # Fix drizzle imports
    perl -pi -e 's/from ['\''"]drizzle-orm\/node-postgres['\''\"]/from "drizzle-orm\/node-postgres"/g' "$file"
    perl -pi -e 's/from ['\''"]drizzle-orm\/pg-core['\''\"]/from "drizzle-orm\/pg-core"/g' "$file"
    
    # Fix google-auth-library imports
    perl -pi -e 's/from ['\''"]google-auth-library['\''\"]/from "google-auth-library"/g' "$file"
    
    # Fix ai-sdk imports
    perl -pi -e 's/from ['\''"]@ai-sdk\/([^'\''"\\s]+)\.js['\''\"]/from "@ai-sdk\/$1"/g' "$file"
    
    # Fix test-harness imports
    perl -pi -e 's/from ['\''"]@\/services\/test-harness\/([^'\''"\\s]+)\.js['\''\"]/from "@\/services\/core\/test-harness\/$1.js"/g' "$file"
}

# Process all TypeScript files
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
    echo "Processing $file"
    fix_imports "$file"
done

echo "Import fixes completed"

# Make the script executable
chmod +x scripts/fix-imports.sh 