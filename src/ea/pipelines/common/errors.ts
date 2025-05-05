/**
 * @file Base error classes for all EffectiveAgent pipelines.
 * @module ea/pipelines/common/errors
 */

import { Data } from "effect";

/**
 * Base error for all pipeline-specific errors
 */
export class PipelineError extends Data.TaggedError("PipelineError")<{
    readonly message: string;
    readonly pipelineName: string;
    readonly cause?: unknown;
}> { }

/**
 * Error thrown when pipeline validation fails
 */
export class PipelineValidationError extends Data.TaggedError("PipelineValidationError")<{
    readonly message: string;
    readonly pipelineName: string;
    readonly validationErrors: string[];
    readonly cause?: unknown;
}> { }

/**
 * Error thrown when pipeline execution fails
 */
export class PipelineExecutionError extends Data.TaggedError("PipelineExecutionError")<{
    readonly message: string;
    readonly pipelineName: string;
    readonly cause?: unknown;
}> { }

/**
 * Error thrown when pipeline configuration is invalid
 */
export class PipelineConfigError extends Data.TaggedError("PipelineConfigError")<{
    readonly message: string;
    readonly pipelineName: string;
    readonly cause?: unknown;
}> { }

/**
 * Union type of all pipeline error types
 */
export type AnyPipelineError =
    | PipelineError
    | PipelineValidationError
    | PipelineExecutionError
    | PipelineConfigError; 