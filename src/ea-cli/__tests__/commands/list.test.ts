import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { listCommand } from "../../src/commands/list.js"
import { ConfigurationError, FileSystemError } from "../../src/errors.js"
import { expectCommandFailure, runCommand } from "../test-utils.js"

describe("List Command", () => {
  describe("list:agent", () => {
    it("should list available agents", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(listCommand, ["agent"])
        expect(result).toBeDefined()
      }))

    it("should handle missing agents directory", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(listCommand, ["agent"])
        expect(result.cause).toBeInstanceOf(FileSystemError)
      }))
  })

  describe("list:model", () => {
    it("should list available models", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(listCommand, ["model"])
        expect(result).toBeDefined()
      }))

    it("should handle missing models.json", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(listCommand, ["model"])
        expect(result.cause).toBeInstanceOf(ConfigurationError)
        const error = result.cause as ConfigurationError
        expect(error.configPath).toBe("ea-config/models.json")
        expect(error.errorType).toBe("missing")
      }))
  })

  describe("list:provider", () => {
    it("should list available providers", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(listCommand, ["provider"])
        expect(result).toBeDefined()
      }))

    it("should handle missing providers.json", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(listCommand, ["provider"])
        expect(result.cause).toBeInstanceOf(ConfigurationError)
        const error = result.cause as ConfigurationError
        expect(error.configPath).toBe("ea-config/providers.json")
        expect(error.errorType).toBe("missing")
      }))
  })

  describe("list:rule", () => {
    it("should list available rules", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(listCommand, ["rule"])
        expect(result).toBeDefined()
      }))

    it("should handle missing policy.json", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(listCommand, ["rule"])
        expect(result.cause).toBeInstanceOf(ConfigurationError)
        const error = result.cause as ConfigurationError
        expect(error.configPath).toBe("ea-config/rules.json")
        expect(error.errorType).toBe("missing")
      }))
  })

  describe("list:toolkit", () => {
    it("should list available toolkits", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(listCommand, ["toolkit"])
        expect(result).toBeDefined()
      }))

    it("should handle missing tool-registry.json", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(listCommand, ["toolkit"])
        expect(result.cause).toBeInstanceOf(ConfigurationError)
        const error = result.cause as ConfigurationError
        expect(error.configPath).toBe("ea-config/toolkits.json")
        expect(error.errorType).toBe("missing")
      }))
  })

  describe("list (no subcommand)", () => {
    it("should show help text", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(listCommand, [])
        expect(result).toBeDefined()
      }))
  })

  describe("list:invalid", () => {
    it("should fail with invalid subcommand", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(listCommand, ["invalid"])
        expect(error).toBeDefined()
        expect(error.message).toContain("invalid")
      }))
  })
})
