/**
 * @file Implements the live Layer for loading AI Provider configuration.
 * @module services/ai/provider/live
 */

import {
    EntityLoadError,
    EntityParseError,
} from "@/services/core/loader/errors.js"; // Import specific loader errors
import { EntityLoaderApiTag } from "@/services/core/loader/types.js";
import { Effect, Either, HashMap, Layer, Schema } from "effect";
import { ProviderConfigError } from "./errors.js"; // Import domain error
import {
    ProviderDefinition,
    ProviderName,
    ProvidersConfigFileSchema,
} from "./schema.js";
import { ProviderConfigData, ProviderConfigDataTag } from "./types.js";

const PROVIDERS_CONFIG_FILENAME = "providers.json" as const;

/**
 * Live Layer that loads provider configurations from a JSON file,
 * validates them against the schema, transforms the data into a HashMap,
 * and provides it via the ProviderConfigDataTag. Maps loading/parsing
 * errors to ProviderConfigError.
 *
 * Requires EntityLoaderApi in its context.
 */
export const ProviderConfigLiveLayer = Layer.effect(
    ProviderConfigDataTag,
    Effect.gen(function* () {
        const loader = yield* EntityLoaderApiTag;

        // 1. Load raw data
        const rawData = yield* loader
            .loadRawEntity(PROVIDERS_CONFIG_FILENAME, { skipValidation: true })
            .pipe(
                // Effect.tapError((cause) => Effect.logDebug(`Loader Error Cause: ${cause}`)), // Optional debug logging
                Effect.mapError(
                    (cause: EntityLoadError | EntityParseError) =>
                        new ProviderConfigError({
                            message: `Failed to load ${PROVIDERS_CONFIG_FILENAME}`,
                            cause: cause, // Pass the received cause directly
                        }),
                ),
            );

        // 2. Validate raw data
        const configFile = yield* Effect.suspend(() => {
            const result = Schema.decodeUnknownEither(ProvidersConfigFileSchema)(rawData);
            return Either.match(result, {
                onLeft: (cause) => Effect.fail(new ProviderConfigError({
                    message: `Schema validation failed for ${PROVIDERS_CONFIG_FILENAME}`,
                    cause: new EntityParseError({
                        filePath: PROVIDERS_CONFIG_FILENAME,
                        cause
                    }),
                })),
                onRight: Effect.succeed
            });
        });

        // 3. Create typed HashMap from provider definitions
        const providerEntries: ReadonlyArray<
            readonly [ProviderName, ProviderDefinition]
        > = configFile.providers.map(
            (providerDef: ProviderDefinition) =>
                [providerDef.name, providerDef] as const,
        );

        const providerMap: HashMap.HashMap<ProviderName, ProviderDefinition> =
            HashMap.fromIterable(providerEntries);

        // 4. Return the ProviderConfigData instance
        return new ProviderConfigData({
            providers: providerMap,
            defaultProviderName: configFile.defaultProviderName,
        });
    }),
);
