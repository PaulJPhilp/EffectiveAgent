/**
 * @file Defines specific errors for the Pipeline service.
 * @module services/pipeline/errors
 */

import { Data } from "effect";

export class PipelineConfigError extends Data.TaggedError("PipelineConfigError")<{
    readonly description: string;
    readonly module: string;
    readonly method: string;
    readonly cause?: unknown;
}> { }

export class PipelineExecutionError extends Data.TaggedError("PipelineExecutionError")<{
    readonly description: string;
    readonly module: string;
    readonly method: string;
    readonly cause?: unknown;
}> { }

export class PipelineValidationError extends Data.TaggedError("PipelineValidationError")<{
    readonly description: string;
    readonly module: string;
    readonly method: string;
    readonly validationErrors: string[];
}> { }

export type PipelineError = PipelineConfigError | PipelineExecutionError | PipelineValidationError;