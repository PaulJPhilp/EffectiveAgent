import { Effect } from "effect";
import type { ModelNotFoundError } from "./errors.js";
import type { ModelCapability } from "@/schema.js";
import type { PublicModelInfoData } from "./schema.js";

/**
 * Defines the public API for the ModelService.
 * This service is responsible for managing and providing information about available AI models.
 */
export interface ModelServiceApi {
  /**
   * This was missing from the API, causing a type error in the service implementation.
   */
  loadModel: any;

  /**
   * Checks if a model with the given ID exists.
   */
  exists: (modelId: string) => Effect.Effect<boolean, ModelNotFoundError>;

  /**
   * Loads the model configuration.
   * Returns a ModelFile containing PublicModelInfoData objects.
   */
  load: () => Effect.Effect<{ models: readonly PublicModelInfoData[], name: string, version: string }, ModelNotFoundError>;

  /**
   * Gets the provider name for a given model ID.
   */
  getProviderName: (modelId: string) => Effect.Effect<string, ModelNotFoundError>;

  /**
   * Finds models that have a specific capability (e.g., 'chat', 'image-generation').
   * Returns an array of PublicModelInfoData objects.
   */
  findModelsByCapability: (
    capability: ModelCapability
  ) => Effect.Effect<PublicModelInfoData[], ModelNotFoundError>;

  /**
   * Finds all models that include ALL of the specified capabilities (based on vendorCapabilities).
   * Returns PublicModelInfoData objects.
   */
  findModelsByCapabilities: (
    capabilities: readonly ModelCapability[]
  ) => Effect.Effect<readonly PublicModelInfoData[], ModelNotFoundError>;

  /**
   * Gets the default model ID.
   */
  getDefaultModelId: () => Effect.Effect<string, ModelNotFoundError>;

  /**
   * Gets metadata for all models associated with a specific provider.
   */
  getModelsForProvider: (
    providerName: string
  ) => Effect.Effect<readonly PublicModelInfoData[], ModelNotFoundError>;

  /**
   * Gets the available public models.
   */
  get publicModels(): Effect.Effect<PublicModelInfoData[], never, never>;

  /**
   * Validates if a model has all the specified capabilities (based on vendorCapabilities).
   */
  validateModel: (modelId: string) => Effect.Effect<boolean, ModelNotFoundError>;

  /**
   * Checks the health of the model service.
   */
  healthCheck: () => Effect.Effect<void, ModelNotFoundError>;

  /**
   * Shuts down the model service and cleans up resources.
   */
  shutdown: () => Effect.Effect<void, ModelNotFoundError>;
}
