/**
 * @file Contract definition for the ReActPipeline
 * @module ea/pipelines/react/contract
 */

import { Effect } from "effect";
import type { ReActPipelineError } from "./errors.js";

/**
 * Represents a tool that can be used within the ReAct reasoning framework
 */
export interface ReActTool {
    /** Unique identifier for the tool */
    id: string;
    /** Human-readable name of the tool */
    name: string;
    /** Description of what the tool does */
    description: string;
    /** Method signature/parameters the tool expects */
    parameters: Record<string, unknown>;
    /** Function to execute the tool with specific parameters */
    execute: (params: Record<string, unknown>) => Effect.Effect<unknown, Error>;
}

/**
 * A single thought-action-observation step in the ReAct process
 */
export interface ReActStep {
    /** Unique identifier for this step */
    id: string;
    /** The agent's thought process as text */
    thought?: string;
    /** The tool selected to use, if any */
    action?: {
        /** The ID of the selected tool */
        toolId: string;
        /** Parameters passed to the tool */
        params: Record<string, unknown>;
    };
    /** The observation resulting from the action */
    observation?: string;
    /** Timestamp when this step was created */
    timestamp: string;
}

/**
 * Input parameters for the ReActPipeline
 */
export interface ReActPipelineInput {
    /** Question or task to solve using ReAct */
    query: string;
    /** Available tools that can be used during reasoning */
    tools: ReActTool[];
    /** Maximum number of reasoning steps to perform */
    maxSteps?: number;
    /** Whether intermediary reasoning steps should be returned */
    includeReasoning?: boolean;
    /** Optional initial context or background information */
    initialContext?: string;
}

/**
 * Output of the ReActPipeline
 */
export interface ReActPipelineOutput {
    /** The final answer to the query */
    answer: string;
    /** Full trail of reasoning steps if includeReasoning was true */
    reasoning?: ReActStep[];
    /** Tools that were used during the reasoning process */
    toolsUsed: string[];
    /** Total number of steps taken */
    stepCount: number;
    /** Whether the reasoning reached the maximum step limit */
    reachedStepLimit: boolean;
    /** Execution time metrics */
    metrics?: {
        /** Total execution time in milliseconds */
        totalTimeMs: number;
        /** Time spent in agent thinking vs. tool execution */
        thinkingTimeMs: number;
        /** Time spent executing tools */
        toolExecutionTimeMs: number;
    };
}

/**
 * API contract for the ReActPipeline service
 */
export interface ReActPipelineApi {
    /**
     * Solves a query or task using the ReAct (Reasoning and Acting) approach
     * 
     * @param input - ReAct process parameters 
     * @returns Effect that resolves to ReAct output or fails with pipeline error
     */
    solveWithReAct: (
        input: ReActPipelineInput
    ) => Effect.Effect<ReActPipelineOutput, ReActPipelineError>;

    /**
     * Continues a previously started ReAct process with additional steps
     * 
     * @param previousOutput - The previous execution output
     * @param additionalSteps - Maximum additional steps to take
     * @returns Effect that resolves to updated ReAct output
     */
    continueReActProcess: (
        previousOutput: ReActPipelineOutput,
        additionalSteps: number
    ) => Effect.Effect<ReActPipelineOutput, ReActPipelineError>;
}

/**
 * Service tag for the ReActPipeline
 */
export class ReActPipeline extends Effect.Service<ReActPipelineApi>()("ReActPipeline", {
    effect: Effect.succeed({} as ReActPipelineApi)
}) { } 