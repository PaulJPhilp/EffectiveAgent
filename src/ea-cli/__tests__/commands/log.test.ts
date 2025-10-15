import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { logCommands } from "../../src/commands/log.js"
import { expectCommandFailure, runCommand } from "../test-utils.js"

describe("log command", () => {
  describe("log", () => {
    it("should show logs with default options", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(logCommands, [])
        expect(result).toBeDefined()
      }))

    it("should respect --tail flag", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(logCommands, ["--tail"])
        expect(result).toBeDefined()
      }))

    it("should respect --lines option", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(logCommands, ["--lines", "10"])
        expect(result).toBeDefined()
      }))

    it("should fail with invalid lines value", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(logCommands, [
          "--lines",
          "invalid",
        ])
        expect(error).toBeDefined()
        expect(error.message).toContain("lines")
      }))
  })

  describe("log <agent>", () => {
    it("should show logs for specific agent", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(logCommands, ["test-agent"])
        expect(result).toBeDefined()
      }))

    it("should fail with invalid agent name", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(logCommands, [
          "invalid-agent",
        ])
        expect(error).toBeDefined()
        expect(error.message).toContain("invalid-agent")
      }))

    it("should respect --follow flag", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(logCommands, [
          "test-agent",
          "--follow",
        ])
        expect(result).toBeDefined()
      }))
  })
})
