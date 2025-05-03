import type { ModelCapability } from "@/schema.js";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import type { Effect } from "effect";
import type {
  MissingModelIdError,
  ModelConfigError,
  ModelNotFoundError,
  ModelValidationError,
} from "./errors.js";
import type { ModelFile, Provider, PublicModelInfoDefinition } from "./schema.js";

/**
 * Defines the public API for the ModelService.
 */
export type ModelServiceApi = {
  exists: (modelId: string) => Effect.Effect<boolean, ModelNotFoundError>;
  /**
   * Loads the model configuration.
   * Returns a ModelFile containing PublicModelInfoDefinition objects.
   */
  load: () => Effect.Effect<ModelFile, ModelConfigError>;

  /**
   * Gets the provider name for a given model ID.
   */
  getProviderName: (
    modelId: string
  ) => Effect.Effect<Provider, ModelConfigError | ModelNotFoundError>;

  /**
   * Finds all models that include the specified capability (based on vendorCapabilities).
   * Returns PublicModelInfoDefinition objects.
   */
  findModelsByCapability: (
    capability: typeof ModelCapability
  ) => Effect.Effect<Array<PublicModelInfoDefinition>, ModelConfigError>;

  /**
   * Finds all models that include ALL of the specified capabilities (based on vendorCapabilities).
   * Returns PublicModelInfoDefinition objects.
   */
  findModelsByCapabilities: (
    capabilities: typeof ModelCapability
  ) => Effect.Effect<Array<PublicModelInfoDefinition>, ModelConfigError>;

  /**
   * Gets the default model ID for a given provider and capability.
   */
  getDefaultModelId: (
    provider: Provider,
    capability: ModelCapability
  ) => Effect.Effect<string, ModelConfigError | MissingModelIdError>;

  /**
   * Gets metadata for all models associated with a specific provider.
   */
  getModelsForProvider: (
    provider: Provider
  ) => Effect.Effect<LanguageModelV1[], never>;

  /**
   * Validates if a model has all the specified capabilities (based on vendorCapabilities).
   * @param modelId The ID of the model to validate.
   * @param capabilities Array of capabilities to validate against.
   * @returns An Effect resolving to true if the model exists and has all specified capabilities.
   * @error ModelNotFoundError If the model ID doesn't exist.
   * @error ModelValidationError If the model lacks required capabilities.
   */
  validateModel: (
    modelId: string,
    capabilities: typeof ModelCapability
  ) => Effect.Effect<boolean, ModelNotFoundError | ModelValidationError>;
};
