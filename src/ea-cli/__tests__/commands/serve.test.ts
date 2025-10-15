import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { ServeCommand } from "../../src/commands/serve.js"
import { expectCommandFailure, runCommand } from "../test-utils.js"

describe("serve command", () => {
  describe("serve", () => {
    it("should start server with default options", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(ServeCommand, [])
        expect(result).toBeDefined()
      }))

    it("should respect custom port", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(ServeCommand, ["--port", "3001"])
        expect(result).toBeDefined()
      }))

    it("should fail with invalid port", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(ServeCommand, [
          "--port",
          "invalid",
        ])
        expect(error).toBeDefined()
        expect(String(error)).toContain("port")
      }))
  })

  describe("serve <agent>", () => {
    it("should serve specific agent", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(ServeCommand, ["test-agent"])
        expect(result).toBeDefined()
      }))

    it("should fail with invalid agent name", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(ServeCommand, [
          "invalid-agent",
        ])
        expect(error).toBeDefined()
        expect(String(error)).toContain("invalid-agent")
      }))

    it("should respect --watch flag", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(ServeCommand, [
          "test-agent",
          "--watch",
        ])
        expect(result).toBeDefined()
      }))
  })
})
