import { describe, it, expect, beforeEach } from "vitest"
import { Effect, Option } from "effect"
import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { addCommand } from "../../src/commands/add.js"
import { runCommand, expectCommandFailure } from "../test-utils.js"
import { setupTestWorkspace } from "../setup.js"
import { ConfigurationService } from "../../../services/core/configuration/service.js"
import { ModelService } from "../../../services/ai/model/service.js"
import {
  ValidationError,
  ResourceExistsError,
  ConfigurationError,
  PermissionError,
} from "../../src/errors.js"

describe("Add Command", () => {
  beforeEach(() => Effect.runPromise(setupTestWorkspace()))
  describe("add:agent", () => {
    it("should create a new agent", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(addCommand, ["agent", "test-agent"])
        expect(result).toBeDefined()
      }).pipe(
        Effect.timeout("5 seconds")
      )
    )

    it("should fail with invalid agent name", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(addCommand, ["agent", "Invalid@Name"])
        expect(result.cause).toBeInstanceOf(ValidationError)
        const error = result.cause as ValidationError
        expect(error.field).toBe("agent-name")
      }).pipe(
        Effect.timeout("5 seconds")
      )
    )

    it("should fail when agent already exists", () =>
      Effect.gen(function* () {
        // First create the agent
        yield* runCommand(addCommand, ["agent", "existing-agent"])
        
        // Try to create it again
        const result = yield* expectCommandFailure(addCommand, ["agent", "existing-agent"])
        expect(result.cause).toBeInstanceOf(ResourceExistsError)
        const error = result.cause as ResourceExistsError
        expect(error.resourceType).toBe("agent")
        expect(error.resourceName).toBe("existing-agent")
      }).pipe(
        Effect.timeout("5 seconds")
      )
    )
  })

  describe("add:model", () => {
    it("should add a new model", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(addCommand, ["model", "test-model"])
        expect(result).toBeDefined()
      })
    )

    it("should fail with invalid model name", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(addCommand, ["model", "Invalid@Model"])
        expect(result.cause).toBeInstanceOf(ValidationError)
        const error = result.cause as ValidationError
        expect(error.field).toBe("item-name")
      })
    )

    it("should fail when model already exists", () =>
      Effect.gen(function* () {
        // First add the model
        yield* runCommand(addCommand, ["model", "existing-model"])
        
        // Try to add it again
        const result = yield* expectCommandFailure(addCommand, ["model", "existing-model"])
        expect(result.cause).toBeInstanceOf(ResourceExistsError)
        const error = result.cause as ResourceExistsError
        expect(error.resourceType).toBe("model")
        expect(error.resourceName).toBe("existing-model")
      })
    )
  })

  describe("add:provider", () => {
    it("should add a new provider", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(addCommand, ["provider", "test-provider"])
        expect(result).toBeDefined()
      })
    )

    it("should fail with invalid provider name", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(addCommand, ["provider", "Invalid@Provider"])
        expect(result.cause).toBeInstanceOf(ValidationError)
        const error = result.cause as ValidationError
        expect(error.field).toBe("item-name")
      })
    )
  })

  describe("add:rule", () => {
    it("should add a new rule", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(addCommand, ["rule", "test.rule"])
        expect(result).toBeDefined()
      })
    )

    it("should fail with invalid rule name", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(addCommand, ["rule", "Invalid@Rule"])
        expect(result.cause).toBeInstanceOf(ValidationError)
        const error = result.cause as ValidationError
        expect(error.field).toBe("item-name")
      })
    )
  })

  describe("add:toolkit", () => {
    it("should add a new toolkit", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(addCommand, ["toolkit", "test-toolkit"])
        expect(result).toBeDefined()
      })
    )

    it("should fail with invalid toolkit name", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(addCommand, ["toolkit", "Invalid@Toolkit"])
        expect(result.cause).toBeInstanceOf(ValidationError)
        const error = result.cause as ValidationError
        expect(error.field).toBe("item-name")
      })
    )
  })

  describe("add (no subcommand)", () => {
    it("should show help text", () =>
      Effect.gen(function* () {
        const result = yield* runCommand(addCommand, [])
        expect(result).toBeDefined()
      })
    )
  })

  describe("add:invalid", () => {
    it("should fail with invalid subcommand", () =>
      Effect.gen(function* () {
        const result = yield* expectCommandFailure(addCommand, ["invalid", "test"])
        expect(Effect.isFailure(result)).toBe(true)
      })
    )
  })
})
