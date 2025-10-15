import type { FileSystem } from "@effect/platform/FileSystem";
import type { Path } from "@effect/platform/Path";
import type { Effect } from "effect";
import type { ToolRegistryService } from "@/services/ai/tool-registry/service.js";
import type { ConfigurationService } from "@/services/core/configuration/service.js";
import type { OrchestratorService } from "@/services/execution/orchestrator/service.js";
import type { ResilienceService } from "@/services/execution/resilience/service.js";
import type { EffectiveResponse } from "@/types.js";
import type { ChatAgentState } from "./service.js";
import type { ChatCompletionOptions, ChatCompletionResult } from "./types.js";

/**
 * Chat service API
 */
export interface ChatServiceApi {
    /** Generate a chat completion */
    readonly generate: (
        options: ChatCompletionOptions
    ) => Effect.Effect<EffectiveResponse<ChatCompletionResult>, Error,
        ToolRegistryService | OrchestratorService | ResilienceService | ConfigurationService | FileSystem | Path>;

    /** Create a chat completion (legacy method) */
    readonly create: (
        options: Omit<ChatCompletionOptions, 'span'> & { span?: any }
    ) => Effect.Effect<ChatCompletionResult, Error,
        ToolRegistryService | OrchestratorService | ResilienceService | ConfigurationService | FileSystem | Path>;

    /**
     * Get the current service state for monitoring/debugging
     * @returns Effect that resolves to the current ChatAgentState
     */
    readonly getAgentState: () => Effect.Effect<ChatAgentState, Error, never>;


    /**
     * Terminate the chat service (resets internal state)
     * @returns Effect that resolves when termination is complete
     */
    readonly terminate: () => Effect.Effect<void, Error, never>;
} 