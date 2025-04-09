/**
 * @file Defines types and the Context Tag for the AI Model Configuration service.
 * @module services/ai/model/types
 */

import type { Schema } from "effect";
import { Context, Data, HashMap, Option } from "effect";
import { ModelCapabilitySchema, ModelDefinition, ModelName } from "./schema.js";

// Type alias for ModelCapability based on the schema
type ModelCapability = Schema.Schema.Type<typeof ModelCapabilitySchema>;

/**
 * Represents the loaded and validated AI model configuration data.
 */
export class ModelConfigData extends Data.Class<{
    readonly models: HashMap.HashMap<ModelName, ModelDefinition>;
    readonly defaultModelName: ModelName;
}> {
    /**
     * Finds all models that include the specified capability.
     * @param capability The capability to search for.
     * @returns A readonly array of matching ModelDefinition objects.
     */
    findModelsByCapability(capability: ModelCapability): ReadonlyArray<ModelDefinition> {
        const matchingModels: ModelDefinition[] = [];
        for (const model of HashMap.values(this.models)) {
            if (model.capabilities.includes(capability)) {
                matchingModels.push(model);
            }
        }
        return matchingModels;
    }

    /**
     * Finds all models that include ALL of the specified capabilities.
     * @param capabilities Array of capabilities to search for.
     * @returns A readonly array of ModelDefinition objects that have all specified capabilities.
     */
    findModelsByCapabilities(capabilities: ReadonlyArray<ModelCapability>): ReadonlyArray<ModelDefinition> {
        const matchingModels: ModelDefinition[] = [];
        for (const model of HashMap.values(this.models)) {
            if (capabilities.every(cap => model.capabilities.includes(cap))) {
                matchingModels.push(model);
            }
        }
        return matchingModels;
    }

    /**
     * Validates if a model has all the specified capabilities.
     * @param modelId The ID of the model to validate.
     * @param capabilities Array of capabilities to validate against.
     * @returns true if the model exists and has all specified capabilities, false otherwise.
     */
    validateModel(modelId: ModelName, capabilities: ReadonlyArray<ModelCapability>): boolean {
        const model = HashMap.get(this.models, modelId);
        if (Option.isNone(model)) {
            return false;
        }
        return capabilities.every(cap => model.value.capabilities.includes(cap));
    }
}

/**
 * Context Tag for accessing the AI Model Configuration data.
 */
export class ModelConfigDataTag extends Context.Tag("ModelConfigData")<
    ModelConfigDataTag,
    ModelConfigData
>() { }
