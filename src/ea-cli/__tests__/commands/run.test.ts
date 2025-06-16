import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { expectCommandFailure, runCommand } from "../test-utils.js"
import { runCommand as cliRunCommand } from "../../src/commands/run.js"

describe("run command", () => {
  describe("run", () => {
    it("should show help text when no agent specified", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(cliRunCommand, [])
        expect(result).toBeDefined()
      })
    )

    it("should fail with invalid agent name", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(cliRunCommand, ["invalid-agent"])
        expect(error).toBeDefined()
        expect(error.message).toContain("invalid-agent")
      })
    )
  })

  describe("run <agent>", () => {
    it("should run the specified agent", () =>
      Effect.gen(function* () {
        // First create an agent
        yield* runCommand(cliRunCommand, ["test-agent", "--create"])
        
        // Then run it
        const result = yield* runCommand(cliRunCommand, ["test-agent"])
        expect(result).toBeDefined()
      })
    )

    it("should fail if agent does not exist", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(cliRunCommand, ["non-existent-agent"])
        expect(error).toBeDefined()
        expect(error.message).toContain("does not exist")
      })
    )

    it("should respect --watch flag", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(cliRunCommand, ["test-agent", "--watch"])
        expect(result).toBeDefined()
      })
    )
  })
})
