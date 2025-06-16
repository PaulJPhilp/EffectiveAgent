import { Effect } from "effect"
import { FileSystem } from "@effect/platform"
import { NodeFileSystem, NodeContext } from "@effect/platform-node"
import { describe, expect, it, beforeEach } from "vitest"
import { runCommand, expectCommandFailure } from "../test-utils.js"
import { initCommand } from "../../src/commands/init.js"
import { cleanupTestDirs } from "../setup.js"
import { ConfigurationService } from "../../../services/core/configuration/service.js"
import { ModelService } from "../../../services/ai/model/service.js"

describe("Init Command", () => {
  beforeEach(async () => {
    await Effect.runPromise(cleanupTestDirs())
  })
  describe("init", () => {
    it("should initialize a new project", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(initCommand, [])
        expect(result).toBeDefined()
      })
    )

    it("should fail if project already exists", () =>
      Effect.gen(function* () {
        // First init
        yield* runCommand(initCommand, [])
        
        // Second init should fail
        const error = yield* expectCommandFailure(initCommand, [])
        expect(error).toBeDefined()
        expect(error.message).toContain("already exists")
      })
    )
  })
})
