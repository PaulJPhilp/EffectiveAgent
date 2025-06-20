import { Command } from "@effect/cli"
import { Path } from "@effect/platform"
import { NodeContext, NodeFileSystem } from "@effect/platform-node"
import { Effect } from "effect"
import { ModelService } from "../../services/ai/model/service.js"
import { ConfigurationService } from "../../services/core/configuration/index.js"

/**
 * Creates a test CLI environment with all required services
 */
export const createTestCli = <N extends string, R, E, A>(
  command: Command.Command<N, R, E, A>,
  args: string[]
): Effect.Effect<void, E, never> =>
  Effect.gen(function* () {
    // Run the command
    const program = Command.run({
      name: "test-cli",
      version: "1.0.0"
    })(command)(args)

    yield* program
  }).pipe(
    Effect.mapError((error): E => error as E),
    Effect.map(() => void 0),
    Effect.withSpan("createTestCli"),
    Effect.annotateLogs({ args })
  ) as Effect.Effect<void, E, never>

/**
 * Helper to run a command and return its result
 */
export const runCommand = <N extends string, R, E, A>(
  command: Command.Command<N, R, E, A>,
  args: string[]
): Effect.Effect<void, E, never> =>
  createTestCli(command, ["node", "ea-cli", ...args])

/**
 * Helper to run a command and expect failure
 */
export const expectCommandFailure = <N extends string, R, E, A>(
  command: Command.Command<N, R, E, A>,
  args: string[]
): Effect.Effect<E, never, never> =>
  runCommand(command, args).pipe(
    Effect.match({
      onSuccess: () => { throw new Error("Expected command to fail") },
      onFailure: (error) => error as E
    })
  )
