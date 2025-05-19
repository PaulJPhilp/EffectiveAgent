import { Effect } from "effect";
import { makeLoggingService } from "./services/core/logging/service.js";
import { FileLogger } from "./services/core/logging/file-logger.js";

// Set up a file logger destination
const fileLogger = new FileLogger();
await Effect.runPromise(fileLogger.initialize());
const loggerService = makeLoggingService([fileLogger.createLoggingService()]);

const program = Effect.gen(function* () {
    yield* loggerService.info("Application started");
    return loggerService;
});

export const logger = await Effect.runPromise(program);