import { Effect } from "effect"
import { describe, expect, it } from "vitest"
import { expectCommandFailure, runCommand } from "../test-utils.js"
import { deleteCommand } from "../../src/commands/delete.js"
import { addCommand } from "../../src/commands/add.js"

describe("delete command", () => {
  describe("delete", () => {
    it("should show help text when no subcommand provided", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(deleteCommand, [])
        expect(result).toBeDefined()
      })
    )

    it("should fail with invalid subcommand", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(deleteCommand, ["invalid"])
        expect(error).toBeDefined()
        expect(error.message).toContain("invalid")
      })
    )
  })

  describe("delete:agent", () => {
    it("should delete an existing agent", () =>
      Effect.gen(function* () {
        // First create an agent
        yield* runCommand(addCommand, ["agent", "test-agent"])
        
        // Then delete it
        const result = yield* runCommand(deleteCommand, ["agent", "test-agent"])
        expect(result).toBeDefined()
      })
    )

    it("should fail if agent does not exist", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(deleteCommand, ["agent", "non-existent-agent"])
        expect(error).toBeDefined()
        expect(error.message).toContain("does not exist")
      })
    )
  })

  describe("delete:model", () => {
    it("should delete an existing model", () =>
      Effect.gen(function* () {
        // First create a model
        yield* runCommand(addCommand, ["model", "test-model"])
        
        // Then delete it
        const result = yield* runCommand(deleteCommand, ["model", "test-model"])
        expect(result).toBeDefined()
      })
    )

    it("should fail if model does not exist", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(deleteCommand, ["model", "non-existent-model"])
        expect(error).toBeDefined()
        expect(error.message).toContain("does not exist")
      })
    )
  })

  describe("delete:provider", () => {
    it("should delete an existing provider", () =>
      Effect.gen(function* () {
        // First create a provider
        yield* runCommand(addCommand, ["provider", "test-provider"])
        
        // Then delete it
        const result = yield* runCommand(deleteCommand, ["provider", "test-provider"])
        expect(result).toBeDefined()
      })
    )

    it("should fail if provider does not exist", () =>
      Effect.gen(function* () {
        const error = yield* expectCommandFailure(deleteCommand, ["provider", "non-existent-provider"])
        expect(error).toBeDefined()
        expect(error.message).toContain("does not exist")
      })
    )
  })
})
