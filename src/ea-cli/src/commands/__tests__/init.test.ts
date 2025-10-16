import { join } from "node:path"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem } from "@effect/platform-node"
import { Effect } from "effect"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createDir } from "../../services/fs"
import { initProjectHandler } from "../init.js"

describe("init command", () => {
  const TEST_DIR = join(process.cwd(), "test-workspace-init")
  const PROJECT_NAME = "test-project"
  const PROJECT_PATH = join(TEST_DIR, PROJECT_NAME)
  let originalCwd: string

  // Set up test workspace before each test
  beforeEach(async () => {
    originalCwd = process.cwd()
    await Effect.runPromise(
      Effect.gen(function* () {
        yield* createDir(TEST_DIR, { recursive: true })
        process.chdir(TEST_DIR)
      }).pipe(Effect.provide(NodeFileSystem.layer)),
    )
  })

  // Clean up after each test
  afterEach(async () => {
    process.chdir(originalCwd) // Restore CWD first
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem
        // Use Effect.ignore to simplify cleanup if directory doesn't exist
        yield* Effect.ignore(fs.remove(TEST_DIR, { recursive: true }))
      }).pipe(Effect.provide(NodeFileSystem.layer)),
    )
    process.env.PROJECT_ROOT // Clean up env var = undefined // Clean up env var
  })

  it("should create a complete and valid workspace", async () => {
    // Run init command handler directly
    await Effect.runPromise(
      Effect.gen(function* () {
        // Call the extracted handler function directly
        yield* initProjectHandler({ projectName: PROJECT_NAME, yes: true })

        // Get FileSystem
        const fs = yield* FileSystem.FileSystem

        // Verify directory structure
        const projectExists = yield* fs.exists(PROJECT_PATH)
        expect(projectExists).toBe(true)

        const configExists = yield* fs.exists(join(PROJECT_PATH, "ea-config"))
        expect(configExists).toBe(true)

        const agentsExists = yield* fs.exists(join(PROJECT_PATH, "agents"))
        expect(agentsExists).toBe(true)

        const logsExists = yield* fs.exists(join(PROJECT_PATH, "logs"))
        expect(logsExists).toBe(true)

        // Verify configuration files
        const configFiles = [
          "master-config.json",
          "models.json",
          "providers.json",
          "policy.json",
          "tool-registry.json",
        ]

        for (const file of configFiles) {
          const exists = yield* fs.exists(join(PROJECT_PATH, "ea-config", file))
          expect(exists).toBe(true)

          const content = yield* fs.readFileString(
            join(PROJECT_PATH, "ea-config", file),
          )
          expect(() => JSON.parse(content)).not.toThrow()
        }

        // Verify project files
        const projectFiles = ["package.json", "tsconfig.json", ".biomerc.json"]

        for (const file of projectFiles) {
          const exists = yield* fs.exists(join(PROJECT_PATH, file))
          expect(exists).toBe(true)

          const content = yield* fs.readFileString(join(PROJECT_PATH, file))
          expect(() => JSON.parse(content)).not.toThrow()
        }

        // Verify package.json content
        const packageJson = JSON.parse(
          yield* fs.readFileString(join(PROJECT_PATH, "package.json")),
        )
        expect(packageJson.name).toBe(PROJECT_NAME)
        expect(packageJson.workspaces).toContain("agents/*")
        expect(packageJson.dependencies.effect).toBeDefined()
        expect(packageJson.devDependencies["@biomejs/biome"]).toBeDefined()
      }).pipe(Effect.provide(NodeFileSystem.layer)),
    )
  })

  it("should fail if project directory already exists", async () => {
    const fs = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* FileSystem.FileSystem
      }).pipe(Effect.provide(NodeFileSystem.layer)),
    )

    // Create project directory first
    await Effect.runPromise(
      fs.makeDirectory(PROJECT_PATH).pipe(Effect.provide(NodeFileSystem.layer)),
    )

    // Run init command and expect failure using Effect.either
    const result = await Effect.runPromise(
      Effect.either(
        initProjectHandler({ projectName: PROJECT_NAME, yes: true }).pipe(
          Effect.provide(NodeFileSystem.layer),
        ),
      ),
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      // Check properties instead of instanceof to avoid module loading issues
      expect(result.left).toHaveProperty("resourceType", "directory")
      expect(result.left).toHaveProperty("resourceName", PROJECT_NAME)
      expect(result.left.message).toContain("already exists")
    }
  })

  it("should fail with validation error for invalid project name", async () => {
    const INVALID_NAME = "Test Project!" // Contains spaces and special characters

    // Run init command and expect failure using Effect.either
    const result = await Effect.runPromise(
      Effect.either(
        initProjectHandler({ projectName: INVALID_NAME, yes: true }).pipe(
          Effect.provide(NodeFileSystem.layer),
        ),
      ),
    )

    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      // Check properties instead of instanceof to avoid module loading issues
      expect(result.left).toHaveProperty("field", "project-name")
      expect(result.left.message).toContain(
        "can only contain lowercase letters, numbers, and hyphens",
      )
    }
  })
})
