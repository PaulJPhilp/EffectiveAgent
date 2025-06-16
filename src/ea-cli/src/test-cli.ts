#!/usr/bin/env node

import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect } from "effect"

// Simple test command to debug option parsing
const testCommand = Command.make(
  "test",
  {
    message: Args.text({ name: "message" }),
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

// Simple CLI setup like the official examples
const cli = Command.run(testCommand, {
  name: "Test CLI",
  version: "1.0.0",
})

// Standard runtime approach from examples
cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain)
