import { Effect } from "effect";
import { makeFileLogger } from "./src/services/core/logging/file-logger.js";

const program = Effect.log("Hello");

// Run the program, writing logs to /tmp/log.txt
Effect.runFork(program.pipe(Effect.provide(makeFileLogger())));
