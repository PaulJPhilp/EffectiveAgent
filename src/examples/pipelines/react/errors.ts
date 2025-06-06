/**
 * @file Error definitions for the ReActPipeline
 * @module ea/pipelines/react/errors
 */

import { PipelineError } from "../common/errors.js";

/**
 * General error for the ReActPipeline
 */
export class ReActPipelineError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ReActPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the ReActPipeline when reasoning fails
 */
export class ReasoningError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ReActPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the ReActPipeline when tool execution fails
 */
export class ToolExecutionError extends PipelineError {
    readonly toolId: string;

    constructor(params: { message: string; toolId: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ReActPipeline",
            cause: params.cause
        });
        this.toolId = params.toolId;
    }
}

/**
 * Error specific to the ReActPipeline when step parsing fails
 */
export class StepParsingError extends PipelineError {
    readonly rawOutput: string;

    constructor(params: { message: string; rawOutput: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ReActPipeline",
            cause: params.cause
        });
        this.rawOutput = params.rawOutput;
    }
}

/**
 * Error specific to the ReActPipeline when maximum steps are reached without finding an answer
 */
export class MaxStepsExceededError extends PipelineError {
    readonly stepsUsed: number;

    constructor(params: { message: string; stepsUsed: number; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ReActPipeline",
            cause: params.cause
        });
        this.stepsUsed = params.stepsUsed;
    }
}

/**
 * Error specific to the ReActPipeline when tool selection fails
 */
export class ToolSelectionError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ReActPipeline",
            cause: params.cause
        });
    }
}

/**
 * Union type of all ReActPipeline error types
 */
export type ReActPipelineErrorUnion =
    | ReActPipelineError
    | ReasoningError
    | ToolExecutionError
    | StepParsingError
    | MaxStepsExceededError
    | ToolSelectionError; 