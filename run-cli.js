#!/usr/bin/env node

// Simple script to run the CLI from the project root with proper working directory
import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliPath = join(__dirname, "src/ea-cli");
const projectRoot = __dirname;

// Set environment variables for proper configuration
process.env.PROJECT_ROOT = projectRoot;
process.env.MASTER_CONFIG_PATH = join(projectRoot, "config/master-config.json");
process.env.MODELS_CONFIG_PATH = join(projectRoot, "config/models.json");
process.env.PROVIDERS_CONFIG_PATH = join(projectRoot, "config/providers.json");
process.env.POLICY_CONFIG_PATH = join(projectRoot, "config/policy.json");

// Change to the project root directory
process.chdir(__dirname);

// Run the CLI with bun from the CLI directory
const args = process.argv.slice(2);
// Properly quote and escape arguments
const quotedArgs = args.map(arg => arg.includes(" ") ? `"${arg}"` : arg);
const child = spawn("bun", ["run", "dev", "--", ...quotedArgs], {
  cwd: cliPath,
  stdio: "inherit",
  env: {
    ...process.env,
    PROJECT_ROOT: projectRoot,
    MASTER_CONFIG_PATH: join(projectRoot, "config/master-config.json"),
    MODELS_CONFIG_PATH: join(projectRoot, "config/models.json"),
    PROVIDERS_CONFIG_PATH: join(projectRoot, "config/providers.json"),
    POLICY_CONFIG_PATH: join(projectRoot, "config/policy.json")
  },
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code);
});
