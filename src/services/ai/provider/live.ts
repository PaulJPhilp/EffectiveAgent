/**
 * @file Implements the live Layer for loading AI Provider configuration.
 * @module services/ai/provider/live
 */

import { EntityParseError } from "@/services/core/loader/errors.js";
import { Config, ConfigProvider, Effect, HashMap, Layer, Schema } from "effect";
import { ProviderConfigError } from "./errors.js";
import { ProviderDefinition, ProvidersConfigFileSchema } from "./schema.js";
import { ProviderConfigData, ProviderConfigDataTag } from "./types.js";

/**
 * Live Layer that loads provider configurations using Effect's Config system,
 * validates them against the schema, transforms the data into a HashMap,
 * and provides it via the ProviderConfigDataTag.
 */
export const ProviderConfigLiveLayer = Layer.effect(
    ProviderConfigDataTag,
    Effect.gen(function* () {
        // 1. Get ConfigProvider and load raw config
        const configProvider = yield* ConfigProvider.ConfigProvider;
        const rawConfig = yield* configProvider.load(Config.string("providers")).pipe(
            Effect.mapError(cause => new ProviderConfigError({
                message: "Failed to load provider config",
                cause: new EntityParseError({
                    filePath: "providers.json",
                    cause
                })
            }))
        );
        const parsedConfig = JSON.parse(rawConfig);

        // 2. Validate config using schema directly
        const validConfig = yield* Schema.decode(ProvidersConfigFileSchema)(parsedConfig).pipe(
            Effect.mapError(cause => new ProviderConfigError({
                message: "Failed to validate provider config",
                cause: new EntityParseError({
                    filePath: "providers.json",
                    cause
                })
            }))
        );

        // 3. Transform to HashMap for efficient lookup
        const providerEntries = validConfig.providers.map(
            (provider: ProviderDefinition) => [provider.name, provider] as const
        );
        const providersMap = HashMap.fromIterable(providerEntries);

        // 4. Return typed ProviderConfigData
        return new ProviderConfigData({
            providers: providersMap,
            defaultProviderName: validConfig.defaultProviderName
        });
    })
);
