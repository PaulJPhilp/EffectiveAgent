/**
 * @file Implements the ObjectService for handling AI structured object generation.
 * @module services/ai/producers/object/service
 */

import { EffectiveInput } from '@/services/ai/input/service.js';
import type { ModelServiceApi } from "@/services/ai/model/api.js";
import { ModelService } from "@/services/ai/model/service.js";
import type { ProviderClientApi } from "@/services/ai/provider/api.js";
import { ProviderService } from "@/services/ai/provider/service.js";
import { AiError } from "@effect/ai/AiError";
import { Message } from "@effect/ai/AiInput";
import { JSONSchema, Schema as S } from "effect";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { Span } from "effect/Tracer";
import type { ObjectGenerationOptions, ObjectGenerationResult, ObjectServiceApi } from "./api.js";
import { ObjectGenerationError, ObjectInputError, ObjectModelError, ObjectProviderError, ObjectSchemaError } from "./errors.js";

/**
 * Result shape expected from the underlying provider client's generateObject method
 */
export type ProviderObjectGenerationResult<T> = import("@/services/ai/provider/types.js").EffectiveResponse<{
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
    effect: Effect.gen(function* () {
        // Get services
        const providerService = yield* ProviderService;
        const modelService: ModelServiceApi = yield* ModelService;

        return {
            generate: <T>(options: ObjectGenerationOptions<T>) =>
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
                    const systemPrompt = Option.getOrUndefined(options.system);
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
                    const effectiveInput = new EffectiveInput(Chunk.make(Message.fromInput(finalPrompt)));

                    // Generate the object using the provider's generateObject method
                    const result = yield* Effect.promise(
                        (): Promise<ProviderObjectGenerationResult<T>> => Effect.runPromise(providerClient.generateObject<T>(
                            effectiveInput,
                            {
                                modelId,
                                schema: options.schema,
                                system: systemPrompt,
                                signal: options.signal,
                                ...options.parameters
                            }
                        ))
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
                        data: parsedObject,
                        model: result.data.model,
                        timestamp: result.data.timestamp,
                        id: result.data.id,
                        usage: result.data.usage ? {
                            promptTokens: result.data.usage.promptTokens || 0,
                            completionTokens: result.data.usage.completionTokens || 0,
                            totalTokens: result.data.usage.totalTokens || 0
                        } : undefined
                    };
                }).pipe(
                    Effect.withSpan("ObjectService.generate")
                )
        };
    })
}) { }
