/**
 * Simple test command to verify CLI argument parsing
 */

import { Args, Command } from "@effect/cli"
import { Console, Effect } from "effect"

/**
 * Test command to verify argument parsing
 */
export const testArgsCommand = Command.make(
  "test-args",
  {
    // Test different argument types
    textArg: Args.text({ name: "text" }).pipe(
      Args.withDescription("A simple text argument"),
    ),
    fileArg: Args.text({ name: "file" }).pipe(
      Args.withDescription("A file path as text"),
    ),
    dirArg: Args.text({ name: "dir" }).pipe(
      Args.withDescription("A directory path as text"),
    ),
    intArg: Args.integer({ name: "int" }).pipe(
      Args.withDescription("An integer argument"),
      Args.withDefault(42),
    ),
  },
  (options) =>
    Effect.gen(function* () {
      // Log all received arguments
      yield* Console.log("Arguments received:")
      yield* Console.log(`textArg: ${options.textArg}`)
      yield* Console.log(`fileArg: ${options.fileArg}`)
      yield* Console.log(`dirArg: ${options.dirArg}`)
      yield* Console.log(`intArg: ${options.intArg}`)

      return Effect.succeed("Command completed successfully")
    }),
).pipe(Command.withDescription("Test command to verify CLI argument parsing"))
