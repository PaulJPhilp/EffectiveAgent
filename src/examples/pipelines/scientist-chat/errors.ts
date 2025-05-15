/**
 * @file Error definitions for the ScientistChatPipeline
 * @module ea/pipelines/scientist-chat/errors
 */

import { PipelineError } from "../common/errors.js";

/**
 * Error specific to the ScientistChatPipeline when domain knowledge is insufficient
 */
export class DomainKnowledgeError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ScientistChatPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the ScientistChatPipeline when citation generation fails
 */
export class CitationError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ScientistChatPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the ScientistChatPipeline when fact verification fails
 */
export class FactVerificationError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ScientistChatPipeline",
            cause: params.cause
        });
    }
}

/**
 * Union type of all ScientistChatPipeline error types
 */
export type ScientistChatPipelineError =
    | DomainKnowledgeError
    | CitationError
    | FactVerificationError; 