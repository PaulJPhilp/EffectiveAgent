/**
 * @file Implements the live layer for ModelConfig service.
 * @module services/ai/model/live
 */

import { EntityParseError } from "@/services/core/loader/errors.js";
import { Config, ConfigProvider, Effect, HashMap, Layer, Schema } from "effect";
import { ModelConfigError } from "./errors.js";
import { type ModelDefinition, ModelsConfigFileSchema } from "./schema.js";
import { ModelConfigData, ModelConfigDataTag } from "./types.js";

/**
 * Live implementation of the ModelConfig service.
 * Loads configuration using Effect's ConfigProvider and validates against ModelsConfig schema.
 */
export const ModelConfigLiveLayer = Layer.effect(
    ModelConfigDataTag,
    Effect.gen(function* () {
        // 1. Get ConfigProvider and load raw config
        const configProvider = yield* ConfigProvider.ConfigProvider;
        const rawConfig = yield* configProvider.load(Config.string("models")).pipe(
            Effect.mapError(cause => new ModelConfigError({
                message: "Failed to load model config",
                cause: new EntityParseError({
                    filePath: "models.json",
                    cause
                })
            }))
        );
        const parsedConfig = JSON.parse(rawConfig);

        // 2. Load and validate config using the schema directly
        const validConfig = yield* Schema.decode(ModelsConfigFileSchema)(parsedConfig).pipe(
            Effect.mapError(cause => new ModelConfigError({
                message: "Failed to validate model config",
                cause: new EntityParseError({
                    filePath: "models.json",
                    cause
                })
            }))
        );

        // 3. Transform to HashMap
        const modelEntries = validConfig.models.map(
            (model: ModelDefinition) => [model.id, model] as const
        );
        const modelsMap = HashMap.fromIterable(modelEntries);

        // 4. Return typed ModelConfigData
        return new ModelConfigData({
            models: modelsMap,
            defaultModelName: validConfig.models[0]?.id ?? "missing-default"
        });
    })
);
