import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { Command } from "@effect/cli"
import { NodeContext } from "@effect/platform-node"
import { testSimpleCommand } from "../test-simple-cli.js"

describe("Simple CLI Tests", () => {
  const createTestCli = (args: string[]) =>
    Effect.gen(function* () {
      const cli = Command.run(testSimpleCommand, {
        name: "test-simple-cli",
        version: "1.0.0"
      })
      
      return yield* Effect.suspend(() => cli(args)).pipe(
        Effect.provide(NodeContext.layer)
      )
    })

  it("should execute with basic message", () =>
    Effect.gen(function* () {
      const args = ["node", "test-simple-cli", "Hello World"]
      const result = yield* createTestCli(args)
      expect(result).toBeDefined()
    })
  )

  it("should execute with verbose flag", () =>
    Effect.gen(function* () {
      const args = ["node", "test-simple-cli", "--verbose", "Hello World"]
      const result = yield* createTestCli(args)
      expect(result).toBeDefined()
    })
  )

  it("should fail with missing message argument", () =>
    Effect.gen(function* () {
      const args = ["node", "test-simple-cli"]
      const result = yield* Effect.either(createTestCli(args))
      expect(Effect.isFailure(result)).toBe(true)
    })
  )

  it("should fail with invalid flag", () =>
    Effect.gen(function* () {
      const args = ["node", "test-simple-cli", "--invalid", "Hello World"]
      const result = yield* Effect.either(createTestCli(args))
      expect(Effect.isFailure(result)).toBe(true)
    })
  )
})
