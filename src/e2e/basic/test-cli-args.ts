#!/usr/bin/env bun
// Moved from test/manual/basic/test-cli-args.ts
// (Original content should be copied here.)

import { Effect } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Console } from "effect";

// Define Effect type explicitly to use RuntimeServices

const testArgs = Effect.gen(function* () {
  // Log test arguments
  yield* Console.log("Arguments to test:");
  yield* Console.log("textArg: hello world");
  yield* Console.log("fileArg: /tmp/test.txt");
  yield* Console.log("dirArg: /tmp");
  yield* Console.log("intArg: 123");
});

Effect.runPromise(
  testArgs.pipe(
    Effect.provide(NodeFileSystem.layer),
    Effect.provide(NodePath.layer)
  )
).then(() => {
  console.log("Test completed successfully");
}).catch((err: unknown) => {
  console.error("Test failed:", err);
  process.exit(1);
});
