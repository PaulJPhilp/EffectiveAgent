// File: src/services/model/types.ts (Complete - Branded Type Pattern)

import { Context, Effect } from "effect";

// Import shared/global types
import type { JSONObject, ModelCompletionOptions } from '../../types.js';

// Import types from this module's schemas
import type { ModelCapability, ModelConfig, ModelConfigFile, ModelsConfig } from './schema.js';

// Import error types from this module
import type { GenerationError, ModelCapabilityError, ModelNotFoundError, ValidationError } from './errors.js';

// Import types/errors from other modules needed for signatures
import type { ApiKeyMissingError, ProviderImplementationError, ProviderNotFoundError } from '../ai/provider/errors.ts';
import type { LLMCompletionResult } from '../ai/provider/types.ts';

// --- Type Definitions ---

/** 
 * Represents a vector of floating-point numbers used for embeddings.
 * Each number in the array represents a dimension in the embedding space.
 */
export type EmbeddingVector = readonly number[];

// --- Declare Brand Symbols ---
// These unique symbols are used to make the service interfaces nominally typed.
declare const ModelConfigurationServiceBrand: unique symbol;
declare const ModelServiceBrand: unique symbol;


// --- Service Interfaces using Branded Types ---

/**
 * Interface and Tag for the ModelConfigurationService.
 * Defines methods for accessing loaded model configuration data using Effect.
 * Uses a branded type for nominal typing.
 */
/**
 * Interface for model configuration service.
 * Defines methods for accessing loaded model configuration data.
 */
export interface ModelConfigurationService {
	/** Get model configuration by its unique ID. */
	readonly getModelConfig: (modelId: string) => Effect.Effect<ModelConfig, ModelNotFoundError>;

	/** Retrieves a list of all loaded model configurations. */
	readonly listModels: () => Effect.Effect<ReadonlyArray<ModelConfig>, never>;

	/** Finds models based on specified capabilities. */
	readonly findModelsByCapability: (
		capabilities: ReadonlyArray<ModelCapability>,
		matchAll?: boolean
	) => Effect.Effect<ReadonlyArray<ModelConfig>, never>;
}
// Tag uses the branded interface name
export const ModelConfigurationService = Context.GenericTag<ModelConfigurationService>("ModelConfigurationService");


/**
 * Interface and Tag for the ModelService.
 * Defines methods for orchestrating LLM generation tasks using Effect.
 * Uses a branded type for nominal typing.
 */
export interface ModelService {
	// Branding property - makes the type nominal
	readonly [ModelServiceBrand]?: never;

	/**
	 * Generates text using the specified model and options.
	 * Potential Failures: ModelNotFound, ProviderNotFound, ApiKeyMissing, ProviderImplementation, GenerationError, ModelCapabilityError (if capability check added)
	 */
	readonly generateText: (options: ModelCompletionOptions) => Effect.Effect<LLMCompletionResult, ModelNotFoundError | ProviderNotFoundError | GenerationError | ApiKeyMissingError | ProviderImplementationError | ModelCapabilityError>;

	/**
	 * Generates a typed JSON object using the specified model and options.
	 * Potential Failures: ModelNotFound, ProviderNotFound, ApiKeyMissing, ProviderImplementation, GenerationError, ValidationError, ModelCapabilityError (if capability check added)
	 */
	readonly generateObject: <T extends JSONObject = JSONObject>(options: ModelCompletionOptions<T>) => Effect.Effect<LLMCompletionResult, ModelNotFoundError | ProviderNotFoundError | GenerationError | ValidationError | ApiKeyMissingError | ProviderImplementationError | ModelCapabilityError>;

	/**
	 * Generates embeddings for the given text using the specified model.
	 * Potential Failures: ModelNotFound, ProviderNotFound, ApiKeyMissing, ProviderImplementation, GenerationError, ModelCapabilityError
	 */
	readonly generateEmbedding: (options: ModelCompletionOptions) => Effect.Effect<LLMCompletionResult, ModelNotFoundError | ProviderNotFoundError | GenerationError | ModelCapabilityError | ApiKeyMissingError | ProviderImplementationError>;

	/**
	 * Generates an image using the specified model and options.
	 * Potential Failures: ModelNotFound, ProviderNotFound, ApiKeyMissing, ProviderImplementation, GenerationError, ModelCapabilityError
	 */
	readonly generateImage: (options: ModelCompletionOptions) => Effect.Effect<LLMCompletionResult, ModelNotFoundError | ProviderNotFoundError | GenerationError | ModelCapabilityError | ApiKeyMissingError | ProviderImplementationError>;
}
// Tag uses the branded interface name
export const ModelService = Context.GenericTag<ModelService>("ModelService");


// --- Re-export Schema Types ---
// Makes types inferred from schema easily available when importing from this module's types.
export type { ModelConfig, ModelConfigFile, ModelsConfig };

// Re-export errors if needed by consumers of this module's types
export * from './errors.js'; // Optional: Re-export errors

