/**
 * @file Defines core schemas used by the pipeline service
 */

import { Schema as S } from "effect";

/**
 * Schema representing usage statistics from a producer service
 */
export class UsageStatistics extends S.Class<UsageStatistics>("UsageStatistics")({
    promptTokens: S.Number.pipe(S.positive()),
    completionTokens: S.Number.pipe(S.positive()),
    totalTokens: S.Number.pipe(S.positive())
}) { }

/**
 * Schema representing a response from a producer service
 * @template T The type of the response data
 */
export class ProducerResponse<T> extends S.Class<ProducerResponse<T>>("ProducerResponse")({
    data: S.any as unknown as S.Schema<T>,  // Generic data type
    model: S.String.pipe(S.nonEmpty()),     // ID of the model used
    id: S.String.pipe(S.uuid()),            // Response ID must be a UUID
    usage: S.optional(S.instanceOf(UsageStatistics))
}) { }

/**
 * Schema representing request options for a producer service
 */
export class ProducerOptions extends S.Class<ProducerOptions>("ProducerOptions")({
    modelId: S.String.pipe(S.nonEmpty()),
    systemPrompt: S.optional(S.String.pipe(S.nonEmpty())),
    maxTokens: S.optional(S.Number.pipe(S.positive())),
    temperature: S.optional(S.Number.pipe(S.between(0, 2))),
    topP: S.optional(S.Number.pipe(S.between(0, 1))),
    topK: S.optional(S.Number.pipe(S.positive())),
    frequencyPenalty: S.optional(S.Number.pipe(S.between(-2, 2))),
    presencePenalty: S.optional(S.Number.pipe(S.between(-2, 2))),
    seed: S.optional(S.Number.pipe(S.int())),
    stop: S.optional(S.Array(S.String.pipe(S.nonEmpty())))
}) { }

// Type guard for checking if a value matches the ProducerResponse schema
export const isProducerResponse = <T>(value: unknown, dataSchema: S.Schema<T>): value is ProducerResponse<T> => {
    const schema = ProducerResponse(dataSchema);
    return S.is(schema)(value);
};