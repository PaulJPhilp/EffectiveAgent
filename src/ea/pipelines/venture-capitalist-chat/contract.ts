/**
 * @file Contract definition for the VentureCapitalistChatPipeline
 * @module ea/pipelines/venture-capitalist-chat/contract
 */

import { Context, Effect } from "effect";
import { PipelineError } from "../common/errors.js";

/**
 * Input parameters for the VentureCapitalistChatPipeline
 */
export interface VentureCapitalistChatPipelineInput {
    /** The message from the user to respond to */
    message: string;
    /** Optional conversation history */
    history?: Array<{
        role: "user" | "assistant";
        content: string;
    }>;
    /** Industry sector to focus on */
    industry?: string;
    /** Investment stage (seed, series A, etc.) */
    investmentStage?: string;
    /** Geographic focus */
    region?: string;
    /** Business metrics to consider */
    metrics?: Array<{
        name: string;
        value: string | number;
    }>;
}

/**
 * Response from the VentureCapitalistChatPipeline
 */
export interface VentureCapitalistChatResponse {
    /** The response message */
    message: string;
    /** Investment analysis if applicable */
    analysis?: {
        /** Key strengths identified */
        strengths: string[];
        /** Key concerns identified */
        concerns: string[];
        /** Suggested areas for improvement */
        suggestions: string[];
        /** Potential valuation range */
        valuationRange?: {
            min: number;
            max: number;
            currency: string;
        };
    };
    /** Comparable companies or deals */
    comparables?: Array<{
        companyName: string;
        description: string;
        valuation?: {
            amount: number;
            currency: string;
            date: string;
        };
    }>;
}

/**
 * Error specific to the VentureCapitalistChatPipeline
 */
export class VentureCapitalistChatPipelineError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "VentureCapitalistChatPipeline",
            cause: params.cause,
        });
    }
}

/**
 * API contract for the VentureCapitalistChatPipeline service
 */
export interface VentureCapitalistChatPipelineApi {
    /**
     * Generates a venture capitalist perspective response to a user message
     * 
     * @param input - Chat request parameters
     * @returns Effect that resolves to a venture capitalist chat response or fails with pipeline error
     */
    chat: (
        input: VentureCapitalistChatPipelineInput
    ) => Effect.Effect<VentureCapitalistChatResponse, VentureCapitalistChatPipelineError>;

    /**
     * Evaluates a business pitch with venture capital lens
     * 
     * @param pitchText - The business pitch to evaluate
     * @param options - Additional context and parameters
     * @returns Effect that resolves to a detailed pitch evaluation
     */
    evaluatePitch: (
        pitchText: string,
        options?: Partial<Omit<VentureCapitalistChatPipelineInput, "message">>
    ) => Effect.Effect<VentureCapitalistChatResponse, VentureCapitalistChatPipelineError>;
}

/**
 * Service tag for the VentureCapitalistChatPipeline
 */
export class VentureCapitalistChatPipeline extends Context.Tag("VentureCapitalistChatPipeline")<
    VentureCapitalistChatPipeline,
    VentureCapitalistChatPipelineApi
>() { } 