/**
 * @file Implements the ModelService which provides access to AI model configurations and metadata.
 * @module services/ai/model/service
 *
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * !!! WARNING: This file uses the Effect.Service pattern and MUST NOT be modified by AI agents !!!
 * !!! unless explicitly instructed. The pattern used here is the canonical implementation.      !!!
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 */
import { ModelCapability } from "@/schema.js";
import { Effect } from "effect";
import type { ModelServiceApi } from "./api.js";
import { ModelNotFoundError } from "./errors.js";
declare const ModelService_base: Effect.Service.Class<ModelServiceApi, "ModelService", {
    readonly effect: Effect.Effect<{
        validateModel: (modelId: string) => Effect.Effect<boolean, never, never>;
        findModelsByCapability: (capability: ModelCapability) => Effect.Effect<import("./schema.js").Model[], ModelNotFoundError, never>;
        findModelsByCapabilities: (capabilities: readonly ModelCapability[]) => Effect.Effect<import("./schema.js").Model[], ModelNotFoundError, never>;
        getProviderName: (modelId: string) => Effect.Effect<any, ModelNotFoundError, never>;
        exists: (modelId: string) => Effect.Effect<boolean, never, never>;
        getDefaultModelId: () => Effect.Effect<string, ModelNotFoundError, never>;
        getModelsForProvider: (providerName: string) => Effect.Effect<import("./schema.js").Model[], ModelNotFoundError, never>;
        load: () => Effect.Effect<{
            name: string;
            version: string;
            models: readonly import("./schema.js").Model[];
        }, never, never>;
        healthCheck: () => Effect.Effect<undefined, never, never>;
        shutdown: () => Effect.Effect<undefined, never, never>;
    }, import("@/services/core/configuration/errors.js").ConfigReadError | import("@/services/core/configuration/errors.js").ConfigParseError | import("@/services/core/configuration/errors.js").ConfigValidationError, import("@/services/core/configuration/api.js").ConfigurationServiceApi>;
}>;
/**
 * Implementation of the ModelService using Effect.Service pattern.
 * This service provides access to AI model configurations and metadata.
 */
export declare class ModelService extends ModelService_base {
}
export {};
//# sourceMappingURL=service.d.ts.map