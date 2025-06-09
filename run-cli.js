#!/usr/bin/env node

// Simple script to run the CLI from the project root with proper working directory
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "src/ea-cli");

// Change to the project root directory
process.chdir(__dirname);

// Run the CLI with npm run dev from the CLI directory
const child = spawn("npm", ["run", "dev", "--", ...process.argv.slice(2)], {
  cwd: cliPath,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code);
});
