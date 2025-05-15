import { Effect } from "effect";
import { AnyPipelineError } from "./errors.js";

/**
 * Generic interface for pipeline input
 * @template T The type of the payload
 */
export interface PipelineInput<T = Record<string, unknown>> {
    /** The main data payload for the pipeline */
    payload: T;
    /** Optional trace ID for tracking and logging purposes */
    traceId?: string;
}

/**
 * Generic interface for pipeline output
 * @template R The type of the result
 */
export interface PipelineOutput<R = Record<string, unknown>> {
    /** The primary result produced by the pipeline */
    result: R;
    /** Optional metadata associated with the pipeline execution (e.g., duration, steps taken) */
    metadata?: Record<string, unknown>;
}

/**
 * Generic API contract for any Pipeline.
 * Defines the core `execute` method that all pipelines must implement.
 * @template InputType The specific input type for the pipeline, extending PipelineInput.
 * @template OutputType The specific output type for the pipeline, extending PipelineOutput.
 * @template PipelineErrorType The specific error type for the pipeline, extending AnyPipelineError.
 */
export interface PipelineApi<
    InputType extends PipelineInput<unknown>,
    OutputType extends PipelineOutput<unknown>,
    PipelineErrorType extends AnyPipelineError,
> {
    /**
     * Executes the pipeline with the given input.
     * This is the primary method for running a pipeline.
     * @param input - The input for the pipeline, conforming to the pipeline's specific InputType.
     * @returns Effect that resolves to the pipeline's output (conforming to OutputType)
     *          or fails with a pipeline-specific error (conforming to PipelineErrorType).
     */
    execute: (
        input: InputType
    ) => Effect.Effect<OutputType, PipelineErrorType>;
} 