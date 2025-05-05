/**
 * @file Error definitions for the VentureCapitalistChatPipeline
 * @module ea/pipelines/venture-capitalist-chat/errors
 */

import { PipelineError } from "../common/errors.js";

/**
 * Error specific to the VentureCapitalistChatPipeline when financial analysis fails
 */
export class FinancialAnalysisError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "VentureCapitalistChatPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the VentureCapitalistChatPipeline when market research fails
 */
export class MarketResearchError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "VentureCapitalistChatPipeline",
            cause: params.cause
        });
    }
}

/**
 * Error specific to the VentureCapitalistChatPipeline when valuation fails
 */
export class ValuationError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "VentureCapitalistChatPipeline",
            cause: params.cause
        });
    }
}

/**
 * Union type of all VentureCapitalistChatPipeline error types
 */
export type VentureCapitalistChatPipelineError =
    | FinancialAnalysisError
    | MarketResearchError
    | ValuationError; 