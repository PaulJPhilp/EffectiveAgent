import type { ModelCapability } from "@/schema.js";
import { Effect, Schema as S } from "effect";
import type { ModelNotFoundError } from "./errors.js";
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
    load: () => Effect.Effect<{
        models: readonly PublicModelInfoDefinition[];
        name: string;
        version: string;
    }, ModelNotFoundError>;
    /**
     * Gets the provider name for a given model ID.
     */
    readonly getProviderName: (modelId: string) => Effect.Effect<string, ModelNotFoundError, never>;
    /**
     * Finds all models that include the specified capability (based on vendorCapabilities).
     * Returns PublicModelInfoDefinition objects.
     */
    readonly findModelsByCapability: (capability: S.Schema.Type<typeof ModelCapability>) => Effect.Effect<readonly PublicModelInfoDefinition[], ModelNotFoundError, never>;
    /**
     * Finds all models that include ALL of the specified capabilities (based on vendorCapabilities).
     * Returns PublicModelInfoDefinition objects.
     */
    readonly findModelsByCapabilities: (capabilities: readonly S.Schema.Type<typeof ModelCapability>[]) => Effect.Effect<readonly PublicModelInfoDefinition[], ModelNotFoundError, never>;
    /**
     * Gets the default model ID for a given provider and capability.
     */
    readonly getDefaultModelId: () => Effect.Effect<string, ModelNotFoundError, never>;
    /**
     * Gets metadata for all models associated with a specific provider.
     */
    readonly getModelsForProvider: (providerName: string) => Effect.Effect<readonly PublicModelInfoDefinition[], ModelNotFoundError, never>;
    /**
     * Validates if a model has all the specified capabilities (based on vendorCapabilities).
     * @param modelId The ID of the model to validate.
     * @param capabilities Array of capabilities to validate against.
     * @returns An Effect resolving to true if the model exists and has all specified capabilities.
     * @error ModelNotFoundError If the model ID doesn't exist.
     * @error ModelValidationError If the model lacks required capabilities.
     */
    validateModel: (modelId: string) => Effect.Effect<boolean, ModelNotFoundError>;
    /**
     * Checks the health of the model service.
     * @returns An Effect that resolves to void on success or fails with ModelNotFoundError
     */
    healthCheck: () => Effect.Effect<void, ModelNotFoundError>;
    /**
     * Shuts down the model service and cleans up resources.
     * @returns An Effect that resolves to void on success or fails with ModelNotFoundError
     */
    shutdown: () => Effect.Effect<void, ModelNotFoundError>;
};
//# sourceMappingURL=api.d.ts.map