/**
 * @file Contract definition for the CoderChatPipeline
 * @module ea/pipelines/coder-chat/contract
 */

import { Context, Effect } from "effect";
import { PipelineError } from "../common/errors.js";

/**
 * Input parameters for the CoderChatPipeline
 */
export interface CoderChatPipelineInput {
    /** The message from the user to respond to */
    message: string;
    /** Optional conversation history */
    history?: Array<{
        role: "user" | "assistant";
        content: string;
    }>;
    /** Programming language to focus on */
    language?: string;
    /** Code repository context (relevant files, etc.) */
    codeContext?: {
        /** Relevant code snippets */
        snippets?: Array<{
            filename: string;
            code: string;
            startLine?: number;
            endLine?: number;
        }>,
        /** Repository information */
        repository?: {
            name: string;
            language?: string;
            framework?: string;
        }
    };
    /** Whether to generate executable code samples */
    includeCode?: boolean;
}

/**
 * Response from the CoderChatPipeline
 */
export interface CoderChatResponse {
    /** The response message */
    message: string;
    /** Code examples if requested */
    codeExamples?: Array<{
        /** Programming language of the code */
        language: string;
        /** The actual code */
        code: string;
        /** Additional explanation of the code */
        explanation?: string;
    }>;
    /** References to documentation */
    references?: Array<{
        /** Reference title */
        title: string;
        /** URL if available */
        url?: string;
    }>;
}

/**
 * Error specific to the CoderChatPipeline
 */
export class CoderChatPipelineError extends PipelineError {
    constructor(params: { message: string; cause?: unknown }) {
        super({
            message: params.message,
            pipelineName: "CoderChatPipeline",
            cause: params.cause,
        });
    }
}

/**
 * API contract for the CoderChatPipeline service
 */
export interface CoderChatPipelineApi {
    /**
     * Generates a coding-focused response to a user message
     * 
     * @param input - Chat request parameters
     * @returns Effect that resolves to a coder chat response or fails with pipeline error
     */
    chat: (
        input: CoderChatPipelineInput
    ) => Effect.Effect<CoderChatResponse, CoderChatPipelineError>;

    /**
     * Reviews a code snippet and provides feedback
     * 
     * @param code - The code to review
     * @param language - The programming language
     * @param options - Additional options for the review
     * @returns Effect that resolves to a code review response
     */
    reviewCode: (
        code: string,
        language: string,
        options?: Partial<Omit<CoderChatPipelineInput, "message">>
    ) => Effect.Effect<CoderChatResponse, CoderChatPipelineError>;
}

/**
 * Service tag for the CoderChatPipeline
 */
export class CoderChatPipeline extends Context.Tag("CoderChatPipeline")<
    CoderChatPipeline,
    CoderChatPipelineApi
>() { } 