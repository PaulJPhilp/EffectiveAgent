/**
 * @file Abstract AgentRunner interface for the core orchestration layer
 * @module agent-runner
 */

import type { Effect, Stream } from "effect";

/**
 * Input payload for running an agent
 */
export interface AgentRunInput {
    /** The prompt or instruction for the agent */
    readonly prompt: string;
    /** Optional model ID to use */
    readonly modelId?: string;
    /** Optional additional context or parameters */
    readonly context?: Record<string, unknown>;
}

/**
 * Output from running an agent
 */
export interface AgentRunOutput {
    /** The agent's response */
    readonly response: string;
    /** Optional metadata about the execution */
    readonly metadata?: Record<string, unknown>;
}

/**
 * Abstract interface for running agents.
 * This interface defines the contract that all agent runners must implement.
 * The first implementation will be EffectLangGraphRunner in the effect-langgraph package.
 */
export interface AgentRunner {
    /**
     * Runs an agent with the given input and returns the output.
     * This is the core method that all agent runners must implement.
     */
    readonly run: (input: AgentRunInput) => Effect.Effect<AgentRunOutput, AgentRunnerError>;

    /**
     * Streams intermediate states as the agent runs.
     * This allows observing the agent's state changes over time.
     * @param graph The compiled graph to execute
     * @param initialState The initial state to start execution with
     */
    readonly stream: <State extends object>(
        graph: unknown,
        initialState: State
    ) => Stream.Stream<State, AgentRunnerError>;
}

/**
 * Base error for agent runner operations
 */
export class AgentRunnerError extends Error {
    readonly _tag = "AgentRunnerError";

    constructor(
        message: string,
        readonly cause?: unknown
    ) {
        super(message);
        this.name = "AgentRunnerError";
    }
}