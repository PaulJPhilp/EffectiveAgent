#!/usr/bin/env node

/**
 * Simple test program to verify CLI argument parsing
 * Using the same imports as the existing CLI commands
 */

import { Args, Command } from "@effect/cli";
import { Console, Effect } from "effect";
import { NodeRuntime } from "@effect/platform-node";

// Define a simple command with various argument types
const testCommand = Command.make(
  "test-args",
  {
    // Test different argument types
    textArg: Args.text({ name: "text" }).pipe(
      Args.withDescription("A simple text argument")
    ),
    fileArg: Args.text({ name: "file" }).pipe(
      Args.withDescription("A file path as text")
    ),
    dirArg: Args.text({ name: "dir" }).pipe(
      Args.withDescription("A directory path as text")
    ),
    intArg: Args.integer({ name: "int" }).pipe(
      Args.withDescription("An integer argument"),
      Args.withDefault(42)
    )
  },
  (options) => Effect.gen(function* () {
    // Log all received arguments
    yield* Console.log("Arguments received:");
    yield* Console.log(`textArg: ${options.textArg}`);
    yield* Console.log(`fileArg: ${options.fileArg}`);
    yield* Console.log(`dirArg: ${options.dirArg}`);
    yield* Console.log(`intArg: ${options.intArg}`);
    
    return Effect.succeed("Command completed successfully");
  })
);

// Run the CLI directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Use dummy arguments if none provided
  const args = process.argv.length > 2 ? process.argv : [
    process.argv[0],
    process.argv[1],
    "--text", "sample text",
    "--file", "/path/to/file.json",
    "--dir", "/path/to/directory",
    "--int", "123"
  ];
  
  console.log("Running with arguments:", args);
  
  const program = Command.run(testCommand, {
    name: "test-cli",
    version: "1.0.0"
  });
  
  NodeRuntime.runMain(Effect.suspend(() => program(args)))
    .then(() => console.log("CLI execution completed"))
    .catch(error => {
      console.error("CLI execution failed:", error);
      process.exit(1);
    });
}
