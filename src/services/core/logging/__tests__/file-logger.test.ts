import { Effect, LogLevel } from "effect";
import { FileLogger } from "../file-logger.js";
import { describe, it } from "vitest";

describe("FileLogger", () => {
  it("should log messages", () => 
    Effect.runPromise(
      Effect.gen(function* () {
        const logger = yield* FileLogger;
        yield* logger.log(LogLevel.Info, "Test message");
      }).pipe(
        Effect.provide(FileLogger.Default)
      )
    )
  );
});
