#!/usr/bin/env node
// Simple validation script for the canonical models JSON
// Usage: node scripts/check_models_dev.js <path-to-json>

import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.error("Usage: node scripts/check_models_dev.js <path-to-json>");
  process.exit(2);
}

const filePath = path.resolve(process.cwd(), argv[0]);

try {
  const content = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(content);

  // valid if top-level is array OR object with 'models' array
  if (Array.isArray(parsed)) {
    console.log(`OK: payload is an array with length=${parsed.length}`);
    process.exit(0);
  }

  if (parsed && Array.isArray(parsed.models)) {
    console.log(`OK: payload has .models with length=${parsed.models.length}`);
    process.exit(0);
  }

  console.error(
    "Invalid payload shape: expected array or object with .models array"
  );
  process.exit(3);
} catch (err) {
  console.error(
    "Failed to validate JSON:",
    err instanceof Error ? err.message : String(err)
  );
  process.exit(1);
}
