import { join } from "node:path"
import { AgentRuntimeService } from "@/ea-agent-runtime/service.js"
import { ModelService } from "@/services/ai/model/service.js"
import { ProviderService } from "@/services/ai/provider/service.js"
import { ConfigurationService } from "@/services/core/configuration/index.js"
import { FileSystem } from "@effect/platform"
import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { Effect, Either, Layer } from "effect"
import { createDir } from "../../services/fs"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { AgentRuntimeError, ConfigurationError } from "../../errors.js"
import { runCommand } from "../run.js"

describe("run command", () => {
  const TEST_DIR = join(process.cwd(), "test-workspace-run")
  const PROJECT_NAME = "test-agent-project"
  const PROJECT_PATH = join(TEST_DIR, PROJECT_NAME)
  const AGENTS_DIR = join(PROJECT_PATH, "agents")
  const CONFIG_DIR = join(PROJECT_PATH, "ea-config")
  const TEST_AGENT_DIR = join(AGENTS_DIR, "test-agent")
  let originalCwd: string

  // Test configurations
  const validProviderConfig = {
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
    ],
  }

  const validModelConfig = {
    name: "Test Models Config",
    version: "1.0.0",
    models: [
      {
        id: "gpt-4o",
        name: "gpt-4-omni",
        displayName: "gpt-4-omni",
        version: "1.0.0",
        modelName: "gpt-4-omni",
        provider: {
          name: "openai",
          displayName: "OpenAI",
        },
        vendorCapabilities: ["chat", "text-generation"],
        contextWindow: 128000,
        maxTokens: 4096,
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

  // Main test layer combining all required services
  const testLayer = Layer.mergeAll(
    ConfigurationService.Default,
    ProviderService.Default,
    ModelService.Default,
    AgentRuntimeService.Default,
    AgentRuntimeService.Default,
    NodeFileSystem.layer,
  )

  // Store original env vars
  const originalEnv = { ...process.env }

  // Set up test workspace before each test
  beforeEach(async () => {
    originalCwd = process.cwd()
    // Set required env vars
    process.env.OPENAI_API_KEY = "test-key"

    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        // Create test directories recursively
        yield* createDir(TEST_DIR, { recursive: true })
        yield* createDir(PROJECT_PATH, { recursive: true })
        yield* createDir(AGENTS_DIR, { recursive: true })
        yield* createDir(CONFIG_DIR, { recursive: true })
        yield* createDir(TEST_AGENT_DIR, { recursive: true })

        // Write test config files
        yield* Effect.all([
          fs.writeFileString(
            join(CONFIG_DIR, "models.json"),
            JSON.stringify(validModelConfig),
          ),
          fs.writeFileString(
            join(CONFIG_DIR, "providers.json"),
            JSON.stringify(validProviderConfig),
          ),
          fs.writeFileString(
            join(CONFIG_DIR, "policy.json"),
            JSON.stringify(validPolicyConfig),
          ),
        ])

        // Set environment variable and change directory for tests
        process.env.PROJECT_ROOT = PROJECT_PATH
        process.chdir(PROJECT_PATH)
      }).pipe(Effect.provide(NodeFileSystem.layer)),
    )
  })

  // Clean up after each test
  afterEach(async () => {
    // Restore CWD first
    process.chdir(originalCwd)
    // Clear specific env var
    delete process.env.PROJECT_ROOT
    // Clean up environment
    process.env = { ...originalEnv }

    // Clean up test files
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        yield* fs.remove(TEST_DIR, { recursive: true })
      }).pipe(Effect.provide(NodeFileSystem.layer)),
    )
  })

  test("successfully runs agent with valid config", () =>
    Effect.gen(function* () {
      const result = yield* runCommand.handler({
        agentName: "test-agent",
        input: "test input",
      })

      expect(result).toBeDefined()
    }).pipe(Effect.provide(testLayer)))

  test("fails when agent directory doesn't exist", () =>
    Effect.gen(function* () {
      const result = yield* Effect.either(
        runCommand.handler({
          agentName: "nonexistent-agent",
          input: "test input",
        }),
      )

      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(AgentRuntimeError)
      }
    }).pipe(Effect.provide(testLayer)))

  test("fails with configuration error when config is invalid", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem

      // Write invalid JSON to the models config file
      yield* fs.writeFileString(join(CONFIG_DIR, "models.json"), "invalid json")

      const result = yield* Effect.either(
        runCommand.handler({
          agentName: "test-agent",
          input: "test input",
        }),
      )

      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ConfigurationError)
      }
    }).pipe(Effect.provide(testLayer)))

  test("fails when config files are missing", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem

      // Remove all config files
      yield* fs.remove(join(CONFIG_DIR, "models.json"))
      yield* fs.remove(join(CONFIG_DIR, "providers.json"))
      yield* fs.remove(join(CONFIG_DIR, "policy.json"))

      const result = yield* Effect.either(
        runCommand.handler({
          agentName: "test-agent",
          input: "test input",
        }),
      )

      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ConfigurationError)
      }
    }).pipe(Effect.provide(testLayer)))
})
