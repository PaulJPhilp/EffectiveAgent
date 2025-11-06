/**
 * @file Error types for the Effect AI SDK
 * @module @effective-agent/ai-sdk/errors
 */

import { Data } from "effect";

/**
 * Base error for AI SDK operations
 */
export class AiSdkError extends Data.TaggedError("AiSdkError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Error during AI SDK operation execution
 */
export class AiSdkOperationError extends Data.TaggedError("AiSdkOperationError")<{
  readonly message: string;
  readonly operation: string;
  readonly cause?: unknown;
}> {}

/**
 * Configuration error in AI SDK
 */
export class AiSdkConfigError extends Data.TaggedError("AiSdkConfigError")<{
  readonly message: string;
  readonly configKey?: string;
  readonly cause?: unknown;
}> {}

/**
 * Provider-specific error
 */
export class AiSdkProviderError extends Data.TaggedError("AiSdkProviderError")<{
  readonly message: string;
  readonly provider: string;
  readonly cause?: unknown;
}> {}

/**
 * Schema conversion or validation error
 */
export class AiSdkSchemaError extends Data.TaggedError("AiSdkSchemaError")<{
  readonly message: string;
  readonly schemaName?: string;
  readonly cause?: unknown;
}> {}

/**
 * Message transformation error
 */
export class AiSdkMessageTransformError extends Data.TaggedError("AiSdkMessageTransformError")<{
  readonly message: string;
  readonly direction: "toVercel" | "toEffective";
  readonly cause?: unknown;
}> {}
