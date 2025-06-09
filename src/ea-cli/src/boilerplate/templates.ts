// Default configuration templates
export const masterConfigTemplate = {
  logPath: "./logs/app.log",
  configPath: "./ea-config",
  agentsPath: "./agents",
}

export const modelsTemplate = {
  models: [],
}

export const providersTemplate = {
  providers: [],
}

export const policyTemplate = {
  rules: [],
}

export const toolRegistryTemplate = {
  toolkits: [],
}

// Package.json template for the root workspace
export function createRootPackageJson(
  projectName: string,
  packageManager: "npm" | "bun",
) {
  return {
    name: projectName,
    version: "0.1.0",
    private: true,
    type: "module",
    workspaces: ["agents/*"],
    scripts: {
      test: `${packageManager} test`,
      build: `${packageManager} run build`,
      format: "biome format --write .",
      lint: "biome check .",
    },
    dependencies: {
      effect: "^3.16.4",
      "@effective-agents/core": "^1.0.0",
    },
    devDependencies: {
      "@biomejs/biome": "^1.6.1",
      "@types/node": "^20.11.30",
      typescript: "^5.4.3",
      vitest: "^1.4.0",
    },
  }
}

// Biome configuration template
export const biomeTemplate = {
  $schema: "https://biomejs.dev/schemas/1.9.4/schema.json",
  organizeImports: {
    enabled: true,
  },
  linter: {
    enabled: true,
    rules: {
      recommended: true,
    },
  },
  formatter: {
    enabled: true,
    formatWithErrors: false,
    indentStyle: "space",
    indentWidth: 2,
    lineEnding: "lf",
    lineWidth: 80,
  },
}

// TypeScript configuration template
export const tsConfigTemplate = {
  compilerOptions: {
    target: "ESNext",
    module: "NodeNext",
    moduleResolution: "NodeNext",
    esModuleInterop: true,
    strict: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    outDir: "dist",
    declaration: true,
    sourceMap: true,
  },
  include: ["agents/**/*.ts"],
  exclude: ["node_modules", "dist"],
}

export const agentPackageJsonTemplate = (agentName: string) => ({
  name: `@agents/${agentName}`,
  version: "0.1.0",
  private: true,
  type: "module",
  scripts: {
    test: "vitest run",
    "test:watch": "vitest",
    build: "tsc -p .",
  },
  dependencies: {
    effect: "^3.16.4",
    "@effective-agents/core": "^1.0.0",
  },
  devDependencies: {
    "@types/node": "^20.11.30",
    typescript: "^5.4.3",
    vitest: "^1.4.0",
  },
})

export const vitestConfigTemplate = `\
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
});
`

export const agentIndexTemplate = `\
import { Effect } from "effect";

// Define your agent logic here
export const main = Effect.succeed("Hello from agent!");
`

export const agentTestTemplate = `\
import { describe, it, expect } from "vitest";
import { main } from "../agent"; // Adjust path as needed

describe("Agent Tests", () => {
  it("should succeed", async () => {
    // Replace with actual test logic
    expect(true).toBe(true);
  });
});
`
