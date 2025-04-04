# Logging Service - Product Requirements Document (PRD)

**Version:** 1.0
**Date:** 2024-07-27
**Author:** T3 Chat (Assisted by Paul)

## 1. Overview

The Logging Service (`LoggingApi`) provides a standardized, Effect-based interface for recording application events, diagnostic information, and errors throughout the EffectiveAgent framework. It abstracts the underlying logging mechanism, allowing different logging backends (e.g., console, file, external services) to be configured while providing a consistent API for all other services. It leverages Effect's built-in logging capabilities where possible.

## 2. Goals

*   **Unified Logging API:** Offer a consistent `LoggingApi` interface with standard logging methods (`debug`, `info`, `warn`, `error`, `trace`).
*   **Structured Logging:** Support logging structured data (`JsonObject`) alongside textual messages for better context and machine readability.
*   **Effect Integration:** Integrate seamlessly with Effect's `Cause` for error reporting and `LogLevel` for severity levels.
*   **Level Control:** Allow configuration of the minimum log level to control verbosity.
*   **Abstraction:** Decouple service logic from specific logging destinations (console, files, etc.). The default implementation uses Effect's default `Logger`.
*   **Contextual Information:** Ensure logs generated via Effect's logger include contextual information like timestamps, log levels, and Fiber IDs automatically.

## 3. Non-Goals

*   **Log Transport Implementation (Beyond Console):** The initial `LoggingApiLive` implementation focuses on using Effect's default logger (typically console). Specific file or remote logging transports are separate implementations/layers.
*   **Log Rotation/Management:** File rotation, archiving, and size management are concerns of specific file transport implementations or external tools.
*   **Distributed Tracing:** While logs should ideally correlate with traces (e.g., via trace IDs in context), this service does not implement tracing itself.
*   **Log Aggregation/Shipping:** Collecting logs from multiple sources and forwarding them to central systems (like Datadog, ELK stack) is outside the scope of this service API.

## 4. User Stories

*(Perspective: Another Backend Service)*

*   **As a Service, I want to:**
    *   Log a debug message with specific context data during development.
    *   Log an informational message when a significant operation starts or completes.
    *   Log a warning when a recoverable issue occurs.
    *   Log an error when an operation fails, including the original `Error` object or Effect `Cause`.
    *   Easily control the verbosity of logs emitted by the application through configuration.

## 5. Functional Requirements

*   **`LoggingApi` Interface & Tag:** Defined in `types.ts`.
*   **Standard Log Methods:** Must implement `log(level, message, data?)`, `debug(message, data?)`, `info(message, data?)`, `warn(message, data?)`, `error(message, data?)`, `trace(message, data?)`.
    *   `level` should use `LogLevel` from `effect`.
    *   `data` should accept `JsonObject` or `Error` (for the `error` method).
*   **Cause Logging Methods:** Must implement `logCause(level, cause)` and `logErrorCause(cause)` accepting an Effect `Cause`.
*   **Default Implementation:** The `LoggingApiLive` implementation must use Effect's built-in logging functions (`Effect.log`, `Effect.logDebug`, etc.).
*   **Level Configuration:** Provide a mechanism (e.g., `LoggingLevelLayer`) to configure the minimum log level for the default logger using `Logger.minimumLogLevel`.

## 6. API Design (Conceptual)

Reference `types.ts` for the `LoggingApi` interface definition.

```typescript
// Example Usage (Conceptual)
Effect.gen(function*() {
  const logger = yield* LoggingApi;
  yield* logger.info("User logged in", { userId: "user-123" });
  const result = yield* someEffect.pipe(Effect.catchAllCause(cause =>
    logger.logErrorCause(cause).pipe(Effect.andThen(Effect.fail("mapped error")))
  ));
})
