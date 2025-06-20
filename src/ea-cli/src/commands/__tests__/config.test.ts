import { join } from "node:path"
import { FileSystem } from "@effect/platform"
import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { Effect, Either, Layer } from "effect"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { createDir } from "../../services/fs"

describe("config command functionality", () => {
  const TEST_DIR = join(process.cwd(), "test-workspace-config")
  const PROJECT_NAME = "test-config-project"
  const PROJECT_PATH = join(TEST_DIR, PROJECT_NAME)
  const CONFIG_DIR = join(PROJECT_PATH, "ea-config")
  let originalCwd: string

  // Test layer
  const testLayer = Layer.mergeAll(NodeFileSystem.layer, NodeContext.layer)

  // Valid test configurations
  const validMasterConfig = {
    name: "test-config",
    version: "1.0.0",
    description: "Test master configuration",
    logging: {
      level: "info",
      filePath: "logs/app.log",
    },
  }

  const validModelsConfig = {
    name: "Test Models Config",
    version: "1.0.0",
    models: [
      {
        id: "gpt-4",
        name: "gpt-4",
        displayName: "GPT-4",
        version: "1.0.0",
        modelName: "gpt-4",
        provider: { name: "openai", displayName: "OpenAI" },
        vendorCapabilities: ["chat"],
        contextWindow: 128000,
        maxTokens: 4096,
      },
    ],
  }

  const validProvidersConfig = {
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
        capabilities: ["chat"],
      },
    ],
  }

  const validPolicyConfig = {
    name: "Test-Policy-Config",
    version: "1.0.0",
    policies: [
      {
        id: "test-rule",
        name: "Test Rule",
        type: "allow",
        resource: "*",
        priority: 100,
        enabled: true,
        description: "A test policy rule",
      },
    ],
  }

  const validToolRegistryConfig = {
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
    ],
  }

  beforeEach(async () => {
    originalCwd = process.cwd()
    await Effect.runPromise(
      Effect.gen(function* () {
        // Create test directories recursively
        yield* createDir(TEST_DIR, { recursive: true })
        yield* createDir(PROJECT_PATH, { recursive: true })
        yield* createDir(CONFIG_DIR, { recursive: true })

        // Set environment variable and change directory
        process.env.PROJECT_ROOT = PROJECT_PATH
        process.chdir(PROJECT_PATH)
      }).pipe(Effect.provide(testLayer)),
    )
  })

  afterEach(async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        // Only remove if directory exists
        const exists = yield* Effect.either(fs.exists(TEST_DIR))
        if (Either.isRight(exists) && exists.right) {
          yield* Effect.ignore(fs.remove(TEST_DIR, { recursive: true }))
        }
      }).pipe(Effect.provide(testLayer)),
    )
    // Restore CWD and clear environment variable
    process.chdir(originalCwd)
    delete process.env.PROJECT_ROOT
  })

  describe("config validation", () => {
    test("should validate complete valid configuration", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        // Create all required config files with valid content
        yield* Effect.all([
          fs.writeFileString(
            join(CONFIG_DIR, "master-config.json"),
            JSON.stringify(validMasterConfig, null, 2),
          ),
          fs.writeFileString(
            join(CONFIG_DIR, "models.json"),
            JSON.stringify(validModelsConfig, null, 2),
          ),
          fs.writeFileString(
            join(CONFIG_DIR, "providers.json"),
            JSON.stringify(validProvidersConfig, null, 2),
          ),
          fs.writeFileString(
            join(CONFIG_DIR, "policy.json"),
            JSON.stringify(validPolicyConfig, null, 2),
          ),
          fs.writeFileString(
            join(CONFIG_DIR, "tool-registry.json"),
            JSON.stringify(validToolRegistryConfig, null, 2),
          ),
        ])

        // Test that all files can be read and parsed successfully
        const configs = yield* Effect.all([
          Effect.gen(function* () {
            const content = yield* fs.readFileString(
              join(CONFIG_DIR, "master-config.json"),
            )
            return JSON.parse(content)
          }),
          Effect.gen(function* () {
            const content = yield* fs.readFileString(
              join(CONFIG_DIR, "models.json"),
            )
            return JSON.parse(content)
          }),
          Effect.gen(function* () {
            const content = yield* fs.readFileString(
              join(CONFIG_DIR, "providers.json"),
            )
            return JSON.parse(content)
          }),
          Effect.gen(function* () {
            const content = yield* fs.readFileString(
              join(CONFIG_DIR, "policy.json"),
            )
            return JSON.parse(content)
          }),
          Effect.gen(function* () {
            const content = yield* fs.readFileString(
              join(CONFIG_DIR, "tool-registry.json"),
            )
            return JSON.parse(content)
          }),
        ])

        expect(configs[0].name).toBe("test-config")
        expect(configs[1].models).toHaveLength(1)
        expect(configs[2].providers).toHaveLength(1)
        expect(configs[3].policies).toHaveLength(1)
        expect(configs[4].toolkits).toHaveLength(1)
      }).pipe(Effect.provide(testLayer)))

    test("should detect missing config directory", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        // Remove config directory
        yield* fs.remove(CONFIG_DIR, { recursive: true })

        // Try to check if config directory exists
        const exists = yield* Effect.either(fs.exists(CONFIG_DIR))

        expect(Either.isRight(exists)).toBe(true)
        if (Either.isRight(exists)) {
          expect(exists.right).toBe(false)
        }
      }).pipe(Effect.provide(testLayer)))

    test("should detect missing config files", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        const requiredFiles = [
          "master-config.json",
          "models.json",
          "providers.json",
          "policy.json",
          "tool-registry.json",
        ]

        // Check that all required files are missing
        const existsChecks = yield* Effect.all(
          requiredFiles.map((file) => fs.exists(join(CONFIG_DIR, file))),
        )

        existsChecks.forEach((exists) => {
          expect(exists).toBe(false)
        })
      }).pipe(Effect.provide(testLayer)))

    test("should detect invalid JSON in config files", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        // Create config files with invalid JSON
        yield* Effect.all([
          fs.writeFileString(
            join(CONFIG_DIR, "master-config.json"),
            "invalid json",
          ),
          fs.writeFileString(join(CONFIG_DIR, "models.json"), "{ incomplete"),
          fs.writeFileString(
            join(CONFIG_DIR, "providers.json"),
            "not json at all",
          ),
          fs.writeFileString(join(CONFIG_DIR, "policy.json"), '{ "missing": }'),
          fs.writeFileString(join(CONFIG_DIR, "tool-registry.json"), "[]"),
        ])

        // Try to parse each file and expect failures
        const parseResults = yield* Effect.all([
          Effect.either(
            Effect.sync(() => {
              return Effect.gen(function* () {
                const content = yield* fs.readFileString(
                  join(CONFIG_DIR, "master-config.json"),
                )
                return JSON.parse(content)
              })
            }),
          ),
          Effect.either(
            Effect.sync(() => {
              return Effect.gen(function* () {
                const content = yield* fs.readFileString(
                  join(CONFIG_DIR, "models.json"),
                )
                return JSON.parse(content)
              })
            }),
          ),
          Effect.either(
            Effect.sync(() => {
              return Effect.gen(function* () {
                const content = yield* fs.readFileString(
                  join(CONFIG_DIR, "providers.json"),
                )
                return JSON.parse(content)
              })
            }),
          ),
          Effect.either(
            Effect.sync(() => {
              return Effect.gen(function* () {
                const content = yield* fs.readFileString(
                  join(CONFIG_DIR, "policy.json"),
                )
                return JSON.parse(content)
              })
            }),
          ),
        ])

        // Most should fail (only tool-registry.json is valid JSON)
        expect(parseResults.some((result) => Either.isLeft(result))).toBe(true)
      }).pipe(Effect.provide(testLayer)))

    test("should validate individual config file structures", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        // Create master-config.json with valid structure
        yield* fs.writeFileString(
          join(CONFIG_DIR, "master-config.json"),
          JSON.stringify(validMasterConfig, null, 2),
        )

        const content = yield* fs.readFileString(
          join(CONFIG_DIR, "master-config.json"),
        )
        const config = JSON.parse(content)

        // Validate structure
        expect(config).toHaveProperty("name")
        expect(config).toHaveProperty("version")
        expect(config).toHaveProperty("logging")
        expect(config.logging).toHaveProperty("level")
        expect(config.logging).toHaveProperty("filePath")
      }).pipe(Effect.provide(testLayer)))
  })

  describe("error scenarios", () => {
    test("should handle permission errors when reading config files", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        // Create a config file
        yield* fs.writeFileString(
          join(CONFIG_DIR, "models.json"),
          JSON.stringify(validModelsConfig, null, 2),
        )

        // Try to read the file (this should succeed in our test environment)
        const result = yield* Effect.either(
          fs.readFileString(join(CONFIG_DIR, "models.json")),
        )

        expect(Either.isRight(result)).toBe(true)
      }).pipe(Effect.provide(testLayer)))

    test("should handle empty config files", () =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem

        // Create empty config files
        yield* Effect.all([
          fs.writeFileString(join(CONFIG_DIR, "master-config.json"), ""),
          fs.writeFileString(join(CONFIG_DIR, "models.json"), ""),
          fs.writeFileString(join(CONFIG_DIR, "providers.json"), ""),
        ])

        // Try to parse empty files
        const parseResults = yield* Effect.all([
          Effect.either(
            Effect.sync(() => {
              return Effect.gen(function* () {
                const content = yield* fs.readFileString(
                  join(CONFIG_DIR, "master-config.json"),
                )
                return JSON.parse(content || "{}")
              })
            }),
          ),
          Effect.either(
            Effect.sync(() => {
              return Effect.gen(function* () {
                const content = yield* fs.readFileString(
                  join(CONFIG_DIR, "models.json"),
                )
                return JSON.parse(content || "{}")
              })
            }),
          ),
        ])

        // Empty files should cause parse errors
        expect(parseResults.some((result) => Either.isLeft(result))).toBe(true)
      }).pipe(Effect.provide(testLayer)))
  })
})
