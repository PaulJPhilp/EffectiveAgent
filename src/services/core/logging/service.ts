/**
 * @file Implementation of the LoggingService using Effect's built-in logger
 * with file-based logging support.
 */

import { JsonObject } from "@/types.js";
import { Effect } from "effect";
import type { LoggingServiceApi } from "./api.js";

/**
 * Compose a LoggingServiceApi from multiple destinations.
 * Each destination must implement LoggingServiceApi.
 */
export function makeLoggingService(destinations: readonly LoggingServiceApi[]): LoggingServiceApi {
  const fanout = <T extends (...args: any[]) => Effect.Effect<void, Error>>(
    method: keyof LoggingServiceApi
  ) =>
    (...args: Parameters<LoggingServiceApi[typeof method]>): Effect.Effect<void, Error> =>
      Effect.all(
        destinations.map(dest =>
          ((dest[method] as any)(...args) as Effect.Effect<void, unknown, unknown>)
            .pipe(Effect.catchAll(e => Effect.fail(e as Error))) as Effect.Effect<void, Error, never>
        ),
        { concurrency: "unbounded" }
      ).pipe(Effect.asVoid);

  return {
    log: fanout("log"),
    debug: fanout("debug"),
    info: fanout("info"),
    warn: fanout("warn"),
    error: fanout("error"),
    trace: fanout("trace"),
    logCause: fanout("logCause"),
    logErrorCause: fanout("logErrorCause"),
    withContext: function <T extends JsonObject>(additionalContext: T): LoggingServiceApi {
      return makeLoggingService(destinations.map(dest => dest.withContext(additionalContext)));
    }
  };
}

export class LoggingService extends Effect.Service<LoggingServiceApi>()("LoggingService", {
  effect: Effect.succeed(makeLoggingService([])), // Provide your real destinations here
  dependencies: []
}) { }