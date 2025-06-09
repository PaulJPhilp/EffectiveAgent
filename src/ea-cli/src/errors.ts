import { Data } from "effect"
import { EffectiveError } from "../../errors.js"

/**
 * Base error class for CLI errors
 */
export class CLIError extends EffectiveError {
  constructor(params: {
    message: string
    cause?: unknown
  }) {
    super({
      description: params.message,
      module: "ea-cli",
      method: "cli",
      cause: params.cause,
    })
  }
}

/**
 * Error thrown when a required resource is not found
 */
export class ResourceNotFoundError extends CLIError {
  readonly resourceType: string
  readonly resourceName: string

  constructor(params: {
    resourceType: string
    resourceName: string
    message?: string
    cause?: unknown
  }) {
    super({
      message:
        params.message ??
        `${params.resourceType} '${params.resourceName}' not found`,
      cause: params.cause,
    })
    this.resourceType = params.resourceType
    this.resourceName = params.resourceName
  }
}

/**
 * Error thrown when there are validation issues
 */
export class ValidationError extends CLIError {
  readonly field?: string
  readonly code?: string

  constructor(params: {
    message: string
    field?: string
    code?: string
    cause?: unknown
  }) {
    super({
      message: params.message,
      cause: params.cause,
    })
    this.field = params.field
    this.code = params.code
  }
}

/**
 * Error thrown when a resource already exists
 */
export class ResourceExistsError extends CLIError {
  readonly resourceType: string
  readonly resourceName: string

  constructor(params: {
    resourceType: string
    resourceName: string
    message?: string
    cause?: unknown
  }) {
    super({
      message:
        params.message ??
        `${params.resourceType} '${params.resourceName}' already exists`,
      cause: params.cause,
    })
    this.resourceType = params.resourceType
    this.resourceName = params.resourceName
  }
}

/**
 * Error thrown when there are configuration-related errors
 */
export class ConfigurationError extends CLIError {
  readonly configPath?: string
  readonly errorType: "parse" | "schema" | "missing" | "invalid"

  constructor(params: {
    message: string
    configPath?: string
    errorType: "parse" | "schema" | "missing" | "invalid"
    cause?: unknown
  }) {
    super({
      message: params.message,
      cause: params.cause,
    })
    this.configPath = params.configPath
    this.errorType = params.errorType
  }
}

/**
 * Error thrown when there are runtime execution errors
 */
export class RuntimeError extends CLIError {
  readonly operation: string
  readonly context: Record<string, unknown>

  constructor(params: {
    message: string
    operation: string
    context: Record<string, unknown>
    cause?: unknown
  }) {
    super({
      message: params.message,
      cause: params.cause,
    })
    this.operation = params.operation
    this.context = params.context
  }
}

/**
 * Error thrown when there are network or connectivity issues
 */
export class NetworkError extends Data.TaggedError("NetworkError")<{
  readonly message: string
  readonly host?: string
  readonly port?: number
  readonly operation: string
  readonly cause?: unknown
}> {
  constructor(params: {
    message: string
    operation: string
    host?: string
    port?: number
    cause?: unknown
  }) {
    super({
      message: params.message,
      operation: params.operation,
      host: params.host,
      port: params.port,
      cause: params.cause,
    })
  }
}

/**
 * Error thrown when an operation is cancelled or interrupted
 */
export class InterruptError extends CLIError {
  readonly operation: string
  readonly reason: string

  constructor(params: {
    message: string
    operation: string
    reason: string
    cause?: unknown
  }) {
    super({
      message: params.message,
      cause: params.cause,
    })
    this.operation = params.operation
    this.reason = params.reason
  }
}

/**
 * Error thrown when there are agent execution or runtime errors
 */
export class AgentRuntimeError extends CLIError {
  readonly agentName: string
  readonly phase: string

  constructor(params: {
    message: string
    agentName: string
    phase: string
    cause?: unknown
  }) {
    super({
      message: params.message,
      cause: params.cause,
    })
    this.agentName = params.agentName
    this.phase = params.phase
  }
}

/**
 * Error thrown when there are permission issues
 */
export class PermissionError extends CLIError {
  readonly path: string
  readonly operation: string
  readonly requiredPermission: string

  constructor(params: {
    message: string
    path: string
    operation: string
    requiredPermission: string
    cause?: unknown
  }) {
    super({
      message: params.message,
      cause: params.cause,
    })
    this.path = params.path
    this.operation = params.operation
    this.requiredPermission = params.requiredPermission
  }
}

/**
 * Error thrown when there are filesystem operation issues
 */
export class FileSystemError extends CLIError {
  readonly path: string
  readonly operation: string

  constructor(params: {
    message: string
    path: string
    operation: string
    cause?: unknown
  }) {
    super({
      message: params.message,
      cause: params.cause,
    })
    this.path = params.path
    this.operation = params.operation
  }
}

/**
 * Helper to format error messages consistently across the CLI
 */
export function formatErrorMessage(error: CLIError): string {
  let message = error.message

  // Add context based on error type
  if (error instanceof ResourceNotFoundError) {
    message = `${error.resourceType} '${error.resourceName}' not found: ${message}`
  } else if (error instanceof ValidationError) {
    message = `Validation error${
      error.field ? ` in ${error.field}` : ""
    }: ${message}`
  } else if (error instanceof ConfigurationError) {
    message = `Configuration error (${error.errorType})${
      error.configPath ? ` in ${error.configPath}` : ""
    }: ${message}`
  } else if (error instanceof RuntimeError) {
    message = `Runtime error during ${error.operation}: ${message}`
  } else if (error instanceof NetworkError) {
    const location = error.host
      ? ` (${error.host}${error.port ? `:${error.port}` : ""})`
      : ""
    message = `Network error${location}: ${message}`
  } else if (error instanceof AgentRuntimeError) {
    message = `Agent runtime error (${error.agentName}) during ${error.phase}: ${message}`
  } else if (error instanceof PermissionError) {
    message = `Permission error (${error.requiredPermission}) for ${error.operation} on ${error.path}: ${message}`
  } else if (error instanceof FileSystemError) {
    message = `File system error (${error.operation}) on ${error.path}: ${message}`
  }

  // Include cause if available
  if (error.cause) {
    const cause = error.cause as Error
    message += `\nCause: ${cause.message}`
  }

  return message
}

/**
 * Helper to determine if an error is retryable
 */
export function isRetryableError(error: CLIError): boolean {
  // Network errors are generally retryable
  if (error instanceof NetworkError) {
    return true
  }

  // Some runtime errors might be retryable
  if (error instanceof RuntimeError) {
    // Retry on transient failures
    if (
      error.message.toLowerCase().includes("timeout") ||
      error.message.toLowerCase().includes("temporary") ||
      error.message.toLowerCase().includes("retry")
    ) {
      return true
    }
  }

  // Configuration errors are not retryable
  if (
    error instanceof ConfigurationError ||
    error instanceof ValidationError ||
    error instanceof ResourceNotFoundError ||
    error instanceof ResourceExistsError ||
    error instanceof PermissionError
  ) {
    return false
  }

  // By default, don't retry
  return false
}

/**
 * Helper function to classify and map unknown errors to specific error types
 */
export function mapUnknownError(error: unknown): CLIError {
  if (error instanceof CLIError) {
    return error
  }

  const err = error as Error
  if (err.message?.includes("ENOENT")) {
    return new FileSystemError({
      message: "File or directory not found",
      path: err.message.split("'")[1] || "unknown",
      operation: "access",
    })
  }

  if (err.message?.includes("EACCES")) {
    return new PermissionError({
      message: "Permission denied",
      path: err.message.split("'")[1] || "unknown",
      operation: "access",
      requiredPermission: "read",
    })
  }

  return new CLIError({
    message: err.message || "An unknown error occurred",
    cause: error,
  })
}
