#!/usr/bin/env node

import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

// Simple test command with minimal runtime
const testCommand = Command.make(
  "test",
  {
    message: Args.text({ name: "message" }).pipe(
      Args.withDescription("A test message"),
    ),
    verbose: Options.boolean("verbose").pipe(
      Options.withDescription("Enable verbose output"),
    ),
  },
  ({ message, verbose }) =>
    Effect.gen(function* () {
      yield* Console.log(`Message: ${message}`)
      if (verbose) {
        yield* Console.log("Verbose mode enabled")
      }
    }),
).pipe(Command.withDescription("A simple test command to debug option parsing"))

// Simple main CLI
const mainCommand = Command.make("simple-cli", {}, () =>
  Effect.succeed(undefined),
).pipe(
  Command.withDescription("Simple CLI for testing @effect/cli option parsing"),
  Command.withSubcommands([testCommand]),
)

// Use standard Effect runtime (like official examples)
const cli = Command.run(mainCommand, {
  name: "simple-cli",
  version: "1.0.0",
})

// Run with Effect.suspend like the official examples
Effect.suspend(() => cli(process.argv)).pipe(
  Effect.provide(NodeContext.layer),
  NodeRuntime.runMain,
)
