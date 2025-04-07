
---

**File: `src/services/core/logging/docs/Architecture.md`**

```markdown
# Logging Service - Architecture Document

**Version:** 1.0
**Date:** 2024-07-27

## 1. Overview

This document describes the architecture of the `LoggingService` (`LoggingApi`). It provides a simple facade over Effect-TS's built-in logging capabilities, ensuring a consistent logging interface across the application while allowing the underlying logging mechanism (via Effect `Logger`) to be configured separately.

## 2. Core Responsibilities

*   Implement the `LoggingApi` interface.
*   Provide methods for logging at different severity levels (`debug`, `info`, `warn`, `error`, `trace`).
*   Support logging structured data alongside messages.
*   Provide helpers for logging Effect `Cause` objects.
*   Delegate actual log formatting and output to the `Logger` service available in the Effect context.

## 3. Key Components

*   **`LoggingApi` (Interface / Tag):** (`types.ts`) Defines the public contract for logging.
*   **`LoggingApiLive` (Implementation):** (`main.ts`) The primary implementation class.
    *   **Dependencies:** None directly injected via constructor. It uses Effect's static logging functions (`Effect.log`, `Effect.logDebug`, etc.) which implicitly require the `Logger` service from the context they are run in.
    *   **Logic:** Maps the `LoggingApi` methods to the corresponding `Effect.log*` functions, passing messages and data appropriately. Handles the `Error` type in the `error` method by wrapping it in `Cause.die`.
*   **`LoggingApiLiveLayer` (Layer):** (`main.ts`) Provides the `LoggingApiLive` instance for the `LoggingApi` Tag using `Layer.succeed`. This layer itself has no requirements (`R = never`).
*   **`LoggingLevelLayer` (Layer Factory):** (`main.ts`) A helper function that returns a `Layer<never>` which uses `Logger.minimumLogLevel` to configure the `Logger` service provided in the context. This layer is typically composed *after* `LoggingApiLiveLayer` and any layer providing the actual `Logger` implementation (like the default runtime layer).
*   **`Logger` (Effect Service):** The underlying Effect service responsible for formatting and outputting log entries. `LoggingApiLive` relies on this being present in the context when its methods are executed. The default Effect runtime provides a console-based `Logger`.

## 4. Core Logic Flows

*   A call to `loggingApi.info("Message", { key: "value" })` within an Effect results in executing `Effect.logInfo("Message", { key: "value" })`.
*   This `Effect.logInfo` operation accesses the `Logger` service currently available in its execution context.
*   The `Logger` service formats the message, data, level, timestamp, Fiber ID, etc., according to its configuration.
*   The `Logger` service outputs the formatted entry (e.g., to the console).
*   Configuring the level via `LoggingLevelLayer` modifies the context provided to subsequent effects, causing the `Logger` service to filter messages below the specified level.

## 5. Interaction with Dependencies

*   **Implicit Dependency:** Relies on the presence of a `Logger` service in the Effect context where logging methods are executed. The default runtime (`DefaultServices`) provides one.
*   **Configuration:** Log level is configured externally via Layer composition (using `LoggingLevelLayer` or `Logger.minimumLogLevel` directly). Specific logger implementations (e.g., file logger) might require `Config` service for their own settings.

## 6. Error Handling

*   The primary implementation (`LoggingApiLive`) generally does not fail itself (logging effects are typically `Effect<void>`). Errors related to the underlying transport (e.g., cannot write to file) would be handled within the specific `Logger` implementation being used. The defined `LoggingError` can be used by custom `Logger` implementations.

## 7. Extensibility

*   Different logging backends can be implemented by creating alternative Layers that provide the `Logger` service (e.g., `MyFileLoggerLayer = Layer.provide(Logger.replace(Logger.Tag, myFileLoggerImpl))`). The `LoggingApi` service does not need to change.

