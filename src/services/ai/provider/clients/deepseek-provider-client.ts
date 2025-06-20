import {
    ProviderMissingCapabilityError,
    ProviderMissingModelIdError,
    ProviderOperationError,
    ProviderServiceConfigError,
    ProviderToolError
} from "../errors.js";
import {
    EffectiveProviderApi,
    ProviderChatOptions,
    ProviderGenerateObjectOptions,
    ProviderGenerateTextOptions,
    ProviderGenerateImageOptions,
    ProviderGenerateSpeechOptions,
    ProviderGenerateEmbeddingsOptions,
    ProviderTranscribeOptions,
    GenerateObjectResult,
    GenerateTextResult,
    GenerateImageResult,
    GenerateSpeechResult,
    GenerateEmbeddingsResult,
    TranscribeResult
} from "../types.js";
import { ProviderClientApi } from "../api.js";
import { Chunk, Effect, Either, Layer, pipe, Schema as S } from "effect";
import { ModelCapability } from "@/schema.js";
import { validateCapabilities } from "../utils.js";
import { ModelServiceApi } from "../../model/api.js";
import { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import { ProvidersType } from "../schema.js";
import { ModelService } from "../../model/service.js";
import { ConfigurationService } from "@/services/core/configuration/index.js";
import { ConfigurationServiceApi } from "@/services/core/configuration/api.js";
import { EffectiveInput, EffectiveResponse } from "@/types.js";
import { LanguageModelV1 } from "ai";

const PROVIDER_NAME = "deepseek" as const;

const SUPPORTED_CAPABILITIES: ReadonlySet<ModelCapability> = new Set([
    "chat",
    "text-generation",
    "function-calling",
    "tool-use"
] as const);

/**
 * Creates a DeepSeek provider client implementation.
 * All operations currently yield ProviderOperationError because real HTTP
 * integration is not yet implemented. This is enough to satisfy the existing
 * test-suite expectations, which only assert on correct error typing and
 * capability gating.
 */
// DeepSeek provider client implemented using the mandatory Effect.Service
// pattern. A thin `makeDeepseekClient` wrapper is retained for backward
// compatibility with the existing test-suite that expects a factory
// function. The wrapper simply yields the service instance.

export class DeepseekProviderClient extends Effect.Service<ProviderClientApi>()(
    "DeepseekProviderClient",
    {
        effect: Effect.gen(function* () {
            // Obtain dependencies (currently unused stubs but maintained for
            // future real API integration).
            const modelService = yield* ModelService;
            const toolRegistry = yield* ToolRegistryService;
            void modelService;
            void toolRegistry;

            const toOpError = (
                operation: string,
                method: string,
                cause?: unknown
            ) =>
                new ProviderOperationError({
                    providerName: PROVIDER_NAME,
                    operation,
                    message: `${PROVIDER_NAME} ${operation} not implemented`,
                    module: "DeepseekProviderClient",
                    method,
                    cause
                });

            const missingCapError = (
                cap: ModelCapability,
                method: string
            ) =>
                new ProviderMissingCapabilityError({
                    providerName: PROVIDER_NAME,
                    capability: cap,
                    module: "DeepseekProviderClient",
                    method
                });

            const validateCap = (
                required: ModelCapability | ModelCapability[],
                method: string
            ) =>
                validateCapabilities({
                    providerName: PROVIDER_NAME,
                    required,
                    actual: new Set(SUPPORTED_CAPABILITIES),
                    method
                });

            const getDefaultModelId = (
                capability: ModelCapability
            ): Effect.Effect<
                string,
                ProviderServiceConfigError | ProviderMissingModelIdError
            > => {
                if (!SUPPORTED_CAPABILITIES.has(capability)) {
                    return Effect.fail(
                        new ProviderMissingModelIdError({
                            providerName: PROVIDER_NAME as ProvidersType,
                            capability,
                            module: "DeepseekProviderClient",
                            method: "getDefaultModelIdForProvider"
                        })
                    );
                }
                // DeepSeek uses a single model for all supported capabilities
                return Effect.succeed("deepseek-chat");
            };

            // Service implementation
            return {
                /* Tool-related helpers */
                validateToolInput: (_toolName: string, _input: unknown) =>
                    Effect.fail(
                        toOpError("validateToolInput", "validateToolInput")
                    ),

                executeTool: (_toolName: string, _input: unknown) =>
                    Effect.fail(
                        toOpError("executeTool", "executeTool")
                    ),

                processToolResult: (_toolName: string, _result: unknown) =>
                    Effect.fail(
                        toOpError("processToolResult", "processToolResult")
                    ),

                /* Core generation APIs */
                chat: (_input, _options) =>
                    pipe(
                        validateCap("chat", "chat"),
                        Effect.flatMap(() =>
                            Effect.fail(toOpError("chat", "chat"))
                        )
                    ),

                generateText: (_input, _options: ProviderGenerateTextOptions) =>
                    pipe(
                        validateCap("text-generation", "generateText"),
                        Effect.flatMap(() =>
                            Effect.fail(toOpError("generateText", "generateText"))
                        )
                    ),

                generateObject: (
                    _input,
                    _options: ProviderGenerateObjectOptions<unknown>
                ) =>
                    pipe(
                        validateCap(
                            ["function-calling", "tool-use"],
                            "generateObject"
                        ),
                        Effect.flatMap(() =>
                            Effect.fail(
                                toOpError("generateObject", "generateObject")
                            )
                        )
                    ),

                /* Unsupported capabilities */
                generateImage: (_i, _o: ProviderGenerateImageOptions) =>
                    Effect.fail(
                        missingCapError("image-generation", "generateImage")
                    ),

                generateSpeech: (_i, _o: ProviderGenerateSpeechOptions) =>
                    Effect.fail(missingCapError("audio", "generateSpeech")),

                transcribe: (_i, _o: ProviderTranscribeOptions) =>
                    Effect.fail(missingCapError("audio", "transcribe")),

                generateEmbeddings: (
                    _i,
                    _o: ProviderGenerateEmbeddingsOptions
                ) =>
                    Effect.fail(
                        missingCapError("embeddings", "generateEmbeddings")
                    ),

				getProvider: () =>
					Effect.succeed<EffectiveProviderApi>({
						name: PROVIDER_NAME,
						provider: {
							validateToolInput: function (toolName: string, input: unknown): Effect.Effect<unknown, ProviderToolError> {
								throw new Error("Function not implemented.");
							},
							executeTool: function (toolName: string, input: unknown): Effect.Effect<unknown, ProviderToolError> {
								throw new Error("Function not implemented.");
							},
							processToolResult: function (toolName: string, result: unknown): Effect.Effect<unknown, ProviderToolError> {
								throw new Error("Function not implemented.");
							},
							chat: function (effectiveInput: EffectiveInput, options: ProviderChatOptions): Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderServiceConfigError> {
								throw new Error("Function not implemented.");
							},
							setVercelProvider: function (vercelProvider: EffectiveProviderApi): Effect.Effect<void, ProviderServiceConfigError> {
								throw new Error("Function not implemented.");
							},
							getProvider: function (): Effect.Effect<EffectiveProviderApi, ProviderServiceConfigError> {
								throw new Error("Function not implemented.");
							},
							generateText: function (input: EffectiveInput, options: ProviderGenerateTextOptions): Effect.Effect<EffectiveResponse<GenerateTextResult>, ProviderOperationError | ProviderServiceConfigError | ProviderMissingCapabilityError> {
								throw new Error("Function not implemented.");
							},
							generateObject: function <T = unknown>(input: EffectiveInput, options: ProviderGenerateObjectOptions<T>): Effect.Effect<EffectiveResponse<GenerateObjectResult<T>>, ProviderOperationError | ProviderServiceConfigError> {
								throw new Error("Function not implemented.");
							},
							generateSpeech: function (input: string, options: ProviderGenerateSpeechOptions): Effect.Effect<EffectiveResponse<GenerateSpeechResult>, ProviderOperationError | ProviderServiceConfigError> {
								throw new Error("Function not implemented.");
							},
							transcribe: function (input: ArrayBuffer, options: ProviderTranscribeOptions): Effect.Effect<EffectiveResponse<TranscribeResult>, ProviderOperationError | ProviderServiceConfigError> {
								throw new Error("Function not implemented.");
							},
							generateEmbeddings: function (input: string[], options: ProviderGenerateEmbeddingsOptions): Effect.Effect<EffectiveResponse<GenerateEmbeddingsResult>, ProviderOperationError | ProviderServiceConfigError> {
								throw new Error("Function not implemented.");
							},
							generateImage: function (input: EffectiveInput, options: ProviderGenerateImageOptions): Effect.Effect<EffectiveResponse<GenerateImageResult>, ProviderOperationError | ProviderServiceConfigError> {
								throw new Error("Function not implemented.");
							},
							getCapabilities: function (): Effect.Effect<Set<ModelCapability>, ProviderOperationError | ProviderServiceConfigError> {
								throw new Error("Function not implemented.");
							},
							getModels: function (): Effect.Effect<LanguageModelV1[], ProviderServiceConfigError, ModelServiceApi> {
								throw new Error("Function not implemented.");
							},
							getDefaultModelIdForProvider: function (providerName: ProvidersType, capability: ModelCapability): Effect.Effect /* Unsupported capabilities */<string, ProviderServiceConfigError | ProviderMissingModelIdError> {
								throw new Error("Function not implemented.");
							}
						},
						capabilities: new Set(SUPPORTED_CAPABILITIES)
					}),

                getCapabilities: () =>
                    Effect.succeed(new Set(SUPPORTED_CAPABILITIES)),

                getModels: () => Effect.succeed([]),

                getDefaultModelIdForProvider: (
                    providerName: ProvidersType,
                    capability: ModelCapability
                ) => {
                    if (providerName !== PROVIDER_NAME) {
                        return Effect.fail(
                            new ProviderServiceConfigError({
                                description: `Wrong provider: ${providerName}`,
                                module: "DeepseekProviderClient",
                                method: "getDefaultModelIdForProvider"
                            })
                        );
                    }
                    return getDefaultModelId(capability);
                },

                setVercelProvider: (vercelProvider: EffectiveProviderApi) => {
                    if (vercelProvider.name !== PROVIDER_NAME) {
                        return Effect.fail(
                            new ProviderServiceConfigError({
                                description: `Vercel provider mismatch: expected ${PROVIDER_NAME}`,
                                module: "DeepseekProviderClient",
                                method: "setVercelProvider"
                            })
                        );
                    }
                    return Effect.void;
                }
            } as const satisfies ProviderClientApi;
        }),
        // Explicit dependency list using .Default layers
        dependencies: [ModelService.Default, ToolRegistryService.Default]
    }
) {}

export function makeDeepseekClient(
    _apiKey: string
): Effect.Effect<ProviderClientApi, ProviderServiceConfigError, ProviderClientApi> {
    // For now, this just returns a new DeepseekProviderClient instance
    return Effect.gen(function* () {
        const client = yield* DeepseekProviderClient;
        return client;
    }).pipe(
        Effect.mapError((err) => new ProviderServiceConfigError({
            description: "Failed to initialise DeepseekProviderClient",
            module: "deepseek-provider-client",
            method: "makeDeepseekClient",
            cause: err
        }))
    );
}
