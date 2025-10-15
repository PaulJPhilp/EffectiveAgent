import { Command } from "@effect/cli"
import { Effect, Either } from "effect"
import { describe, expect, it } from "vitest"
import { createTestCli, expectCommandFailure } from "./test-utils"

describe("test-utils", () => {
  describe("createTestCli", () => {
    it("should execute a simple command successfully", () =>
      Effect.gen(function* () {
        // Create a simple command that just returns a string
        const simpleCommand = Command.make<string, {}, never, never>(
          "test",
          {},
          () => Effect.succeed("success"),
        )

        // Run the command through our test utility
        const result = yield* createTestCli(simpleCommand, [])

        // The command should complete without error
        expect(result).toBeUndefined()
      }))

    it("should handle command errors properly", () =>
      Effect.gen(function* () {
        // Create a command that fails
        const failingCommand = Command.make<string, {}, never, Error>(
          "test",
          {},
          () => Effect.fail(new Error("test error")),
        )

        // Run the command and expect it to fail
        const error = yield* expectCommandFailure(failingCommand, [])
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe("test error")
      }))
  })
})
