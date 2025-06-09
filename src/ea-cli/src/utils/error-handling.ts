import { Console, Effect } from "effect"
import {
  ConfigurationError,
  FileSystemError,
  PermissionError,
  ValidationError,
} from "../errors.js"

export interface ErrorContext {
  command: string
  operation: string
}

export function handleCommandError(
  error: unknown,
  context: ErrorContext,
): Effect.Effect<void> {
  return Effect.gen(function* () {
    if (error instanceof ValidationError) {
      yield* Console.error(`Validation Error: ${error.message}`)
      if (error.field) {
        yield* Console.error(`Field: ${error.field}`)
      }
    } else if (error instanceof ConfigurationError) {
      yield* Console.error(`Configuration Error: ${error.message}`)
      if (error.configPath) {
        yield* Console.error(`File: ${error.configPath}`)
      }
      if (error.errorType === "missing") {
        yield* Console.log(
          "\nTip: Run 'ea-cli init' to create a new project with default configurations.",
        )
      }
      if (error.errorType === "parse") {
        yield* Console.log("\nTip: Check the file for JSON syntax errors.")
      }
    } else if (error instanceof PermissionError) {
      yield* Console.error(`Permission Error: ${error.message}`)
      yield* Console.error(`Path: ${error.path}`)
      yield* Console.error(`Required Permission: ${error.requiredPermission}`)
      yield* Console.log(
        "\nTip: Check the file/directory permissions and ensure you have the necessary access rights.",
      )
    } else if (error instanceof FileSystemError) {
      yield* Console.error(`File System Error: ${error.message}`)
      yield* Console.error(`Path: ${error.path}`)
      yield* Console.error(`Operation: ${error.operation}`)
      if (error.cause instanceof Error) {
        yield* Console.error(`Details: ${error.cause.message}`)
      }
    } else if (error instanceof Error) {
      yield* Console.error(
        `Error in ${context.command} command during ${context.operation}: ${error.message}`,
      )
    } else {
      yield* Console.error(
        `Unexpected error in ${context.command} command: ${String(error)}`,
      )
    }

    // Add help context
    yield* Console.log("\nFor more help, run:")
    yield* Console.log(`  ea-cli ${context.command} --help`)
  })
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof FileSystemError) {
    // Retry on transient filesystem errors like locks
    return error.operation === "write" || error.operation === "read"
  }
  if (error instanceof PermissionError) {
    // Don't retry permission errors
    return false
  }
  if (error instanceof ConfigurationError) {
    // Only retry missing files, not parse errors
    return error.errorType === "missing"
  }
  return false
}
