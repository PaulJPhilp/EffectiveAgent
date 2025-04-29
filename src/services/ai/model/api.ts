import type { Effect } from "effect";
import type { ModelCapability } from "@/schema.js";
import type { LanguageModelV1 } from "@ai-sdk/provider";
import type {
  MissingModelIdError,
  ModelConfigError,
  ModelNotFoundError,
  ModelValidationError,
} from "./errors.js";
import type { Model, ModelFile, Provider } from "./schema.js";

/**
 * Defines the public API for the ModelService.
 */
export type ModelServiceApi = {
  /**
   * Loads the model configuration from the config provider and validates it.
   * @returns An Effect resolving to the loaded and validated ModelFile.
   */
  load: () => Effect.Effect<ModelFile, ModelConfigError>;

  /**
   * Gets the provider name for a given model ID.
   */
  getProviderName: (
    modelId: string
  ) => Effect.Effect<Provider, ModelConfigError | ModelNotFoundError>;

  /**
   * Finds all models that include the specified capability.
   */
  findModelsByCapability: (
    capability: typeof ModelCapability
  ) => Effect.Effect<Array<Model>, ModelConfigError>;

  /**
   * Finds all models that include ALL of the specified capabilities.
   */
  findModelsByCapabilities: (
    capabilities: typeof ModelCapability
  ) => Effect.Effect<Array<Model>, ModelConfigError>;

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
   * Validates if a model has all the specified capabilities.
   * @param modelId The ID of the model to validate.
   * @param capabilities Array of capabilities to validate against.
   * @returns An Effect resolving to true if the model exists and has all specified capabilities, false otherwise.
   */
  validateModel: (
    modelId: string,
    capabilities: typeof ModelCapability
  ) => Effect.Effect<boolean, ModelConfigError | ModelValidationError>;
};
