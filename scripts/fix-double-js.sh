#!/bin/bash

# Function to process a file
fix_double_js() {
    local file=$1
    
    # Fix double .js extensions in imports
    perl -pi -e 's/\.js\.js/\.js/g' "$file"
    perl -pi -e 's/\.js\.js\.js/\.js/g' "$file"
}

# Process all TypeScript files
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read -r file; do
    if grep -q "\.js\.js" "$file"; then
        echo "Processing $file"
        fix_double_js "$file"
    fi
done

echo "Double .js extension fixes completed" 