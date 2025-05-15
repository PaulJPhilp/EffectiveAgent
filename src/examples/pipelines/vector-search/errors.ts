/**
 * @file Error definitions for the VectorSearchPipeline
 * @module ea/pipelines/vector-search/errors
 */

import { PipelineError } from "../common/errors.js";

/**
 * Error specific to the VectorSearchPipeline when embedding generation fails
 */
export class EmbeddingGenerationError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "VectorSearchPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the VectorSearchPipeline when database operations fail
 */
export class VectorDatabaseError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "VectorSearchPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the VectorSearchPipeline when no results are found
 */
export class NoVectorResultsError extends PipelineError {
    readonly query: string;

    constructor(params: { message: string; query: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "VectorSearchPipeline",
            cause: params.cause
        });
        this.query = params.query;
    }
}

/**
 * Error specific to the VectorSearchPipeline when reranking fails
 */
export class RerankingError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "VectorSearchPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the VectorSearchPipeline when vector storage fails
 */
export class VectorStorageError extends PipelineError {
    readonly itemCount: number;

    constructor(params: { message: string; itemCount: number; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "VectorSearchPipeline",
            cause: params.cause
        });
        this.itemCount = params.itemCount;
    }
}

/**
 * Union type of all VectorSearchPipeline error types
 */
export type VectorSearchPipelineError =
    | EmbeddingGenerationError
    | VectorDatabaseError
    | NoVectorResultsError
    | RerankingError
    | VectorStorageError; 