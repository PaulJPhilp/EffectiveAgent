/**
 * @file Contract definition for the ScientistChatPipeline
 * @module ea/pipelines/scientist-chat/contract
 */

import { Effect } from "effect";
import { AnyPipelineError } from "../common/errors.js";

/**
 * Input parameters for the ScientistChatPipeline
 */
export interface ScientistChatPipelineInput {
    /** The message from the user to respond to */
    message: string;
    /** Optional conversation history */
    history?: Array<{
        role: "user" | "assistant";
        content: string;
    }>;
    /** Scientific domain to focus on (physics, biology, chemistry, etc.) */
    domain?: string;
    /** Academic level of the conversation (elementary, high school, undergraduate, graduate, expert) */
    academicLevel?: string;
    /** Whether to include citations in responses */
    includeCitations?: boolean;
}

/**
 * Response from the ScientistChatPipeline
 */
export interface ScientistChatResponse {
    /** The response message */
    message: string;
    /** Citations if requested */
    citations?: Array<{
        /** Reference identifier */
        id: string;
        /** Title of the source */
        title: string;
        /** Authors of the source */
        authors: string[];
        /** Year of publication */
        year?: number;
        /** URL if available */
        url?: string;
    }>;
    /** Domain-specific notes or clarifications */
    notes?: string[];
}

/**
 * Error specific to the ScientistChatPipeline
 */
export class ScientistChatPipelineError extends AnyPipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "ScientistChatPipeline",
            cause: params.cause,
        });
    }
}

/**
 * API contract for the ScientistChatPipeline service
 */
export interface ScientistChatPipelineApi {
    /**
     * Generates a scientifically accurate response to a user message
     * 
     * @param input - Chat request parameters
     * @returns Effect that resolves to a scientist chat response or fails with pipeline error
     */
    chat: (
        input: ScientistChatPipelineInput
    ) => Effect.Effect<ScientistChatResponse, ScientistChatPipelineError>;

    /**
     * Explains a scientific concept in detail
     * 
     * @param conceptQuery - The concept to explain
     * @param options - Optional parameters for academic level, domain, etc.
     * @returns Effect that resolves to a detailed explanation
     */
    explainConcept: (
        conceptQuery: string,
        options?: Omit<ScientistChatPipelineInput, "message">
    ) => Effect.Effect<ScientistChatResponse, ScientistChatPipelineError>;
}

/**
 * Service tag for the ScientistChatPipeline
 */
export const ScientistChatPipeline = Effect.GenericTag<ScientistChatPipelineApi>("ScientistChatPipeline"); 