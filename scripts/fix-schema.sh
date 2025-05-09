#!/bin/bash

# Function to process a file
fix_schema() {
    local file=$1
    
    # Fix Schema import
    perl -pi -e 's/import \{ Schema \}/import { Schema as S }/g' "$file"
    perl -pi -e 's/import \{ Schema, /import { Schema as S, /g' "$file"
    
    # Fix Schema.struct to S.Class
    perl -pi -e 's/Schema\.struct/S.Class/g' "$file"
    
    # Fix capitalization
    perl -pi -e 's/Schema\.string/S.String/g' "$file"
    perl -pi -e 's/Schema\.number/S.Number/g' "$file"
    perl -pi -e 's/Schema\.boolean/S.Boolean/g' "$file"
    perl -pi -e 's/Schema\.array/S.Array/g' "$file"
    perl -pi -e 's/Schema\.literal/S.Literal/g' "$file"
    perl -pi -e 's/Schema\.optional/S.optional/g' "$file"
    
    # Fix class pattern
    perl -pi -e 's/extends Schema\.Class/extends S.Class/g' "$file"
}

# Process all TypeScript files
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
    if grep -q "Schema" "$file"; then
        echo "Processing $file"
        fix_schema "$file"
    fi
done

echo "Schema fixes completed" 