/**
 * @file Error definitions for the ReActPipeline
 * @module ea/pipelines/react/errors
 */

import { PipelineError } from "../common/errors.js";

/**
 * Error specific to the ReActPipeline when a tool execution fails
 */
export class ToolExecutionError extends PipelineError {
    readonly toolId: string;
    readonly params: Record<string, unknown>;

    constructor(params: {
        message: string;
        toolId: string;
        toolParams: Record<string, unknown>;
        cause?: unknown
    }) {
        super({
            message: params.message,
            pipelineName: "ReActPipeline",
            cause: params.cause
        });
        this.toolId = params.toolId;
        this.params = params.toolParams;
    }
}

/**
 * Error specific to the ReActPipeline when a reasoning step fails
 */
export class ReasoningError extends PipelineError {
    readonly stepNumber: number;

    constructor(params: { message: string; stepNumber: number; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ReActPipeline",
            cause: params.cause
        });
        this.stepNumber = params.stepNumber;
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
export type ReActPipelineError =
    | ToolExecutionError
    | ReasoningError
    | MaxStepsExceededError
    | ToolSelectionError; 