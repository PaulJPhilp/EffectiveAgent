#!/usr/bin/env node

/**
 * Simple test program to verify @effect/cli argument parsing
 */

import { Command, Args } from "@effect/cli";
import { Effect, Console } from "effect";
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
    ),
    optionalArg: Args.text({ name: "optional" }).pipe(
      Args.withDescription("An optional argument"),
      Args.optional
    )
  },
  (options) => Effect.gen(function* () {
    // Log all received arguments
    yield* Console.log("Arguments received:");
    yield* Console.log(`textArg: ${options.textArg}`);
    yield* Console.log(`fileArg: ${options.fileArg}`);
    yield* Console.log(`dirArg: ${options.dirArg}`);
    yield* Console.log(`intArg: ${options.intArg}`);
    yield* Console.log(`optionalArg: ${options.optionalArg ?? "not provided"}`);
    
    // Test file path validation
    yield* Console.log("\nValidating paths:");
    yield* Console.log(`fileArg path: ${options.fileArg}`);
    yield* Console.log(`dirArg path: ${options.dirArg}`);
    
    return Effect.succeed("Command completed successfully");
  })
).pipe(
  Command.withDescription("Test command to verify CLI argument parsing")
);

// Create the main CLI
const cli = Command.make("test-cli", {}, () => Effect.succeed(undefined)).pipe(
  Command.withDescription("CLI argument testing utility"),
  Command.withSubcommands([testCommand])
);

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  // Use dummy arguments if none provided
  const args = process.argv.length > 2 ? process.argv : [
    process.argv[0],
    process.argv[1],
    "test-args",
    "--text", "sample text",
    "--file", "/path/to/file.json",
    "--dir", "/path/to/directory",
    "--int", "123"
  ];
  
  console.log("Running with arguments:", args);
  
  const program = Command.run(cli, {
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
