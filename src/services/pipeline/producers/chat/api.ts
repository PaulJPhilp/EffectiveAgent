import type { AgentRuntime } from "@/agent-runtime/api.js";
import { EffectiveResponse } from "@/types.js";
import type { Effect } from "effect";
import type { ChatAgentState } from "./service.js";
import type { ChatCompletionOptions, ChatCompletionResult } from "./types.js";

/**
 * Chat service API
 */
export interface ChatServiceApi {
    /** Generate a chat completion */
    readonly generate: (
        options: ChatCompletionOptions
    ) => Effect.Effect<EffectiveResponse<ChatCompletionResult>, Error>;

    /** Create a chat completion (legacy method) */
    readonly create: (
        options: Omit<ChatCompletionOptions, 'span'> & { span?: any }
    ) => Effect.Effect<ChatCompletionResult, Error>;

    /**
     * Get the current agent state for monitoring/debugging
     * @returns Effect that resolves to the current ChatAgentState
     */
    readonly getAgentState: () => Effect.Effect<ChatAgentState, Error>;

    /**
     * Get the agent runtime for advanced operations
     * @returns The AgentRuntime instance
     */
    readonly getRuntime: () => AgentRuntime<ChatAgentState>;

    /**
     * Terminate the chat service agent
     * @returns Effect that resolves when termination is complete
     */
    readonly terminate: () => Effect.Effect<void, Error>;
} 