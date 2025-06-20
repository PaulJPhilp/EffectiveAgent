/**
 * @file Defines types for the ObjectService producer.
 */

import type { Option, Schema as S } from "effect";
import type { Span } from "effect/Tracer";

/**
 * Options for generating a structured object.
 * @template S_Schema The Effect schema defining the structure of the object to generate.
 */
export interface ObjectGenerationOptions<S_Schema extends S.Schema<any, any>> {
    /** The model ID to use for generation. */
    readonly modelId?: string;
    /** The main prompt or instruction for the object generation. */
    readonly prompt: string;
    /** An optional system prompt or context. */
    readonly system?: Option.Option<string>;
    /** The Effect schema that defines the desired object structure. */
    readonly schema: S_Schema;
    /** Optional tracing span for observability. */
    readonly span?: Span;
    /** Optional AbortSignal to cancel the operation. */
    readonly signal?: AbortSignal;
    /** Optional parameters for model behavior tuning. */
    readonly parameters?: {
        readonly temperature?: number;
        readonly topP?: number;
        // Add other relevant model parameters as needed
    };
} 