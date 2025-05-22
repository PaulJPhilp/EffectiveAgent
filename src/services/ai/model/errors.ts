/**
 * @file Defines error types specific to the AI Model configuration service.
 * @module services/ai/model/errors
 */

import { EffectiveError, EntityLoadError, EntityParseError } from "@/errors.js";

/**
 * Base error type for model-related errors
 */
/**
 * Base error type for model-related errors.
 * @extends EffectiveError
 */
export class ModelServiceError extends EffectiveError {
  public readonly modelId: string;
  /**
   * @param params - Error details
   * @param params.modelId - The affected model's ID
   * @param params.message - Error message
   * @param params.method - Method where error occurred
   * @param params.cause - Optional cause
   */
  constructor(params: { modelId: string; message: string; method: string; cause?: unknown }) { // Renamed from ModelError
    super({
      description: params.message,
      module: "services/ai/model/errors",
      method: params.method,
      cause: params.cause,
    });
    this.modelId = params.modelId;
  }
}

/**
 * Error class for failures related to loading, parsing, or validating
 * the AI model configuration (e.g., 'models.json').
 */
/**
 * Error class for failures related to loading, parsing, or validating the AI model configuration.
 * @extends EffectiveError
 */
export class ModelConfigError extends EffectiveError {
  /**
   * @param params - Error details
   * @param params.message - Error message
   * @param params.method - Method where error occurred
   * @param params.cause - Underlying error (EntityLoadError | EntityParseError)
   */
  constructor(params: { message: string; method: string; cause: EntityLoadError | EntityParseError }) {
    super({
      description: params.message,
      module: "services/ai/model/errors",
      method: params.method,
      cause: params.cause,
    });
  }
}

/**
 * Error when a requested model is not found
 */
/**
 * Error when a requested model is not found.
 * @extends EffectiveError
 */
export class ModelNotFoundError extends EffectiveError {
  public readonly modelId: string;

  /**
   * @param params - Error details
   * @param params.modelId - The missing model's ID
   * @param params.method - Method where error occurred
   * @param params.description - Optional description
   */
  constructor(params: { modelId: string; method: string; description?: string }) {
    super({
      description: params.description ?? `Model not found: ${params.modelId}`,
      module: "services/ai/model/errors",
      method: params.method,
    });
    this.modelId = params.modelId;
  }
}

/**
 * Error when a default model ID cannot be found for a given provider and capability.
 */
/**
 * Error when a default model ID cannot be found for a given provider and capability.
 * @extends EffectiveError
 */
export class ModelMissingModelIdError extends EffectiveError {
  public readonly provider: string;
  public readonly capability: string;
  /**
   * @param params - Error details
   * @param params.provider - Provider name
   * @param params.capability - Capability name
   * @param params.method - Method where error occurred
   */
  constructor(params: { provider: string; capability: string; method: string }) { // Renamed from MissingModelIdError
    super({
      description: `Missing default model ID for provider '${params.provider}' and capability '${params.capability}'`,
      module: "services/ai/model/errors",
      method: params.method,
    });
    this.provider = params.provider;
    this.capability = params.capability;
  }
}

/**
 * Error when a model validation fails
 */
/**
 * Error when a model validation fails.
 * @extends EffectiveError
 */
export class ModelValidationError extends EffectiveError {
  public readonly modelId: string;
  public readonly capabilities: string[];
  /**
   * @param params - Error details
   * @param params.modelId - The model's ID
   * @param params.message - Error message
   * @param params.capabilities - Capabilities involved
   * @param params.method - Method where error occurred
   * @param params.cause - Optional cause
   */
  constructor(params: { modelId: string; message: string; capabilities: string[]; method: string; cause?: unknown }) {
    super({
      description: params.message,
      module: "services/ai/model/errors",
      method: params.method,
      cause: params.cause,
    });
    this.modelId = params.modelId;
    this.capabilities = params.capabilities;
  }
}
