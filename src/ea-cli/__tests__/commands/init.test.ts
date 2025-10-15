import { FileSystem } from "@effect/platform"
import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { Effect } from "effect"
import { beforeEach, describe, expect, it } from "vitest"
import { ModelService } from "../../../services/ai/model/service.js"
import { ConfigurationService } from "../../../services/core/configuration/index.js"
import { initCommand } from "../../src/commands/init.js"
import { cleanupTestDirs } from "../setup.js"
import { expectCommandFailure, runCommand } from "../test-utils.js"

describe("Init Command", () => {
  beforeEach(async () => {
    await Effect.runPromise(cleanupTestDirs())
  })
  describe("init", () => {
    it("should initialize a new project", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(initCommand, [])
        expect(result).toBeDefined()
      }))

    it("should fail if project already exists", () =>
      Effect.gen(function* () {
        // First init
        yield* runCommand(initCommand, [])

        // Second init should fail
        const error = yield* expectCommandFailure(initCommand, [])
        expect(error).toBeDefined()
        expect(error.message).toContain("already exists")
      }))
  })
})
