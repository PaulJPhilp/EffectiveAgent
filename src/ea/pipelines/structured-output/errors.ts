/**
 * @file Error definitions for the StructuredOutputPipeline
 * @module ea/pipelines/structured-output/errors
 */

import { PipelineError } from "../common/errors.js";

/**
 * Error specific to the StructuredOutputPipeline when schema validation fails
 */
export class SchemaValidationError extends PipelineError {
    readonly validationIssues: string[];

    constructor(params: { message: string; validationIssues: string[]; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "StructuredOutputPipeline",
            cause: params.cause
        });
        this.validationIssues = params.validationIssues;
    }
}

/**
 * Error specific to the StructuredOutputPipeline when schema parsing fails
 */
export class SchemaParsingError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "StructuredOutputPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the StructuredOutputPipeline when maximum retries are exceeded
 */
export class MaxRetriesExceededError extends PipelineError {
    readonly attempts: number;

    constructor(params: { message: string; attempts: number; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "StructuredOutputPipeline",
            cause: params.cause
        });
        this.attempts = params.attempts;
    }
}

/**
 * Union type of all StructuredOutputPipeline error types
 */
export type StructuredOutputPipelineError =
    | SchemaValidationError
    | SchemaParsingError
    | MaxRetriesExceededError; 