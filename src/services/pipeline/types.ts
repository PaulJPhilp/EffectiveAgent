/**
 * @file Shared types for generation-related pipeline operations
 */

/**
 * Base result type for all pipeline operations
 */
export interface GenerateBaseResult {
    location: any;
    temperature: any;
    temperatureFeelsLike: any;
    humidity: any;
    windSpeed: any;
    windDirection: any;
    conditions: any;
    timestamp: any;
    text(text: any): unknown;
    /** The generated output */
    output: string;
    /** Usage statistics */
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    /** Reason for completion */
    finishReason?: "stop" | "length" | "content_filter" | "tool_calls" | "function_call";
    /** Provider-specific metadata */
    providerMetadata?: Record<string, unknown>;
}

/**
 * Base options type for all pipeline operations
 */
export interface GenerateBaseOptions {
    /** The model ID to use */
    modelId: string;
    /** The input text */
    text: string;
    /** Optional system message */
    system?: string;
    /** Optional abort signal */
    signal?: AbortSignal;
    /** Optional parameters */
    parameters?: {
        /** Maximum tokens to generate */
        maxTokens?: number;
        /** Temperature (0-2) */
        temperature?: number;
        /** Top-p sampling */
        topP?: number;
        /** Top-k sampling */
        topK?: number;
        /** Presence penalty */
        presencePenalty?: number;
        /** Frequency penalty */
        frequencyPenalty?: number;
        /** Random seed */
        seed?: number;
        /** Stop sequences */
        stop?: string[];
    };
}

// Schemas previously in shared/schema.ts
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
 * Schema representing a response from a producer service.
 * The actual schema for the 'data' field is applied at runtime, typically via a type guard or parser.
 */
export class ProducerResponse extends S.Class<ProducerResponse>("ProducerResponse")({
    data: S.encodedSchema(S.Any), // Represents a placeholder for any data structure
    model: S.String.pipe(S.minLength(1)),     // ID of the model used
    id: S.UUID,            // Response ID must be a UUID
    usage: S.optional(S.instanceOf(UsageStatistics))
}) {
    // This allows us to type the 'data' property when we instantiate or use ProducerResponse
    // For example: const response = yield* S.decode(ProducerResponse(MySpecificDataSchema))(unknownInput)
    // then response.data would be typed according to MySpecificDataSchema
    static provideDataSchema<T extends S.Schema.AnyNoContext>(dataSchema: T) {
        return S.Struct({
            data: dataSchema,
            model: S.String.pipe(S.minLength(1)),
            id: S.UUID,
            usage: S.optional(S.instanceOf(UsageStatistics))
        })
    }
}

// Updated type alias for clarity when using the schema with a specific data type
export type TypedProducerResponse<T> = S.Schema.Type<ReturnType<typeof ProducerResponse.provideDataSchema<S.Schema<T>>>>;

/**
 * Schema representing request options for a producer service
 */
export class ProducerOptions extends S.Class<ProducerOptions>("ProducerOptions")({
    modelId: S.String.pipe(S.minLength(1)),
    systemPrompt: S.optional(S.String.pipe(S.minLength(1))),
    maxTokens: S.optional(S.Number.pipe(S.positive())),
    temperature: S.optional(S.Number.pipe(S.between(0, 2))),
    topP: S.optional(S.Number.pipe(S.between(0, 1))),
    topK: S.optional(S.Number.pipe(S.positive())),
    frequencyPenalty: S.optional(S.Number.pipe(S.between(-2, 2))),
    presencePenalty: S.optional(S.Number.pipe(S.between(-2, 2))),
    seed: S.optional(S.Number.pipe(S.int())),
    stop: S.optional(S.Array(S.String.pipe(S.minLength(1))))
}) { }

// Type guard for checking if a value matches the ProducerResponse schema
export const isProducerResponse = <T extends S.Schema.AnyNoContext>(value: unknown, dataSchema: T): value is S.Schema.Type<ReturnType<typeof ProducerResponse.provideDataSchema<T>>> => {
    const schemaWithSpecificData = ProducerResponse.provideDataSchema(dataSchema);
    return S.is(schemaWithSpecificData)(value);
};
