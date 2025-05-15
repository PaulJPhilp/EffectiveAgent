/**
 * @file Implements the ObjectService for handling AI structured object generation.
 * @module services/ai/producers/object/service
 */

import { TextPart } from "@/schema.js";
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import { ModelService } from "@/services/ai/model/service.js";
import type { ProviderClientApi, ProviderServiceApi } from "@/services/ai/provider/api.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { ConfigurationService } from "@/services/core/configuration/service.js";
import type { ObjectServiceApi } from "@/services/pipeline/producers/object/api.js";
import { ObjectGenerationError, ObjectInputError, ObjectModelError, ObjectProviderError, ObjectSchemaError } from "@/services/pipeline/producers/object/errors.js";
import type { EffectiveResponse } from "@/types.js";
import { EffectiveInput, EffectiveMessage } from "@/types.js";
import { JSONSchema, Schema as S } from "effect";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import { ObjectGenerationOptions } from "./types.js";

/**
 * Result shape expected from the underlying provider client's generateObject method
 */
export type ProviderObjectGenerationResult<T> = EffectiveResponse<{
    readonly object: T; // The generated object
    readonly model: string;
    readonly timestamp: Date;
    readonly id: string;
    readonly usage?: {
        readonly promptTokens?: number;
        readonly completionTokens?: number;
        readonly totalTokens?: number;
    };
}>;

/**
 * ObjectService provides methods for generating structured objects using AI providers.
 */
export class ObjectService extends Effect.Service<ObjectServiceApi>()("ObjectService", {
    effect: Effect.succeed(({ modelService, providerService }: { modelService: ModelServiceApi; providerService: ProviderServiceApi }) => {

        return {
            generate: <S_Schema extends S.Schema<any, any>, T_Output = S.Schema.Type<S_Schema>>(options: ObjectGenerationOptions<S_Schema>): Effect.Effect<EffectiveResponse<T_Output>, Error, any> =>
                Effect.gen(function* () {
                    // Validate prompt
                    if (!options.prompt || options.prompt.trim() === "") {
                        return yield* Effect.fail(new ObjectInputError({
                            description: "Prompt cannot be empty",
                            module: "ObjectService",
                            method: "generate"
                        }));
                    }

                    // Get model ID or fail
                    const modelId = yield* Effect.fromNullable(options.modelId).pipe(
                        Effect.mapError(() => new ObjectModelError({
                            description: "Model ID must be provided",
                            module: "ObjectService",
                            method: "generate"
                        }))
                    );

                    // Get provider name from model service
                    const providerName = yield* modelService.getProviderName(modelId).pipe(
                        Effect.mapError((error) => new ObjectProviderError({
                            description: "Failed to get provider name for model",
                            module: "ObjectService",
                            method: "generate",
                            cause: error
                        }))
                    );

                    // Get provider client
                    const providerClient: ProviderClientApi = yield* providerService.getProviderClient(providerName).pipe(
                        Effect.mapError((error) => new ObjectProviderError({
                            description: "Failed to get provider client",
                            module: "ObjectService",
                            method: "generate",
                            cause: error
                        }))
                    );

                    // If system prompt is provided, prepend it to the prompt
                    let finalPrompt = options.prompt;
                    const systemPrompt = options.system ? Option.getOrUndefined(options.system) : undefined;
                    if (systemPrompt) {
                        finalPrompt = `${systemPrompt}\n\n${finalPrompt}`;
                    }

                    // Add schema details to the prompt
                    const schemaDescription = yield* Effect.try({
                        try: () => JSON.stringify(JSONSchema.make(options.schema), null, 2),
                        catch: error => new ObjectSchemaError({
                            description: "Failed to stringify schema",
                            module: "ObjectService",
                            method: "generate",
                            cause: error,
                            schema: options.schema
                        })
                    });

                    // Enhance prompt with schema information
                    finalPrompt = `${finalPrompt}\n\nPlease provide an object that conforms to the following schema:\n${schemaDescription}\n\nEnsure that all required properties are included and all values match the specified types.`;

                    yield* Effect.annotateCurrentSpan("ai.provider.name", providerName);
                    yield* Effect.annotateCurrentSpan("ai.model.name", modelId);

                    // Create EffectiveInput from the final prompt
                    const effectiveInput = new EffectiveInput(
                        finalPrompt,
                        Chunk.make(new EffectiveMessage({
                            role: "user",
                            parts: Chunk.make(new TextPart({ _tag: "Text", content: finalPrompt }))
                        }))
                    );

                    // Create Effect for provider call with its context
                    const providerCallEffect = providerClient.generateObject<T_Output>(
                        effectiveInput,
                        {
                            modelId,
                            schema: options.schema as unknown as S.Schema<any, T_Output>,
                            system: systemPrompt,
                            signal: options.signal,
                            ...options.parameters
                        }
                    );

                    // Generate the object using the provider's generateObject method
                    const result = yield* Effect.promise(
                        (): Promise<ProviderObjectGenerationResult<T_Output>> => Effect.runPromise(providerCallEffect)
                    ).pipe(
                        Effect.mapError((error) => new ObjectGenerationError({
                            description: "Object generation failed",
                            module: "ObjectService",
                            method: "generate",
                            cause: error
                        }))
                    );

                    // Validate and parse the result with the schema
                    const parsedObject = yield* S.decode(options.schema)(result.data.object as any).pipe(
                        Effect.mapError(error => new ObjectSchemaError({
                            description: "Generated object does not match schema",
                            module: "ObjectService",
                            method: "generate",
                            cause: error,
                            schema: options.schema,
                            result: result.data.object,
                            validationErrors: Array.isArray(error) ? error : [error]
                        }))
                    );

                    // Map the result to ObjectGenerationResult
                    return {
                        metadata: result.metadata,
                        data: parsedObject,
                        usage: result.usage,
                        finishReason: result.finishReason,
                        providerMetadata: result.providerMetadata,
                        messages: result.messages
                    } as EffectiveResponse<T_Output>;
                }).pipe(
                    Effect.mapError(error => {
                        // Ensure all known errors are preserved, otherwise wrap unknown
                        if (error instanceof ObjectInputError ||
                            error instanceof ObjectModelError ||
                            error instanceof ObjectProviderError ||
                            error instanceof ObjectSchemaError ||
                            error instanceof ObjectGenerationError) {
                            return error;
                        }
                        // Fallback for truly unknown errors, though ideally all paths are typed
                        return new Error(`An unexpected error occurred: ${String(error)}`);
                    }),
                    Effect.withSpan("ObjectService.generate"),
                    Effect.provide(ConfigurationService.Default)
                )
        };
    }),
    dependencies: [ModelService.Default, ProviderService.Default]
}) { }
