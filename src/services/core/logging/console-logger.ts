import { Effect, LogLevel } from "effect";
import type { ConsoleLoggerApi } from "./api.js";
import type { JsonObject } from "@/types.js";

/**
 * ConsoleLogger Effect.Service implementation.
 * Use ConsoleLogger.Default to provide the service.
 */
export class ConsoleLogger extends Effect.Service<ConsoleLoggerApi>()(
  "ConsoleLogger",
  {
    effect: Effect.succeed({
      log: (level: LogLevel.LogLevel, message: string, data?: JsonObject) =>
        Effect.sync(() => {
          const formatted = data ? `${message} ${JSON.stringify(data)}` : message;
          switch (level) {
            case LogLevel.Error:
              console.error(formatted);
              break;
            case LogLevel.Warning:
              console.warn(formatted);
              break;
            case LogLevel.Info:
              console.info(formatted);
              break;
            case LogLevel.Debug:
              console.debug(formatted);
              break;
            default:
              console.log(formatted);
          }
        }),

      debug: (message: string, data?: JsonObject) =>
        Effect.sync(() => {
          console.debug(data ? `${message} ${JSON.stringify(data)}` : message);
        }),

      info: (message: string, data?: JsonObject) =>
        Effect.sync(() => {
          console.info(data ? `${message} ${JSON.stringify(data)}` : message);
        }),

      warn: (message: string, data?: JsonObject) =>
        Effect.sync(() => {
          console.warn(data ? `${message} ${JSON.stringify(data)}` : message);
        }),

      error: (message: string, error?: unknown) =>
        Effect.sync(() => {
          const errorData = error instanceof Error
            ? { error: error.message, stack: error.stack }
            : { error };
          console.error(
            `${message} ${JSON.stringify(errorData as JsonObject)}`
          );
        })
    })
  }
) { }
