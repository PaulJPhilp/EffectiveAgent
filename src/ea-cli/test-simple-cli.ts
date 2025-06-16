#!/usr/bin/env node

import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

// Simple test command using standard Effect runtime
const testSimpleCommand = Command.make(
  "test-simple",
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
).pipe(Command.withDescription("A simple test command using standard runtime"))

// Main CLI using standard Effect runtime (like official examples)
const cli = Command.run(testSimpleCommand, {
  name: "test-simple-cli",
  version: "1.0.0",
})

// Use standard Effect runtime instead of our complex agent runtime
cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
