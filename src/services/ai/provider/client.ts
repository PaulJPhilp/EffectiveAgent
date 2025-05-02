/**
 * @file Provider client service implementation
 * @module services/ai/provider/client
 */

import { Effect, Option, Ref } from "effect";
import { validateModelId, validateCapabilities } from "./helpers.js";

import { ProviderClientApi } from "./api.js";
import { EffectiveProviderApi } from "./types.js";

import { ModelCapability } from "@/schema.js";
import { EffectiveInput } from "../input/service.js";
import {
    ProviderConfigError,
    ProviderMissingCapabilityError,
    ProviderOperationError
} from "./errors.js";
import type {
    GenerateTextResult,
    ProviderGenerateTextOptions,
    ProviderChatOptions,
    ChatResult,
    EffectiveResponse
} from "./types.js";



/**
 * ProviderClient service implementation using Effect.Service pattern
 */
export class ProviderClient extends Effect.Service<ProviderClientApi>()(
    "ProviderClient",
    {
        effect: Effect.gen(function* () {
            // Provider state ref
            const providerRef = yield* Ref.make<{
                provider: EffectiveProviderApi;
                capabilities: Set<ModelCapability>;
                name: string;
            } | null>(null);

            // Helper function to get provider
            const getProvider = (): Effect.Effect<{
                provider: EffectiveProviderApi;
                capabilities: Set<ModelCapability>;
                name: string;
            }, ProviderConfigError> =>
                Effect.gen(function* () {
                    const state = yield* Ref.get(providerRef);
                    if (!state) {
                        return yield* Effect.fail(
                            new ProviderConfigError({
                                description: "No provider configured",
                                module: "ProviderClient",
                                method: "getProvider"
                            })
                        );
                    }
                    return state;
                });

            // Helper function to set provider
            const setProvider = (provider: EffectiveProviderApi, capabilities: Set<ModelCapability>, name: string): Effect.Effect<void, never> =>
                Ref.set(
                    providerRef,
                    { provider, capabilities, name }
                );

            return {
                // Return implementation of ProviderClientApi
                setVercelProvider: (provider: EffectiveProviderApi) =>
                    Effect.gen(function* () {
                        yield* setProvider(provider, new Set(["text-generation", "chat"]), "vercel");
                    }),

                getProvider: () =>
                    Effect.gen(function* () {
                        const { provider } = yield* getProvider();
                        return provider;
                    }),

                getCapabilities: () =>
                    Effect.gen(function* () {
                        const { capabilities } = yield* getProvider();
                        return capabilities;
                    }),

                chat: (input: EffectiveInput, options: ProviderChatOptions): Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderConfigError | ProviderMissingCapabilityError> =>
                    Effect.gen(function* () {
                        const { provider, name } = yield* getProvider();
                        const modelId = yield* validateModelId({
                            options,
                            method: "chat"
                        });
                        yield* validateCapabilities({
                            providerName: name,
                            required: "chat",
                            actual: provider.capabilities,
                            method: "chat"
                        });
                        return yield* provider.provider.chat(input, { ...options, modelId });
                    })
            };
        }),
        dependencies: []
    }
) { }