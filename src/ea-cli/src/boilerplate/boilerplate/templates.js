"use strict"
Object.defineProperty(exports, "__esModule", { value: true })
exports.agentTestTemplate =
  exports.agentIndexTemplate =
  exports.vitestConfigTemplate =
  exports.agentPackageJsonTemplate =
  exports.tsConfigTemplate =
  exports.biomeTemplate =
  exports.toolRegistryTemplate =
  exports.policyTemplate =
  exports.providersTemplate =
  exports.modelsTemplate =
  exports.masterConfigTemplate =
    void 0
exports.createRootPackageJson = createRootPackageJson
// Default configuration templates
exports.masterConfigTemplate = {
  logPath: "./logs/app.log",
  configPath: "./ea-config",
  agentsPath: "./agents",
}
exports.modelsTemplate = {
  models: [],
}
exports.providersTemplate = {
  providers: [],
}
exports.policyTemplate = {
  rules: [],
}
exports.toolRegistryTemplate = {
  toolkits: [],
}
// Package.json template for the root workspace
function createRootPackageJson(projectName, packageManager) {
  return {
    name: projectName,
    version: "0.1.0",
    private: true,
    type: "module",
    workspaces: ["agents/*"],
    scripts: {
      test: "".concat(packageManager, " test"),
      build: "".concat(packageManager, " run build"),
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
exports.biomeTemplate = {
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
exports.tsConfigTemplate = {
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
var agentPackageJsonTemplate = function (agentName) {
  return {
    name: "@agents/".concat(agentName),
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
  }
}
exports.agentPackageJsonTemplate = agentPackageJsonTemplate
exports.vitestConfigTemplate =
  'import { defineConfig } from "vitest/config";\n\nexport default defineConfig({\n  test: {\n    globals: true,\n    environment: "node",\n  },\n});\n'
exports.agentIndexTemplate =
  'import { Effect } from "effect";\n\n// Define your agent logic here\nexport const main = Effect.succeed("Hello from agent!");\n'
exports.agentTestTemplate =
  'import { describe, it, expect } from "vitest";\nimport { main } from "../agent"; // Adjust path as needed\n\ndescribe("Agent Tests", () => {\n  it("should succeed", async () => {\n    // Replace with actual test logic\n    expect(true).toBe(true);\n  });\n});\n'
