/**
 * @file Error definitions for the QueryAnalysisPipeline
 * @module ea/pipelines/query-analysis/errors
 */

import { PipelineError } from "../common/errors.js";

/**
 * General error for the QueryAnalysisPipeline
 */
export class QueryAnalysisPipelineError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "QueryAnalysisPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the QueryAnalysisPipeline when entity extraction fails
 */
export class EntityExtractionError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "QueryAnalysisPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the QueryAnalysisPipeline when intent classification fails
 */
export class IntentClassificationError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "QueryAnalysisPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the QueryAnalysisPipeline when sentiment analysis fails
 */
export class SentimentAnalysisError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "QueryAnalysisPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the QueryAnalysisPipeline when query parsing fails
 */
export class QueryParsingError extends PipelineError {
    readonly queryText: string;

    constructor(params: { message: string; queryText: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "QueryAnalysisPipeline",
            cause: params.cause
        });
        this.queryText = params.queryText;
    }
}

/**
 * Union type of all QueryAnalysisPipeline error types
 */
export type QueryAnalysisPipelineErrorUnion =
    | QueryAnalysisPipelineError
    | EntityExtractionError
    | IntentClassificationError
    | SentimentAnalysisError
    | QueryParsingError; 