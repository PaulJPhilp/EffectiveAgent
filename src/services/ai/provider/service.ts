/**
 * @file Defines types and the Context Tag for the AI Provider configuration data.
 * @module services/ai/provider/types
 */

// Import Schema, Context, Data, HashMap from 'effect'
import { Config, ConfigProvider, Effect, Ref, Schema as S } from "effect";
// Import types derived from schemas using 'import type'
import { ProviderFile } from "./schema.js";

import { EntityParseError } from "@/services/core/errors.js";

import { ProviderConfigError } from "./errors.js";

import { ProviderClient, ProviderClientApi } from "./client.js";


export class ProviderService extends Effect.Service<ProviderService>()("ProviderService", {
    effect: Effect.gen(function* () {
        let providerRef: Ref.Ref<ProviderFile>;
        let providerClientRef: Ref.Ref<ProviderClientApi>;

        return {
            load: () => {
                return Effect.gen(function* () {
                    const configProvider = yield* ConfigProvider.ConfigProvider;
                    const rawConfig = yield* configProvider.load(Config.string("provider")).pipe(
                        Effect.mapError(cause => new ProviderConfigError({
                            message: "Failed to load model config",
                            cause: new EntityParseError({
                                filePath: "models.json",
                                cause
                            })
                        }))
                    );

                    const parsedConfig = Effect.try({
                        try: () => JSON.parse(rawConfig),
                        catch: (error) => {
                            throw new ProviderConfigError({
                                message: "Failed to parse model config",
                                cause: new EntityParseError({
                                    filePath: "models.json",
                                    cause: error
                                })
                            });
                        }
                    });

                    // 2. Load and validate config using the schema directly
                    const data = yield* parsedConfig
                    const validConfig = yield* S.decode(ProviderFile)(data).pipe(
                        Effect.mapError(cause => new ProviderConfigError({
                            message: "Failed to validate model config",
                            cause: new EntityParseError({
                                filePath: "models.json",
                                cause
                            })
                        }))
                    );

                    providerRef = yield* Ref.make<ProviderFile>(validConfig);
                    return validConfig;
                })
            },
            getClient: () => {
                //return providerClientRef.get;
            }
        }
    })
}) { }