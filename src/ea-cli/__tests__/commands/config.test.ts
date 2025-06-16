import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { expectCommandFailure, runCommand } from "../test-utils.js"
import { configCommands } from "../../src/commands/config.js"

describe("config command", () => {
  describe("config", () => {
    it("should show help text when no subcommand provided", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(configCommands, [])
        expect(result).toBeDefined()
      })
    )

    it("should fail with invalid subcommand", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(configCommands, ["invalid"])
        expect(error).toBeDefined()
        expect(error.message).toContain("invalid")
      })
    )
  })

  describe("config:get", () => {
    it("should get configuration value", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(configCommands, ["get", "model"])
        expect(result).toBeDefined()
      })
    )

    it("should fail with invalid key", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(configCommands, ["get", "invalid-key"])
        expect(error).toBeDefined()
        expect(error.message).toContain("invalid-key")
      })
    )
  })

  describe("config:set", () => {
    it("should set configuration value", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(configCommands, ["set", "model", "gpt-4"])
        expect(result).toBeDefined()
      })
    )

    it("should fail with invalid key", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(configCommands, ["set", "invalid-key", "value"])
        expect(error).toBeDefined()
        expect(error.message).toContain("invalid-key")
      })
    )
  })
})
