import { join } from "node:path"
import { FileSystem } from "@effect/platform"
import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { Effect, Either, Layer } from "effect"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { ConfigurationError } from "../../errors.js"
import { listConfigItems } from "../../utils/config-helpers.js"

describe("list command functionality", () => {
  const TEST_DIR = join(process.cwd(), "test-workspace-list")
  const PROJECT_NAME = "test-list-project"
  const PROJECT_PATH = join(TEST_DIR, PROJECT_NAME)
  const CONFIG_DIR = join(PROJECT_PATH, "ea-config")
  const AGENTS_DIR = join(PROJECT_PATH, "agents")

  // Test layer
  const testLayer = Layer.mergeAll(NodeFileSystem.layer, NodeContext.layer)

  // Test configurations with sample data
  const modelsConfig = {
    name: "Test Models Config",
    version: "1.0.0",
    models: [
      {
        id: "gpt-4",
        name: "gpt-4",
        displayName: "GPT-4",
        version: "1.0.0",
        modelName: "gpt-4",
        provider: {
          name: "openai",
          displayName: "OpenAI",
        },
        vendorCapabilities: ["chat", "text-generation"],
        contextWindow: 128000,
        maxTokens: 4096,
      },
      {
        id: "claude-3",
        name: "claude-3",
        displayName: "Claude 3",
        version: "1.0.0",
        modelName: "claude-3-sonnet-20240229",
        provider: {
          name: "anthropic",
          displayName: "Anthropic",
        },
        vendorCapabilities: ["chat", "text-generation"],
        contextWindow: 200000,
        maxTokens: 4096,
      },
    ],
  }

  const providersConfig = {
    version: "1.0.0",
    name: "test-providers",
    description: "Test providers",
    providers: [
      {
        name: "openai",
        displayName: "OpenAI",
        type: "llm",
        apiKeyEnvVar: "OPENAI_API_KEY",
        baseUrl: "https://api.openai.com/v1",
        capabilities: ["chat", "text-generation"],
      },
      {
        name: "anthropic",
        displayName: "Anthropic",
        type: "llm",
        apiKeyEnvVar: "ANTHROPIC_API_KEY",
        baseUrl: "https://api.anthropic.com",
        capabilities: ["chat", "text-generation"],
      },
    ],
  }

  const policyConfig = {
    name: "Test-Policy-Config",
    version: "1.0.0",
    policies: [
      {
        id: "test-rule-1",
        name: "Test Rule 1",
        type: "allow",
        resource: "*",
        priority: 100,
        enabled: true,
        description: "A test policy rule",
      },
      {
        id: "test-rule-2",
        name: "Test Rule 2",
        type: "deny",
        resource: "admin/*",
        priority: 200,
        enabled: true,
        description: "Another test policy rule",
      },
    ],
  }

  const toolRegistryConfig = {
    name: "Test Tool Registry",
    version: "1.0.0",
    toolkits: [
      {
        name: "web-toolkit",
        displayName: "Web Toolkit",
        description: "Tools for web interactions",
        version: "1.0.0",
        tools: ["fetch", "scrape"],
      },
      {
        name: "file-toolkit",
        displayName: "File Toolkit",
        description: "Tools for file operations",
        version: "1.0.0",
        tools: ["read", "write", "delete"],
      },
    ],
  }

  beforeEach(async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        // Clean up any existing test directory first
        const testDirExists = yield* fs.exists(TEST_DIR)
        if (testDirExists) {
          yield* fs.remove(TEST_DIR, { recursive: true })
        }

        // Create test directories
        yield* fs.makeDirectory(TEST_DIR, { recursive: true })
        yield* fs.makeDirectory(PROJECT_PATH, { recursive: true })
        yield* fs.makeDirectory(CONFIG_DIR, { recursive: true })
        yield* fs.makeDirectory(AGENTS_DIR, { recursive: true })

        // Create sample agent directories
        yield* fs.makeDirectory(join(AGENTS_DIR, "chat-agent"), {
          recursive: true,
        })
        yield* fs.makeDirectory(join(AGENTS_DIR, "weather-agent"), {
          recursive: true,
        })
        yield* fs.makeDirectory(join(AGENTS_DIR, "calculator-agent"), {
          recursive: true,
        })

        // Create sample package.json files for agents
        const agentPackageJson = {
          name: "sample-agent",
          version: "1.0.0",
          description: "A sample agent",
        }

        yield* Effect.all([
          fs.writeFileString(
            join(AGENTS_DIR, "chat-agent", "package.json"),
            JSON.stringify(
              { ...agentPackageJson, name: "chat-agent" },
              null,
              2,
            ),
          ),
          fs.writeFileString(
            join(AGENTS_DIR, "weather-agent", "package.json"),
            JSON.stringify(
              { ...agentPackageJson, name: "weather-agent" },
              null,
              2,
            ),
          ),
          fs.writeFileString(
            join(AGENTS_DIR, "calculator-agent", "package.json"),
            JSON.stringify(
              { ...agentPackageJson, name: "calculator-agent" },
              null,
              2,
            ),
          ),
        ])

        // Create config files with sample data
        yield* Effect.all([
          fs.writeFileString(
            join(CONFIG_DIR, "models.json"),
            JSON.stringify(modelsConfig, null, 2),
          ),
          fs.writeFileString(
            join(CONFIG_DIR, "providers.json"),
            JSON.stringify(providersConfig, null, 2),
          ),
          fs.writeFileString(
            join(CONFIG_DIR, "policy.json"),
            JSON.stringify(policyConfig, null, 2),
          ),
          fs.writeFileString(
            join(CONFIG_DIR, "tool-registry.json"),
            JSON.stringify(toolRegistryConfig, null, 2),
          ),
        ])

        // Change to project directory
        process.chdir(PROJECT_PATH)
      }).pipe(Effect.provide(testLayer)),
    )
  })

  afterEach(async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        // Restore original working directory if it was changed
        const originalCwd = process.cwd()
        if (originalCwd.includes(PROJECT_PATH)) {
          process.chdir("/Users/paul/Projects/EffectiveAgent/src/ea-cli")
        }

        // Remove test directory if it exists
        const testDirExists = yield* fs.exists(TEST_DIR)
        if (testDirExists) {
          yield* fs.remove(TEST_DIR, { recursive: true })
        }
      }).pipe(Effect.provide(testLayer)),
    )
  })

  describe("list models", () => {
    test("should list all models from models.json", () =>
      Effect.gen(function* () {
        const models = yield* listConfigItems("model")

        expect(models).toHaveLength(2)
        expect(models[0].id).toBe("gpt-4")
        expect(models[1].id).toBe("claude-3")
      }).pipe(Effect.provide(testLayer)))

    test("should handle empty models.json", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        // Write empty models config
        yield* fs.writeFileString(
          join(CONFIG_DIR, "models.json"),
          JSON.stringify(
            { name: "Empty", version: "1.0.0", models: [] },
            null,
            2,
          ),
        )

        const models = yield* listConfigItems("model")

        expect(models).toHaveLength(0)
      }).pipe(Effect.provide(testLayer)))
  })

  describe("list providers", () => {
    test("should list all providers from providers.json", () =>
      Effect.gen(function* () {
        const providers = yield* listConfigItems("provider")

        expect(providers).toHaveLength(2)
        expect(providers[0].name).toBe("openai")
        expect(providers[1].name).toBe("anthropic")
      }).pipe(Effect.provide(testLayer)))
  })

  describe("list rules", () => {
    test("should list all rules from policy.json", () =>
      Effect.gen(function* () {
        const rules = yield* listConfigItems("rule")

        expect(rules).toHaveLength(2)
        expect(rules[0].id).toBe("test-rule-1")
        expect(rules[1].id).toBe("test-rule-2")
      }).pipe(Effect.provide(testLayer)))
  })

  describe("list toolkits", () => {
    test("should list all toolkits from tool-registry.json", () =>
      Effect.gen(function* () {
        const toolkits = yield* listConfigItems("toolkit")

        expect(toolkits).toHaveLength(2)
        expect(toolkits[0].name).toBe("web-toolkit")
        expect(toolkits[1].name).toBe("file-toolkit")
      }).pipe(Effect.provide(testLayer)))
  })

  describe("error handling", () => {
    test("should handle invalid JSON in config files", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        // Write invalid JSON
        yield* fs.writeFileString(
          join(CONFIG_DIR, "models.json"),
          "invalid json",
        )

        const result = yield* Effect.either(listConfigItems("model"))

        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ConfigurationError)
        }
      }).pipe(Effect.provide(testLayer)))

    test("should handle missing config files", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        // Remove config file
        yield* fs.remove(join(CONFIG_DIR, "models.json"))

        const result = yield* Effect.either(listConfigItems("model"))

        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ConfigurationError)
        }
      }).pipe(Effect.provide(testLayer)))

    test("should handle missing config directory", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        // Remove entire config directory
        yield* fs.remove(CONFIG_DIR, { recursive: true })

        const result = yield* Effect.either(listConfigItems("model"))

        expect(Either.isLeft(result)).toBe(true)
        if (Either.isLeft(result)) {
          expect(result.left).toBeInstanceOf(ConfigurationError)
        }
      }).pipe(Effect.provide(testLayer)))
  })
})
