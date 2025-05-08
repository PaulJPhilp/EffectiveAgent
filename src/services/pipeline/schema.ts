/**
 * @file Defines core schemas used by the pipeline service
 */

import { Schema as S } from "effect";

/**
 * Schema representing a response from a producer service
 */
export class ProducerResponse<T> extends S.Class<ProducerResponse<T>>("ProducerResponse")({
    data: S.any as S.Schema<T>,  // The actual response data
    model: S.String,             // ID of the model used
    id: S.String,               // Response ID
    usage: S.Class<Usage>("Usage")({   // Optional usage statistics
        promptTokens: S.Number,
        completionTokens: S.Number,
        totalTokens: S.Number
    }).pipe(S.optional)
}) { }

/**
 * Schema representing request options for a producer service
 */
export class ProducerOptions extends S.Class<ProducerOptions>("ProducerOptions")({
    modelId: S.String,
    systemPrompt: S.String.pipe(S.optional),
    maxTokens: S.Number.pipe(S.optional),
    temperature: S.Number.pipe(S.between(0, 2), S.optional),
    topP: S.Number.pipe(S.between(0, 1), S.optional),
    topK: S.Number.pipe(S.optional),
    frequencyPenalty: S.Number.pipe(S.between(-2, 2), S.optional),
    presencePenalty: S.Number.pipe(S.between(-2, 2), S.optional),
    seed: S.Number.pipe(S.optional),
    stop: S.Array(S.String).pipe(S.optional)
}) { }