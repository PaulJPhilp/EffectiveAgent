#!/usr/bin/env bun

/**
 * Minimal test program to isolate CLI argument parsing issues
 */

import { Command, Args } from "@effect/cli";
import { Effect, Console } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeFileSystem, NodePath, NodeRuntime } from "@effect/platform-node";

// Define a simple command with various argument types
const testCommand = Command.make(
  "test",
  {
    // Test different argument types
    textArg: Args.text({ name: "text" }).pipe(
      Args.withDescription("A simple text argument")
    ),
    filePathArg: Args.text({ name: "file-path" }).pipe(
      Args.withDescription("A file path as text")
    ),
    dirPathArg: Args.text({ name: "dir-path" }).pipe(
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
    yield* Console.log(`filePathArg: ${options.filePathArg}`);
    yield* Console.log(`dirPathArg: ${options.dirPathArg}`);
    yield* Console.log(`intArg: ${options.intArg}`);
    
    // Get file system
    const fs = yield* FileSystem.FileSystem;
    
    // Check if file exists
    if (options.filePathArg) {
      const fileExists = yield* fs.exists(options.filePathArg);
      yield* Console.log(`File exists: ${fileExists}`);
    }
    
    // Check if directory exists
    if (options.dirPathArg) {
      const dirExists = yield* fs.exists(options.dirPathArg);
      yield* Console.log(`Directory exists: ${dirExists}`);
    }
    
    return Effect.succeed("Command completed successfully");
  })
);

// Run the CLI directly
const args = process.argv;
console.log("Running with arguments:", args);

// Create and run the program
const program = Command.run(testCommand, {
  name: "test-cli",
  version: "1.0.0"
});

// Provide the file system layer and run the program
const runEffect = program(args).pipe(
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(NodePath.layer)
);

NodeRuntime.runMain(runEffect);
