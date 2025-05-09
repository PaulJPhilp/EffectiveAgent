import type { Effect, Schema } from "effect";
import type {
  ModelNotFoundError
} from "./errors.js";
import type { PublicModelInfoDefinition } from "./schema.js";

/**
 * Defines the public API for the ModelService.
 */
export type ModelServiceApi = {
  exists: (modelId: string) => Effect.Effect<boolean, ModelNotFoundError>;
  /**
   * Loads the model configuration.
   * Returns a ModelFile containing PublicModelInfoDefinition objects.
   */
  load: () => Effect.Effect<{ models: Schema.Schema.Type<PublicModelInfoDefinition>[], name: string, version: string }, never>;

  /**
   * Gets the provider name for a given model ID.
   */
  getProviderName: (modelId: string) => Effect.Effect<string, never>;

  /**
   * Finds all models that include the specified capability (based on vendorCapabilities).
   * Returns PublicModelInfoDefinition objects.
   */
  findModelsByCapability: (capability: string) => Effect.Effect<Schema.Schema.Type<PublicModelInfoDefinition>[], never>;

  /**
   * Finds all models that include ALL of the specified capabilities (based on vendorCapabilities).
   * Returns PublicModelInfoDefinition objects.
   */
  findModelsByCapabilities: (capabilities: string[]) => Effect.Effect<Schema.Schema.Type<PublicModelInfoDefinition>[], never>;

  /**
   * Gets the default model ID for a given provider and capability.
   */
  getDefaultModelId: () => Effect.Effect<string, never>;

  /**
   * Gets metadata for all models associated with a specific provider.
   */
  getModelsForProvider: (providerName: string) => Effect.Effect<Schema.Schema.Type<PublicModelInfoDefinition>[], never>;

  /**
   * Validates if a model has all the specified capabilities (based on vendorCapabilities).
   * @param modelId The ID of the model to validate.
   * @param capabilities Array of capabilities to validate against.
   * @returns An Effect resolving to true if the model exists and has all specified capabilities.
   * @error ModelNotFoundError If the model ID doesn't exist.
   * @error ModelValidationError If the model lacks required capabilities.
   */
  validateModel: (modelId: string) => Effect.Effect<boolean, never>;
};
