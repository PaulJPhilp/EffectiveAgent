/**
 * @file Defines core schemas used by the pipeline service
 */

import { Schema as S } from "effect";


/**
 * Schema representing a response from a producer service
 */
export class ProducerResponse extends S.Class<ProducerResponse>("ProducerResponse")({
    data: S.Any,  // The actual response data
    model: S.String,             // ID of the model used
    id: S.String,               // Response ID
    usage: S.optional(S.Struct({
        promptTokens: S.Number,
        completionTokens: S.Number,
        totalTokens: S.Number
    }))    // Optional usage statistics
}) { }

/**
 * Schema representing request options for a producer service
 */
export class ProducerOptions extends S.Class<ProducerOptions>("ProducerOptions")({
    modelId: S.String,
    systemPrompt: S.optional(S.String),
    maxTokens: S.optional(S.Number),
    temperature: S.optional(S.Number.pipe(S.between(0, 2))),
    topP: S.optional(S.Number.pipe(S.between(0, 1))),
    topK: S.optional(S.Number),
    frequencyPenalty: S.optional(S.Number.pipe(S.between(-2, 2))),
    presencePenalty: S.optional(S.Number.pipe(S.between(-2, 2))),
    seed: S.optional(S.Number),
    stop: S.optional(S.Array(S.String))
}) { }