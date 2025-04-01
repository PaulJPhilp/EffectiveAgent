// File: src/shared/services-effect/provider/errors.ts

import { Data } from "effect";

/** Base error type for all provider errors */
export type ProviderErrorData = {
  readonly message: string;
  readonly providerName: string;
  readonly cause?: unknown;
};

/** Base error class for all provider errors */
export class ProviderError extends Data.TaggedError("ProviderError")<ProviderErrorData> {
  constructor(data: ProviderErrorData) {
    super(data);
  }
}

/** Error for when a provider configuration is not found */
export class ProviderNotFoundError extends ProviderError {
  constructor(options: { providerName: string }) {
    super({
      message: `Provider configuration not found for: ${options.providerName}`,
      providerName: options.providerName
    });
  }
}

/** Error during provider instantiation or execution */
export class ProviderImplementationError extends ProviderError {
  constructor(options: { message: string; providerName: string; modelId?: string; cause?: unknown }) {
    super({
      message: options.message,
      providerName: options.providerName,
      cause: options.cause
    });
  }
}

/** Error for when an API key is missing */
export class ApiKeyMissingError extends ProviderError {
  constructor(options: { providerName: string; envVar?: string }) {
    const envVarMsg = options.envVar ? ` (checked env var: ${options.envVar})` : '';
    super({
      message: `API key for provider "${options.providerName}" is required but was not found${envVarMsg}.`,
      providerName: options.providerName
    });
  }
}

/** Error for unavailable capabilities */
export class ProviderCapabilityUnavailableError extends ProviderError {
  constructor(public params: { providerName: string; capability: string }) {
    super({ message: `Capability '${params.capability}' not available for provider '${params.providerName}'.`, providerName: params.providerName });
  }
}

/** Error for authentication failures */
export class ProviderAuthError extends ProviderError {
  constructor(options: { message: string; providerName: string; cause?: unknown }) {
    super({
      message: options.message,
      providerName: options.providerName,
      cause: options.cause
    });
  }
}

/** Error for rate limit issues */
export interface ProviderRateLimitErrorData extends ProviderErrorData {
  readonly retryAfterMs: number;
}

export class ProviderRateLimitError extends Data.TaggedError("ProviderRateLimitError")<ProviderRateLimitErrorData> {
  constructor(options: { message: string; providerName: string; retryAfterMs: number; cause?: unknown }) {
    super({
      message: options.message,
      providerName: options.providerName,
      retryAfterMs: options.retryAfterMs,
      cause: options.cause
    });
  }
}
