/**
 * @file Error definitions for the CoderChatPipeline
 * @module ea/pipelines/coder-chat/errors
 */

import { PipelineError } from "../common/errors.js";

/**
 * General error for the CoderChatPipeline
 */
export class CoderChatPipelineError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "CoderChatPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the CoderChatPipeline when code generation fails
 */
export class CodeGenerationError extends PipelineError {
    readonly language: string;

    constructor(params: { message: string; language: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "CoderChatPipeline",
            cause: params.cause
        });
        this.language = params.language;
    }
}

/**
 * Error specific to the CoderChatPipeline when code analysis fails
 */
export class CodeAnalysisError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "CoderChatPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the CoderChatPipeline when documentation lookup fails
 */
export class DocumentationError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "CoderChatPipeline",
            cause: params.cause
        });
    }
}

/**
 * Union type of all CoderChatPipeline error types
 */
export type CoderChatPipelineErrorUnion =
    | CoderChatPipelineError
    | CodeGenerationError
    | CodeAnalysisError
    | DocumentationError; 